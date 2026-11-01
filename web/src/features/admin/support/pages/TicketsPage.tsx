import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Ticket } from "lucide-react";

import type { SupportKind, SupportPriority, SupportStatus } from "../../../support/types";
import { KIND_LABELS } from "../../../support/utils/helpFormat";
import { Card, Pager, PersonCell, PriorityPill, SmEmpty, SmError, SmLoading, StatusPill, timeAgo, useAdminQuery } from "../components/SmParts";
import { supportAdminApi } from "../supportAdminApi";

const STATUS_OPTIONS: { value: SupportStatus | "active" | "all"; label: string }[] = [
  { value: "active", label: "All open" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_user", label: "Waiting for User" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All statuses" },
];

export default function TicketsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as SupportStatus | "active" | "all") || "active";
  const kind = (params.get("kind") as SupportKind) || "";
  const priority = (params.get("priority") as SupportPriority) || "";
  const assigned = (params.get("assigned") as "me" | "unassigned") || "";
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
    () => supportAdminApi.tickets({ status, kind: kind || undefined, priority: priority || undefined, assigned: assigned || undefined, search: search || undefined, page }),
    [status, kind, priority, assigned, search, page],
  );

  return (
    <Card title="Support Tickets" icon={<Ticket size={20} />}>
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
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search subject or ticket number…" aria-label="Search tickets" />
        </form>
        <select className="fksm-select" value={status} onChange={(e) => set("status", e.target.value === "active" ? "" : e.target.value)} aria-label="Status">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select className="fksm-select" value={kind} onChange={(e) => set("kind", e.target.value)} aria-label="Type">
          <option value="">All types</option>
          {(Object.keys(KIND_LABELS) as SupportKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>
        <select className="fksm-select" value={priority} onChange={(e) => set("priority", e.target.value)} aria-label="Priority">
          <option value="">Any priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="fksm-select" value={assigned} onChange={(e) => set("assigned", e.target.value)} aria-label="Assignment">
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Ticket size={24} />} title="No tickets match" text="Try another status or clear the search." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Subject</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((t) => (
                  <tr key={t.id} className="is-clickable" onClick={() => navigate(`/admin/support/${t.kind === "chat" ? "live" : "tickets"}/${t.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{t.number}</strong>
                        <span>{KIND_LABELS[t.kind]}</span>
                      </span>
                    </td>
                    <td>
                      <span className="fksm-subject">
                        <strong title={t.subject}>
                          {t.unread && <span className="fksm-pill fksm-pill--blue" style={{ marginRight: 6, padding: "0 7px" }}>New reply</span>}
                          {t.subject}
                        </strong>
                        <span>{t.lastMessage ? `${t.lastMessage.author === "agent" ? "Support: " : ""}${t.lastMessage.preview}` : "No messages"}</span>
                      </span>
                    </td>
                    <td><PersonCell person={t.user} /></td>
                    <td><StatusPill status={t.status} /></td>
                    <td><PriorityPill priority={t.priority} /></td>
                    <td><PersonCell person={t.assignedTo} fallback="Unassigned" /></td>
                    <td className="fksm-date">{timeAgo(t.lastMessageAt)}</td>
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
