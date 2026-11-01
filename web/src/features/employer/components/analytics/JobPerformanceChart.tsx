
import '../styles/JobPerformanceChart.scss';

export type JobPerformanceItem = {
  id: string;
  title: string;
  views: number;
  applications: number;
  hires: number;
};

export type JobPerformanceChartProps = {
  jobs: JobPerformanceItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  maxItems?: number;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function calculateConversion(views: number, applications: number): string {
  if (views <= 0) return '—';

  return `${((applications / views) * 100).toFixed(1)}%`;
}

export function JobPerformanceChart({
  jobs,
  loading = false,
  error = null,
  onRetry,
  maxItems = 5,
}: JobPerformanceChartProps) {
  const validJobs = jobs.filter(
    (job) =>
      Number.isFinite(job.views) &&
      Number.isFinite(job.applications) &&
      Number.isFinite(job.hires) &&
      job.views >= 0 &&
      job.applications >= 0 &&
      job.hires >= 0,
  );

  const sortedJobs = [...validJobs]
    .sort((a, b) => b.applications - a.applications)
    .slice(0, Math.max(1, maxItems));

  const maxApplications = Math.max(
    ...sortedJobs.map((job) => job.applications),
    0,
  );

  if (error) {
    return (
      <section
        className="job-performance-chart job-performance-chart--message"
        aria-label="Job performance"
        role="alert"
      >
        <h2>Unable to load job performance</h2>
        <p>{error}</p>

        {onRetry && (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      className="job-performance-chart"
      aria-label="Job performance chart"
      aria-busy={loading}
    >
      <div className="job-performance-chart__header">
        <div>
          <h2>Job performance</h2>
          <p>Compare views, applications, and hires across your job listings.</p>
        </div>

        <span className="job-performance-chart__badge">
          Top {maxItems} jobs
        </span>
      </div>

      {loading ? (
        <div
          className="job-performance-chart__loading"
          aria-label="Loading job performance"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="job-performance-chart__skeleton" key={index}>
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : sortedJobs.length === 0 ? (
        <div className="job-performance-chart__empty">
          <span aria-hidden="true">▤</span>
          <h3>No job performance data</h3>
          <p>
            Performance information will appear here when your job listings
            receive views and applications.
          </p>
        </div>
      ) : (
        <>
          <div className="job-performance-chart__legend">
            <span>
              <i className="job-performance-chart__legend-dot job-performance-chart__legend-dot--views" />
              Views
            </span>
            <span>
              <i className="job-performance-chart__legend-dot job-performance-chart__legend-dot--applications" />
              Applications
            </span>
            <span>
              <i className="job-performance-chart__legend-dot job-performance-chart__legend-dot--hires" />
              Hires
            </span>
          </div>

          <div className="job-performance-chart__list">
            {sortedJobs.map((job) => {
              const applicationWidth =
                maxApplications > 0
                  ? (job.applications / maxApplications) * 100
                  : 0;

              const conversion = calculateConversion(
                job.views,
                job.applications,
              );

              return (
                <article
                  className="job-performance-chart__job"
                  key={job.id}
                >
                  <div className="job-performance-chart__job-header">
                    <h3 title={job.title}>{job.title}</h3>

                    <span className="job-performance-chart__conversion">
                      {conversion} conversion
                    </span>
                  </div>

                  <div
                    className="job-performance-chart__track"
                    role="img"
                    aria-label={`${job.title}: ${formatNumber(job.applications)} applications`}
                  >
                    <div
                      className="job-performance-chart__bar"
                      style={{ width: `${applicationWidth}%` }}
                    />
                  </div>

                  <div className="job-performance-chart__metrics">
                    <div>
                      <span>Views</span>
                      <strong>{formatNumber(job.views)}</strong>
                    </div>

                    <div>
                      <span>Applications</span>
                      <strong>{formatNumber(job.applications)}</strong>
                    </div>

                    <div>
                      <span>Hires</span>
                      <strong>{formatNumber(job.hires)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default JobPerformanceChart;
