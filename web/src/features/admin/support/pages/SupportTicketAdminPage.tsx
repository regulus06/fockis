import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";

import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminErrorState, AdminLoadingState } from "../../components/AdminStates";
import { moderationError } from "../../moderation/moderationApi";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { CATEGORY_LABELS } from "../../../support/data/helpTopics";
import type { SupportStatus } from "../../../support/types";
import { formatDateTime, KIND_LABELS, STATUS_LABELS } from "../../../support/utils/helpFormat";
import { supportAdminApi, type AgentTicket } from "../supportAdminApi";
import { SupportStatusBadge } from "./SupportInboxPage";
import "../SupportAdmin.scss";

/** /admin/support/cases/:ticketId — read and answer one request. */
export default function SupportTicketAdminPage() {
  const { ticketId = "" } = useParams<{ ticketId: string }>();
  const pushToast = useAdminNotificationStore((s) => s.pushToast);
  const [ticket, setTicket] = useState<AgentTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [nextStatus, setNextStatus] = useState<SupportStatus>("awaiting_user");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTicket(await supportAdminApi.ticket(ticketId));
    } catch (err) {
      setError(moderationError(err, "Couldn't load this request."));
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const reply = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      setTicket(await supportAdminApi.reply(ticketId, body.trim(), nextStatus));
      setBody("");
      pushToast("success", "Reply sent. The user was notified.");
    } catch (err) {
      pushToast("error", moderationError(err, "Reply not sent."));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: SupportStatus) => {
    setBusy(true);
    try {
      setTicket(await supportAdminApi.setStatus(ticketId, status));
      pushToast("success", `Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
    } catch (err) {
      pushToast("error", moderationError(err, "Status not changed."));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <AdminErrorState message={error} onRetry={() => void load()} />;
  if (!ticket) return <AdminLoadingState label="Loading request…" />;

  const who = ticket.user.name || (ticket.user.username ? `@${ticket.user.username}` : "User");

  return (
    <div className="fksup">
      <Link to="/admin/support/cases" className="fksup-back"><ArrowLeft size={15} /> Support Inbox</Link>
      <AdminPageHeader title={ticket.subject} description={`${ticket.number} · ${KIND_LABELS[ticket.kind]} · ${CATEGORY_LABELS[ticket.category] ?? ticket.category}`} actions={<SupportStatusBadge status={ticket.status} />} />

      <div className="fksup-layout">
        <section className="fk-panel">
          <div className="fk-panel__header"><h2>Conversation</h2></div>
          <div className="fk-panel__body">
            <div className="fksup-thread">
              {ticket.messages.map((m) => (
                <div key={m.id} className={`fksup-msg fksup-msg--${m.author}`}>
                  <div className="fksup-msg__bubble">{m.body}</div>
                  <small>{m.author === "agent" ? "Fockis Support" : who} · {formatDateTime(m.createdAt)}</small>
                </div>
              ))}
            </div>
            <form className="fksup-reply" onSubmit={reply}>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000} placeholder="Write a reply. The user sees it as “Fockis Support”." aria-label="Reply" />
              <div className="fksup-reply__row">
                <label>
                  After sending:{" "}
                  <select className="fk-select" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as SupportStatus)}>
                    <option value="awaiting_user">Waiting for user</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
                <button type="submit" className="fk-btn fk-btn--primary" disabled={busy || !body.trim()}>
                  <Send size={15} /> Send reply
                </button>
              </div>
            </form>
          </div>
        </section>

        <aside className="fk-panel">
          <div className="fk-panel__header"><h2>Details</h2></div>
          <div className="fk-panel__body">
            <dl className="fksup-dl">
              <dt>User</dt>
              <dd>
                {who}
                {ticket.user.username && <small> @{ticket.user.username}</small>}
              </dd>
              {ticket.user.email && (<><dt>Email</dt><dd>{ticket.user.email}</dd></>)}
              <dt>Opened</dt>
              <dd>{formatDateTime(ticket.createdAt)}</dd>
              {ticket.pageUrl && (<><dt>Page</dt><dd>{ticket.pageUrl}</dd></>)}
              {ticket.deviceInfo && (<><dt>Device</dt><dd>{ticket.deviceInfo}</dd></>)}
            </dl>
            <div className="fksup-actions">
              {ticket.status !== "in_progress" && ticket.status !== "closed" && (
                <button type="button" className="fk-btn fk-btn--sm" disabled={busy} onClick={() => void changeStatus("in_progress")}>Mark in progress</button>
              )}
              {ticket.status !== "resolved" && ticket.status !== "closed" && (
                <button type="button" className="fk-btn fk-btn--sm" disabled={busy} onClick={() => void changeStatus("resolved")}>Mark resolved</button>
              )}
              {ticket.status !== "closed" ? (
                <button type="button" className="fk-btn fk-btn--sm" disabled={busy} onClick={() => void changeStatus("closed")}>Close</button>
              ) : (
                <button type="button" className="fk-btn fk-btn--sm" disabled={busy} onClick={() => void changeStatus("open")}>Reopen</button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
