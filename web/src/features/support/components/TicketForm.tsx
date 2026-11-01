import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck, Info, Send } from "lucide-react";

import { HELP_TOPICS } from "../data/helpTopics";
import { describeDevice, supportApi, supportErrorMessage } from "../services/supportApi";
import type { SupportAttachment, SupportCategory, SupportTicket } from "../types";
import { AttachmentPicker } from "./Attachments";

const SUBJECT_MAX = 150;

const AFFECTED_FEATURES = [
  "Feed & posts",
  "Comments",
  "Stories",
  "Waves & reels",
  "Live streaming",
  "Messages & calls",
  "Notifications",
  "Profile & settings",
  "Sign in & account",
  "Marketplace",
  "Fockis Shop",
  "Payments & wallet",
  "Subscriptions",
  "Organizations & churches",
  "Events & meetings",
  "Fockis Careers",
  "Search",
  "Uploads & media",
];
const MESSAGE_MAX = 5000;

type Field = "category" | "subject" | "message" | "pageUrl";

/**
 * Shared form for Contact Support (kind "question") and Report a Problem
 * (kind "problem"). Creates a real ticket with POST /support/tickets.
 */
export default function TicketForm({
  kind,
  initialTopic,
  initialPage = "",
}: {
  kind: "question" | "problem";
  initialTopic?: string;
  initialPage?: string;
}) {
  const problem = kind === "problem";
  const validTopic = HELP_TOPICS.some((t) => t.id === initialTopic) ? (initialTopic as SupportCategory) : "";
  const [category, setCategory] = useState<SupportCategory | "">(validTopic || (problem ? "technical" : ""));
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pageUrl, setPageUrl] = useState(initialPage);
  const [includeDevice, setIncludeDevice] = useState(true);
  const [feature, setFeature] = useState("");
  const [files, setFiles] = useState<SupportAttachment[]>([]);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<SupportTicket | null>(null);
  const device = describeDevice();

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (!category) e.category = "Choose what this is about.";
    if (subject.trim().length < 3) e.subject = "Add a short subject (at least 3 characters).";
    if (message.trim().length < 10) e.message = problem ? "Describe what happened in at least 10 characters." : "Write at least 10 characters.";
    if (pageUrl.trim().length > 500) e.pageUrl = "The page address is too long.";
    return e;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      window.setTimeout(() => document.querySelector<HTMLElement>('.fk-help-form [aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const ticket = await supportApi.createTicket({
        kind,
        category: category as SupportCategory,
        subject: subject.trim(),
        message: message.trim(),
        ...(problem && pageUrl.trim() ? { pageUrl: pageUrl.trim() } : {}),
        ...(problem && feature ? { affectedFeature: feature } : {}),
        ...(files.length ? { attachments: files } : {}),
        ...(problem && includeDevice && device ? { deviceInfo: device } : {}),
      });
      setCreated(ticket);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setServerError(supportErrorMessage(error, "We couldn't send your request. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="fk-help-card">
        <div className="fk-help-state">
          <span className="fk-help-state__icon" style={{ background: "var(--help-green-soft)", color: "var(--help-green)" }}>
            <CircleCheck size={26} />
          </span>
          <h3>{problem ? "Problem reported" : "Message sent"}</h3>
          <p>
            Your request <strong>{created.number}</strong> is open. We'll notify you when the support team replies, and you can
            follow it in My Support Tickets.
          </p>
          <div className="fk-help-links" style={{ justifyContent: "center" }}>
            <Link to={`/help/tickets/${created.id}`} className="fk-help-btn fk-help-btn--primary">View request</Link>
            <Link to="/help" className="fk-help-btn fk-help-btn--secondary">Back to Help</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="fk-help-card fk-help-form" onSubmit={submit} noValidate>
      <div className="fk-help-grid2">
        <div className="fk-help-field">
          <label htmlFor="help-category">{problem ? "Where is the problem?" : "Topic"} <span className="fk-help-required">*</span></label>
          <select
            id="help-category"
            className="fk-help-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            aria-invalid={errors.category ? "true" : undefined}
          >
            <option value="">Choose a topic…</option>
            {HELP_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            <option value="other">Something else</option>
          </select>
          {errors.category && <span className="fk-help-error">{errors.category}</span>}
        </div>
        <div className="fk-help-field">
          <label htmlFor="help-subject">{problem ? "What isn't working?" : "Subject"} <span className="fk-help-required">*</span></label>
          <input
            id="help-subject"
            className="fk-help-input"
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={problem ? "e.g. Feed won't load after signing in" : "e.g. I can't change my email"}
            aria-invalid={errors.subject ? "true" : undefined}
          />
          {errors.subject && <span className="fk-help-error">{errors.subject}</span>}
        </div>
      </div>

      <div className="fk-help-field">
        <label htmlFor="help-message">{problem ? "What happened?" : "How can we help?"} <span className="fk-help-required">*</span></label>
        <textarea
          id="help-message"
          className="fk-help-textarea"
          rows={7}
          value={message}
          maxLength={MESSAGE_MAX}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={problem ? "What did you do, what did you expect, and what happened instead?" : "Tell us as much as you can."}
          aria-invalid={errors.message ? "true" : undefined}
          aria-describedby="help-message-hint"
        />
        <small id="help-message-hint">
          {message.length.toLocaleString()} / {MESSAGE_MAX.toLocaleString()} · Never share your password or full card number.
        </small>
        {errors.message && <span className="fk-help-error">{errors.message}</span>}
      </div>

      <div className="fk-help-field">
        <span className="fk-help-label">{problem ? "Screenshot or video" : "Attachments"} <span style={{ fontWeight: 500, color: "var(--help-text-3)" }}>(optional)</span></span>
        <AttachmentPicker value={files} onChange={setFiles} disabled={submitting} />
        <small>Images, videos (MP4, WebM, MOV), PDFs or text files, up to 25 MB each. Only you and Fockis Support can open them.</small>
      </div>

      {problem && (
        <>
          <div className="fk-help-field">
            <label htmlFor="help-feature">Affected feature <span style={{ fontWeight: 500, color: "var(--help-text-3)" }}>(optional)</span></label>
            <select id="help-feature" className="fk-help-select" value={feature} onChange={(e) => setFeature(e.target.value)}>
              <option value="">Not sure / something else</option>
              {AFFECTED_FEATURES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="fk-help-field">
            <label htmlFor="help-page">Page address <span style={{ fontWeight: 500, color: "var(--help-text-3)" }}>(optional)</span></label>
            <input
              id="help-page"
              className="fk-help-input"
              value={pageUrl}
              maxLength={500}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="e.g. /fockis-preview"
              aria-invalid={errors.pageUrl ? "true" : undefined}
            />
            {errors.pageUrl && <span className="fk-help-error">{errors.pageUrl}</span>}
          </div>
          <label className="fk-help-notice" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={includeDevice} onChange={(e) => setIncludeDevice(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              Include my browser and device: <strong>{device || "unknown"}</strong>. This helps us reproduce the problem.
            </span>
          </label>
        </>
      )}

      {!problem && (
        <p className="fk-help-notice">
          <Info size={16} />
          <span>Your request is linked to your Fockis account, so we know who to reply to. Replies appear in My Support Tickets.</span>
        </p>
      )}

      {serverError && (
        <p className="fk-help-notice fk-help-notice--error" role="alert">
          <CircleAlert size={16} />
          <span>{serverError}</span>
        </p>
      )}

      <div className="fk-help-form__footer">
        <Link to="/help" className="fk-help-btn fk-help-btn--ghost">Cancel</Link>
        <button type="submit" className="fk-help-btn fk-help-btn--primary" disabled={submitting}>
          <Send size={16} /> {submitting ? "Sending…" : problem ? "Send report" : "Send message"}
        </button>
      </div>
    </form>
  );
}
