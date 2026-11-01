
import '../styles/RecentJobs.scss';

export type RecentJobStatus = 'draft' | 'pending' | 'active' | 'closed' | 'rejected';

export type RecentJobData = {
  id: string;
  title: string;
  company?: string | null;
  location?: string | null;
  employmentType?: string | null;
  workplaceType?: string | null;
  status: RecentJobStatus;
  createdAt: string;
  applicationsCount?: number;
  viewsCount?: number;
  applicationDeadline?: string | null;
};

export type RecentJobsProps = {
  jobs: RecentJobData[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewJob?: (job: RecentJobData) => void;
  onEditJob?: (job: RecentJobData) => void;
  onViewAll?: () => void;
  onCreateJob?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  maxItems?: number;
  emptyMessage?: string;
};

const STATUS_LABELS: Record<RecentJobStatus, string> = {
  draft: 'Draft',
  pending: 'Pending review',
  active: 'Active',
  closed: 'Closed',
  rejected: 'Rejected',
};

function formatDate(value?: string | null): string {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getRelativeDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  const now = new Date();
  const days = Math.floor(
    (now.getTime() - date.getTime()) / 86_400_000,
  );

  if (days < 0) return formatDate(value);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return formatDate(value);
}

function formatCount(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat().format(Math.max(0, value));
}

function formatLabel(value?: string | null): string | null {
  if (!value) return null;

  return value
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RecentJobsSkeleton() {
  return (
    <div
      className="recent-jobs__skeleton"
      aria-label="Loading recent jobs"
      aria-busy="true"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="recent-jobs__skeleton-card" key={index}>
          <div className="recent-jobs__skeleton-heading">
            <span className="recent-jobs__skeleton-icon" />
            <div>
              <span className="recent-jobs__skeleton-line" />
              <span className="recent-jobs__skeleton-line recent-jobs__skeleton-line--short" />
            </div>
            <span className="recent-jobs__skeleton-status" />
          </div>
          <span className="recent-jobs__skeleton-line recent-jobs__skeleton-line--wide" />
          <span className="recent-jobs__skeleton-line recent-jobs__skeleton-line--medium" />
        </div>
      ))}
    </div>
  );
}

export function RecentJobs({
  jobs,
  loading = false,
  error = null,
  onRetry,
  onViewJob,
  onEditJob,
  onViewAll,
  onCreateJob,
  disabled = false,
  readOnly = false,
  maxItems = 4,
  emptyMessage = 'Your latest job postings will appear here after you create them.',
}: RecentJobsProps) {
  const visibleJobs = jobs
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .slice(0, Math.max(1, maxItems));

  const canView = Boolean(onViewJob) && !disabled;
  const canEdit = Boolean(onEditJob) && !disabled && !readOnly;

  return (
    <section
      className="recent-jobs"
      aria-label="Recent job postings"
      aria-busy={loading}
    >
      <header className="recent-jobs__header">
        <div className="recent-jobs__heading">
          <span className="recent-jobs__eyebrow">JOB MANAGEMENT</span>
          <h2>Recent jobs</h2>
          <p>Manage your latest job postings and monitor applications.</p>
        </div>

        <div className="recent-jobs__header-actions">
          {onCreateJob && (
            <button
              type="button"
              className="recent-jobs__create-button"
              onClick={onCreateJob}
              disabled={disabled || readOnly}
            >
              <span aria-hidden="true">+</span>
              Create job
            </button>
          )}

          {onViewAll && (
            <button
              type="button"
              className="recent-jobs__view-all"
              onClick={onViewAll}
              disabled={disabled}
            >
              View all
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </header>

      {error ? (
        <div className="recent-jobs__error" role="alert">
          <div>
            <strong>Unable to load your jobs</strong>
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
      ) : loading ? (
        <RecentJobsSkeleton />
      ) : visibleJobs.length === 0 ? (
        <div className="recent-jobs__empty">
          <span className="recent-jobs__empty-icon" aria-hidden="true">
            +
          </span>
          <h3>No job postings yet</h3>
          <p>{emptyMessage}</p>

          {onCreateJob && (
            <button
              type="button"
              className="recent-jobs__empty-action"
              onClick={onCreateJob}
              disabled={disabled || readOnly}
            >
              Create your first job
            </button>
          )}
        </div>
      ) : (
        <div className="recent-jobs__list">
          {visibleJobs.map((job) => {
            const employmentType = formatLabel(job.employmentType);
            const workplaceType = formatLabel(job.workplaceType);

            return (
              <article className="recent-jobs__item" key={job.id}>
                <div className="recent-jobs__item-main">
                  <div className="recent-jobs__job-icon" aria-hidden="true">
                    <span>▤</span>
                  </div>

                  <div className="recent-jobs__job-info">
                    <h3>{job.title}</h3>

                    {job.company && (
                      <span className="recent-jobs__company">
                        {job.company}
                      </span>
                    )}

                    <div className="recent-jobs__metadata">
                      {job.location && (
                        <span>
                          <span aria-hidden="true">⌖</span>
                          {job.location}
                        </span>
                      )}

                      {employmentType && (
                        <span>{employmentType}</span>
                      )}

                      {workplaceType && (
                        <span>{workplaceType}</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`recent-jobs__status recent-jobs__status--${job.status}`}
                  >
                    {STATUS_LABELS[job.status]}
                  </span>
                </div>

                <div className="recent-jobs__metrics">
                  <div className="recent-jobs__metric">
                    <strong>{formatCount(job.applicationsCount)}</strong>
                    <span>Applications</span>
                  </div>

                  <div className="recent-jobs__metric">
                    <strong>{formatCount(job.viewsCount)}</strong>
                    <span>Views</span>
                  </div>

                  <div className="recent-jobs__metric recent-jobs__metric--date">
                    <strong>{getRelativeDate(job.createdAt)}</strong>
                    <span>Posted {formatDate(job.createdAt)}</span>
                  </div>

                  {job.applicationDeadline && (
                    <div className="recent-jobs__metric recent-jobs__metric--deadline">
                      <strong>{formatDate(job.applicationDeadline)}</strong>
                      <span>Application deadline</span>
                    </div>
                  )}
                </div>

                <div className="recent-jobs__actions">
                  {onViewJob && (
                    <button
                      type="button"
                      className="recent-jobs__view-button"
                      onClick={() => onViewJob(job)}
                      disabled={!canView}
                    >
                      View job
                    </button>
                  )}

                  {onEditJob && (
                    <button
                      type="button"
                      className="recent-jobs__edit-button"
                      onClick={() => onEditJob(job)}
                      disabled={!canEdit}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && jobs.length > visibleJobs.length && (
        <footer className="recent-jobs__footer">
          <span>
            Showing {visibleJobs.length} of {jobs.length} jobs
          </span>

          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              disabled={disabled}
            >
              See all jobs
              <span aria-hidden="true">→</span>
            </button>
          )}
        </footer>
      )}
    </section>
  );
}

export default RecentJobs;
