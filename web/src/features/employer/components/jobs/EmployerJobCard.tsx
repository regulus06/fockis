
import '../styles/EmployerJobCard.scss';
import {
  EmployerJobActions,
  type EmployerJobActionItem,
} from './EmployerJobActions';

export type EmployerJobCardStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'closed'
  | 'rejected';

export type EmployerJobCardData = EmployerJobActionItem & {
  company?: string;
  location?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  employmentType?: string;
  workplaceType?: 'remote' | 'hybrid' | 'onsite' | 'on-site' | string;
  createdAt?: string;
  updatedAt?: string;
  applicationDeadline?: string | null;
  applicationsCount?: number;
  viewsCount?: number;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  salaryPeriod?: string;
  description?: string;
};

export type EmployerJobCardProps = {
  job: EmployerJobCardData;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onView?: (job: EmployerJobCardData) => void;
  onEdit?: (job: EmployerJobCardData) => void;
  onViewApplicants?: (job: EmployerJobCardData) => void;
  onToggleActive?: (
    job: EmployerJobCardData,
    nextIsActive: boolean,
  ) => void | Promise<void>;
  onDuplicate?: (job: EmployerJobCardData) => void | Promise<void>;
  onDelete?: (job: EmployerJobCardData) => void | Promise<void>;
  actionLoading?: boolean;
  error?: string | null;
  showDescription?: boolean;
  compact?: boolean;
};

const STATUS_LABELS: Record<EmployerJobCardStatus, string> = {
  draft: 'Draft',
  pending: 'Pending approval',
  active: 'Active',
  closed: 'Closed',
  rejected: 'Rejected',
};

function normalizeStatus(job: EmployerJobCardData): EmployerJobCardStatus {
  if (job.status === 'rejected') return 'rejected';
  if (job.status === 'draft') return 'draft';
  if (job.status === 'pending') return 'pending';
  if (job.status === 'closed' || !job.isActive) return 'closed';

  if (job.isApproved === false) return 'pending';

  return 'active';
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not specified';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatCount(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '—';
  }

  return new Intl.NumberFormat().format(value);
}

function formatSalary(job: EmployerJobCardData): string | null {
  const { salaryMin, salaryMax, currency, salaryPeriod } = job;

  if (
    salaryMin == null &&
    salaryMax == null
  ) {
    return null;
  }

  const currencyCode = currency || 'USD';

  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    });

    const minimum =
      salaryMin != null ? formatter.format(salaryMin) : null;
    const maximum =
      salaryMax != null ? formatter.format(salaryMax) : null;

    const range =
      minimum && maximum
        ? `${minimum} – ${maximum}`
        : minimum || `Up to ${maximum}`;

    return `${range}${salaryPeriod ? ` / ${salaryPeriod}` : ''}`;
  } catch {
    return null;
  }
}

function getLocation(job: EmployerJobCardData): string {
  if (job.location?.trim()) return job.location;

  return [
    job.city,
    job.stateProvince,
    job.country,
  ]
    .filter((part) => part?.trim())
    .join(', ') || 'Location not specified';
}

function getWorkplaceLabel(value?: string): string | null {
  if (!value) return null;

  const labels: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
    'on-site': 'On-site',
  };

  return labels[value.toLowerCase()] || value;
}

function getEmploymentLabel(value?: string): string | null {
  if (!value) return null;

  const labels: Record<string, string> = {
    job: 'Job',
    internship: 'Internship',
    coop: 'Co-op',
    'co-op': 'Co-op',
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    contract: 'Contract',
    temporary: 'Temporary',
  };

  return labels[value.toLowerCase()] || value;
}

function JobCardSkeleton() {
  return (
    <div
      className="employer-job-card employer-job-card--skeleton"
      aria-label="Loading job"
      aria-busy="true"
    >
      <div className="employer-job-card__skeleton-top">
        <span />
        <span />
      </div>
      <span className="employer-job-card__skeleton-title" />
      <span className="employer-job-card__skeleton-line" />
      <span className="employer-job-card__skeleton-line employer-job-card__skeleton-line--short" />
      <div className="employer-job-card__skeleton-bottom">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function EmployerJobCard({
  job,
  loading = false,
  disabled = false,
  readOnly = false,
  onView,
  onEdit,
  onViewApplicants,
  onToggleActive,
  onDuplicate,
  onDelete,
  actionLoading = false,
  error = null,
  showDescription = true,
  compact = false,
}: EmployerJobCardProps) {
  if (loading) return <JobCardSkeleton />;

  const status = normalizeStatus(job);
  const salary = formatSalary(job);
  const workplace = getWorkplaceLabel(job.workplaceType);
  const employment = getEmploymentLabel(job.employmentType);
  const location = getLocation(job);
  const deadline = job.applicationDeadline
    ? formatDate(job.applicationDeadline)
    : null;

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
        'employer-job-card',
        compact && 'employer-job-card--compact',
        disabled && 'employer-job-card--disabled',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="employer-job-card__header">
        <div className="employer-job-card__company">
          <div className="employer-job-card__company-icon" aria-hidden="true">
            {(job.company || 'F').trim().charAt(0).toUpperCase()}
          </div>

          <div className="employer-job-card__company-info">
            <span>{job.company || 'Company'}</span>
            {job.createdAt && (
              <small>Created {formatDate(job.createdAt)}</small>
            )}
          </div>
        </div>

        <span
          className={`employer-job-card__status employer-job-card__status--${status}`}
          role="status"
        >
          <span aria-hidden="true" />
          {STATUS_LABELS[status]}
        </span>
      </header>

      <div className="employer-job-card__content">
        <h3>
          {onView ? (
            <button
              type="button"
              className="employer-job-card__title-button"
              onClick={() => onView(job)}
              disabled={disabled}
            >
              {job.title}
            </button>
          ) : (
            job.title
          )}
        </h3>

        <p className="employer-job-card__location">
          <span aria-hidden="true">⌖</span>
          {location}
        </p>

        <div className="employer-job-card__tags">
          {employment && (
            <span className="employer-job-card__tag">
              {employment}
            </span>
          )}

          {workplace && (
            <span className="employer-job-card__tag">
              {workplace}
            </span>
          )}
        </div>

        {showDescription && job.description && (
          <p className="employer-job-card__description">
            {job.description}
          </p>
        )}

        {salary && (
          <p className="employer-job-card__salary">
            {salary}
          </p>
        )}
      </div>

      <div className="employer-job-card__metrics">
        <div>
          <strong>{formatCount(job.applicationsCount)}</strong>
          <span>Applications</span>
        </div>
        <div>
          <strong>{formatCount(job.viewsCount)}</strong>
          <span>Views</span>
        </div>
        <div>
          <strong>{deadline || '—'}</strong>
          <span>Application deadline</span>
        </div>
      </div>

      {deadline && (
        <div
          className={[
            'employer-job-card__deadline',
            isPastDeadline && 'employer-job-card__deadline--expired',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isPastDeadline
            ? 'Application deadline has passed.'
            : `Applications close ${deadline}.`}
        </div>
      )}

      {error && (
        <div className="employer-job-card__error" role="alert">
          {error}
        </div>
      )}

      <footer className="employer-job-card__footer">
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
          showLabels={!compact}
          compact={compact}
        />
      </footer>
    </article>
  );
}

export default EmployerJobCard;
