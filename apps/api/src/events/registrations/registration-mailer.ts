/**
 * registration-mailer.ts
 * -----------------------------------------------------------------------------
 * Event registration emails. Uses the same delivery settings as the rest of
 * Fockis (MAIL_FROM with RESEND_API_KEY, otherwise SMTP_HOST / SMTP_PORT /
 * SMTP_USER / SMTP_PASS / SMTP_SECURE — see AuthService.sendEmail). An email
 * that cannot be sent is logged and never fails the registration.
 * -----------------------------------------------------------------------------
 */

import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class RegistrationMailer {
  private readonly logger = new Logger(RegistrationMailer.name);

  /** True when it was handed to the provider. */
  async send(message: MailMessage): Promise<boolean> {
    try {
      const from = process.env.MAIL_FROM;
      if (!from) throw new Error("MAIL_FROM is not set.");

      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        });
        if (!res.ok) throw new Error(`Resend API error ${res.status}: ${await res.text().catch(() => "")}`);
        return true;
      }

      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT || 465);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      if (!host || !user || !pass || !Number.isInteger(port)) throw new Error("No RESEND_API_KEY set and SMTP configuration is incomplete.");
      const secure = String(process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")).toLowerCase() === "true";
      await nodemailer.createTransport({ host, port, secure, auth: { user, pass } }).sendMail({ from, ...message });
      return true;
    } catch (error) {
      this.logger.warn(`Event email to ${message.to} not sent: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

/* ------------------------------------------------------------------ templates */

export function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export interface MailEvent {
  title: string;
  when: string;
  where: string;
  url: string;
}

/** Simple, email-client-safe layout in the Fockis navy/blue. */
export function layout(heading: string, paragraphs: string[], ev: MailEvent | null, button?: { label: string; url: string }, footer?: string): { html: string; text: string } {
  const p = paragraphs.map((x) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1e293b">${x}</p>`).join("");
  const card = ev
    ? `<table role="presentation" width="100%" style="margin:6px 0 18px;border-collapse:collapse;background:#f1f5fb;border-radius:12px"><tr><td style="padding:16px 18px;font-size:14px;color:#0f1b3d">
         <div style="font-weight:700;font-size:16px;margin-bottom:6px">${escapeHtml(ev.title)}</div>
         <div>🗓 ${escapeHtml(ev.when)}</div><div>📍 ${escapeHtml(ev.where)}</div></td></tr></table>`
    : "";
  const btn = button
    ? `<p style="margin:8px 0 20px"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#1d6cf2;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${escapeHtml(button.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#0b1530;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border-collapse:separate">
    <tr><td style="background:linear-gradient(135deg,#0b1f4d,#1d6cf2);border-radius:16px 16px 0 0;padding:20px 24px;color:#fff;font-size:20px;font-weight:800">Fockis Events</td></tr>
    <tr><td style="padding:24px">
      <h1 style="margin:0 0 14px;font-size:22px;color:#0f1b3d">${escapeHtml(heading)}</h1>${p}${card}${btn}
      <p style="margin:18px 0 0;font-size:12px;color:#64748b">${escapeHtml(footer ?? "You received this email because you registered for an event on Fockis.")}</p>
    </td></tr></table></body></html>`;
  const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const text = [heading, "", ...paragraphs.map(strip), "", ...(ev ? [ev.title, ev.when, ev.where, ""] : []), ...(button ? [`${button.label}: ${button.url}`] : [])].join("\n");
  return { html, text };
}
