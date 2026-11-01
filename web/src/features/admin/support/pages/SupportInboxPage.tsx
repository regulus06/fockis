import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bug, Headset, MessageCircleMore, MessageSquare, Search } from "lucide-react";

import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminDataTable, type AdminTableColumn } from "../../components/AdminDataTable";
import { AdminErrorState } from "../../components/AdminStates";
import { moderationError } from "../../moderation/moderationApi";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { CATEGORY_LABELS } from "../../../support/data/helpTopics";
import type { Paged, SupportStatus, SupportTicketSummary } from "../../../support/types";
import { KIND_LABELS, STATUS_LABELS, timeAgo } from "../../../support/utils/helpFormat";
import { supportAdminApi, type SupportStats } from "../supportAdminApi";
import "../SupportAdmin.scss";

const TONE: Record<SupportStatus, string> = {
  open: "info",
  in_progress: "warning",
  awaiting_user: "neutral",
  resolved: "success",
  closed: "neutral",
};

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return <span className={`fk-badge fk-badge--${TONE[status] ?? "neutral"}`}>{STATUS_LABELS[status] ?? status}</span>;
}

const KIND_ICON = { question: MessageCircleMore, problem: Bug, chat: MessageSquare };

/** /admin/support/cases — Help & Support requests from users. */
export default function SupportInboxPage() {
  const navigate = useNavigate();
  const pushToast = useAdminNotificationStore((s) => s.pushToast);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [data, setData] = useState<Paged<SupportTicketSummary> | null>(null);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [liveChat, setLiveChat] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const status = (params.get("status") as SupportStatus | "active" | "all") || "active";
  const kind = (params.get("kind") as "question" | "problem" | "chat" | "") || "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page") ?? 1) || 1;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([supportAdminApi.list({ status, kind, search: q, page }), supportAdminApi.stats()]);
      setData(list);
      setStats(s);
    } catch (err) {
      setError(moderationError(err, "Couldn't load support requests."));
    } finally {
      setLoading(false);
    }
  }, [status, kind, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    supportAdminApi
      .settings()
      .then((s) => setLiveChat(s.liveChatOnline))
      .catch(() => setLiveChat(null));
  }, []);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: key !== "page" });
  };

  const toggleLiveChat = async () => {
    if (liveChat === null) return;
    setToggling(true);
    try {
      const s = await supportAdminApi.setLiveChat(!liveChat);
      setLiveChat(s.liveChatOnline);
      pushToast("success", s.liveChatOnline ? "Live chat is on. Users see “Online now”." : "Live chat is off. Users see “Offline”.");
    } catch (err) {
      pushToast("error", moderationError(err, "Couldn't change live chat."));
    } finally {
      setToggling(false);
    }
  };

  const columns: AdminTableColumn<SupportTicketSummary>[] = [
    {
      key: "subject",
      header: "Request",
      render: (row) => {
        const Icon = KIND_ICON[row.kind] ?? MessageCircleMore;
        return (
          <span className="fksup-subject">
            <span className="fksup-subject__icon" aria-hidden="true"><Icon size={15} /></span>
            <span>
              <strong>
                {row.unread && <span className="fksup-dot" aria-label="Unread" />}
                {row.subject}
              </strong>
              <small>{row.number} · {KIND_LABELS[row.kind]}</small>
            </span>
          </span>
        );
      },
    },
    { key: "topic", header: "Topic", render: (row) => <span>{CATEGORY_LABELS[row.category] ?? row.category}</span> },
    {
      key: "last",
      header: "Last message",
      render: (row) => (
        <span className="fk-muted fksup-preview">
          {row.lastMessage ? `${row.lastMessage.author === "agent" ? "Support: " : ""}${row.lastMessage.preview}` : "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (row) => <SupportStatusBadge status={row.status} /> },
    { key: "updated", header: "Updated", render: (row) => <span className="fk-muted">{timeAgo(row.lastMessageAt)}</span> },
  ];

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;

  return (
    <div className="fksup">
      <AdminPageHeader
        title="Support Inbox"
        description="Requests from Help & Support: Contact Support messages, problem reports and live chats."
        actions={
          <button
            type="button"
            className={`fk-btn ${liveChat ? "fk-btn--primary" : ""}`}
            onClick={() => void toggleLiveChat()}
            disabled={liveChat === null || toggling}
            aria-pressed={Boolean(liveChat)}
          >
            <Headset size={16} /> {liveChat ? "Live chat: Online" : "Live chat: Offline"}
          </button>
        }
      />

      {stats && (
        <div className="fksup-kpis">
          {(["open", "in_progress", "awaiting_user", "resolved"] as SupportStatus[]).map((s) => (
            <button key={s} type="button" className={`fksup-kpi ${status === s ? "is-active" : ""}`} onClick={() => update("status", s)}>
              <span>{STATUS_LABELS[s]}</span>
              <strong>{stats.byStatus[s] ?? 0}</strong>
            </button>
          ))}
          <div className="fksup-kpi">
            <span>Unread</span>
            <strong>{stats.unread}</strong>
          </div>
        </div>
      )}

      {error ? (
        <AdminErrorState message={error} onRetry={() => void load()} />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(row) => row.id}
          loading={loading}
          emptyTitle="No support requests"
          emptyDescription="Requests from Help & Support appear here."
          onRowClick={(row) => navigate(`/admin/support/cases/${row.id}`)}
          toolbar={
            <div className="fk-toolbar">
              <form
                className="fk-search fk-toolbar__grow"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  update("q", search.trim());
                }}
              >
                <Search size={16} aria-hidden="true" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject or FK- reference" aria-label="Search requests" />
              </form>
              <select className="fk-select" value={status} onChange={(e) => update("status", e.target.value)} aria-label="Status">
                <option value="active">Needs attention</option>
                <option value="all">All requests</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select className="fk-select" value={kind} onChange={(e) => update("kind", e.target.value)} aria-label="Type">
                <option value="">All types</option>
                <option value="question">Contact Support</option>
                <option value="problem">Problem reports</option>
                <option value="chat">Live chats</option>
              </select>
            </div>
          }
          footer={
            data && data.total > 20 ? (
              <div className="fksup-pagination">
                <span className="fk-muted">Page {page} of {totalPages} · {data.total} requests</span>
                <span>
                  <button type="button" className="fk-btn fk-btn--sm" disabled={page <= 1} onClick={() => update("page", String(page - 1))}>Previous</button>{" "}
                  <button type="button" className="fk-btn fk-btn--sm" disabled={!data.hasMore} onClick={() => update("page", String(page + 1))}>Next</button>
                </span>
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
