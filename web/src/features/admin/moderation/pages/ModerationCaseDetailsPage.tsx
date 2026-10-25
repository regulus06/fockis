import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldAlert, UserRound } from "lucide-react";

import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminErrorState, AdminLoadingState } from "../../components/AdminStates";
import { AdminModal } from "../../components/AdminConfirmModal";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminSessionStore } from "../../store/adminSessionStore";
import { buildMediaUrl } from "../../../../utils/fockisFeedHelpers";
import { moderationApi, moderationError } from "../moderationApi";
import {
  ACTION_LABELS,
  CONSEQUENCE_OPTIONS,
  REASON_OPTIONS,
  type CaseActionName,
  type CaseDetails,
  type Consequence,
  type StaffPerson,
} from "../moderationTypes";
import {
  AppealBadge,
  CaseStatusBadge,
  ModerationTabs,
  PersonCell,
  PriorityBadge,
  formatDateTime,
  formatRelative,
} from "../components/ModerationParts";

const P = PERMISSIONS;
const OPEN = new Set(["pending", "under_review", "action_required", "escalated"]);
const CONSEQUENCE_PERMISSION: Record<Consequence, string> = {
  remove_post: P.MODERATION_CONTENT_REMOVE,
  warn: P.MODERATION_WARN,
  restrict_posting: P.MODERATION_RESTRICT,
  suspend_temporary: P.MODERATION_SUSPEND,
  suspend_permanent: P.MODERATION_SUSPEND,
};

type ModalKind = null | "dismiss" | "violation" | "restore" | "appeal" | "simple";

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);
}

/* ==========================================================================
   EVIDENCE
========================================================================== */

