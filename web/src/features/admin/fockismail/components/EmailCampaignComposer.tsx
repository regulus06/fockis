import { FormEvent, useState } from "react";
import { mailchimpApi } from "../services/mailchimpApi";

type Props = {
  audienceId: string;
  businessId?: string;
  defaultFromName?: string;
  defaultReplyTo?: string;
  onPublished?: (campaignId: string) => void;
};

export default function EmailCampaignComposer({
  audienceId,
  businessId,
  defaultFromName = "Fockis",
  defaultReplyTo = "",
  onPublished,
}: Props) {
  const [title, setTitle] = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [fromName, setFromName] = useState(defaultFromName);
  const [replyTo, setReplyTo] = useState(defaultReplyTo);
  const [html, setHtml] = useState("<h1>Hello from Fockis</h1><p>Write your message here.</p>");
  const [sendNow, setSendNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (!audienceId) throw new Error("Select a Mailchimp audience first.");
      if (!title.trim()) throw new Error("Campaign title is required.");
      if (!subjectLine.trim()) throw new Error("Subject line is required.");
      if (!fromName.trim()) throw new Error("From name is required.");
      if (!replyTo.trim()) throw new Error("Reply-to email is required.");
      if (!html.trim()) throw new Error("Email content is required.");

      const created = await mailchimpApi.createEmailCampaign({
        audienceId,
        businessId,
        title,
        subjectLine,
        previewText,
        fromName,
        replyTo,
        html,
        sendNow,
      });

      setMessage(
        created.sent
          ? `Campaign ${created.campaignId} was created and sent.`
          : `Campaign ${created.campaignId} was created.`,
      );
      onPublished?.(created.campaignId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create campaign.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="fockis-mailchimp-composer" onSubmit={submit}>
      <div>
        <label>Campaign name</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekend promotion" />
      </div>

      <div>
        <label>Subject</label>
        <input value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} placeholder="20% off this weekend" />
      </div>

      <div>
        <label>Preview text</label>
        <input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="A short inbox preview" />
      </div>

      <div className="fockis-mailchimp-composer__two">
        <div>
          <label>From name</label>
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </div>
        <div>
          <label>Reply-to email</label>
          <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
        </div>
      </div>

      <div>
        <label>Email HTML</label>
        <textarea
          rows={14}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          spellCheck={false}
        />
      </div>

      <label className="fockis-mailchimp-checkbox">
        <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} />
        Send immediately after the campaign passes Mailchimp's send checks
      </label>

      <button disabled={busy} type="submit">
        {busy ? "Publishing…" : sendNow ? "Publish & Send" : "Create Campaign"}
      </button>

      {message && <p className="fockis-mailchimp-message">{message}</p>}
    </form>
  );
}
