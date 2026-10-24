import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Flag, Gavel, Inbox, ShieldBan, Scale, XCircle } from "lucide-react";

import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminErrorState, AdminLoadingState } from "../../components/AdminStates";
import { moderationApi, moderationError } from "../moderationApi";
import { ACTION_LABELS, type ModerationStats } from "../moderationTypes";
import { ModerationTabs, PersonCell, formatRelative } from "../components/ModerationParts";

function Kpi({
  label,
  value,
  icon,
  tone,
  to,
  meta,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: "blue" | "navy" | "cyan" | "amber" | "red" | "green" | "slate";
  to?: string;
  meta?: string;
}) {
  const body = (
    <>
      <span className={`fkmod-kpi__icon fkmod-kpi__icon--${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="fkmod-kpi__body">
        <span className="fkmod-kpi__label">{label}</span>
        <strong className="fkmod-kpi__value">{value.toLocaleString()}</strong>
        {meta && <span className="fkmod-kpi__meta">{meta}</span>}
      </span>
    </>
  );

  return to ? (
    <Link to={to} className="fkmod-kpi fkmod-kpi--link">
      {body}
    </Link>
  ) : (
    <div className="fkmod-kpi">{body}</div>
  );
}

export default function ModerationOverviewPage() {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setStats(await moderationApi.stats());
    } catch (caught) {
      setError(moderationError(caught, "Couldn't load moderation statistics."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="fk-page fkmod">
      <AdminPageHeader
        title="Moderation"
        description="Reports from the community, grouped into cases for review. Reports never punish anyone on their own."
        actions={
          <Link className="fk-btn fk-btn--primary" to="/admin/moderation/cases">
            Open queue
          </Link>
        }
      />

      <ModerationTabs />

      {loading && !stats && <AdminLoadingState label="Loading moderation overview…" />}
      {error && !stats && <AdminErrorState message={error} onRetry={() => void load()} />}

      {stats && (
        <>
          <section className="fkmod-kpi-grid" aria-label="Moderation statistics">
            <Kpi label="Total reports" value={stats.totalReports} icon={<Flag size={20} />} tone="blue" meta={`${stats.reportsLast24h} in the last 24h`} />
            <Kpi label="Pending cases" value={stats.pending} icon={<Inbox size={20} />} tone="navy" to="/admin/moderation/cases?status=pending" />
            <Kpi label="Under review" value={stats.underReview + stats.actionRequired} icon={<Gavel size={20} />} tone="cyan" to="/admin/moderation/cases?status=under_review" meta={`${stats.actionRequired} action required`} />
            <Kpi label="High priority open" value={stats.highPriorityOpen} icon={<AlertTriangle size={20} />} tone="red" to="/admin/moderation/cases?priority=high" meta={`${stats.escalated} escalated`} />
            <Kpi label="Confirmed violations" value={stats.confirmedViolations} icon={<CheckCircle2 size={20} />} tone="green" to="/admin/moderation/cases?status=resolved" meta={`${stats.reversedDecisions} reversed`} />
            <Kpi label="Dismissed" value={stats.dismissed} icon={<XCircle size={20} />} tone="slate" to="/admin/moderation/cases?status=dismissed" />
            <Kpi label="Restricted accounts" value={stats.restrictedAccounts} icon={<ShieldBan size={20} />} tone="amber" />
            <Kpi label="Pending appeals" value={stats.pendingAppeals} icon={<Scale size={20} />} tone="navy" to="/admin/moderation/appeals" />
          </section>

          <section className="fk-panel">
            <div className="fk-panel__header">
              <h2>Recent moderation activity</h2>
              <Link className="fk-panel__link" to="/admin/moderation/cases?status=all&sort=newest">
                View all cases
              </Link>
            </div>
            <div className="fk-panel__body">
              {stats.recentActivity.length === 0 ? (
                <p className="fk-muted fkmod-empty-line">No moderator actions yet.</p>
              ) : (
                <ul className="fkmod-activity">
                  {stats.recentActivity.map((item, index) => (
                    <li key={`${item.caseId}-${item.at}-${index}`}>
                      <PersonCell person={item.actor} fallback="System" />
                      <span className="fkmod-activity__what">
                        <strong>{ACTION_LABELS[item.action] ?? item.action.replace(/_/g, " ")}</strong>
                        <span>
                          on a {item.targetType === "post" ? "post" : "account"} case
                          {item.reason ? ` — ${item.reason}` : ""}
                        </span>
                      </span>
                      <span className="fkmod-activity__when">{formatRelative(item.at)}</span>
                      <Link className="fk-btn fk-btn--ghost fk-btn--sm" to={`/admin/moderation/cases/${item.caseId}`}>
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
