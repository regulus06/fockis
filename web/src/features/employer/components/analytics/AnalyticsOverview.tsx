
import '../styles/AnalyticsOverview.scss';

export type AnalyticsMetric = {
  id: string;
  label: string;
  value: number | string | null;
  description?: string;
  change?: number | null;
  changeLabel?: string;
  icon?: 'jobs' | 'applicants' | 'interviews' | 'hires';
};

export type AnalyticsOverviewProps = {
  metrics: AnalyticsMetric[];
  loading?: boolean;
  error?: string | null;
  periodLabel?: string;
  onRetry?: () => void;
};

const DEFAULT_ICONS: Record<string, string> = {
  jobs: '▤',
  applicants: '♙',
  interviews: '▣',
  hires: '✓',
};

function formatValue(value: AnalyticsMetric['value']): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value);
  }

  return value;
}

function formatChange(change: number): string {
  const absoluteChange = Math.abs(change);
  const formatted = Number.isInteger(absoluteChange)
    ? absoluteChange.toString()
    : absoluteChange.toFixed(1);

  return `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatted}%`;
}

function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  const hasChange =
    typeof metric.change === 'number' && Number.isFinite(metric.change);

  const changeClass =
    !hasChange || metric.change === 0
      ? 'neutral'
      : metric.change > 0
        ? 'positive'
        : 'negative';

  return (
    <article className="analytics-overview__card">
      <div className="analytics-overview__card-top">
        <span className="analytics-overview__label">{metric.label}</span>

        <span
          className={`analytics-overview__icon analytics-overview__icon--${metric.icon ?? 'default'}`}
          aria-hidden="true"
        >
          {DEFAULT_ICONS[metric.icon ?? ''] ?? '◈'}
        </span>
      </div>

      <div className="analytics-overview__value">
        {formatValue(metric.value)}
      </div>

      <div className="analytics-overview__footer">
        {hasChange ? (
          <span
            className={`analytics-overview__change analytics-overview__change--${changeClass}`}
          >
            {formatChange(metric.change!)}
          </span>
        ) : (
          <span className="analytics-overview__change analytics-overview__change--neutral">
            No comparison
          </span>
        )}

        <span className="analytics-overview__description">
          {metric.changeLabel ?? metric.description ?? 'Compared with previous period'}
        </span>
      </div>
    </article>
  );
}

export function AnalyticsOverview({
  metrics,
  loading = false,
  error = null,
  periodLabel = 'Selected period',
  onRetry,
}: AnalyticsOverviewProps) {
  if (error) {
    return (
      <section
        className="analytics-overview analytics-overview--message"
        aria-label="Analytics overview"
        role="alert"
      >
        <div>
          <h2>Unable to load analytics</h2>
          <p>{error}</p>
        </div>

        {onRetry && (
          <button
            type="button"
            className="analytics-overview__retry"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      className="analytics-overview"
      aria-label="Analytics overview"
      aria-busy={loading}
    >
      <div className="analytics-overview__heading">
        <div>
          <h2>Hiring overview</h2>
          <p>Your recruitment performance at a glance.</p>
        </div>

        <span className="analytics-overview__period">{periodLabel}</span>
      </div>

      {loading ? (
        <div className="analytics-overview__grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="analytics-overview__skeleton"
              key={index}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <div className="analytics-overview__empty">
          <span className="analytics-overview__empty-icon" aria-hidden="true">
            ◈
          </span>
          <h3>No analytics available</h3>
          <p>
            Analytics will appear here when recruitment activity is available
            for the selected period.
          </p>
        </div>
      ) : (
        <div className="analytics-overview__grid">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}
    </section>
  );
}

export default AnalyticsOverview;