function Evidence({ detail }: { detail: CaseDetails }) {
  const snap = detail.targetSnapshot ?? {};
  const current = detail.currentTarget ?? {};

  if (detail.targetType === "post") {
    const mediaRaw = text(snap.media).split(",")[0]?.trim() ?? "";
    const media = mediaRaw ? buildMediaUrl(mediaRaw) : "";
    const removed = current.moderationStatus === "removed";
    const deleted = current.exists === false;

    return (
      <section className="fk-panel">
        <div className="fk-panel__header">
          <h2>Reported post</h2>
          <span className="fkmod-badges">
            {deleted && <span className="fk-badge fk-badge--neutral">Deleted by author</span>}
            {removed && <span className="fk-badge fk-badge--danger">Removed by moderation</span>}
            {!deleted && !removed && <span className="fk-badge fk-badge--success">Live</span>}
            <span className="fk-badge fk-badge--neutral">{text(snap.audience) || "public"}</span>
          </span>
        </div>
        <div className="fk-panel__body fkmod-evidence">
          <p className="fkmod-evidence__meta">
            By <strong>@{text(snap.authorUsername) || detail.reportedUser.username}</strong> · posted {formatDateTime(text(snap.postCreatedAt) || null)} · captured{" "}
            {formatDateTime(text(snap.capturedAt) || null)}
          </p>
          {text(snap.content) ? <blockquote className="fkmod-quote">{text(snap.content)}</blockquote> : <p className="fk-muted">No text.</p>}
          {media &&
            (isVideo(media) ? (
              <video className="fkmod-media" src={media} controls preload="metadata" />
            ) : (
              <img className="fkmod-media" src={media} alt="Reported post media" loading="lazy" />
            ))}
          {!deleted && text(current.content) !== text(snap.content) && text(current.content) && (
            <div className="fkmod-callout">
              <strong>Edited since it was reported.</strong> Current text:
              <blockquote className="fkmod-quote">{text(current.content)}</blockquote>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="fk-panel">
      <div className="fk-panel__header">
        <h2>Reported account</h2>
        <span className="fkmod-badges">
          {current.exists === false && <span className="fk-badge fk-badge--neutral">Deleted</span>}
          {current.isActive === false && <span className="fk-badge fk-badge--danger">Deactivated</span>}
          {Boolean(current.lockedUntil) && new Date(text(current.lockedUntil)) > new Date() && (
            <span className="fk-badge fk-badge--warning">Suspended until {formatDateTime(text(current.lockedUntil))}</span>
          )}
          {current.verified === true && <span className="fk-badge fk-badge--info">Verified</span>}
        </span>
      </div>
      <div className="fk-panel__body fkmod-evidence">
        <PersonCell person={detail.reportedUser} />
        <dl className="fkmod-dl">
          <div>
            <dt>Name at report time</dt>
            <dd>{text(snap.name) || "—"}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{formatDateTime(text(snap.accountCreatedAt) || null)}</dd>
          </div>
        </dl>
        {text(snap.bio) && <blockquote className="fkmod-quote">{text(snap.bio)}</blockquote>}
        <Link className="fk-panel__link" to={`/profile/${detail.reportedUser.id}`} target="_blank" rel="noreferrer">
          Open profile in a new tab
        </Link>
      </div>
    </section>
  );
}

/* ==========================================================================
   PAGE
========================================================================== */

export default function ModerationCaseDetailsPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const { can } = useAdminAccess();
  const currentAdmin = useAdminSessionStore((state) => state.currentAdmin);
  const myId = String((currentAdmin as { id?: string } | null)?.id ?? "");

  const [detail, setDetail] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [staff, setStaff] = useState<StaffPerson[]>([]);
  const [note, setNote] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [simpleAction, setSimpleAction] = useState<CaseActionName>("start_review");

  // Shared modal form state
  const [reason, setReason] = useState("");
  const [rule, setRule] = useState("");
  const [consequences, setConsequences] = useState<Consequence[]>([]);
  const [durationDays, setDurationDays] = useState("7");
  const [userMessage, setUserMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [appealOutcome, setAppealOutcome] = useState<"upheld" | "overturned">("upheld");
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setDetail(await moderationApi.details(caseId));
    } catch (caught) {
      setError(moderationError(caught, "Couldn't load this case."));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!can([P.MODERATION_ASSIGN])) return;
    moderationApi
      .staff()
      .then((result) => setStaff(result.items ?? []))
      .catch(() => setStaff([]));
  }, [can]);

  const isOpen = detail ? OPEN.has(detail.status) : false;
  const isMine = Boolean(detail && myId && detail.reportedUser.id === myId);
  const canReview = can([P.MODERATION_REVIEW]) && !isMine;
  const canResolve = can([P.MODERATION_RESOLVE]) && !isMine;
  const canRestore = can([P.MODERATION_RESTORE]) && !isMine;
  const canAppeals = can([P.MODERATION_APPEALS]) && !isMine;

  const allowedConsequences = useMemo(
    () =>
      CONSEQUENCE_OPTIONS.filter(
        (option) => (!option.postOnly || detail?.targetType === "post") && can([CONSEQUENCE_PERMISSION[option.value]]),
      ),
    [can, detail?.targetType],
  );

  const needsDuration = consequences.some((item) => item === "restrict_posting" || item === "suspend_temporary");
  const highImpact = consequences.some((item) => item !== "warn");

  function resetModal(kind: ModalKind) {
    setReason("");
    setRule(detail?.topReason ?? "");
    setConsequences([]);
    setDurationDays("7");
    setUserMessage("");
    setConfirmed(false);
    setAppealOutcome("upheld");
    setModalError("");
    setModal(kind);
  }

  async function run(work: () => Promise<CaseDetails>, success: string): Promise<boolean> {
    setBusy(true);
    setModalError("");

    try {
      const next = await work();
      setDetail(next);
      setNotice({ tone: "success", message: success });
      setModal(null);
      return true;
    } catch (caught) {
      const message = moderationError(caught);
      if (modal) setModalError(message);
      else setNotice({ tone: "error", message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function toggleConsequence(value: Consequence) {
    setConsequences((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      // Temporary and permanent suspension are mutually exclusive.
      const withoutClash = current.filter((item) =>
        value === "suspend_permanent" ? item !== "suspend_temporary" : value === "suspend_temporary" ? item !== "suspend_permanent" : true,
      );
      return [...withoutClash, value];
    });
  }

  function submitModal(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;

    if (modal === "dismiss") {
      if (!reason.trim()) return setModalError("Record why the reports are being dismissed.");
      void run(() => moderationApi.act(detail.id, { action: "dismiss", reason: reason.trim() }), "Reports dismissed. No action was taken against the user.");
    }

    if (modal === "violation") {
      if (!consequences.length) return setModalError("Choose at least one action.");
      if (!reason.trim()) return setModalError("Record why the violation was confirmed.");
      if (needsDuration && !(Number(durationDays) >= 1)) return setModalError("Choose how many days the restriction lasts.");
      if (highImpact && !confirmed) return setModalError("Tick the confirmation box to continue.");

      void run(
        () =>
          moderationApi.act(detail.id, {
            action: "confirm_violation",
            consequences,
            rule: rule || undefined,
            reason: reason.trim(),
            durationDays: needsDuration ? Number(durationDays) : undefined,
            userMessage: userMessage.trim() || undefined,
            confirm: highImpact ? true : undefined,
          }),
        "Violation confirmed and actions applied. The user has been notified.",
      );
    }

    if (modal === "restore") {
      if (!reason.trim()) return setModalError("Record why the decision is being reversed.");
      void run(() => moderationApi.act(detail.id, { action: "restore", reason: reason.trim() }), "Decision reversed. Content and account access were restored.");
    }

    if (modal === "appeal") {
      if (reason.trim().length < 3) return setModalError("Record the reason for your decision.");
      if (appealOutcome === "overturned" && !confirmed) return setModalError("Tick the confirmation box to continue.");
      void run(
        () => moderationApi.decideAppeal(detail.id, { outcome: appealOutcome, note: reason.trim(), confirm: appealOutcome === "overturned" ? true : undefined }),
        appealOutcome === "overturned" ? "Appeal accepted and the decision reversed." : "Appeal reviewed. The decision stands.",
      );
    }

    if (modal === "simple") {
      void run(
        () => moderationApi.act(detail.id, { action: simpleAction, reason: reason.trim() || undefined }),
        simpleAction === "escalate" ? "Case escalated." : simpleAction === "start_review" ? "Review started." : "Marked as action required.",
      );
    }
  }

  if (loading && !detail) {
    return (
      <div className="fk-page fkmod">
        <AdminLoadingState label="Loading case…" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="fk-page fkmod">
        <Link className="fkmod-back" to="/admin/moderation/cases">
          <ArrowLeft size={16} aria-hidden="true" /> Back to queue
        </Link>
        <AdminErrorState message={error || "Case not found."} onRetry={() => void load()} />
      </div>
    );
  }

  const reasons = Object.entries(detail.reasonCounts ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="fk-page fkmod">
      <Link className="fkmod-back" to="/admin/moderation/cases">
        <ArrowLeft size={16} aria-hidden="true" /> Back to queue
      </Link>

      <AdminPageHeader
        title={detail.targetType === "post" ? "Post case" : "Account case"}
        description={`Case ${detail.id} · opened ${formatDateTime(detail.firstReportAt)}`}
        actions={
          <span className="fkmod-badges">
            <PriorityBadge priority={detail.priority} />
            <CaseStatusBadge status={detail.status} />
            <AppealBadge status={detail.appealStatus} />
          </span>
        }
      />

      <ModerationTabs />

      {notice && (
        <div className={`fkmod-notice fkmod-notice--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
          <span>{notice.message}</span>
          <button type="button" className="fk-btn fk-btn--sm" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {isMine && (
        <div className="fkmod-notice fkmod-notice--error" role="note">
          This case is about your own account or content. Another moderator must handle it.
        </div>
      )}

      <div className="fkmod-layout">
        {/* ============================== MAIN ============================== */}
        <div className="fkmod-main">
          <Evidence detail={detail} />

          <section className="fk-panel">
            <div className="fk-panel__header">
              <h2>Reports ({detail.reports.length})</h2>
              <span className="fk-muted">{detail.eligibleReporterCount} counted toward thresholds</span>
            </div>
            <div className="fk-panel__body">
              <ul className="fkmod-reports">
                {detail.reports.map((report) => (
                  <li key={report.id} className={report.eligible ? "" : "is-invalid"}>
                    <div className="fkmod-reports__head">
                      <PersonCell person={report.reporter} fallback="Deleted user" />
                      <span className="fk-badge fk-badge--info">{report.reasonLabel}</span>
                      {!report.eligible && <span className="fk-badge fk-badge--neutral">Not counted</span>}
                      <span className="fk-muted fkmod-reports__when">{formatRelative(report.createdAt)}</span>
                    </div>
                    {report.description && <p className="fkmod-reports__text">{report.description}</p>}
                    {canReview && (
                      <button
                        type="button"
                        className="fk-btn fk-btn--sm"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => moderationApi.setReportEligibility(report.id, !report.eligible),
                            report.eligible ? "Report marked invalid; it no longer counts." : "Report counts again.",
                          )
                        }
                      >
                        {report.eligible ? "Mark invalid" : "Count again"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="fk-muted fkmod-small">Reporter identities are visible to moderators only and are never shared with the reported user.</p>
            </div>
          </section>

          <section className="fk-panel">
            <div className="fk-panel__header">
              <h2>Internal notes</h2>
              <span className="fk-muted">Never shown to users</span>
            </div>
            <div className="fk-panel__body">
              {detail.notes.length === 0 && <p className="fk-muted">No notes yet.</p>}
              <ul className="fkmod-notes">
                {detail.notes.map((item) => (
                  <li key={item.id}>
                    <div className="fkmod-notes__head">
                      <PersonCell person={item.author} />
                      <span className="fk-muted">{formatDateTime(item.at)}</span>
                    </div>
                    <p>{item.body}</p>
                  </li>
                ))}
              </ul>
              {canReview && (
                <form
                  className="fkmod-note-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!note.trim()) return;
                    void run(() => moderationApi.addNote(detail.id, note.trim()), "Note added.").then((ok) => ok && setNote(""));
                  }}
                >
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} placeholder="Add context for other moderators…" aria-label="New note" />
                  <button type="submit" className="fk-btn fk-btn--primary fk-btn--sm" disabled={busy || !note.trim()}>
                    Add note
                  </button>
                </form>
              )}
            </div>
          </section>

          <section className="fk-panel">
            <div className="fk-panel__header">
              <h2>Audit history</h2>
            </div>
            <div className="fk-panel__body">
              {detail.history.length === 0 ? (
                <p className="fk-muted">No history yet.</p>
              ) : (
                <ol className="fkmod-timeline">
                  {detail.history.map((entry, index) => (
                    <li key={`${entry.at}-${index}`}>
                      <span className="fkmod-timeline__dot" aria-hidden="true" />
                      <div>
                        <strong>{ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ")}</strong>
                        <span className="fk-muted">
                          {" "}
                          · {entry.actor ? entry.actor.name || `@${entry.actor.username}` : entry.actorId === detail.reportedUser.id ? "Account owner" : "System"} ·{" "}
                          {formatDateTime(entry.at)}
                        </span>
                        {entry.reason && <p>{entry.reason}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>

        {/* ============================== SIDE ============================== */}
        <aside className="fkmod-side">
          <section className="fk-panel fk-card fkmod-summary">
            <h3>Summary</h3>
            <dl className="fkmod-dl">
              <div>
                <dt>Reported user</dt>
                <dd>
                  <PersonCell person={detail.reportedUser} />
                </dd>
              </div>
              <div>
                <dt>Unique reporters</dt>
                <dd>
                  <strong className="fkmod-big">{detail.eligibleReporterCount}</strong>
                  <span className="fk-muted"> of {detail.totalReportCount} reports</span>
                </dd>
              </div>
              <div>
                <dt>Latest report</dt>
                <dd>{formatDateTime(detail.latestReportAt)}</dd>
              </div>
            </dl>
            <ul className="fkmod-reasons">
              {reasons.map(([key, count]) => (
                <li key={key}>
                  <span>{REASON_OPTIONS.find((option) => option.value === key)?.label ?? key}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          </section>

          {can([P.MODERATION_ASSIGN]) && (
            <section className="fk-panel fk-card">
              <h3>Assignment</h3>
              <div className="fkmod-assign">
                <select
                  className="fk-select"
                  value={detail.assignedTo?.id ?? ""}
                  disabled={busy}
                  onChange={(event) => void run(() => moderationApi.assign(detail.id, event.target.value || null), "Assignment updated.")}
                  aria-label="Assign to"
                >
                  <option value="">Unassigned</option>
                  {detail.assignedTo && !staff.some((person) => person.id === detail.assignedTo?.id) && (
                    <option value={detail.assignedTo.id}>{detail.assignedTo.name}</option>
                  )}
                  {staff
                    .filter((person) => person.id !== detail.reportedUser.id)
                    .map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name || person.username} ({person.role.replace(/_/g, " ")})
                      </option>
                    ))}
                </select>
                {myId && detail.assignedTo?.id !== myId && !isMine && (
                  <button type="button" className="fk-btn fk-btn--sm" disabled={busy} onClick={() => void run(() => moderationApi.assign(detail.id, myId), "Assigned to you.")}>
                    Assign to me
                  </button>
                )}
              </div>
            </section>
          )}

          {isOpen && (canReview || canResolve) && (
            <section className="fk-panel fk-card">
              <h3>Actions</h3>
              <div className="fkmod-actions">
                {canReview && detail.status !== "under_review" && (
                  <button type="button" className="fk-btn fk-btn--navy" disabled={busy} onClick={() => { setSimpleAction("start_review"); resetModal("simple"); }}>
                    Start review
                  </button>
                )}
                {canReview && detail.status !== "action_required" && (
                  <button type="button" className="fk-btn" disabled={busy} onClick={() => { setSimpleAction("request_review"); resetModal("simple"); }}>
                    Mark action required
                  </button>
                )}
                {canReview && detail.status !== "escalated" && (
                  <button type="button" className="fk-btn" disabled={busy} onClick={() => { setSimpleAction("escalate"); resetModal("simple"); }}>
                    Escalate
                  </button>
                )}
                {canResolve && (
                  <>
                    <button type="button" className="fk-btn" disabled={busy} onClick={() => resetModal("dismiss")}>
                      Dismiss reports
                    </button>
                    <button type="button" className="fk-btn fk-btn--danger" disabled={busy || allowedConsequences.length === 0} onClick={() => resetModal("violation")}>
                      <ShieldAlert size={16} aria-hidden="true" /> Confirm violation
                    </button>
                  </>
                )}
              </div>
              <p className="fk-muted fkmod-small">Reaching a report threshold only flags a case. Consequences are applied only when a moderator confirms a violation.</p>
            </section>
          )}

          {detail.decision && (
            <section className="fk-panel fk-card">
              <h3>Decision</h3>
              <p>
                <strong>{detail.decision.outcome === "violation" ? `Violation — ${detail.decision.ruleLabel}` : "No violation"}</strong>
              </p>
              {detail.decision.consequences.length > 0 && (
                <div className="fkmod-badges fkmod-badges--wrap">
                  {detail.decision.consequences.map((item) => (
                    <span key={item} className="fk-badge fk-badge--warning">
                      {CONSEQUENCE_OPTIONS.find((option) => option.value === item)?.label ?? item}
                    </span>
                  ))}
                </div>
              )}
              {detail.decision.restrictionUntil && <p className="fk-muted">Until {formatDateTime(detail.decision.restrictionUntil)}</p>}
              <p className="fkmod-small">{detail.decision.reason}</p>
              <p className="fk-muted fkmod-small">
                By {detail.decision.decidedByUser?.name ?? "a moderator"} · {formatDateTime(detail.decision.decidedAt)}
              </p>
              {detail.decision.reversedAt && (
                <div className="fkmod-callout">
                  <strong>Reversed</strong> {formatDateTime(detail.decision.reversedAt)}
                  {detail.decision.reversalReason ? ` — ${detail.decision.reversalReason}` : ""}
                </div>
              )}
              {detail.decision.outcome === "violation" && !detail.decision.reversedAt && canRestore && detail.appealStatus !== "pending" && (
                <button type="button" className="fk-btn fk-btn--sm" disabled={busy} onClick={() => resetModal("restore")}>
                  Reverse decision & restore
                </button>
              )}
            </section>
          )}

          {detail.appeal && (
            <section className="fk-panel fk-card">
              <h3>Appeal</h3>
              <p className="fk-muted fkmod-small">Submitted {formatDateTime(detail.appeal.submittedAt)}</p>
              <blockquote className="fkmod-quote">{detail.appeal.message}</blockquote>
              {detail.appeal.outcomeNote && <p className="fkmod-small">{detail.appeal.outcomeNote}</p>}
              {detail.appealStatus === "pending" && canAppeals && (
                <button type="button" className="fk-btn fk-btn--primary fk-btn--sm" disabled={busy} onClick={() => resetModal("appeal")}>
                  Review appeal
                </button>
              )}
            </section>
          )}

          {(detail.previousDecisions.length > 0 || detail.activeRestrictions.length > 0) && (
            <section className="fk-panel fk-card">
              <h3>Account history</h3>
              {detail.activeRestrictions.length > 0 && (
                <div className="fkmod-badges fkmod-badges--wrap">
                  {detail.activeRestrictions.map((item, index) => (
                    <span key={`${item.type}-${index}`} className="fk-badge fk-badge--danger">
                      {item.type === "posting" ? "Posting restricted" : "Suspended"}
                      {item.until ? ` until ${new Date(item.until).toLocaleDateString()}` : ""}
                    </span>
                  ))}
                </div>
              )}
              <ul className="fkmod-previous">
                {detail.previousDecisions.map((item) => (
                  <li key={item.id}>
                    <Link to={`/admin/moderation/cases/${item.id}`}>
                      {item.targetType === "post" ? <FileText size={14} aria-hidden="true" /> : <UserRound size={14} aria-hidden="true" />}
                      {item.outcome === "violation" ? item.ruleLabel || "Violation" : "No violation"}
                    </Link>
                    <span className="fk-muted">
                      {item.reversed ? "Reversed · " : ""}
                      {formatRelative(item.decidedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {/* ============================== MODALS ============================== */}
      {modal && (
        <AdminModal
          title={
            modal === "dismiss"
              ? "Dismiss reports"
              : modal === "violation"
                ? "Confirm violation"
                : modal === "restore"
                  ? "Reverse decision"
                  : modal === "appeal"
                    ? "Review appeal"
                    : simpleAction === "escalate"
                      ? "Escalate case"
                      : simpleAction === "start_review"
                        ? "Start review"
                        : "Mark action required"
          }
          danger={modal === "violation"}
          onClose={() => !busy && setModal(null)}
        >
          <form className="fkmod-form" onSubmit={submitModal}>
            {modal === "violation" && (
              <>
                <p className="fk-modal__desc">Choose the rule and the actions to apply. The user is notified once with the rule and actions — never who reported them.</p>

                <label className="fk-modal__field">
                  <span>Rule broken</span>
                  <select className="fk-select" value={rule} onChange={(event) => setRule(event.target.value)}>
                    {REASON_OPTIONS.filter((option) => option.value !== "other").map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                </label>

                <fieldset className="fkmod-consequences">
                  <legend>Actions</legend>
                  {allowedConsequences.map((option) => (
                    <label key={option.value} className={consequences.includes(option.value) ? "is-checked" : ""}>
                      <input type="checkbox" checked={consequences.includes(option.value)} onChange={() => toggleConsequence(option.value)} />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>

                {needsDuration && (
                  <label className="fk-modal__field">
                    <span>Duration (days)</span>
                    <input type="number" min={1} max={365} value={durationDays} onChange={(event) => setDurationDays(event.target.value)} />
                  </label>
                )}

                <label className="fk-modal__field">
                  <span>Message to the user (optional)</span>
                  <textarea rows={2} maxLength={2000} value={userMessage} onChange={(event) => setUserMessage(event.target.value)} placeholder="Explain what needs to change." />
                </label>
              </>
            )}

            {modal === "appeal" && (
              <>
                <p className="fk-modal__desc">Accepting the appeal reverses the decision: removed content is restored and restrictions from this case are lifted.</p>
                <div className="fkmod-choice">
                  <label className={appealOutcome === "upheld" ? "is-checked" : ""}>
                    <input type="radio" name="appeal" checked={appealOutcome === "upheld"} onChange={() => setAppealOutcome("upheld")} />
                    Keep the decision
                  </label>
                  <label className={appealOutcome === "overturned" ? "is-checked" : ""}>
                    <input type="radio" name="appeal" checked={appealOutcome === "overturned"} onChange={() => setAppealOutcome("overturned")} />
                    Accept appeal & reverse
                  </label>
                </div>
              </>
            )}

            {modal === "restore" && (
              <p className="fk-modal__desc">This restores removed content and lifts every restriction applied by this case. The user is notified.</p>
            )}

            {modal === "dismiss" && (
              <p className="fk-modal__desc">The case closes with no action against the user. Reporters can report this again later if it continues.</p>
            )}

            <label className="fk-modal__field">
              <span>{modal === "appeal" ? "Note to the user" : modal === "simple" ? "Note (optional)" : "Reason (recorded in the audit log)"}</span>
              <textarea rows={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} required={modal !== "simple"} />
            </label>

            {((modal === "violation" && highImpact) || (modal === "appeal" && appealOutcome === "overturned")) && (
              <label className="fk-modal__checkbox">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                <span>I've reviewed the evidence and want to apply these changes.</span>
              </label>
            )}

            {modalError && (
              <p className="fk-modal__error" role="alert">
                {modalError}
              </p>
            )}

            <div className="fk-modal__actions">
              <button type="button" className="fk-btn" onClick={() => setModal(null)} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className={`fk-btn ${modal === "violation" ? "fk-btn--danger" : "fk-btn--primary"}`} disabled={busy}>
                {busy ? "Working…" : modal === "violation" ? "Apply decision" : modal === "dismiss" ? "Dismiss reports" : modal === "restore" ? "Reverse decision" : modal === "appeal" ? "Save decision" : "Confirm"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
