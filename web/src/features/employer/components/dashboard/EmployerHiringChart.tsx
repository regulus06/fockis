
import { useMemo, useState } from 'react';
import '../styles/EmployerHiringChart.scss';

export type EmployerHiringPeriod = 'week' | 'month' | 'quarter' | 'year';

export type EmployerHiringDataPoint = {
  id: string;
  label: string;
  applications: number;
  interviews: number;
  hires: number;
};

export type EmployerHiringChartProps = {
  data: EmployerHiringDataPoint[];
  period?: EmployerHiringPeriod;
  onPeriodChange?: (period: EmployerHiringPeriod) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  showLegend?: boolean;
};

const PERIODS: Array<{
  value: EmployerHiringPeriod;
  label: string;
}> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const SERIES = [
  {
    key: 'applications',
    label: 'Applications',
    color: '#246bfd',
  },
  {
    key: 'interviews',
    label: 'Interviews',
    color: '#9b75d7',
  },
  {
    key: 'hires',
    label: 'Hires',
    color: '#91c83e',
  },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];

const CHART_WIDTH = 720;
const CHART_HEIGHT = 270;
const PADDING = {
  top: 20,
  right: 20,
  bottom: 42,
  left: 42,
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function getSafeValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function ChartSkeleton() {
  return (
    <div
      className="employer-hiring-chart__skeleton"
      aria-label="Loading hiring analytics"
      aria-busy="true"
    >
      <div className="employer-hiring-chart__skeleton-stats">
        <span />
        <span />
        <span />
      </div>
      <div className="employer-hiring-chart__skeleton-graph" />
    </div>
  );
}

export function EmployerHiringChart({
  data,
  period = 'month',
  onPeriodChange,
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  title = 'Hiring performance',
  description = 'Track applications, interviews, and successful hires.',
  emptyMessage = 'Hiring analytics will appear here when activity is available.',
  showLegend = true,
}: EmployerHiringChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<
    Record<SeriesKey, boolean>
  >({
    applications: true,
    interviews: true,
    hires: true,
  });

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        applications: getSafeValue(point.applications),
        interviews: getSafeValue(point.interviews),
        hires: getSafeValue(point.hires),
      })),
    [data],
  );

  const totals = useMemo(
    () => ({
      applications: chartData.reduce(
        (sum, point) => sum + point.applications,
        0,
      ),
      interviews: chartData.reduce(
        (sum, point) => sum + point.interviews,
        0,
      ),
      hires: chartData.reduce((sum, point) => sum + point.hires, 0),
    }),
    [chartData],
  );

  const visibleMax = Math.max(
    1,
    ...chartData.flatMap((point) =>
      SERIES.filter((series) => visibleSeries[series.key]).map(
        (series) => point[series.key],
      ),
    ),
  );

  const yAxisMax = Math.max(4, Math.ceil(visibleMax / 4) * 4);
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xPosition = (index: number) => {
    if (chartData.length <= 1) {
      return PADDING.left + plotWidth / 2;
    }

    return (
      PADDING.left +
      (index / (chartData.length - 1)) * plotWidth
    );
  };

  const yPosition = (value: number) =>
    PADDING.top + plotHeight - (value / yAxisMax) * plotHeight;

  const getPath = (key: SeriesKey) =>
    chartData
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${xPosition(index)} ${yPosition(point[key])}`;
      })
      .join(' ');

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries((current) => {
      const visibleCount = Object.values(current).filter(Boolean).length;

      if (current[key] && visibleCount === 1) {
        return current;
      }

      return { ...current, [key]: !current[key] };
    });
  };

  const hasData = chartData.some(
    (point) =>
      point.applications > 0 ||
      point.interviews > 0 ||
      point.hires > 0,
  );

  return (
    <section
      className="employer-hiring-chart"
      aria-label="Employer hiring performance chart"
      aria-busy={loading}
    >
      <header className="employer-hiring-chart__header">
        <div>
          <span className="employer-hiring-chart__eyebrow">
            HIRING ANALYTICS
          </span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <label className="employer-hiring-chart__period">
          <span className="employer-hiring-chart__sr-only">
            Reporting period
          </span>
          <select
            value={period}
            onChange={(event) =>
              onPeriodChange?.(
                event.target.value as EmployerHiringPeriod,
              )
            }
            disabled={disabled || loading || !onPeriodChange}
          >
            {PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <div
          className="employer-hiring-chart__error"
          role="alert"
        >
          <div>
            <strong>Unable to load hiring analytics</strong>
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
      ) : !hasData ? (
        <div className="employer-hiring-chart__empty">
          <span aria-hidden="true">▥</span>
          <h3>No hiring data yet</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="employer-hiring-chart__stats">
            {SERIES.map((series) => (
              <div
                className="employer-hiring-chart__stat"
                key={series.key}
              >
                <span
                  className="employer-hiring-chart__stat-dot"
                  style={{ backgroundColor: series.color }}
                />
                <span className="employer-hiring-chart__stat-label">
                  {series.label}
                </span>
                <strong>{formatNumber(totals[series.key])}</strong>
              </div>
            ))}
          </div>

          <div className="employer-hiring-chart__graph-wrapper">
            <svg
              className="employer-hiring-chart__graph"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label={`Hiring trend chart. ${chartData.length} reporting points. Applications: ${formatNumber(totals.applications)}. Interviews: ${formatNumber(totals.interviews)}. Hires: ${formatNumber(totals.hires)}.`}
              preserveAspectRatio="xMidYMid meet"
            >
              {Array.from({ length: 5 }).map((_, index) => {
                const value = (yAxisMax / 4) * (4 - index);
                const y = yPosition(value);

                return (
                  <g key={index}>
                    <line
                      x1={PADDING.left}
                      y1={y}
                      x2={CHART_WIDTH - PADDING.right}
                      y2={y}
                      className="employer-hiring-chart__grid-line"
                    />
                    <text
                      x={PADDING.left - 9}
                      y={y + 4}
                      textAnchor="end"
                      className="employer-hiring-chart__axis-label"
                    >
                      {formatNumber(value)}
                    </text>
                  </g>
                );
              })}

              {chartData.map((point, index) => (
                <text
                  key={point.id}
                  x={xPosition(index)}
                  y={CHART_HEIGHT - 12}
                  textAnchor="middle"
                  className="employer-hiring-chart__axis-label"
                >
                  {point.label}
                </text>
              ))}

              {SERIES.map((series) =>
                visibleSeries[series.key] ? (
                  <g key={series.key}>
                    <path
                      d={getPath(series.key)}
                      fill="none"
                      stroke={series.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />

                    {chartData.map((point, index) => (
                      <circle
                        key={`${series.key}-${point.id}`}
                        cx={xPosition(index)}
                        cy={yPosition(point[series.key])}
                        r="4"
                        fill="#fff"
                        stroke={series.color}
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                      >
                        <title>
                          {`${point.label}: ${series.label} ${formatNumber(point[series.key])}`}
                        </title>
                      </circle>
                    ))}
                  </g>
                ) : null,
              )}
            </svg>
          </div>

          {showLegend && (
            <div
              className="employer-hiring-chart__legend"
              aria-label="Toggle chart series"
            >
              {SERIES.map((series) => (
                <button
                  type="button"
                  key={series.key}
                  className={
                    visibleSeries[series.key]
                      ? 'employer-hiring-chart__legend-item'
                      : 'employer-hiring-chart__legend-item employer-hiring-chart__legend-item--hidden'
                  }
                  onClick={() => toggleSeries(series.key)}
                  aria-pressed={visibleSeries[series.key]}
                  disabled={disabled}
                >
                  <span
                    style={{ backgroundColor: series.color }}
                  />
                  {series.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default EmployerHiringChart;
