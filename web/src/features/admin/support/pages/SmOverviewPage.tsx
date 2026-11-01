import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, Copy, Eye, EyeOff, Flag, Inbox, SquareArrowOutUpRight, Ticket, Zap } from "lucide-react";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, PersonCell, PriorityPill, SmEmpty, SmError, SmLoading, StatusPill, TypeBadge, ViewAll, timeAgo, useAdminQuery } from "../components/SmParts";
import RowMenu from "../components/RowMenu";
import { supportAdminApi, type RecentItem } from "../supportAdminApi";
import { useSupportMod } from "../layout/SupportModLayout";

const P = PERMISSIONS;
type Tab = "all" | "feedback" | "ticket" | "report";

export default function SmOverviewPage() {
  const { can } = useAdminAccess();
  const navigate = useNavigate();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { dashboard } = useSupportMod();
  const [tab, setTab] = useState<Tab>("all");
  const canSupport = can([P.SUPPORT_VIEW]);
  const canModerate = can([P.MODERATION_VIEW]);

  const recent = useAdminQuery(() => (canSupport ? supportAdminApi.recent() : Promise.resolve([] as RecentItem[])), [canSupport]);
  const rows = useMemo(() => (recent.data ?? []).filter((r) => tab === "all" || r.type === tab).slice(0, 8), [recent.data, tab]);

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "all", label: "All", show: true },
    { id: "feedback", label: "Feedback", show: canSupport },
    { id: "ticket", label: "Tickets", show: canSupport },
    { id: "report", label: "Reports", show: canModerate },
  ];

  const viewAll = tab === "feedback" ? "/admin/support/feedback" : tab === "report" ? "/admin/support/reports" : "/admin/support/tickets";

  const quick = [
    { show: canModerate, to: "/admin/support/reports", label: "Review Reports", icon: <Flag size={18} />, tone: "red" },
    { show: canSupport, to: "/admin/support/tickets", label: "Manage Tickets", icon: <Ticket size={18} />, tone: "purple" },
    { show: canModerate, to: "/admin/support/hidden-posts?view=visible", label: "Hide a Post", icon: <EyeOff size={18} />, tone: "red" },
    { show: canModerate, to: "/admin/support/hidden-posts", label: "Restore a Post", icon: <Eye size={18} />, tone: "blue" },
    { show: can([P.HELP_CONTENT_MANAGE]), to: "/admin/support/articles/new", label: "Write Help Article", icon: <BookOpen size={18} />, tone: "blue" },
  ].filter((q) => q.show);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("success", "Reference copied.");
    } catch {
      toast("error", "Couldn't copy to the clipboard.");
    }
  };

  return (
    <div className="fksm-split">
      <Card title="Recent Reports & Tickets" action={<ViewAll to={viewAll} />}>
        <div className="fksm-tabs" role="tablist" aria-label="Filter recent items">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
        </div>

        {recent.loading && !recent.data ? (
          <SmLoading />
        ) : recent.error ? (
          <SmError message={recent.error} onRetry={recent.refetch} />
        ) : rows.length === 0 ? (
          <SmEmpty icon={<Inbox size={24} />} title="Nothing here yet" text="New feedback, support requests and content reports will appear here as they arrive." />
        ) : (
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Subject / Content</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Date</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="is-clickable" onClick={() => navigate(row.link)}>
                    <td><TypeBadge type={row.type} /></td>
                    <td>
                      <span className="fksm-subject">
                        <strong title={row.subject}>{row.subject}</strong>
                        <span>{row.reference}</span>
                      </span>
                    </td>
                    <td><PersonCell person={row.user} /></td>
                    <td><StatusPill status={row.status} /></td>
                    <td><PriorityPill priority={row.priority} /></td>
                    <td className="fksm-date">{timeAgo(row.at)}</td>
                    <td className="fksm-actions-cell">
                      <RowMenu
                        items={[
                          { label: "Open", icon: <SquareArrowOutUpRight size={15} />, onSelect: () => navigate(row.link) },
                          { label: "Copy reference", icon: <Copy size={15} />, onSelect: () => void copy(row.reference) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Quick Actions" icon={<Zap size={20} />}>
        <div className="fksm-quick">
          {quick.map((q) => (
            <Link key={q.label} to={q.to}>
              <span className={`fksm-quick__icon fksm-quick__icon--${q.tone}`}>{q.icon}</span>
              <span className="fksm-quick__label">{q.label}</span>
              <ChevronRight size={18} />
            </Link>
          ))}
        </div>
        {dashboard && (
          <dl className="fksm-facts" style={{ marginTop: 16 }}>
            <div>
              <dt>High-priority items</dt>
              <dd>{dashboard.highPriority}</dd>
            </div>
            <div>
              <dt>Unread replies</dt>
              <dd>{dashboard.unreadTickets}</dd>
            </div>
            <div>
              <dt>Active live chats</dt>
              <dd>{dashboard.liveChats}</dd>
            </div>
            <div>
              <dt>Avg. first response (30 days)</dt>
              <dd>{dashboard.avgFirstResponseMinutes == null ? "No data yet" : formatMinutes(dashboard.avgFirstResponseMinutes)}</dd>
            </div>
          </dl>
        )}
      </Card>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const h = minutes / 60;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} h`;
  return `${Math.round(h / 24)} days`;
}
