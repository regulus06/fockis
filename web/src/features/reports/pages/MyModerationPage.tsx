import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, Flag, Loader2, Scale, ShieldAlert, ShieldCheck } from "lucide-react";

import {
  CONSEQUENCE_LABELS,
  type ModerationDecision,
  type MyReport,
} from "../reportTypes";
import { getMyDecisions, getMyReports, reportErrorMessage, submitAppeal } from "../services/reportsApi";

import "../styles/MyModerationPage.scss";

const APPEAL_MIN = 10;
const APPEAL_MAX = 2000;

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function appealBadge(decision: ModerationDecision) {
  if (decision.reversed) return { label: "Reversed", tone: "success" };

  switch (decision.appeal.status) {
    case "pending":
      return { label: "Appeal in review", tone: "info" };
    case "upheld":
      return { label: "Appeal reviewed — decision stands", tone: "neutral" };
    case "overturned":
      return { label: "Appeal accepted", tone: "success" };
    default:
      return { label: "Decision in effect", tone: "warning" };
  }
}

function DecisionCard({ decision, onAppealed }: { decision: ModerationDecision; onAppealed: (next: ModerationDecision) => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const badge = appealBadge(decision);
  const trimmed = message.trim();

  async function send() {
    if (trimmed.length < APPEAL_MIN || sending) return;

    setSending(true);
    setError("");

    try {
      const result = await submitAppeal(decision.caseId, trimmed);
      onAppealed(result.decision);
      setOpen(false);
    } catch (caught) {
      setError(reportErrorMessage(caught, "We couldn't send your appeal. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="fkm-card">
      <header className="fkm-card__head">
        <span className={`fkm-card__icon${decision.reversed ? " is-ok" : ""}`} aria-hidden="true">
          {decision.reversed ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
        </span>
        <div className="fkm-card__title">
          <h3>{decision.targetType === "post" ? "Post decision" : "Account decision"}</h3>
          <p>
            {decision.ruleLabel || "Community Guidelines"} · {formatDate(decision.decidedAt)}
          </p>
        </div>
        <span className={`fkm-badge fkm-badge--${badge.tone}`}>{badge.label}</span>
      </header>

      <div className="fkm-card__body">
        <div className="fkm-chips">
          {decision.consequences.map((item) => (
            <span key={item} className="fkm-chip">
              {CONSEQUENCE_LABELS[item] ?? item}
            </span>
          ))}
          {decision.restrictionUntil && !decision.reversed && (
            <span className="fkm-chip fkm-chip--time">
              <Clock3 size={13} aria-hidden="true" /> Until {formatDate(decision.restrictionUntil)}
            </span>
          )}
        </div>

        {decision.contentPreview && <blockquote className="fkm-quote">{decision.contentPreview}</blockquote>}

        {decision.message && <p className="fkm-text">{decision.message}</p>}

        {decision.appeal.status !== "none" && (
          <div className="fkm-appeal-state">
            <p>
              <strong>Your appeal</strong> · sent {formatDate(decision.appeal.submittedAt)}
            </p>
            {decision.appeal.outcomeNote && <p className="fkm-text">{decision.appeal.outcomeNote}</p>}
          </div>
        )}

        {decision.canAppeal && !open && (
          <button type="button" className="fkm-btn fkm-btn--ghost" onClick={() => setOpen(true)}>
            <Scale size={16} aria-hidden="true" /> Appeal this decision
          </button>
        )}

        {open && (
          <div className="fkm-appeal">
            <label className="fkm-field">
              <span>Why should we look at this again?</span>
              <textarea
                value={message}
                rows={4}
                maxLength={APPEAL_MAX}
                placeholder="Explain the context. A different moderator will review it."
                onChange={(event) => setMessage(event.target.value)}
              />
              <small>
                {trimmed.length < APPEAL_MIN ? `At least ${APPEAL_MIN} characters` : ""}
                <span>
                  {message.length}/{APPEAL_MAX}
                </span>
              </small>
            </label>
            {error && (
              <div className="fkm-alert" role="alert">
                {error}
              </div>
            )}
            <div className="fkm-actions">
              <button type="button" className="fkm-btn fkm-btn--ghost" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </button>
              <button type="button" className="fkm-btn fkm-btn--primary" onClick={() => void send()} disabled={sending || trimmed.length < APPEAL_MIN}>
                {sending ? <Loader2 size={16} className="fkm-spin" aria-hidden="true" /> : null}
                Send appeal
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/** "Moderation" page for signed-in users: decisions about them, appeals, and reports they sent. */
export default function MyModerationPage() {
  const [decisions, setDecisions] = useState<ModerationDecision[]>([]);
  const [reports, setReports] = useState<MyReport[]>([]);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsMore, setReportsMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [decisionResult, reportResult] = await Promise.all([getMyDecisions(), getMyReports(1)]);
      setDecisions(decisionResult.items ?? []);
      setReports(reportResult.items ?? []);
      setReportsMore(Boolean(reportResult.hasMore));
      setReportsPage(1);
    } catch (caught) {
      setError(reportErrorMessage(caught, "We couldn't load your moderation center."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);

    try {
      const next = await getMyReports(reportsPage + 1);
      setReports((current) => [...current, ...(next.items ?? [])]);
      setReportsMore(Boolean(next.hasMore));
      setReportsPage((page) => page + 1);
    } catch (caught) {
      setError(reportErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="fkm-page">
      <div className="fkm-page__inner">
        <Link to="/" className="fkm-back">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Fockis
        </Link>

        <header className="fkm-hero">
          <span className="fkm-hero__icon" aria-hidden="true">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h1>Moderation center</h1>
            <p>Decisions about your account and content, and the reports you've sent.</p>
          </div>
        </header>

        {loading && (
          <div className="fkm-state" role="status">
            <Loader2 size={20} className="fkm-spin" aria-hidden="true" /> Loading…
          </div>
        )}

        {!loading && error && (
          <div className="fkm-state fkm-state--error" role="alert">
            <p>{error}</p>
            <button type="button" className="fkm-btn fkm-btn--primary" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="fkm-section" aria-labelledby="fkm-decisions">
              <h2 id="fkm-decisions">Decisions about you</h2>

              {decisions.length === 0 ? (
                <div className="fkm-empty">
                  <CheckCircle2 size={22} aria-hidden="true" />
                  <p>Your account is in good standing. There are no moderation decisions about you.</p>
                </div>
              ) : (
                <div className="fkm-list">
                  {decisions.map((decision) => (
                    <DecisionCard
                      key={decision.caseId}
                      decision={decision}
                      onAppealed={(next) =>
                        setDecisions((current) => current.map((item) => (item.caseId === next.caseId ? next : item)))
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="fkm-section" aria-labelledby="fkm-reports">
              <h2 id="fkm-reports">Reports you sent</h2>

              {reports.length === 0 ? (
                <div className="fkm-empty">
                  <Flag size={20} aria-hidden="true" />
                  <p>You haven't reported anything. Use “Report” in a post or profile menu if something breaks the rules.</p>
                </div>
              ) : (
                <ul className="fkm-reports">
                  {reports.map((report) => (
                    <li key={report.id}>
                      <div>
                        <strong>{report.targetLabel}</strong>
                        <span>
                          {report.reasonLabel} · {formatDate(report.createdAt)}
                        </span>
                      </div>
                      <span className={`fkm-badge fkm-badge--${report.status === "reviewed" ? "success" : "info"}`}>
                        {report.status === "reviewed" ? "Reviewed" : "Received"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {reportsMore && (
                <button type="button" className="fkm-btn fkm-btn--ghost fkm-more" onClick={() => void loadMore()} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Show more"}
                </button>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
