
import { useMemo } from 'react';
import '../styles/JobPreview.scss';

export type JobPreviewStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'closed'
  | 'rejected';

export type JobPreviewData = {
  id?: string;
  title: string;
  company: string;
  companyLogoUrl?: string | null;
  companyWebsite?: string | null;
  companyDescription?: string | null;
  country?: string;
  city?: string;
  stateProvince?: string;
  location?: string;
  type?: 'job' | 'internship' | 'coop' | string;
  workplaceType?: 'onsite' | 'hybrid' | 'remote' | string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  salaryPeriod?: string;
  applicationDeadline?: string | null;
  description: string;
  skills?: string[];
  benefits?: string[];
  status?: JobPreviewStatus;
  isActive?: boolean;
  isApproved?: boolean;
  createdAt?: string | null;
};

export type JobPreviewProps = {
  job: JobPreviewData;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEdit?: () => void;
  onClose?: () => void;
  previewLabel?: string;
  showPreviewNotice?: boolean;
  showCompanyDescription?: boolean;
  showActions?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
};

function safeExternalUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function getJobStatus(job: JobPreviewData): JobPreviewStatus {
  if (job.status === 'rejected') return 'rejected';
  if (job.status === 'draft') return 'draft';
  if (job.status === 'pending') return 'pending';

  if (job.status === 'closed' || job.isActive === false) {
    return 'closed';
  }

  if (job.isApproved === false) return 'pending';

  if (job.status === 'active' || (job.isActive && job.isApproved)) {
    return 'active';
  }

  return 'draft';
}

