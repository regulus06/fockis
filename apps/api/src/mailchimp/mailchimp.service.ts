import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHash } from "crypto";

type MailchimpError = {
  title?: string;
  detail?: string;
  status?: number;
  errors?: unknown[];
};

@Injectable()
export class MailchimpService {
  private readonly apiKey = process.env.MAILCHIMP_API_KEY?.trim() || "";
  private readonly serverPrefix =
    process.env.MAILCHIMP_SERVER_PREFIX?.trim() || "";
  private readonly defaultAudienceId =
    process.env.MAILCHIMP_DEFAULT_AUDIENCE_ID?.trim() || "";

  private get marketingBaseUrl() {
    const configured = process.env.MAILCHIMP_API_BASE_URL?.trim();
    if (configured) return configured.replace(/\/+$/, "");
    if (!this.serverPrefix) return "";
    return `https://${this.serverPrefix}.api.mailchimp.com/3.0`;
  }

  private get transactionalBaseUrl() {
    return (
      process.env.MAILCHIMP_TRANSACTIONAL_BASE_URL?.trim() ||
      "https://mandrillapp.com/api/1.1"
    ).replace(/\/+$/, "");
  }

  private ensureMarketingConfigured() {
    if (!this.apiKey || !this.serverPrefix || !this.marketingBaseUrl) {
      throw new ServiceUnavailableException(
        "Mailchimp Marketing API is not configured. Set MAILCHIMP_API_KEY and MAILCHIMP_SERVER_PREFIX.",
      );
    }
  }

  private async marketingRequest<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    this.ensureMarketingConfigured();

