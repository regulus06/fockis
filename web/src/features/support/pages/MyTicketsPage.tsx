import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Bug, ChevronRight, Inbox, Lightbulb, MessageCircleMore, MessageSquare, Ticket } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { HelpEmpty, HelpError, HelpLoading, SignedInOnly } from "../components/HelpStates";
import { Composer, MessageList } from "../components/TicketThread";
import { CATEGORY_LABELS } from "../data/helpTopics";
import { useHelpQuery } from "../hooks/useHelpQuery";
import { useHelpToast } from "../hooks/useHelpToast";
import { supportApi, supportErrorMessage } from "../services/supportApi";
import type { SupportAttachment, SupportKind } from "../types";
import { formatDateTime, KIND_LABELS, PRIORITY_LABELS, PRIORITY_TONES, STATUS_LABELS, STATUS_TONES, timeAgo } from "../utils/helpFormat";

const KIND_ICONS: Record<SupportKind, typeof Ticket> = { question: MessageCircleMore, problem: Bug, chat: MessageSquare };
const FILTERS = [
  { id: "active", label: "Active" },
  { id: "closed", label: "Resolved & closed" },
  { id: "all", label: "All" },
] as const;

function TicketList() {
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.find((f) => f.id === params.get("filter"))?.id ?? "active") as "active" | "closed" | "all";
  const [page, setPage] = useState(1);
  const list = useHelpQuery(() => supportApi.myTickets(filter, page), [filter, page]);

  return (
    <div className="fk-help-card">
      <div className="fk-help-chips" role="tablist" aria-label="Filter requests" style={{ marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            className="fk-help-chip"
            aria-selected={filter === f.id}
            onClick={() => {
              setPage(1);
              setParams(f.id === "active" ? {} : { filter: f.id }, { replace: true });
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.loading && !list.data ? (
        <HelpLoading label="Loading your requests…" />
      ) : list.error ? (
        <HelpError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <HelpEmpty
          icon={<Inbox size={24} />}
          title={filter === "active" ? "No open requests" : "No requests here"}
          text="When you contact support, report a problem or start a live chat, it shows up here."
          action={<Link to="/help/contact" className="fk-help-btn fk-help-btn--primary">Contact Support</Link>}
        />
      ) : (
        <>
          <ul className="fk-help-rows">
            {list.data.items.map((t) => {
              const Icon = KIND_ICONS[t.kind] ?? Ticket;
              return (
                <li key={t.id}>
                  <Link to={`/help/tickets/${t.id}`} className="fk-help-row">
                    <span className="fk-help-row__icon"><Icon size={18} /></span>
                    <span className="fk-help-row__main">
                      <span className="fk-help-row__title">
                        {t.unread && <span className="fk-help-count" style={{ marginLeft: 0, marginRight: 8 }} aria-label="New reply">New</span>}
                        {t.subject}
                      </span>
                      <span className="fk-help-row__sub">
                        {t.number} · {KIND_LABELS[t.kind]} · {CATEGORY_LABELS[t.category] ?? t.category} · Updated {timeAgo(t.lastMessageAt)}
                      </span>
                    </span>
                    <span className="fk-help-row__end">
                      <span className={`fk-help-pill fk-help-pill--${STATUS_TONES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                      <ChevronRight className="fk-help-chevron" size={18} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {(page > 1 || list.data.hasMore) && (
            <div className="fk-help-form__footer" style={{ marginTop: 12 }}>
              <button type="button" className="fk-help-btn fk-help-btn--secondary fk-help-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="fk-help-btn fk-help-btn--secondary fk-help-btn--sm" disabled={!list.data.hasMore} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** /help/tickets — my support requests. */
export function MyTicketsPage() {
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title="My Support Tickets"
          description="View and track your support requests."
          icon={<Ticket size={30} />}
          tone="purple"
          actions={
            <>
              <Link to="/help/feedback" className="fk-help-btn fk-help-btn--secondary"><Lightbulb size={16} /> My feedback</Link>
              <Link to="/help/contact" className="fk-help-btn fk-help-btn--primary"><MessageCircleMore size={16} /> New request</Link>
            </>
          }
        />
        <SignedInOnly what="see your support requests">{() => <TicketList />}</SignedInOnly>
      </div>
    </HelpShell>
  );
}

function TicketDetail({ id }: { id: string }) {
  const notify = useHelpToast();
  const ticket = useHelpQuery(() => supportApi.ticket(id), [id]);
  const [closing, setClosing] = useState(false);

  if (ticket.loading && !ticket.data) return <div className="fk-help-card"><HelpLoading label="Loading request…" /></div>;
  if (ticket.error || !ticket.data) return <div className="fk-help-card"><HelpError message={ticket.error ?? "Request not found."} onRetry={ticket.refetch} /></div>;
  const t = ticket.data;

  const reply = async (body: string, attachments: SupportAttachment[]) => {
    try {
      ticket.setData(await supportApi.reply(t.id, body, attachments));
      return true;
    } catch (error) {
      notify(supportErrorMessage(error, "Your reply wasn't sent."), "error");
      return false;
    }
  };

  const reopen = async () => {
    setClosing(true);
    try {
      ticket.setData(await supportApi.reopen(t.id));
      notify("Request reopened. Support has been told.");
    } catch (error) {
      notify(supportErrorMessage(error, "Couldn't reopen this request."), "error");
    } finally {
      setClosing(false);
    }
  };

  const close = async () => {
    setClosing(true);
    try {
      ticket.setData(await supportApi.close(t.id));
      notify("Request closed.");
    } catch (error) {
      notify(supportErrorMessage(error, "Couldn't close this request."), "error");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="fk-help-two">
      <div className="fk-help-card">
        <h2 className="fk-help-section-title" style={{ fontSize: 19 }}>{t.subject}</h2>
        <MessageList messages={t.messages} resolveFile={(key) => supportApi.ticketFile(t.id, key)} />
        {t.status === "closed" && !t.canReopen ? (
          <p className="fk-help-notice" style={{ marginTop: 16 }}>
            This request is closed. <Link to="/help/contact" className="fk-help-link">Open a new request</Link> if you still need help.
          </p>
        ) : t.status === "closed" || t.status === "resolved" ? (
          <div className="fk-help-notice" style={{ marginTop: 16, alignItems: "center" }}>
            <span style={{ flex: 1 }}>This request is {t.status}. Still need help with it?</span>
            <button type="button" className="fk-help-btn fk-help-btn--secondary fk-help-btn--sm" onClick={() => void reopen()} disabled={closing}>
              Reopen request
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <Composer onSend={reply} />
          </div>
        )}
      </div>
      <div className="fk-help-card">
        <h2 className="fk-help-section-title">Details</h2>
        <dl className="fk-help-dl">
          <dt>Status</dt>
          <dd><span className={`fk-help-pill fk-help-pill--${STATUS_TONES[t.status]}`}>{STATUS_LABELS[t.status]}</span></dd>
          <dt>Priority</dt>
          <dd><span className={`fk-help-pill fk-help-pill--${PRIORITY_TONES[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span></dd>
          <dt>Reference</dt>
          <dd>{t.number}</dd>
          <dt>Type</dt>
          <dd>{KIND_LABELS[t.kind]}</dd>
          <dt>Topic</dt>
          <dd>{CATEGORY_LABELS[t.category] ?? t.category}</dd>
          <dt>Opened</dt>
          <dd>{formatDateTime(t.createdAt)}</dd>
          {t.affectedFeature && (<><dt>Feature</dt><dd>{t.affectedFeature}</dd></>)}
          {t.pageUrl && (<><dt>Page</dt><dd style={{ overflowWrap: "anywhere" }}>{t.pageUrl}</dd></>)}
          {t.deviceInfo && (<><dt>Device</dt><dd>{t.deviceInfo}</dd></>)}
        </dl>
        {t.status !== "closed" && (
          <button type="button" className="fk-help-btn fk-help-btn--secondary fk-help-btn--block" style={{ marginTop: 16 }} onClick={() => void close()} disabled={closing}>
            {closing ? "Closing…" : "Close request"}
          </button>
        )}
      </div>
    </div>
  );
}

/** /help/tickets/:ticketId — one request and its conversation. */
export function TicketDetailPage() {
  const { ticketId = "" } = useParams<{ ticketId: string }>();
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader title="Support request" crumbs={[{ label: "My Support Tickets", to: "/help/tickets" }]} icon={<Ticket size={28} />} tone="purple" />
        <SignedInOnly what="see this request">{() => <TicketDetail id={ticketId} />}</SignedInOnly>
      </div>
    </HelpShell>
  );
}
