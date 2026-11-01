import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CircleCheck, Lock, RotateCcw, ShieldAlert, Ticket } from "lucide-react";

import type { SupportAttachment, SupportPriority, SupportStatus } from "../../../support/types";
import { KIND_LABELS } from "../../../support/utils/helpFormat";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, PriorityPill, SmError, SmLoading, StatusPill, formatDateTime, useAdminQuery, useConfirm } from "../components/SmParts";
import { SmComposer, SmMessages, SmNotes } from "../components/SmThread";
import { adminError, supportAdminApi, type AgentTicket } from "../supportAdminApi";
import { useSupportMod } from "../layout/SupportModLayout";

const P = PERMISSIONS;

const AFTER_REPLY: { value: SupportStatus; label: string }[] = [
  { value: "awaiting_user", label: "Waiting for user" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

/** Ticket workspace. Also used for live chats (`chat`), which share the same record. */
export default function TicketDetailPage({ embedded = false, ticketId: forcedId, onChanged }: { embedded?: boolean; ticketId?: string; onChanged?: () => void }) {
  const params = useParams();
  const id = forcedId ?? params.ticketId ?? "";
  const { can, currentAdmin } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useSupportMod();
  const confirm = useConfirm();
  const [afterReply, setAfterReply] = useState<SupportStatus>("awaiting_user");

  const query = useAdminQuery(() => supportAdminApi.ticket(id), [id]);
  const staff = useAdminQuery(() => (can([P.SUPPORT_ASSIGN]) ? supportAdminApi.staff() : Promise.resolve([])), [id]);
  const t = query.data;
  const { refetch } = query;

  // Live chats refresh while open so new user messages show up.
  useEffect(() => {
    if (!embedded) return undefined;
    const timer = window.setInterval(() => void refetch(), 10_000);
    return () => window.clearInterval(timer);
  }, [embedded, refetch]);

  const canRespond = can([P.SUPPORT_RESPOND]);
  const canResolve = can([P.SUPPORT_RESOLVE]);
  const canAssign = can([P.SUPPORT_ASSIGN]);
  const myId = String((currentAdmin as { id?: string } | null)?.id ?? "");

  const apply = async (work: Promise<AgentTicket>, success: string) => {
    try {
      query.setData(await work);
      toast("success", success);
      refreshCounts();
      onChanged?.();
      return true;
    } catch (error) {
      toast("error", adminError(error));
      return false;
    }
  };

  if (query.loading && !t) return <SmLoading label="Loading ticket…" />;
  if (query.error || !t) return <SmError message={query.error ?? "Ticket not found."} onRetry={query.refetch} />;

  const closed = t.status === "resolved" || t.status === "closed";
  const isChat = t.kind === "chat";
  const resolve = (key: string) => supportAdminApi.ticketFile(t.id, key);

  return (
    <>
      {!embedded && (
        <Link to={isChat ? "/admin/support/live" : "/admin/support/tickets"} className="fksm-back">
          <ArrowLeft size={16} /> Back to {isChat ? "Live Support" : "Support Tickets"}
        </Link>
      )}

      <div className={embedded ? "fksm-stack" : "fksm-detail"}>
        <Card>
          <div className="fksm-detail-head">
            <div>
              <h2>{t.subject}</h2>
              <div className="fksm-detail-head__meta">
                <span>{t.number}</span>·<span>{KIND_LABELS[t.kind]}</span>·<span>Opened {formatDateTime(t.createdAt)}</span>
              </div>
            </div>
            <div className="fksm-row">
              <StatusPill status={t.status} />
              <PriorityPill priority={t.priority} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <SmMessages messages={t.messages} userName={t.user.username || t.user.name || "User"} resolve={resolve} />
          </div>

          {canRespond ? (
            t.status === "closed" ? (
              <p className="fksm-notice fksm-notice--info" style={{ marginTop: 14 }}>This {isChat ? "chat" : "ticket"} is closed. Reopen it to reply.</p>
            ) : (
              <SmComposer
                placeholder={isChat ? "Reply in the chat…" : "Write a reply to the user…"}
                onSend={(body, attachments: SupportAttachment[]) =>
                  apply(supportAdminApi.reply(t.id, body, attachments, isChat ? "in_progress" : afterReply), "Reply sent.")
                }
                extra={
                  !isChat && canResolve ? (
                    <select className="fksm-select" value={afterReply} onChange={(e) => setAfterReply(e.target.value as SupportStatus)} aria-label="Status after reply">
                      {AFTER_REPLY.map((o) => (
                        <option key={o.value} value={o.value}>Then: {o.label}</option>
                      ))}
                    </select>
                  ) : undefined
                }
              />
            )
          ) : (
            <p className="fksm-notice fksm-notice--info" style={{ marginTop: 14 }}>You can read this ticket but your role can't reply.</p>
          )}
        </Card>

        <div className="fksm-stack">
          <Card title="Requester">
            <dl className="fksm-facts">
              <div><dt>User</dt><dd>{t.user.username ? `@${t.user.username}` : t.user.name || "Unknown"}</dd></div>
              {t.userEmail && <div><dt>Email</dt><dd>{t.userEmail}</dd></div>}
              {t.userSince && <div><dt>Member since</dt><dd>{new Date(t.userSince).toLocaleDateString()}</dd></div>}
              <div><dt>Category</dt><dd>{t.category}</dd></div>
              {t.affectedFeature && <div><dt>Affected feature</dt><dd>{t.affectedFeature}</dd></div>}
              {t.pageUrl && <div><dt>Page</dt><dd>{t.pageUrl}</dd></div>}
              {t.deviceInfo && <div><dt>Device</dt><dd>{t.deviceInfo}</dd></div>}
              <div><dt>First response</dt><dd>{t.firstResponseAt ? formatDateTime(t.firstResponseAt) : "Not yet"}</dd></div>
            </dl>
            {t.user.id && (
              <Link to={`/admin/users/${t.user.id}`} className="fksm-link" style={{ marginTop: 10 }}>
                Open user profile →
              </Link>
            )}
          </Card>

          <Card title="Manage">
            <div className="fksm-stack">
              <label className="fksm-field">
                <span>Status</span>
                <select className="fksm-select" value={t.status} disabled={!canResolve} onChange={(e) => void apply(supportAdminApi.setStatus(t.id, e.target.value as SupportStatus), "Status updated.")}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="awaiting_user">Waiting for User</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="fksm-field">
                <span>Priority</span>
                <select className="fksm-select" value={t.priority} disabled={!canResolve} onChange={(e) => void apply(supportAdminApi.setPriority(t.id, e.target.value as SupportPriority), "Priority updated.")}>
                  <option value="low">Low</option>
                  <option value="normal">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="fksm-field">
                <span>Assigned to</span>
                <select
                  className="fksm-select"
                  value={t.assignedTo?.id ?? ""}
                  disabled={!canAssign || staff.loading}
                  onChange={(e) => void apply(supportAdminApi.assign(t.id, e.target.value || null), e.target.value ? "Ticket assigned." : "Ticket unassigned.")}
                >
                  <option value="">Unassigned</option>
                  {t.assignedTo && !(staff.data ?? []).some((s) => s.id === t.assignedTo?.id) && (
                    <option value={t.assignedTo.id}>{t.assignedTo.username || t.assignedTo.name}</option>
                  )}
                  {(staff.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.username || s.name}
                      {s.id === myId ? " (me)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="fksm-row">
                {canAssign && myId && t.assignedTo?.id !== myId && !closed && (
                  <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => void apply(supportAdminApi.assign(t.id, myId), "Assigned to you.")}>
                    Assign to me
                  </button>
                )}
                {canAssign && t.status !== "escalated" && !closed && (
                  <button
                    type="button"
                    className="fksm-btn fksm-btn--danger-ghost fksm-btn--sm"
                    onClick={() =>
                      confirm.ask(
                        {
                          title: "Escalate this ticket?",
                          description: "The ticket is flagged for senior staff and its priority is raised to at least High. Your reason is saved as an internal note.",
                          confirmLabel: "Escalate",
                          tone: "danger",
                          reasonLabel: "Reason for escalation",
                        },
                        async (reason) => {
                          const ok = await apply(supportAdminApi.escalate(t.id, reason), "Ticket escalated.");
                          if (!ok) throw new Error("Escalation failed.");
                        },
                      )
                    }
                  >
                    <ShieldAlert size={15} /> Escalate
                  </button>
                )}
                {canResolve && !closed && (
                  <button type="button" className="fksm-btn fksm-btn--success fksm-btn--sm" onClick={() => void apply(supportAdminApi.setStatus(t.id, "resolved"), "Marked as resolved.")}>
                    <CircleCheck size={15} /> Resolve
                  </button>
                )}
                {canResolve && t.status !== "closed" && (
                  <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => void apply(supportAdminApi.setStatus(t.id, "closed"), isChat ? "Chat ended." : "Ticket closed.")}>
                    <Lock size={15} /> {isChat ? "End chat" : "Close"}
                  </button>
                )}
                {canResolve && closed && (
                  <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => void apply(supportAdminApi.setStatus(t.id, "open"), "Reopened.")}>
                    <RotateCcw size={15} /> Reopen
                  </button>
                )}
              </div>
            </div>
          </Card>

          <Card title="Internal notes" icon={<Ticket size={18} />}>
            <SmNotes
              notes={t.notes}
              disabled={!canRespond}
              onAdd={(body) => apply(supportAdminApi.ticketNote(t.id, body), "Note added.")}
            />
          </Card>
        </div>
      </div>
      {confirm.element}
    </>
  );
}