    const response = await fetch(`${this.marketingBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const text = await response.text();
    let body: unknown = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      const error = (body || {}) as MailchimpError;
      throw new Error(
        error.detail ||
          error.title ||
          `Mailchimp API request failed with HTTP ${response.status}`,
      );
    }

    return body as T;
  }

  status() {
    return {
      configured: Boolean(this.apiKey && this.serverPrefix),
      serverPrefix: this.serverPrefix || undefined,
      defaultAudienceId: this.defaultAudienceId || undefined,
      message:
        this.apiKey && this.serverPrefix
          ? "Mailchimp Marketing API credentials are configured."
          : "Configure Mailchimp API credentials on the backend.",
    };
  }

  async listAudiences() {
    return this.marketingRequest<{ lists: unknown[]; total_items: number }>(
      "/lists?count=1000&offset=0",
    ).then((data) => ({
      audiences: data.lists,
      total: data.total_items,
    }));
  }

  async listMembers(audienceId: string, count = 100, offset = 0) {
    this.assertId(audienceId, "audienceId");

    const data = await this.marketingRequest<{
      members: unknown[];
      total_items: number;
    }>(
      `/lists/${encodeURIComponent(audienceId)}/members?count=${Math.min(
        Math.max(count, 1),
        1000,
      )}&offset=${Math.max(offset, 0)}`,
    );

    return {
      members: data.members,
      total: data.total_items,
    };
  }

  async upsertMember(audienceId: string, body: Record<string, unknown>) {
    this.assertId(audienceId, "audienceId");

    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("A valid email address is required.");
    }

    const subscriberHash = this.hashEmail(email);
    const emailMarketing = body.emailMarketing !== false;

    const mergeFields: Record<string, string> = {};
    if (body.firstName) mergeFields.FNAME = String(body.firstName);
    if (body.lastName) mergeFields.LNAME = String(body.lastName);
    if (body.phone) mergeFields.PHONE = String(body.phone);

    return this.marketingRequest(
      `/lists/${encodeURIComponent(audienceId)}/members/${subscriberHash}`,
      {
        method: "PUT",
        body: JSON.stringify({
          email_address: email,
          status_if_new: emailMarketing ? "subscribed" : "unsubscribed",
          merge_fields: mergeFields,
        }),
      },
    );
  }

  async addTags(audienceId: string, email: string, tags: string[]) {
    this.assertId(audienceId, "audienceId");

    const cleanTags = Array.isArray(tags)
      ? tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
          .slice(0, 100)
      : [];

    if (!cleanTags.length) throw new Error("At least one tag is required.");

    const subscriberHash = this.hashEmail(email);

    await this.marketingRequest(
      `/lists/${encodeURIComponent(
        audienceId,
      )}/members/${subscriberHash}/tags`,
      {
        method: "POST",
        body: JSON.stringify({
          tags: cleanTags.map((name) => ({ name, status: "active" })),
        }),
      },
    );

    return { ok: true };
  }

  async createEmailCampaign(body: Record<string, unknown>) {
    const audienceId = String(
      body.audienceId || this.defaultAudienceId || "",
    ).trim();

    if (!audienceId) throw new Error("A Mailchimp audience ID is required.");

    const title = this.required(body.title, "title");
    const subjectLine = this.required(body.subjectLine, "subjectLine");
    const fromName = this.required(body.fromName, "fromName");
    const replyTo = this.required(body.replyTo, "replyTo");
    const html = this.required(body.html, "html");
    const plainText = body.plainText ? String(body.plainText) : undefined;

    const campaign = await this.marketingRequest<{
      id: string;
      status: string;
      web_id?: number;
    }>("/campaigns", {
      method: "POST",
      body: JSON.stringify({
        type: "regular",
        recipients: {
          list_id: audienceId,
        },
        settings: {
          subject_line: subjectLine,
          title,
          from_name: fromName,
          reply_to: replyTo,
          preview_text: body.previewText
            ? String(body.previewText)
            : undefined,
        },
      }),
    });

    await this.setCampaignContent(campaign.id, {
      html,
      plainText,
    });

    let sent = false;
    if (body.sendNow === true) {
      await this.sendCampaign(campaign.id);
      sent = true;
    }

    return {
      campaignId: campaign.id,
      status: campaign.status,
      webId: campaign.web_id,
      sent,
    };
  }

  async setCampaignContent(
    campaignId: string,
    body: { html: string; plainText?: string },
  ) {
    this.assertId(campaignId, "campaignId");

    if (!body.html?.trim()) throw new Error("Email HTML is required.");

    return this.marketingRequest(
      `/campaigns/${encodeURIComponent(campaignId)}/content`,
      {
        method: "PUT",
        body: JSON.stringify({
          html: body.html,
          plain_text: body.plainText || undefined,
        }),
      },
    );
  }

  async sendCampaign(campaignId: string) {
    this.assertId(campaignId, "campaignId");

    await this.marketingRequest(
      `/campaigns/${encodeURIComponent(campaignId)}/send`,
      { method: "POST", body: JSON.stringify({}) },
    );

    return { sent: true };
  }

  async listCampaigns(count = 20, offset = 0) {
    const data = await this.marketingRequest<{
      campaigns: unknown[];
      total_items: number;
    }>(
      `/campaigns?count=${Math.min(Math.max(count, 1), 1000)}&offset=${Math.max(
        offset,
        0,
      )}`,
    );

    return { campaigns: data.campaigns, total: data.total_items };
  }

  async listReports(count = 20, offset = 0) {
    const data = await this.marketingRequest<{
      reports: unknown[];
      total_items: number;
    }>(
      `/reports?count=${Math.min(Math.max(count, 1), 1000)}&offset=${Math.max(
        offset,
        0,
      )}`,
    );

    return { reports: data.reports, total: data.total_items };
  }

  async sendTransactionalSms(body: Record<string, unknown>) {
    const transactionalKey =
      process.env.MAILCHIMP_TRANSACTIONAL_API_KEY?.trim() || "";

    if (!transactionalKey) {
      throw new ServiceUnavailableException(
        "Mailchimp Transactional SMS is not configured. Set MAILCHIMP_TRANSACTIONAL_API_KEY.",
      );
    }

    const to = this.required(body.to, "to");
    const from = this.required(body.from, "from");
    const text = this.required(body.text, "text");
    const consent = this.required(body.consent, "consent");

    if (!["onetime", "recurring", "recurring-no-confirm"].includes(consent)) {
      throw new Error(
        "consent must be onetime, recurring, or recurring-no-confirm.",
      );
    }

    const response = await fetch(`${this.transactionalBaseUrl}/messages/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: transactionalKey,
        message: {
          sms: {
            text,
            to,
            from,
            consent,
            track_clicks: true,
            ...(body.tag ? { tag: String(body.tag) } : {}),
            ...(body.metadata
              ? { metadata: body.metadata as Record<string, string> }
              : {}),
          },
        },
      }),
    });

    const raw = await response.text();
    let result: unknown = null;
    try {
      result = raw ? JSON.parse(raw) : null;
    } catch {
      result = raw;
    }

    if (!response.ok) {
      throw new Error(
        typeof result === "object" &&
          result !== null &&
          "message" in result
          ? String((result as { message?: unknown }).message)
          : `Mailchimp Transactional SMS failed with HTTP ${response.status}`,
      );
    }

    return {
      status: "accepted",
      message: result,
    };
  }

  private hashEmail(email: string) {
    return createHash("md5")
      .update(email.trim().toLowerCase())
      .digest("hex");
  }

  private assertId(value: string, name: string) {
    if (!value?.trim()) throw new Error(`${name} is required.`);
  }

  private required(value: unknown, name: string) {
    const result = String(value ?? "").trim();
    if (!result) throw new Error(`${name} is required.`);
    return result;
  }
}
