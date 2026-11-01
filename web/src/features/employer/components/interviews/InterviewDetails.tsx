
import '../styles/InterviewDetails.scss';

export type InterviewDetailsStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type InterviewDetailsData = {
  id: string;
  applicant: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    location?: string | null;
  };
  job: {
    id: string;
    title: string;
    company?: string | null;
  };
  scheduledAt: string;
  durationMinutes?: number;
  status: InterviewDetailsStatus;
  interviewType?: 'video' | 'phone' | 'in_person' | 'other';
  location?: string | null;
  meetingUrl?: string | null;
  interviewer?: {
    id?: string;
    name: string;
    email?: string | null;
  } | null;
  agenda?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type InterviewDetailsProps = {
  interview: InterviewDetailsData | null;
  loading?: boolean;
  error?: string | null;
  actionLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onRetry?: () => void;
  onEdit?: (interview: InterviewDetailsData) => void;
  onCancel?: (interview: InterviewDetailsData) => void;
  onJoin?: (interview: InterviewDetailsData) => void;
  onContactApplicant?: (interview: InterviewDetailsData) => void;
  onViewApplicant?: (applicantId: string) => void;
  onViewJob?: (jobId: string) => void;
  showInternalNotes?: boolean;
};

const STATUS_LABELS: Record<InterviewDetailsStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

const TYPE_LABELS: Record<
  NonNullable<InterviewDetailsData['interviewType']>,
  string
> = {
  video: 'Video interview',
  phone: 'Phone interview',
  in_person: 'In-person interview',
  other: 'Other interview',
};

