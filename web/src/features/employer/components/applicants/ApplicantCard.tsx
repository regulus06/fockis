
import '../styles/ApplicantCard.scss';

export type ApplicantStatus =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'rejected';

export type ApplicantCardData = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  jobTitle: string;
  appliedAt: string;
  status: ApplicantStatus;
  location?: string;
  experience?: string;
  skills?: string[];
  resumeUrl?: string | null;
};

export type ApplicantCardProps = {
  applicant: ApplicantCardData;
  onView?: (applicant: ApplicantCardData) => void;
  onStatusChange?: (
    applicant: ApplicantCardData,
    status: ApplicantStatus,
  ) => void;
  onContact?: (applicant: ApplicantCardData) => void;
  loading?: boolean;
  disabled?: boolean;
};

const STATUS_LABELS: Record<ApplicantStatus, string> = {
  applied: 'Applied',
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatAppliedDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function ApplicantCard({
  applicant,
  onView,
  onStatusChange,
  onContact,
  loading = false,
  disabled = false,
}: ApplicantCardProps) {
  const isDisabled = disabled || loading;

  return (
    <article
      className="applicant-card"
      aria-label={`Applicant ${applicant.name}`}
      aria-busy={loading}
    >
      <div className="applicant-card__top">
        <div className="applicant-card__identity">
          {applicant.avatarUrl ? (
            <img
              className="applicant-card__avatar"
              src={applicant.avatarUrl}
              alt={`${applicant.name}'s profile`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="applicant-card__avatar applicant-card__avatar--initials">
              {getInitials(applicant.name) || '?'}
            </div>
          )}

          <div className="applicant-card__person">
            <h3>{applicant.name}</h3>
            <a href={`mailto:${applicant.email}`}>
              {applicant.email}
            </a>
          </div>
        </div>

        <span
          className={`applicant-card__status applicant-card__status--${applicant.status}`}
        >
          {STATUS_LABELS[applicant.status]}
        </span>
      </div>

      <div className="applicant-card__job">
        <span className="applicant-card__job-label">Applied for</span>
        <strong>{applicant.jobTitle}</strong>
      </div>

      <div className="applicant-card__details">
        {applicant.location && (
          <div>
            <span aria-hidden="true">⌖</span>
            {applicant.location}
          </div>
        )}

        {applicant.experience && (
          <div>
            <span aria-hidden="true">◷</span>
            {applicant.experience}
          </div>
        )}

        <div>
          <span aria-hidden="true">▦</span>
          Applied {formatAppliedDate(applicant.appliedAt)}
        </div>
      </div>

      {applicant.skills && applicant.skills.length > 0 && (
        <div className="applicant-card__skills">
          <span className="applicant-card__section-label">
            Skills
          </span>

          <div className="applicant-card__skill-list">
            {applicant.skills.slice(0, 5).map((skill, index) => (
              <span key={`${skill}-${index}`}>{skill}</span>
            ))}

            {applicant.skills.length > 5 && (
              <span className="applicant-card__more-skills">
                +{applicant.skills.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="applicant-card__footer">
        <div className="applicant-card__actions">
          {onView && (
            <button
              type="button"
              className="applicant-card__view"
              onClick={() => onView(applicant)}
              disabled={isDisabled}
            >
              View profile
            </button>
          )}

          {applicant.resumeUrl && (
            <a
              className="applicant-card__resume"
              href={applicant.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${applicant.name}'s resume`}
            >
              Resume ↗
            </a>
          )}

          {onContact && (
            <button
              type="button"
              className="applicant-card__contact"
              onClick={() => onContact(applicant)}
              disabled={isDisabled}
            >
              Contact
            </button>
          )}
        </div>

        {onStatusChange && (
          <label className="applicant-card__status-control">
            <span>Update status</span>
            <select
              value={applicant.status}
              disabled={isDisabled}
              onChange={(event) =>
                onStatusChange(
                  applicant,
                  event.target.value as ApplicantStatus,
                )
              }
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}

export default ApplicantCard;
