import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, CircleAlert, CircleCheck, Lightbulb, MessageSquareText, Send } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { AttachmentList, AttachmentPicker } from "../components/Attachments";
import { HelpEmpty, HelpError, HelpLoading, SignedInOnly } from "../components/HelpStates";
import { useHelpQuery } from "../hooks/useHelpQuery";
import { supportApi, supportErrorMessage } from "../services/supportApi";
import type { Feedback, FeedbackCategory, SupportAttachment } from "../types";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_TONES,
  formatDateTime,
  timeAgo,
} from "../utils/helpFormat";

const CATEGORIES = Object.entries(FEEDBACK_CATEGORY_LABELS) as [FeedbackCategory, string][];
const STEPS: Feedback["status"][] = ["new", "under_review", "planned", "implemented"];

function FeedbackForm({ onSent }: { onSent: (f: Feedback) => void }) {
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<SupportAttachment[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const e: Record<string, string> = {};
    if (!category) e.category = "Choose a category.";
    if (subject.trim().length < 3) e.subject = "Add a short subject (at least 3 characters).";
    if (description.trim().length < 10) e.description = "Describe your feedback in at least 10 characters.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setServerError(null);
    try {
      onSent(await supportApi.sendFeedback({ category: category as FeedbackCategory, subject: subject.trim(), description: description.trim(), attachments: files }));
      setCategory("");
      setSubject("");
      setDescription("");
      setFiles([]);
    } catch (error) {
      setServerError(supportErrorMessage(error, "We couldn't send your feedback. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="fk-help-card fk-help-form" onSubmit={submit} noValidate>
      <h2 className="fk-help-section-title">Share your feedback</h2>
      <div className="fk-help-grid2">
        <div className="fk-help-field">
          <label htmlFor="fb-category">Category <span className="fk-help-required">*</span></label>
          <select id="fb-category" className="fk-help-select" value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)} aria-invalid={errors.category ? "true" : undefined}>
            <option value="">Choose a category…</option>
            {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {errors.category && <span className="fk-help-error">{errors.category}</span>}
        </div>
        <div className="fk-help-field">
          <label htmlFor="fb-subject">Subject <span className="fk-help-required">*</span></label>
          <input id="fb-subject" className="fk-help-input" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Add a dark mode for the feed" aria-invalid={errors.subject ? "true" : undefined} />
          {errors.subject && <span className="fk-help-error">{errors.subject}</span>}
        </div>
      </div>
      <div className="fk-help-field">
        <label htmlFor="fb-description">Description <span className="fk-help-required">*</span></label>
        <textarea id="fb-description" className="fk-help-textarea" rows={6} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What would make Fockis better for you?" aria-invalid={errors.description ? "true" : undefined} />
        <small>{description.length.toLocaleString()} / 5,000</small>
        {errors.description && <span className="fk-help-error">{errors.description}</span>}
      </div>
      <div className="fk-help-field">
        <span className="fk-help-label">Attachments <span style={{ fontWeight: 500, color: "var(--help-text-3)" }}>(optional)</span></span>
        <AttachmentPicker value={files} onChange={setFiles} disabled={busy} />
      </div>
      {serverError && (
        <p className="fk-help-notice fk-help-notice--error" role="alert"><CircleAlert size={16} /><span>{serverError}</span></p>
      )}
      <div className="fk-help-form__footer">
        <button type="submit" className="fk-help-btn fk-help-btn--primary" disabled={busy}>
          <Send size={16} /> {busy ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </form>
  );
}

function FeedbackList() {
  const [sent, setSent] = useState<Feedback | null>(null);
  const list = useHelpQuery(() => supportApi.myFeedback(), []);

  return (
    <div className="fk-help-two">
      <div className="fk-help-stack">
        {sent && (
          <p className="fk-help-notice fk-help-notice--success" role="status">
            <CircleCheck size={16} />
            <span>
              Thanks! Your feedback <strong>{sent.number}</strong> was sent. You'll see its status and any reply from the team below.
            </span>
          </p>
        )}
        <FeedbackForm
          onSent={(f) => {
            setSent(f);
            list.setData((current) => (current ? { ...current, items: [f, ...current.items], total: current.total + 1 } : current));
          }}
        />
      </div>
      <div className="fk-help-card">
        <h2 className="fk-help-section-title">My feedback</h2>
        {list.loading && !list.data ? (
          <HelpLoading label="Loading your feedback…" />
        ) : list.error ? (
          <HelpError message={list.error} onRetry={list.refetch} />
        ) : !list.data?.items.length ? (
          <HelpEmpty icon={<Lightbulb size={22} />} title="No feedback yet" text="Ideas and suggestions you send appear here with their status." />
        ) : (
          <ul className="fk-help-rows">
            {list.data.items.map((f) => (
              <li key={f.id}>
                <Link to={`/help/feedback/${f.id}`} className="fk-help-row">
                  <span className="fk-help-row__main">
                    <span className="fk-help-row__title" style={{ fontSize: 14.5 }}>
                      {f.unread && <span className="fk-help-count" style={{ marginLeft: 0, marginRight: 6 }}>New</span>}
                      {f.subject}
                    </span>
                    <span className="fk-help-row__sub">{f.number} · {FEEDBACK_CATEGORY_LABELS[f.category]} · {timeAgo(f.updatedAt)}</span>
                  </span>
                  <span className={`fk-help-pill fk-help-pill--${FEEDBACK_STATUS_TONES[f.status]}`}>{FEEDBACK_STATUS_LABELS[f.status]}</span>
                  <ChevronRight className="fk-help-chevron" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** /help/feedback — send feedback and follow its status. */
export function FeedbackPage() {
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title="Feedback"
          description="Ideas, feature requests, bug reports, design suggestions or performance complaints — the Fockis team reads every one."
          icon={<Lightbulb size={30} />}
          tone="amber"
        />
        <SignedInOnly what="send feedback">{() => <FeedbackList />}</SignedInOnly>
      </div>
    </HelpShell>
  );
}

function FeedbackDetail({ id }: { id: string }) {
  const item = useHelpQuery(() => supportApi.feedback(id), [id]);
  if (item.loading && !item.data) return <div className="fk-help-card"><HelpLoading label="Loading feedback…" /></div>;
  if (item.error || !item.data) return <div className="fk-help-card"><HelpError message={item.error ?? "Feedback not found."} onRetry={item.refetch} /></div>;
  const f = item.data;
  const reached = f.status === "rejected" ? -1 : STEPS.indexOf(f.status);

  return (
    <div className="fk-help-two">
      <div className="fk-help-stack">
        <div className="fk-help-card">
          <h2 className="fk-help-section-title" style={{ fontSize: 19 }}>{f.subject}</h2>
          <p style={{ whiteSpace: "pre-wrap", color: "var(--help-text-2)", lineHeight: 1.6 }}>{f.description}</p>
          {f.attachments.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <AttachmentList files={f.attachments} resolve={(key) => supportApi.feedbackFile(f.id, key)} />
            </div>
          )}
        </div>
        <div className="fk-help-card">
          <h2 className="fk-help-section-title">Responses from Fockis</h2>
          {f.responses.length === 0 ? (
            <p style={{ color: "var(--help-text-2)" }}>No response yet. We'll notify you when the team replies.</p>
          ) : (
            <div className="fk-help-thread">
              {f.responses.map((r) => (
                <div key={r.id} className="fk-help-msg fk-help-msg--agent">
                  <div className="fk-help-msg__bubble">{r.body}</div>
                  <span className="fk-help-msg__meta">Fockis team · {formatDateTime(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="fk-help-card">
        <h2 className="fk-help-section-title">Status</h2>
        <span className={`fk-help-pill fk-help-pill--${FEEDBACK_STATUS_TONES[f.status]} fk-help-pill--lg`}>{FEEDBACK_STATUS_LABELS[f.status]}</span>
        {f.status !== "rejected" && (
          <ol className="fk-help-steps" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s} className={i <= reached ? "is-done" : ""}>{FEEDBACK_STATUS_LABELS[s]}</li>
            ))}
          </ol>
        )}
        <dl className="fk-help-dl" style={{ marginTop: 16 }}>
          <dt>Reference</dt><dd>{f.number}</dd>
          <dt>Category</dt><dd>{FEEDBACK_CATEGORY_LABELS[f.category]}</dd>
          <dt>Sent</dt><dd>{formatDateTime(f.createdAt)}</dd>
          {f.statusHistory.length > 1 && (<><dt>Updated</dt><dd>{formatDateTime(f.statusHistory[f.statusHistory.length - 1].at)}</dd></>)}
        </dl>
      </div>
    </div>
  );
}

/** /help/feedback/:feedbackId */
export function FeedbackDetailPage() {
  const { feedbackId = "" } = useParams<{ feedbackId: string }>();
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader title="Your feedback" crumbs={[{ label: "Feedback", to: "/help/feedback" }]} icon={<MessageSquareText size={28} />} tone="amber" />
        <SignedInOnly what="see your feedback">{() => <FeedbackDetail id={feedbackId} />}</SignedInOnly>
      </div>
    </HelpShell>
  );
}
