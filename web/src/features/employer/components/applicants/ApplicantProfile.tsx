
import '../styles/ApplicantProfile.scss';

export type ApplicantExperience = {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  current?: boolean;
  description?: string;
};

export type ApplicantEducation = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string | null;
  description?: string;
};

export type ApplicantProfileData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  location?: string | null;
  professionalSummary?: string | null;
  skills?: string[];
  experience?: ApplicantExperience[];
  education?: ApplicantEducation[];
  portfolioUrl?: string | null;
  linkedInUrl?: string | null;
  websiteUrl?: string | null;
  resumeUrl?: string | null;
  updatedAt?: string | null;
};

export type ApplicantProfileProps = {
  applicant: ApplicantProfileData;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onContact?: (applicant: ApplicantProfileData) => void;
  onDownloadResume?: (applicant: ApplicantProfileData) => void;
  disabled?: boolean;
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`
    .toUpperCase();
}

function formatDate(value?: string | null): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatPeriod(
  startDate: string,
  endDate?: string | null,
  current?: boolean,
): string {
  const start = formatDate(startDate);

  if (!start) return 'Dates unavailable';

  const end = current ? 'Present' : formatDate(endDate);

  return end ? `${start} – ${end}` : start;
}

function getSafeExternalUrl(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function ApplicantProfile({
  applicant,
  loading = false,
  error = null,
  onRetry,
  onContact,
  onDownloadResume,
  disabled = false,
}: ApplicantProfileProps) {
  const fullName = `${applicant.firstName} ${applicant.lastName}`.trim();

  const linkedInUrl = getSafeExternalUrl(applicant.linkedInUrl);
  const portfolioUrl = getSafeExternalUrl(applicant.portfolioUrl);
  const websiteUrl = getSafeExternalUrl(applicant.websiteUrl);

  const isDisabled = disabled || loading;

  if (error) {
    return (
      <section
        className="applicant-profile applicant-profile--message"
        aria-label="Applicant profile"
        role="alert"
      >
        <h2>Unable to load applicant profile</h2>
        <p>{error}</p>

        {onRetry && (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </section>
    );
  }

  if (loading) {
    return (
      <section
        className="applicant-profile"
        aria-label="Loading applicant profile"
        aria-busy="true"
      >
        <div className="applicant-profile__loading">
          <div className="applicant-profile__skeleton-avatar" />
          <div className="applicant-profile__skeleton-lines">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="applicant-profile__loading-sections">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  return (
    <section
      className="applicant-profile"
      aria-label={`Applicant profile: ${fullName}`}
      aria-busy={false}
    >
      <div className="applicant-profile__header">
        <div className="applicant-profile__identity">
          {applicant.avatarUrl ? (
            <img
              className="applicant-profile__avatar"
              src={applicant.avatarUrl}
              alt={`${fullName}'s profile`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="applicant-profile__avatar applicant-profile__avatar--initials">
              {getInitials(applicant.firstName, applicant.lastName) || '?'}
            </div>
          )}

          <div className="applicant-profile__identity-info">
            <h2>{fullName}</h2>

            <p className="applicant-profile__headline">
              {applicant.headline || 'Professional profile'}
            </p>

            {applicant.location && (
              <span className="applicant-profile__location">
                <span aria-hidden="true">⌖</span>
                {applicant.location}
              </span>
            )}
          </div>
        </div>

        <div className="applicant-profile__actions">
          {onContact && (
            <button
              type="button"
              className="applicant-profile__contact"
              onClick={() => onContact(applicant)}
              disabled={isDisabled}
            >
              Contact candidate
            </button>
          )}

          {applicant.resumeUrl && (
            onDownloadResume ? (
              <button
                type="button"
                className="applicant-profile__resume"
                onClick={() => onDownloadResume(applicant)}
                disabled={isDisabled}
              >
                View resume ↗
              </button>
            ) : (
              <a
                className="applicant-profile__resume"
                href={getSafeExternalUrl(applicant.resumeUrl) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!getSafeExternalUrl(applicant.resumeUrl)}
                onClick={(event) => {
                  if (!getSafeExternalUrl(applicant.resumeUrl)) {
                    event.preventDefault();
                  }
                }}
              >
                View resume ↗
              </a>
            )
          )}
        </div>
      </div>

      <div className="applicant-profile__content">
        <section className="applicant-profile__section">
          <h3>Professional summary</h3>

          {applicant.professionalSummary ? (
            <p className="applicant-profile__summary">
              {applicant.professionalSummary}
            </p>
          ) : (
            <p className="applicant-profile__empty-text">
              No professional summary provided.
            </p>
          )}
        </section>

        <section className="applicant-profile__section">
          <h3>Contact information</h3>

          <div className="applicant-profile__contact-grid">
            <div className="applicant-profile__contact-item">
              <span>Email address</span>
              <a href={`mailto:${applicant.email}`}>
                {applicant.email}
              </a>
            </div>

            {applicant.phone && (
              <div className="applicant-profile__contact-item">
                <span>Phone number</span>
                <a href={`tel:${applicant.phone}`}>
                  {applicant.phone}
                </a>
              </div>
            )}

            {applicant.location && (
              <div className="applicant-profile__contact-item">
                <span>Location</span>
                <strong>{applicant.location}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="applicant-profile__section">
          <h3>Skills and expertise</h3>

          {applicant.skills && applicant.skills.length > 0 ? (
            <div className="applicant-profile__skills">
              {applicant.skills.map((skill, index) => (
                <span key={`${skill}-${index}`}>{skill}</span>
              ))}
            </div>
          ) : (
            <p className="applicant-profile__empty-text">
              No skills have been added.
            </p>
          )}
        </section>

        <section className="applicant-profile__section">
          <h3>Work experience</h3>

          {applicant.experience && applicant.experience.length > 0 ? (
            <div className="applicant-profile__timeline">
              {applicant.experience.map((item) => (
                <article
                  className="applicant-profile__timeline-item"
                  key={item.id}
                >
                  <span className="applicant-profile__timeline-marker" />

                  <div className="applicant-profile__timeline-content">
                    <h4>{item.jobTitle}</h4>
                    <strong>{item.company}</strong>

                    <span className="applicant-profile__date">
                      {formatPeriod(
                        item.startDate,
                        item.endDate,
                        item.current,
                      )}
                    </span>

                    {item.location && (
                      <span className="applicant-profile__subtext">
                        {item.location}
                      </span>
                    )}

                    {item.description && (
                      <p>{item.description}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="applicant-profile__empty-text">
              No work experience provided.
            </p>
          )}
        </section>

        <section className="applicant-profile__section">
          <h3>Education</h3>

          {applicant.education && applicant.education.length > 0 ? (
            <div className="applicant-profile__education">
              {applicant.education.map((item) => (
                <article
                  className="applicant-profile__education-item"
                  key={item.id}
                >
                  <span className="applicant-profile__education-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      aria-hidden="true"
                    >
                      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
                      <path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5M22 9v7" />
                    </svg>
                  </span>

                  <div>
                    <h4>{item.institution}</h4>
                    <strong>
                      {item.degree}
                      {item.fieldOfStudy
                        ? ` · ${item.fieldOfStudy}`
                        : ''}
                    </strong>

                    {(item.startDate || item.endDate) && (
                      <span className="applicant-profile__date">
                        {formatPeriod(
                          item.startDate ?? '',
                          item.endDate,
                        )}
                      </span>
                    )}

                    {item.description && <p>{item.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="applicant-profile__empty-text">
              No education information provided.
            </p>
          )}
        </section>

        <section className="applicant-profile__section">
          <h3>Professional links</h3>

          <div className="applicant-profile__links">
            {linkedInUrl && (
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn profile ↗
              </a>
            )}

            {portfolioUrl && (
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Portfolio ↗
              </a>
            )}

            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Personal website ↗
              </a>
            )}

            {!linkedInUrl && !portfolioUrl && !websiteUrl && (
              <p className="applicant-profile__empty-text">
                No professional links provided.
              </p>
            )}
          </div>
        </section>
      </div>

      {applicant.updatedAt && (
        <footer className="applicant-profile__updated">
          Profile last updated: {formatDate(applicant.updatedAt)}
        </footer>
      )}
    </section>
  );
}

export default ApplicantProfile;
