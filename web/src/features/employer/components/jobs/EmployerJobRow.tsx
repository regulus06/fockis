
import '../styles/EmployerJobRow.scss';
import {
  EmployerJobActions,
  type EmployerJobActionItem,
} from './EmployerJobActions';

export type EmployerJobRowStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'closed'
  | 'rejected';

export type EmployerJobRowData = EmployerJobActionItem & {
  company?: string;
  location?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  employmentType?: string;
  workplaceType?: string;
  createdAt?: string;
  applicationDeadline?: string | null;
  applicationsCount?: number;
  viewsCount?: number;
};

export type EmployerJobRowProps = {
  job: EmployerJobRowData;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  actionLoading?: boolean;
  error?: string | null;
  onView?: (job: EmployerJobRowData) => void;
  onEdit?: (job: EmployerJobRowData) => void;
  onViewApplicants?: (job: EmployerJobRowData) => void;
  onToggleActive?: (
    job: EmployerJobRowData,
    nextIsActive: boolean,
  ) => void | Promise<void>;
  onDuplicate?: (job: EmployerJobRowData) => void | Promise<void>;
  onDelete?: (job: EmployerJobRowData) => void | Promise<void>;
  compact?: boolean;
};

const STATUS_LABELS: Record<EmployerJobRowStatus, string> = {
  draft: 'Draft',
  pending: 'Pending approval',
  active: 'Active',
  closed: 'Closed',
  rejected: 'Rejected',
};

function normalizeStatus(job: EmployerJobRowData): EmployerJobRowStatus {
  if (job.status === 'rejected') return 'rejected';
  if (job.status === 'draft') return 'draft';
  if (job.status === 'pending') return 'pending';
  if (job.status === 'closed' || !job.isActive) return 'closed';
  if (job.isApproved === false) return 'pending';

  return 'active';
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatCount(value?: number): string {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return '—';
  }

  return new Intl.NumberFormat().format(value);
}

function getLocation(job: EmployerJobRowData): string {
  if (job.location?.trim()) return job.location;

  return [
    job.city,
    job.stateProvince,
    job.country,
  ]
    .filter((part) => part?.trim())
    .join(', ') || 'Location not specified';
}

function formatLabel(value?: string): string {
  if (!value) return '';

  const labels: Record<string, string> = {
    job: 'Job',
    internship: 'Internship',
    coop: 'Co-op',
    'co-op': 'Co-op',
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    contract: 'Contract',
    temporary: 'Temporary',
    onsite: 'On-site',
    'on-site': 'On-site',
    hybrid: 'Hybrid',
    remote: 'Remote',
  };

  return labels[value.toLowerCase()] || value;
}

function JobRowSkeleton() {
  return (
    <div
      className="employer-job-row employer-job-row--skeleton"
      aria-label="Loading job"
      aria-busy="true"
    >
      <span />
      <div>
        <span />
        <span />
      </div>
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function EmployerJobRow({
  job,
  loading = false,
  disabled = false,
  readOnly = false,
  actionLoading = false,
  error = null,
  onView,
  onEdit,
  onViewApplicants,
  onToggleActive,
  onDuplicate,
  onDelete,
  compact = false,
}: EmployerJobRowProps) {
  if (loading) return <JobRowSkeleton />;

  const status = normalizeStatus(job);
  const location = getLocation(job);
  const employmentType = formatLabel(job.employmentType);
  const workplaceType = formatLabel(job.workplaceType);
  const deadline = formatDate(job.applicationDeadline);

  const isPastDeadline = job.applicationDeadline
    ? new Date(job.applicationDeadline).getTime() < Date.now()
    : false;

  const actionJob: EmployerJobActionItem = {
    id: job.id,
    title: job.title,
    status,
    isActive: job.isActive,
    isApproved: job.isApproved,
  };

  return (
    <article
      className={[
        'employer-job-row',
        compact && 'employer-job-row--compact',
        disabled && 'employer-job-row--disabled',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="employer-job-row__main">
        <div className="employer-job-row__identity">
          <div className="employer-job-row__company-icon" aria-hidden="true">
            {(job.company || 'F').trim().charAt(0).toUpperCase()}
          </div>

          <div className="employer-job-row__job-info">
            <h3>
              {onView ? (
                <button
                  type="button"
                  onClick={() => onView(job)}
                  disabled={disabled}
                >
                  {job.title}
                </button>
              ) : (
                job.title
              )}
            </h3>

            <span className="employer-job-row__company">
              {job.company || 'Company not specified'}
            </span>

            <span className="employer-job-row__location">
              {location}
            </span>

            <div className="employer-job-row__tags">
              {employmentType && <span>{employmentType}</span>}
              {workplaceType && <span>{workplaceType}</span>}
            </div>
          </div>
        </div>

        <div className="employer-job-row__status-cell">
          <span
            className={`employer-job-row__status employer-job-row__status--${status}`}
            role="status"
          >
            <span aria-hidden="true" />
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="employer-job-row__metric">
          <strong>{formatCount(job.applicationsCount)}</strong>
          <span>Applications</span>
        </div>

        <div className="employer-job-row__metric">
          <strong>{formatCount(job.viewsCount)}</strong>
          <span>Views</span>
        </div>

        <div className="employer-job-row__deadline">
          <strong className={isPastDeadline ? 'is-expired' : ''}>
            {deadline}
          </strong>
          <span>Deadline</span>
        </div>
      </div>

      {error && (
        <div className="employer-job-row__error" role="alert">
          {error}
        </div>
      )}

      <footer className="employer-job-row__actions">
        <EmployerJobActions
          job={actionJob}
          onView={onView ? () => onView(job) : undefined}
          onViewApplicants={
            onViewApplicants
              ? () => onViewApplicants(job)
              : undefined
          }
          onEdit={onEdit ? () => onEdit(job) : undefined}
          onToggleActive={
            onToggleActive
              ? (_, nextIsActive) => onToggleActive(job, nextIsActive)
              : undefined
          }
          onDuplicate={
            onDuplicate ? () => onDuplicate(job) : undefined
          }
          onDelete={onDelete ? () => onDelete(job) : undefined}
          actionLoading={actionLoading}
          disabled={disabled}
          readOnly={readOnly}
          compact
          showLabels={false}
        />
      </footer>
    </article>
  );
}

export default EmployerJobRow;
