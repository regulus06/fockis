
import '../styles/EmployerStatsGrid.scss';

export type EmployerStatTrend = 'up' | 'down' | 'neutral';

export type EmployerStat = {
  id: string;
  label: string;
  value: number | string;
  description?: string | null;
  change?: number | null;
  changeLabel?: string | null;
  trend?: EmployerStatTrend;
  icon?: 'jobs' | 'applicants' | 'interviews' | 'hires' | 'views' | 'team' | 'custom';
  iconText?: string;
};

export type EmployerStatsGridProps = {
  stats: EmployerStat[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  columns?: 2 | 3 | 4;
  showChanges?: boolean;
  emptyMessage?: string;
  onStatClick?: (stat: EmployerStat) => void;
};

const ICONS: Record<NonNullable<EmployerStat['icon']>, string> = {
  jobs: '▤',
  applicants: '♙',
  interviews: '▦',
  hires: '✓',
  views: '◉',
  team: '♧',
  custom: '•',
};

function formatValue(value: number | string): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat().format(value);
  }

  return value;
}

function formatChange(value: number): string {
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(Math.abs(value));

  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatted}%`;
}

function StatsSkeleton({ columns }: { columns: number }) {
  return (
    <div
      className="employer-stats-grid__grid"
      style={{ '--stats-columns': columns } as React.CSSProperties}
      aria-label="Loading employer statistics"
      aria-busy="true"
    >
      {Array.from({ length: columns }).map((_, index) => (
        <div className="employer-stats-grid__skeleton" key={index}>
          <span className="employer-stats-grid__skeleton-icon" />
          <span className="employer-stats-grid__skeleton-label" />
          <span className="employer-stats-grid__skeleton-value" />
          <span className="employer-stats-grid__skeleton-description" />
        </div>
      ))}
    </div>
  );
}

export function EmployerStatsGrid({
  stats,
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  columns = 4,
  showChanges = true,
  emptyMessage = 'Employer statistics will appear here when account activity is available.',
  onStatClick,
}: EmployerStatsGridProps) {
  if (loading) {
    return (
      <section className="employer-stats-grid" aria-label="Employer statistics">
        <StatsSkeleton columns={columns} />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="employer-stats-grid"
        aria-label="Employer statistics"
      >
        <div className="employer-stats-grid__error" role="alert">
          <div>
            <strong>Unable to load employer statistics</strong>
            <p>{error}</p>
          </div>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled}
            >
              Retry
            </button>
          )}
        </div>
      </section>
    );
  }

  if (stats.length === 0) {
    return (
      <section
        className="employer-stats-grid"
        aria-label="Employer statistics"
      >
        <div className="employer-stats-grid__empty">
          <span aria-hidden="true">▥</span>
          <p>{emptyMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="employer-stats-grid"
      aria-label="Employer statistics"
    >
      <div
        className="employer-stats-grid__grid"
        style={{ '--stats-columns': columns } as React.CSSProperties}
      >
        {stats.map((stat) => {
          const icon = stat.icon ?? 'custom';
          const hasChange =
            showChanges &&
            typeof stat.change === 'number' &&
            Number.isFinite(stat.change);

          const trend =
            stat.trend ??
            (typeof stat.change === 'number'
              ? stat.change > 0
                ? 'up'
                : stat.change < 0
                  ? 'down'
                  : 'neutral'
              : 'neutral');

          const content = (
            <>
              <div className="employer-stats-grid__top">
                <span
                  className={`employer-stats-grid__icon employer-stats-grid__icon--${icon}`}
                  aria-hidden="true"
                >
                  {stat.iconText || ICONS[icon]}
                </span>

                {hasChange && (
                  <span
                    className={`employer-stats-grid__change employer-stats-grid__change--${trend}`}
                    aria-label={`${formatChange(stat.change!)} ${stat.changeLabel || ''}`}
                  >
                    <span aria-hidden="true">
                      {trend === 'up'
                        ? '↗'
                        : trend === 'down'
                          ? '↘'
                          : '→'}
                    </span>
                    {formatChange(stat.change!)}
                  </span>
                )}
              </div>

              <span className="employer-stats-grid__label">
                {stat.label}
              </span>

              <strong className="employer-stats-grid__value">
                {formatValue(stat.value)}
              </strong>

              {stat.description && (
                <span className="employer-stats-grid__description">
                  {stat.description}
                </span>
              )}

              {hasChange && stat.changeLabel && (
                <span className="employer-stats-grid__change-label">
                  {stat.changeLabel}
                </span>
              )}
            </>
          );

          return onStatClick ? (
            <button
              type="button"
              className="employer-stats-grid__card employer-stats-grid__card--interactive"
              key={stat.id}
              onClick={() => onStatClick(stat)}
              disabled={disabled}
              aria-label={`${stat.label}: ${formatValue(stat.value)}. View details`}
            >
              {content}
            </button>
          ) : (
            <article
              className="employer-stats-grid__card"
              key={stat.id}
            >
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default EmployerStatsGrid;
