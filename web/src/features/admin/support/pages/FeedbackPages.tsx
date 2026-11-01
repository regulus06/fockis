import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Archive, ArchiveRestore, ArrowLeft, MessageSquareText, Search, Send } from "lucide-react";

import type { FeedbackCategory, FeedbackStatus } from "../../../support/types";
import { FEEDBACK_CATEGORY_LABELS } from "../../../support/utils/helpFormat";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, Pager, PersonCell, SmEmpty, SmError, SmLoading, StatusPill, formatDateTime, timeAgo, useAdminQuery } from "../components/SmParts";
import { SmFiles, SmNotes } from "../components/SmThread";
import { adminError, supportAdminApi, type AgentFeedback } from "../supportAdminApi";
import { useSupportMod } from "../layout/SupportModLayout";

const P = PERMISSIONS;

const STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "planned", label: "Planned" },
  { value: "implemented", label: "Implemented" },
  { value: "rejected", label: "Rejected" },
];

const TABS: { value: FeedbackStatus | "open" | "all"; label: string }[] = [{ value: "open", label: "Open" }, ...STATUSES, { value: "all", label: "All" }];

/* ============================================================================
   INBOX
============================================================================ */

export function FeedbackInboxPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as FeedbackStatus | "open" | "all") || "open";
  const category = (params.get("category") as FeedbackCategory) || "";
  const assigned = (params.get("assigned") as "me" | "unassigned") || "";
  const archived = params.get("archived") === "1";
  const search = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const list = useAdminQuery(
    () => supportAdminApi.feedbackList({ status, category: category || undefined, assigned: assigned || undefined, archived, search: search || undefined, page }),
    [status, category, assigned, archived, search, page],
  );

  return (
    <Card title="Feedback Inbox" icon={<MessageSquareText size={20} />}>
      <div className="fksm-tabs" role="tablist" aria-label="Feedback status">
        {TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => set("status", t.value === "open" ? "" : t.value)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set("q", draft.trim());
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search subject or FB number…" aria-label="Search feedback" />
        </form>
        <select className="fksm-select" value={category} onChange={(e) => set("category", e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {(Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[]).map((c) => (
            <option key={c} value={c}>{FEEDBACK_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select className="fksm-select" value={assigned} onChange={(e) => set("assigned", e.target.value)} aria-label="Assignment">
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <label className="fksm-check">
          <input type="checkbox" checked={archived} onChange={(e) => set("archived", e.target.checked ? "1" : "")} />
          Archived
        </label>
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<MessageSquareText size={24} />} title="No feedback here" text={archived ? "Nothing has been archived with these filters." : "When people share feedback from the Help Center it lands here."} />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Feedback</th>
                  <th>Category</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((f) => (
                  <tr key={f.id} className="is-clickable" onClick={() => navigate(`/admin/support/feedback/${f.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong title={f.subject}>{f.subject}</strong>
                        <span>{f.number}{f.attachments.length ? ` · ${f.attachments.length} file${f.attachments.length === 1 ? "" : "s"}` : ""}</span>
                      </span>
                    </td>
                    <td>{FEEDBACK_CATEGORY_LABELS[f.category]}</td>
                    <td><PersonCell person={f.user} /></td>
                    <td><StatusPill status={f.status} /></td>
                    <td><PersonCell person={f.assignedTo} fallback="Unassigned" /></td>
                    <td className="fksm-date">{timeAgo(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </Card>
  );
}

/* ============================================================================
   DETAIL
============================================================================ */

export function FeedbackDetailPage() {
  const { feedbackId = "" } = useParams();
  const { can, currentAdmin } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useSupportMod();
  const query = useAdminQuery(() => supportAdminApi.feedback(feedbackId), [feedbackId]);
  const staff = useAdminQuery(() => (can([P.SUPPORT_ASSIGN]) ? supportAdminApi.staff() : Promise.resolve([])), [feedbackId]);
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState<FeedbackStatus | "">("");
  const [sending, setSending] = useState(false);
  const f = query.data;
  const myId = String((currentAdmin as { id?: string } | null)?.id ?? "");

  const canRespond = can([P.SUPPORT_RESPOND]);
  const canResolve = can([P.SUPPORT_RESOLVE]);
  const canAssign = can([P.SUPPORT_ASSIGN]);

  const apply = async (work: Promise<AgentFeedback>, success: string) => {
    try {
      query.setData(await work);
      toast("success", success);
      refreshCounts();
      return true;
    } catch (error) {
      toast("error", adminError(error));
      return false;
    }
  };

  if (query.loading && !f) return <SmLoading label="Loading feedback…" />;
  if (query.error || !f) return <SmError message={query.error ?? "Feedback not found."} onRetry={query.refetch} />;

  return (
    <>
      <Link to="/admin/support/feedback" className="fksm-back">
        <ArrowLeft size={16} /> Back to Feedback Inbox
      </Link>
      <div className="fksm-detail">
        <div className="fksm-stack">
          <Card>
            <div className="fksm-detail-head">
              <div>
                <h2>{f.subject}</h2>
                <div className="fksm-detail-head__meta">
                  <span>{f.number}</span>·<span>{FEEDBACK_CATEGORY_LABELS[f.category]}</span>·<span>{formatDateTime(f.createdAt)}</span>
                  {f.archived && <span className="fksm-pill fksm-pill--amber">Archived</span>}
                </div>
              </div>
              <StatusPill status={f.status} />
            </div>
            <p className="fksm-prose" style={{ marginTop: 14 }}>{f.description}</p>
            {f.attachments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <SmFiles files={f.attachments} resolve={(key) => supportAdminApi.feedbackFile(f.id, key)} />
              </div>
            )}
          </Card>

          <Card title="Responses to the user">
            {f.responses.length === 0 ? (
              <p className="fksm-muted">No response yet. The user sees replies on their feedback page and gets a notification.</p>
            ) : (
              <div className="fksm-thread">
                {f.responses.map((r) => (
                  <div key={r.id} className="fksm-msg fksm-msg--agent">
                    <div className="fksm-msg__bubble">{r.body}</div>
                    <span className="fksm-msg__meta">{r.author?.username || r.author?.name || "Fockis Support"} · {formatDateTime(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
            {canRespond && (
              <form
                className="fksm-composer"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!reply.trim()) return;
                  setSending(true);
                  const ok = await apply(supportAdminApi.feedbackRespond(f.id, reply.trim(), replyStatus || undefined), "Response sent.");
                  setSending(false);
                  if (ok) {
                    setReply("");
                    setReplyStatus("");
                  }
                }}
              >
                <textarea className="fksm-input" rows={3} maxLength={5000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank the user and tell them what happens next…" aria-label="Response" />
                <div className="fksm-composer__foot">
                  {canResolve ? (
                    <select className="fksm-select" value={replyStatus} onChange={(e) => setReplyStatus(e.target.value as FeedbackStatus | "")} aria-label="Status after response">
                      <option value="">Keep status</option>
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>Set to: {s.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span />
                  )}
                  <button type="submit" className="fksm-btn fksm-btn--primary" disabled={sending || !reply.trim()}>
                    <Send size={15} /> {sending ? "Sending…" : "Send response"}
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>

        <div className="fksm-stack">
          <Card title="Details">
            <dl className="fksm-facts">
              <div><dt>From</dt><dd>{f.user.username ? `@${f.user.username}` : f.user.name || "Unknown"}</dd></div>
              <div><dt>First response</dt><dd>{f.firstResponseAt ? formatDateTime(f.firstResponseAt) : "Not yet"}</dd></div>
              {f.resolvedAt && <div><dt>Closed</dt><dd>{formatDateTime(f.resolvedAt)}</dd></div>}
            </dl>
          </Card>

          <Card title="Manage">
            <div className="fksm-stack">
              <label className="fksm-field">
                <span>Status</span>
                <select className="fksm-select" value={f.status} disabled={!canResolve} onChange={(e) => void apply(supportAdminApi.feedbackStatus(f.id, e.target.value as FeedbackStatus), "Status updated.")}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <small>The user is notified when the status changes.</small>
              </label>
              <label className="fksm-field">
                <span>Assigned to</span>
                <select className="fksm-select" value={f.assignedTo?.id ?? ""} disabled={!canAssign} onChange={(e) => void apply(supportAdminApi.feedbackAssign(f.id, e.target.value || null), "Assignment updated.")}>
                  <option value="">Unassigned</option>
                  {f.assignedTo && !(staff.data ?? []).some((s) => s.id === f.assignedTo?.id) && <option value={f.assignedTo.id}>{f.assignedTo.username || f.assignedTo.name}</option>}
                  {(staff.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.username || s.name}{s.id === myId ? " (me)" : ""}</option>
                  ))}
                </select>
              </label>
              {canResolve && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => void apply(supportAdminApi.feedbackArchive(f.id, !f.archived), f.archived ? "Moved back to the inbox." : "Archived.")}>
                  {f.archived ? <><ArchiveRestore size={15} /> Unarchive</> : <><Archive size={15} /> Archive</>}
                </button>
              )}
            </div>
          </Card>

          <Card title="Internal notes">
            <SmNotes notes={f.notes} disabled={!canRespond} onAdd={(body) => apply(supportAdminApi.feedbackNote(f.id, body), "Note added.")} />
          </Card>
        </div>
      </div>
    </>
  );
}
