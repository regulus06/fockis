import { Link } from "react-router-dom";
import { ArrowRight, ArrowUp, CalendarDays, CircleCheck, Clock3, Database, FileText, Layers, Pencil, ShieldCheck, Users, Zap } from "lucide-react";

import { SmError, SmLoading, useAdminQuery } from "../../support/components/SmParts";
import PolicyLibrary from "../components/PolicyLibrary";
import { activityInfo, Workflow } from "../components/PolicyParts";
import { PC_BASE, usePolicyContext } from "../PolicyLayout";
import { policyAdminApi } from "../policyAdminApi";

const fmt = (iso?: string | null, withTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return withTime ? d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export function PolicyStatsRow() {
  const { stats, statsFailed } = usePolicyContext();
  const v = (n: number | undefined) => (stats && n !== undefined ? n.toLocaleString() : statsFailed ? "—" : "…");
  const cards = [
    { tone: "blue", icon: FileText, value: v(stats?.activePolicies), label: "Active Policies", sub: stats ? <span className="fkpc-up"><ArrowUp size={14} aria-hidden /> {stats.publishedThisMonth} this month</span> : null, to: `${PC_BASE}/policies` },
    { tone: "purple", icon: Clock3, value: v(stats?.pendingApproval), label: "Pending Approval", sub: stats ? (stats.pendingApproval ? <span className="fkpc-warn">Requires review</span> : <span>Nothing waiting</span>) : null, to: `${PC_BASE}/approvals` },
    { tone: "amber", icon: CalendarDays, value: v(stats?.scheduledUpdates), label: "Scheduled Updates", sub: stats ? <span>{stats.nextScheduled ? `Next: ${fmt(stats.nextScheduled)}` : "None scheduled"}</span> : null, to: `${PC_BASE}/versions?status=scheduled` },
    { tone: "sky", icon: Layers, value: v(stats?.policyVersions), label: "Policy Versions", sub: <span>All time</span>, to: `${PC_BASE}/versions` },
    { tone: "green", icon: Users, value: v(stats?.userAcceptances), label: "User Acceptances", sub: stats ? <span className="fkpc-up"><ArrowUp size={14} aria-hidden /> +{stats.acceptancesThisWeek.toLocaleString()} this week</span> : null, to: `${PC_BASE}/acceptances` },
  ];
  return (
    <section className="fkpc-stats" aria-label="Summary">
      {cards.map((c) => (
        <Link key={c.label} to={c.to} className={`fkpc-stat fkpc-stat--${c.tone}`}>
          <span className="fkpc-stat__icon">
            <c.icon size={30} strokeWidth={1.9} aria-hidden />
          </span>
          <span className="fkpc-stat__body">
            <strong>{c.value}</strong>
            <b>{c.label}</b>
            <span className="fkpc-stat__sub">{c.sub}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

function RecentActivity() {
  const { data, loading, error, refetch } = useAdminQuery(() => policyAdminApi.activity(), []);
  return (
    <section className="fksm-card fkpc-side-card">
      <div className="fksm-card__head">
        <h2>
          <Clock3 size={22} aria-hidden /> Recent Policy Activity
        </h2>
        <Link to={`${PC_BASE}/audit`} className="fksm-link">
          View All <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
      {loading && !data ? (
        <SmLoading />
      ) : error ? (
        <SmError message={error} onRetry={() => void refetch()} />
      ) : !data?.items.length ? (
        <p className="fksm-muted">No policy activity yet.</p>
      ) : (
        <ul className="fkpc-activity">
          {data.items.slice(0, 4).map((e) => {
            const a = activityInfo(e);
            const Icon = a.icon;
            return (
              <li key={e.id}>
                <span className={`fkpc-activity__icon fkpc-tone--${a.tone}`}>
                  <Icon size={19} aria-hidden />
                </span>
                <span className="fkpc-activity__text">
                  <strong>{a.title}</strong>
                  <small>
                    {fmt(e.at, true)}
                    {e.actor?.username ? ` • ${e.actor.username}` : e.actor?.name ? ` • ${e.actor.name}` : ""}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function QuickActions() {
  const { stats } = usePolicyContext();
  return (
    <section className="fksm-card fkpc-side-card">
      <div className="fksm-card__head">
        <h2>
          <Zap size={22} aria-hidden /> Quick Actions
        </h2>
      </div>
      <div className="fkpc-quick">
        <Link to={`${PC_BASE}/policies?status=published`}>
          <Pencil size={20} aria-hidden /> Edit Active Policy
        </Link>
        <Link to={`${PC_BASE}/versions`}>
          <Layers size={20} aria-hidden /> Manage Versions
        </Link>
        <Link to={`${PC_BASE}/approvals`}>
          <ShieldCheck size={20} aria-hidden /> View Approvals{stats?.pendingApproval ? <em>({stats.pendingApproval})</em> : null}
        </Link>
        <Link to="/admin/legal/retention">
          <Database size={20} aria-hidden /> Retention Settings
        </Link>
      </div>
    </section>
  );
}

export default function PolicyOverviewPage() {
  return (
    <>
      <PolicyStatsRow />
      <div className="fkpc-grid">
        <PolicyLibrary compact />
        <aside className="fkpc-side">
          <section className="fksm-card fkpc-side-card">
            <div className="fksm-card__head">
              <h2>
                <CircleCheck size={22} aria-hidden /> Policy Workflow
              </h2>
            </div>
            <Workflow />
          </section>
          <RecentActivity />
          <QuickActions />
        </aside>
      </div>
    </>
  );
}
