import type { AnalyticsMetric } from "../types/mailchimp.types";
import { formatMetric } from "../utils/format";
import { Trend } from "./ui/Badge";
import { Sparkline } from "./AnalyticsChart";
import { Skeleton } from "./ui/Feedback";

export function MarketingKpiCard({ metric }: { metric: AnalyticsMetric }) {
  const good = metric.invert ? metric.changePct <= 0 : metric.changePct >= 0;
  return (
    <div className="fm-kpi">
      <span className="fm-kpi__label">{metric.label}</span>
      <span className="fm-kpi__value">{formatMetric(metric.value, metric.format)}</span>
      <div className="fm-kpi__foot">
        <Trend value={metric.changePct} invert={metric.invert} />
        <Sparkline values={metric.sparkline} color={good ? "#1f5eff" : "#d64545"} label={`${metric.label} trend`} />
      </div>
    </div>
  );
}

/** The dashboard KPI band: one connected surface instead of eight floating cards. */
export function KpiBand({ metrics, loading, count = 8 }: { metrics?: AnalyticsMetric[]; loading?: boolean; count?: number }) {
  return (
    <div className="fm-kpiband" role="list" aria-label="Key metrics" aria-busy={loading || undefined}>
      {loading || !metrics
        ? Array.from({ length: count }, (_, i) => (
            <div className="fm-kpi" key={i} role="listitem">
              <Skeleton width="55%" height={12} />
              <Skeleton width="70%" height={26} />
              <Skeleton width="40%" height={12} />
            </div>
          ))
        : metrics.map((m) => (
            <div role="listitem" key={m.key} className="fm-kpiband__cell">
              <MarketingKpiCard metric={m} />
            </div>
          ))}
    </div>
  );
}
