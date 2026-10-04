import { Link } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { useMailchimp } from "../../hooks/useMailchimp";
import { useMarketingWorkspace } from "../../hooks/useMarketingWorkspace";
import { agencyApi } from "../../services/agencyApi";
import { applicationsApi } from "../../services/applicationsApi";
import { creditsApi } from "../../services/creditsApi";
import { KpiBand } from "../../components/MarketingKpiCard";
import { BusinessMark } from "../../components/WorkspaceSwitcher";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Badge, DemoBadge } from "../../components/ui/Badge";
import { LinkButton } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_TONES, APPROVAL_STATUS_LABELS, BUSINESS_TYPE_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES } from "../../utils/platformLabels";
import { creditThresholds } from "../../data/billingMockData";
import { levelOf } from "../../utils/credits";
import { formatCurrency, formatDate, formatNumber, formatPercent, timeAgo } from "../../utils/format";
import type { AnalyticsMetric } from "../../types/mailchimp.types";

export default function AgencyDashboardPage() {
  const { isMock } = useMailchimp();
  const { businesses, switchBusiness } = useMarketingWorkspace();
  const dash = useAsync(() => agencyApi.getDashboard(), []);
  const apps = useAsync(() => applicationsApi.getApplications({ status: "all" }), []);
  const approvals = useAsync(() => agencyApi.getApprovals(), []);
  const tasks = useAsync(() => agencyApi.getTasks(), []);
  const activity = useAsync(() => agencyApi.getActivity(), []);
  const balances = useAsync(() => creditsApi.listClientBalances(), []);

  const name = (id: string) => businesses.find((b) => b.id === id)?.name ?? "Client";
  const t = dash.data?.totals;
  const metrics: AnalyticsMetric[] | undefined = t && [
    { key: "clients", label: "Total clients", value: t.clients, format: "number", changePct: 14.3, sparkline: [4, 5, 5, 6, 6, 7, t.clients] },
    { key: "active", label: "Active clients", value: t.activeClients, format: "number", changePct: 0, sparkline: [4, 4, 5, 5, 6, 6, t.activeClients] },
    { key: "apps", label: "Open applications", value: t.applications, format: "number", changePct: 25, sparkline: [1, 2, 1, 3, 2, 3, t.applications] },
    { key: "campaigns", label: "Active campaigns", value: t.activeCampaigns, format: "number", changePct: 8, sparkline: [3, 4, 4, 5, 5, 6, t.activeCampaigns] },
    { key: "contacts", label: "Total contacts", value: t.contacts, format: "number", changePct: 6.1, sparkline: [18, 19, 20, 21, 21, 22, 22.4] },
    { key: "emails", label: "Emails sent", value: t.emailsSent, format: "number", changePct: 11.2, sparkline: [30, 34, 31, 38, 40, 44, 47] },
    { key: "leads", label: "Leads", value: t.leads, format: "number", changePct: 9.4, sparkline: [8, 9, 10, 11, 11, 12, 13] },
    { key: "conv", label: "Conversions", value: t.conversions, format: "number", changePct: 4.8, sparkline: [5, 5, 6, 6, 7, 7, 8] },
    { key: "revenue", label: "Client revenue", value: t.revenue, format: "currency", changePct: 17.6, sparkline: [60, 66, 70, 74, 80, 86, 91] },
  ];

  const newApps = (apps.data ?? []).filter((a) => a.status === "NEW" || a.status === "UNDER_REVIEW").slice(0, 4);
  const pending = (approvals.data ?? []).filter((a) => a.status === "pending_approval" || a.status === "changes_requested");
  const upcoming = (approvals.data ?? []).filter((a) => a.status === "scheduled" || a.status === "approved");
  const openTasks = (tasks.data ?? []).filter((x) => x.status !== "completed").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const lowCredit = (balances.data ?? []).filter((b) => levelOf(b, "email", creditThresholds) !== "normal" || levelOf(b, "sms", creditThresholds) !== "normal");

  return (
    <div className="fm-page">
      <PageHeader
        title="Agency dashboard"
        description="Every client you market for, in one place."
        actions={<>{isMock && <DemoBadge />}<LinkButton to={MARKETING_ROUTES.applications} icon="form">Review applications</LinkButton><LinkButton to={MARKETING_ROUTES.newClient} variant="primary" icon="plus">Add client</LinkButton></>}
      />
      {dash.error ? <ErrorState message={dash.error} onRetry={dash.reload} /> : <KpiBand metrics={metrics} loading={!metrics} count={9} />}

      {lowCredit.length > 0 && (
        <div className="fm-creditalert is-low">
          <span className="fm-row fm-row--wrap"><strong>{lowCredit.length} client{lowCredit.length === 1 ? " is" : "s are"} low on credits:</strong> {lowCredit.map((b) => name(b.businessId)).join(", ")}</span>
          <div className="fm-creditalert__actions"><LinkButton size="sm" to={MARKETING_ROUTES.agencyCredits}>Manage client credits</LinkButton></div>
        </div>
      )}

      <div className="fm-grid fm-grid--three">
        <Panel title="New applications" actions={<Link className="fm-linkbtn" to={MARKETING_ROUTES.applications}>View all</Link>}>
          {apps.loading ? <Skeleton height={160} /> : newApps.length === 0 ? <EmptyState compact icon="form" title="No new applications" body="Share fockis.com/marketing/request with businesses." /> : (
            <ul className="fm-rowlist">
              {newApps.map((a) => (
                <li key={a.id}>
                  <div>
                    <Link to={MARKETING_ROUTES.application(a.id)}>{a.business.name}</Link>
                    <small>{BUSINESS_TYPE_LABELS[a.business.type]} · {timeAgo(a.createdAt)}</small>
                  </div>
                  <Badge tone={APPLICATION_STATUS_TONES[a.status]} dot>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Pending approvals" actions={<Link className="fm-linkbtn" to={MARKETING_ROUTES.approvals}>Open approvals</Link>}>
          {approvals.loading ? <Skeleton height={160} /> : pending.length === 0 ? <EmptyState compact icon="check" title="Nothing waiting" body="Campaigns sent for client approval appear here." /> : (
            <ul className="fm-rowlist">
              {pending.map((a) => (
                <li key={a.id}>
                  <div><Link to={MARKETING_ROUTES.approvals}>{a.campaignName}</Link><small>{name(a.businessId)} · {timeAgo(a.requestedAt)}</small></div>
                  <Badge tone={a.status === "changes_requested" ? "red" : "amber"} dot>{APPROVAL_STATUS_LABELS[a.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming campaigns">
          {approvals.loading ? <Skeleton height={160} /> : upcoming.length === 0 ? <EmptyState compact icon="calendar" title="Nothing scheduled" body="Approved campaigns with a send date show up here." /> : (
            <ul className="fm-rowlist">
              {upcoming.map((a) => (
                <li key={a.id}><div><strong>{a.campaignName}</strong><small>{name(a.businessId)}</small></div><span className="fm-small fm-muted">{a.scheduledFor ? formatDate(a.scheduledFor) : "Approved"}</span></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="fm-grid fm-grid--main">
        <Panel title="Client reports" className="fm-span-2" flush actions={<LinkButton size="sm" variant="ghost" to={MARKETING_ROUTES.agencyReports}>Full report</LinkButton>}>
          {!dash.data ? <Skeleton height={220} /> : (
            <div className="fm-tablewrap"><table className="fm-table">
              <thead><tr><th scope="col">Client</th><th scope="col" className="is-num">Contacts</th><th scope="col" className="is-num">Open rate</th><th scope="col" className="is-num">Click rate</th><th scope="col" className="is-num">Revenue</th><th scope="col"><span className="fm-sr">Open</span></th></tr></thead>
              <tbody>{dash.data.summaries.map((s) => {
                const b = businesses.find((x) => x.id === s.businessId);
                if (!b) return null;
                return (
                  <tr key={s.businessId}>
                    <td className="fm-table__primary"><div className="fm-person"><BusinessMark business={b} size={28} /><div><Link to={MARKETING_ROUTES.client(b.id)}>{b.name}</Link><span className="fm-table__sub">{BUSINESS_TYPE_LABELS[b.type]}</span></div></div></td>
                    <td className="is-num">{formatNumber(s.contacts)}</td>
                    <td className="is-num">{s.openRate ? formatPercent(s.openRate) : "—"}</td>
                    <td className="is-num">{s.clickRate ? formatPercent(s.clickRate) : "—"}</td>
                    <td className="is-num">{formatCurrency(s.revenue)}</td>
                    <td className="is-actions"><Link className="fm-linkbtn" to={MARKETING_ROUTES.overview} onClick={() => switchBusiness(b.id)}>Open</Link></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </Panel>

        <div className="fm-stack">
          <Panel title="Agency tasks" actions={<Link className="fm-linkbtn" to={MARKETING_ROUTES.tasks}>All tasks</Link>}>
            {tasks.loading ? <Skeleton height={140} /> : (
              <ul className="fm-rowlist">
                {openTasks.map((x) => (
                  <li key={x.id}><div><strong>{x.title}</strong><small>{name(x.businessId)} · due {formatDate(x.dueDate)}</small></div><Badge tone={TASK_PRIORITY_TONES[x.priority]}>{TASK_PRIORITY_LABELS[x.priority]}</Badge></li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Recent client activity">
            {activity.loading ? <Skeleton height={140} /> : (
              <ul className="fm-activity">
                {(activity.data ?? []).slice(0, 6).map((a) => (
                  <li key={a.id}><span className="fm-activity__icon"><span className="fm-sr">Activity</span>•</span><div><p>{a.text}</p><time>{timeAgo(a.at)}</time></div></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
