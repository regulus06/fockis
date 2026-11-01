import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Flag, Search, SquareArrowOutUpRight } from "lucide-react";

import { moderationApi } from "../../moderation/moderationApi";
import { REASON_OPTIONS } from "../../moderation/moderationTypes";
import { Card, Pager, PersonCell, PriorityPill, SmEmpty, SmError, SmLoading, StatusPill, timeAgo, useAdminQuery } from "../components/SmParts";
import RowMenu from "../components/RowMenu";

const TABS = [
  { value: "open", label: "Open" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Violation confirmed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "", label: "All" },
];

/**
 * Reported posts and accounts. Reports never hide anything by themselves:
 * each case is reviewed on the case page, where a moderator decides.
 */
export default function ContentReportsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.has("status") ? params.get("status") ?? "" : "open";
  const targetType = params.get("target") ?? "";
  const reason = params.get("reason") ?? "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(q);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const list = useAdminQuery(
    () => moderationApi.cases({ status: status || undefined, targetType: targetType || undefined, reason: reason || undefined, q: q || undefined, sort: "newest", page, limit: 20 }),
    [status, targetType, reason, q, page],
  );

  return (
    <Card title="Content Reports" icon={<Flag size={20} />}>
      <div className="fksm-tabs" role="tablist" aria-label="Report status">
        {TABS.map((t) => (
          <button key={t.label} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => set("status", t.value === "open" ? null : t.value)}>
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
            set("q", draft.trim() || null);
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search content or username…" aria-label="Search reports" />
        </form>
        <select className="fksm-select" value={targetType} onChange={(e) => set("target", e.target.value || null)} aria-label="Reported item">
          <option value="">Posts and accounts</option>
          <option value="post">Posts</option>
          <option value="account">Accounts</option>
        </select>
        <select className="fksm-select" value={reason} onChange={(e) => set("reason", e.target.value || null)} aria-label="Reason">
          <option value="">All reasons</option>
          {REASON_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Flag size={24} />} title="No reports here" text="Reports from users appear here for review. A report on its own never hides a post." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Reported content</th>
                  <th>Reason</th>
                  <th>Reported user</th>
                  <th>Reports</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Latest</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((c) => (
                  <tr key={c.id} className="is-clickable" onClick={() => navigate(`/admin/moderation/cases/${c.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong title={c.preview}>{c.preview || (c.targetType === "post" ? "Post" : "Account")}</strong>
                        <span>{c.targetType === "post" ? `Post #${c.targetId.slice(-6).toUpperCase()}` : "Account report"}</span>
                      </span>
                    </td>
                    <td>{c.topReasonLabel}</td>
                    <td><PersonCell person={c.reportedUser} /></td>
                    <td>
                      <b>{c.eligibleReporterCount}</b>
                      <span className="fksm-muted"> / {c.totalReportCount}</span>
                    </td>
                    <td><StatusPill status={c.status} /></td>
                    <td><PriorityPill priority={c.priority} /></td>
                    <td className="fksm-date">{timeAgo(c.latestReportAt)}</td>
                    <td className="fksm-actions-cell">
                      <RowMenu
                        items={[
                          { label: "Review case", icon: <SquareArrowOutUpRight size={15} />, onSelect: () => navigate(`/admin/moderation/cases/${c.id}`) },
                          ...(c.postId ? [{ label: "View post", icon: <Eye size={15} />, onSelect: () => navigate(`/admin/support/posts/${c.postId}`) }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fksm-muted" style={{ fontSize: 12.5, marginTop: 8 }}>Reports column: eligible reporters / all reports.</p>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </Card>
  );
}
