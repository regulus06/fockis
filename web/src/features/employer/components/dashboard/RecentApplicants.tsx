
import '../styles/RecentApplicants.scss';

export type RecentApplicantStatus =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'rejected';

export type RecentApplicantData = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  jobTitle: string;
  appliedAt: string;
  status: RecentApplicantStatus;
  location?: string | null;
  experience?: string | null;
};

export type RecentApplicantsProps = {
  applicants: RecentApplicantData[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewApplicant?: (applicant: RecentApplicantData) => void;
  onViewAll?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  maxItems?: number;
  emptyMessage?: string;
};

const STATUS_LABELS: Record<RecentApplicantStatus, string> = {
  applied: 'Applied',
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

function formatApplicantDate(value: string): {
  relative: string;
  full: string;
} {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      relative: 'Date unavailable',
      full: 'Date unavailable',
    };
  }

  const now = new Date();
  const diff = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  let relative: string;

  if (minutes < 1) {
    relative = 'Just now';
  } else if (minutes < 60) {
    relative = `${minutes}m ago`;
  } else if (hours < 24) {
    relative = `${hours}h ago`;
  } else if (days === 1) {
    relative = 'Yesterday';
  } else if (days < 7) {
    relative = `${days} days ago`;
  } else {
    relative = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    }).format(date);
  }

  const full = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

  return { relative, full };
}

function getApplicantName(applicant: RecentApplicantData): string {
  return [applicant.firstName, applicant.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ') || 'Candidate';
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function RecentApplicantsSkeleton() {
  return (
    <div
      className="recent-applicants__skeleton"
      aria-label="Loading recent applicants"
      aria-busy="true"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="recent-applicants__skeleton-row" key={index}>
          <span className="recent-applicants__skeleton-avatar" />
          <div>
            <span className="recent-applicants__skeleton-line" />
            <span className="recent-applicants__skeleton-line recent-applicants__skeleton-line--short" />
          </div>
          <span className="recent-applicants__skeleton-status" />
        </div>
      ))}
    </div>
  );
}

export function RecentApplicants({
  applicants,
  loading = false,
  error = null,
  onRetry,
  onViewApplicant,
  onViewAll,
  disabled = false,
  readOnly = false,
  maxItems = 5,
  emptyMessage = 'New applications will appear here when candidates apply to your jobs.',
}: RecentApplicantsProps) {
  const visibleApplicants = applicants
    .slice()
    .sort(
      (a, b) =>
        new Date(b.appliedAt).getTime() -
        new Date(a.appliedAt).getTime(),
    )
    .slice(0, Math.max(1, maxItems));

  const canOpenApplicant =
    Boolean(onViewApplicant) && !disabled && !readOnly;

  return (
    <section
      className="recent-applicants"
      aria-label="Recent applicants"
      aria-busy={loading}
    >
      <header className="recent-applicants__header">
        <div>
          <span className="recent-applicants__eyebrow">
            CANDIDATE ACTIVITY
          </span>
          <h2>Recent applicants</h2>
          <p>Stay up to date with candidates applying to your jobs.</p>
        </div>

        {onViewAll && (
          <button
            type="button"
            className="recent-applicants__view-all"
            onClick={onViewAll}
            disabled={disabled}
          >
            View all applicants
            <span aria-hidden="true">→</span>
          </button>
        )}
      </header>

      {error ? (
        <div className="recent-applicants__error" role="alert">
          <div>
            <strong>Unable to load applicants</strong>
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
        <RecentApplicantsSkeleton />
      ) : visibleApplicants.length === 0 ? (
        <div className="recent-applicants__empty">
          <span aria-hidden="true">♙</span>
          <h3>No applicants yet</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="recent-applicants__list">
          {visibleApplicants.map((applicant) => {
            const name = getApplicantName(applicant);
            const date = formatApplicantDate(applicant.appliedAt);

            return (
              <article
                className="recent-applicants__item"
                key={applicant.id}
              >
                <div className="recent-applicants__identity">
                  <div className="recent-applicants__avatar">
                    {applicant.avatarUrl ? (
                      <img
                        src={applicant.avatarUrl}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span aria-hidden="true">
                        {getInitials(name)}
                      </span>
                    )}
                  </div>

                  <div className="recent-applicants__details">
                    <h3>{name}</h3>

                    {applicant.email && (
                      <span className="recent-applicants__email">
                        {applicant.email}
                      </span>
                    )}

                    <span className="recent-applicants__job">
                      Applied for <strong>{applicant.jobTitle}</strong>
                    </span>

                    {(applicant.location || applicant.experience) && (
                      <span className="recent-applicants__additional">
                        {[applicant.location, applicant.experience]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="recent-applicants__meta">
                  <span
                    className={`recent-applicants__status recent-applicants__status--${applicant.status}`}
                  >
                    {STATUS_LABELS[applicant.status]}
                  </span>

                  <time
                    dateTime={applicant.appliedAt}
                    title={date.full}
                  >
                    {date.relative}
                  </time>
                </div>

                {onViewApplicant && (
                  <button
                    type="button"
                    className="recent-applicants__view-button"
                    onClick={() => onViewApplicant(applicant)}
                    disabled={!canOpenApplicant}
                    aria-label={`View ${name}'s application`}
                  >
                    View
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!loading &&
        !error &&
        applicants.length > visibleApplicants.length && (
          <footer className="recent-applicants__footer">
            <span>
              Showing {visibleApplicants.length} of {applicants.length} recent applicants
            </span>

            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                disabled={disabled}
              >
                See all applicants
                <span aria-hidden="true">→</span>
              </button>
            )}
          </footer>
        )}
    </section>
  );
}

export default RecentApplicants;