function getDate(value?: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null): string {
  const date = getDate(value);

  if (!date) return 'Not available';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(value?: string | null): string {
  const date = getDate(value);

  if (!date) return 'Not available';

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function formatTimestamp(value?: string | null): string {
  const date = getDate(value);

  if (!date) return 'Not available';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getInitials(name?: string): string {
  return (name || 'Candidate')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function isSafeHttpUrl(value?: string | null): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function InterviewDetailsSkeleton() {
  return (
    <div
      className="interview-details interview-details--skeleton"
      aria-label="Loading interview details"
      aria-busy="true"
    >
      <div className="interview-details__skeleton-heading">
        <span />
        <div>
          <span />
          <span />
        </div>
      </div>

      <div className="interview-details__skeleton-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>

      <div className="interview-details__skeleton-section" />
      <div className="interview-details__skeleton-section" />
    </div>
  );
}

function DetailItem({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="interview-details__item">
      <span className="interview-details__item-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span className="interview-details__item-label">{label}</span>
        <div className="interview-details__item-value">{children}</div>
      </div>
    </div>
  );
}

export function InterviewDetails({
  interview,
  loading = false,
  error = null,
  actionLoading = false,
  disabled = false,
  readOnly = false,
  onRetry,
  onEdit,
  onCancel,
  onJoin,
  onContactApplicant,
  onViewApplicant,
  onViewJob,
  showInternalNotes = false,
}: InterviewDetailsProps) {
  if (loading) {
    return <InterviewDetailsSkeleton />;
  }

  if (error) {
    return (
      <section className="interview-details" aria-label="Interview details">
        <div className="interview-details__error" role="alert">
          <span aria-hidden="true">!</span>
          <h2>Unable to load interview details</h2>
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

  if (!interview) {
    return (
      <section className="interview-details" aria-label="Interview details">
        <div className="interview-details__empty">
          <span aria-hidden="true">◷</span>
          <h2>Interview not found</h2>
          <p>
            This interview may have been removed or may no longer be available
            to your account.
          </p>
        </div>
      </section>
    );
  }

  const {
    applicant,
    job,
    scheduledAt,
    durationMinutes,
    status,
    interviewType,
    location,
    meetingUrl,
    interviewer,
    agenda,
    notes,
    createdAt,
    updatedAt,
  } = interview;

  const canModify =
    !disabled &&
    !readOnly &&
    status !== 'completed' &&
    status !== 'cancelled';

  const canJoin =
    !disabled &&
    status !== 'completed' &&
    status !== 'cancelled' &&
    Boolean(onJoin);

  const safeMeetingUrl = isSafeHttpUrl(meetingUrl);

  const showJoin =
    Boolean(onJoin) &&
    (interviewType === 'video' || safeMeetingUrl);

  return (
    <section
      className="interview-details"
      aria-label="Interview details"
      aria-busy={actionLoading}
    >
      <header className="interview-details__header">
        <div>
          <span className="interview-details__eyebrow">
            INTERVIEW INFORMATION
          </span>
          <h2>Interview details</h2>
          <p>Review the schedule and information for this candidate interview.</p>
        </div>

        <span
          className={`interview-details__status interview-details__status--${status}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </header>

      <section className="interview-details__candidate">
        <div className="interview-details__avatar">
          {applicant.avatarUrl ? (
            <img src={applicant.avatarUrl} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true">
              {getInitials(applicant.name)}
            </span>
          )}
        </div>

        <div className="interview-details__candidate-info">
          <span className="interview-details__section-label">
            CANDIDATE
          </span>
          <h3>{applicant.name}</h3>

          {applicant.email && (
            <a href={`mailto:${applicant.email}`}>
              {applicant.email}
            </a>
          )}

          {applicant.phone && (
            <a href={`tel:${applicant.phone}`}>
              {applicant.phone}
            </a>
          )}

          {applicant.location && (
            <span>{applicant.location}</span>
          )}
        </div>

        {onViewApplicant && (
          <button
            type="button"
            className="interview-details__text-action"
            onClick={() => onViewApplicant(applicant.id)}
            disabled={disabled}
          >
            View applicant
          </button>
        )}
      </section>

      <section className="interview-details__section">
        <div className="interview-details__section-heading">
          <h3>Schedule and format</h3>
        </div>

        <div className="interview-details__grid">
          <DetailItem icon="◷" label="Interview date">
            {formatDate(scheduledAt)}
          </DetailItem>

          <DetailItem icon="◴" label="Interview time">
            {formatTime(scheduledAt)}
          </DetailItem>

          <DetailItem icon="◷" label="Duration">
            {durationMinutes && durationMinutes > 0
              ? `${durationMinutes} minutes`
              : 'Not specified'}
          </DetailItem>

          <DetailItem icon="◉" label="Interview format">
            {interviewType
              ? TYPE_LABELS[interviewType]
              : 'Not specified'}
          </DetailItem>

          <DetailItem icon="⌖" label="Location">
            {location || 'Not specified'}
          </DetailItem>

          <DetailItem icon="▤" label="Related position">
            {onViewJob ? (
              <button
                type="button"
                className="interview-details__inline-link"
                onClick={() => onViewJob(job.id)}
                disabled={disabled}
              >
                {job.title}
              </button>
            ) : (
              job.title
            )}
          </DetailItem>
        </div>
      </section>

      {interviewer && (
        <section className="interview-details__section">
          <div className="interview-details__section-heading">
            <h3>Interviewer</h3>
          </div>

          <div className="interview-details__interviewer">
            <div className="interview-details__interviewer-avatar">
              {getInitials(interviewer.name)}
            </div>

            <div>
              <strong>{interviewer.name}</strong>
              {interviewer.email && <span>{interviewer.email}</span>}
            </div>
          </div>
        </section>
      )}

      {agenda && (
        <section className="interview-details__section">
          <div className="interview-details__section-heading">
            <h3>Interview agenda</h3>
          </div>
          <div className="interview-details__content">
            <p>{agenda}</p>
          </div>
        </section>
      )}

      {showInternalNotes && notes && (
        <section className="interview-details__section">
          <div className="interview-details__section-heading">
            <h3>Internal notes</h3>
            <span>Private to authorized employer users</span>
          </div>
          <div className="interview-details__content interview-details__content--notes">
            <p>{notes}</p>
          </div>
        </section>
      )}

      {safeMeetingUrl && (
        <section className="interview-details__meeting">
          <div>
            <strong>Online meeting</strong>
            <span>Use the meeting link when the interview is ready to begin.</span>
          </div>

          <a
            href={meetingUrl!}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open meeting ↗
          </a>
        </section>
      )}

      <section className="interview-details__metadata">
        <span>Interview ID: {interview.id}</span>
        {createdAt && <span>Created: {formatTimestamp(createdAt)}</span>}
        {updatedAt && <span>Updated: {formatTimestamp(updatedAt)}</span>}
      </section>

      <footer className="interview-details__footer">
        <div className="interview-details__actions">
          {onContactApplicant && (
            <button
              type="button"
              className="interview-details__button interview-details__button--secondary"
              onClick={() => onContactApplicant(interview)}
              disabled={disabled || actionLoading}
            >
              Contact candidate
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              className="interview-details__button interview-details__button--secondary"
              onClick={() => onEdit(interview)}
              disabled={!canModify || actionLoading}
            >
              Edit interview
            </button>
          )}

          {showJoin && onJoin && (
            <button
              type="button"
              className="interview-details__button interview-details__button--primary"
              onClick={() => onJoin(interview)}
              disabled={!canJoin || actionLoading}
            >
              {actionLoading ? 'Please wait…' : 'Join interview'}
            </button>
          )}

          {onCancel && (
            <button
              type="button"
              className="interview-details__button interview-details__button--danger"
              onClick={() => onCancel(interview)}
              disabled={!canModify || actionLoading}
            >
              Cancel interview
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

export default InterviewDetails;