function formatLabel(value?: string): string {
  if (!value) return '';

  const labels: Record<string, string> = {
    job: 'Job',
    internship: 'Internship',
    coop: 'Co-op',
    onsite: 'On-site',
    'on-site': 'On-site',
    hybrid: 'Hybrid',
    remote: 'Remote',
    hour: 'Per hour',
    hourly: 'Per hour',
    day: 'Per day',
    daily: 'Per day',
    week: 'Per week',
    weekly: 'Per week',
    month: 'Per month',
    monthly: 'Per month',
    year: 'Per year',
    yearly: 'Per year',
  };

  return (
    labels[value.toLowerCase()] ??
    value
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function formatSalary(job: JobPreviewData): string | null {
  const min = job.salaryMin;
  const max = job.salaryMax;

  if (
    (min === null || min === undefined) &&
    (max === null || max === undefined)
  ) {
    return null;
  }

  const currency = job.currency || 'USD';

  const formatAmount = (amount: number) => {
    if (!Number.isFinite(amount)) return null;

    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  const formattedMin = min != null ? formatAmount(min) : null;
  const formattedMax = max != null ? formatAmount(max) : null;

  if (formattedMin && formattedMax) {
    if (min === max) return formattedMin;
    return `${formattedMin} – ${formattedMax}`;
  }

  return formattedMin
    ? `${formattedMin}+`
    : `Up to ${formattedMax}`;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date);
}

function getLocation(job: JobPreviewData): string {
  const parts = [
    job.city,
    job.stateProvince,
    job.country,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(', ');

  return job.location?.trim() || 'Location not specified';
}

function JobPreviewSkeleton() {
  return (
    <div
      className="job-preview job-preview--skeleton"
      aria-label="Loading job preview"
      aria-busy="true"
    >
      <div className="job-preview__skeleton-banner" />
      <div className="job-preview__skeleton-content">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function JobPreview({
  job,
  loading = false,
  error = null,
  onRetry,
  onEdit,
  onClose,
  previewLabel = 'Candidate preview',
  showPreviewNotice = true,
  showCompanyDescription = true,
  showActions = true,
  readOnly = false,
  disabled = false,
}: JobPreviewProps) {
  const status = getJobStatus(job);
  const salary = formatSalary(job);
  const deadline = formatDate(job.applicationDeadline);
  const companyWebsite = safeExternalUrl(job.companyWebsite);

  const companyInitials = useMemo(() => {
    const words = job.company.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) return 'C';

    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }, [job.company]);

  const skills = (job.skills ?? []).filter(
    (skill) => typeof skill === 'string' && skill.trim(),
  );

  const benefits = (job.benefits ?? []).filter(
    (benefit) => typeof benefit === 'string' && benefit.trim(),
  );

  const descriptionParagraphs = job.description
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (loading) return <JobPreviewSkeleton />;

  if (error) {
    return (
      <section className="job-preview" aria-label="Job preview">
        <div className="job-preview__error" role="alert">
          <span aria-hidden="true">!</span>
          <h3>Unable to load job preview</h3>
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled}
            >
              Try again
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="job-preview" aria-label="Job preview">
      {showPreviewNotice && (
        <div className="job-preview__notice">
          <span aria-hidden="true">◉</span>
          <div>
            <strong>{previewLabel}</strong>
            <p>
              This is a preview of how your job listing may appear to
              candidates. Final publication depends on platform approval.
            </p>
          </div>
        </div>
      )}

      <article className="job-preview__listing">
        <div className="job-preview__topline">
          <span className="job-preview__listing-label">
            JOB OPPORTUNITY
          </span>

          <span
            className={`job-preview__status job-preview__status--${status}`}
            role="status"
          >
            {status === 'pending'
              ? 'Pending approval'
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        <div className="job-preview__identity">
          <div className="job-preview__company-logo">
            {job.companyLogoUrl ? (
              <img
                src={job.companyLogoUrl}
                alt={`${job.company} logo`}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span aria-hidden="true">{companyInitials}</span>
            )}
          </div>

          <div className="job-preview__identity-content">
            <h2>{job.title.trim() || 'Job title'}</h2>
            <p>{job.company.trim() || 'Company name'}</p>
            <span className="job-preview__location">
              <span aria-hidden="true">⌖</span>
              {getLocation(job)}
            </span>
          </div>
        </div>

        <div className="job-preview__tags">
          {job.type && (
            <span className="job-preview__tag">
              {formatLabel(job.type)}
            </span>
          )}

          {job.workplaceType && (
            <span className="job-preview__tag">
              {formatLabel(job.workplaceType)}
            </span>
          )}

          {salary && (
            <span className="job-preview__tag job-preview__tag--salary">
              {salary}
              {job.salaryPeriod && ` ${formatLabel(job.salaryPeriod)}`}
            </span>
          )}
        </div>

        <div className="job-preview__divider" />

        <section className="job-preview__section">
          <h3>About this role</h3>

          {descriptionParagraphs.length > 0 ? (
            <div className="job-preview__description">
              {descriptionParagraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="job-preview__placeholder">
              No job description has been added yet.
            </p>
          )}
        </section>

        {skills.length > 0 && (
          <section className="job-preview__section">
            <h3>Skills and qualifications</h3>
            <div className="job-preview__chips">
              {skills.map((skill, index) => (
                <span key={`${skill}-${index}`}>{skill}</span>
              ))}
            </div>
          </section>
        )}

        {benefits.length > 0 && (
          <section className="job-preview__section">
            <h3>Benefits and perks</h3>
            <ul className="job-preview__benefits">
              {benefits.map((benefit, index) => (
                <li key={`${benefit}-${index}`}>
                  <span aria-hidden="true">✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </section>
        )}

        {showCompanyDescription && job.companyDescription?.trim() && (
          <section className="job-preview__section">
            <h3>About the company</h3>
            <p className="job-preview__company-description">
              {job.companyDescription}
            </p>

            {companyWebsite && (
              <a
                href={companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit company website
                <span aria-hidden="true"> ↗</span>
              </a>
            )}
          </section>
        )}

        {deadline && (
          <div className="job-preview__deadline">
            <span aria-hidden="true">◷</span>
            <div>
              <strong>Application deadline</strong>
              <span>{deadline}</span>
            </div>
          </div>
        )}
      </article>

      {showActions && !readOnly && (onEdit || onClose) && (
        <footer className="job-preview__actions">
          <span>
            Preview only. This page does not publish the job.
          </span>

          <div>
            {onClose && (
              <button
                type="button"
                className="job-preview__secondary-action"
                onClick={onClose}
                disabled={disabled}
              >
                Close preview
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                className="job-preview__primary-action"
                onClick={onEdit}
                disabled={disabled}
              >
                Edit job listing
              </button>
            )}
          </div>
        </footer>
      )}

      {readOnly && (
        <p className="job-preview__readonly">
          This preview is read-only.
        </p>
      )}
    </section>
  );
}

export default JobPreview;
