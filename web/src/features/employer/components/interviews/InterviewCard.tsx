
import '../styles/InterviewCard.scss';

export type InterviewCardStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type InterviewCardData = {
  id: string;
  applicantName: string;
  applicantEmail?: string | null;
  applicantAvatarUrl?: string | null;
  jobTitle: string;
  scheduledAt: string;
  durationMinutes?: number;
  status: InterviewCardStatus;
  interviewType?: 'video' | 'phone' | 'in_person' | 'other';
  location?: string | null;
  meetingUrl?: string | null;
  interviewerName?: string | null;
  notes?: string | null;
};

export type InterviewCardProps = {
  interview: InterviewCardData;
  onView?: (interview: InterviewCardData) => void;
  onEdit?: (interview: InterviewCardData) => void;
  onCancel?: (interview: InterviewCardData) => void;
  onJoin?: (interview: InterviewCardData) => void;
  loading?: boolean;
  actionLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  showNotes?: boolean;
};

const STATUS_LABELS: Record<InterviewCardStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

const TYPE_LABELS: Record<
  NonNullable<InterviewCardData['interviewType']>,
  string
> = {
  video: 'Video interview',
  phone: 'Phone interview',
  in_person: 'In-person interview',
  other: 'Other interview',
};

function getDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string): string {
  const date = getDate(value);

  if (!date) return 'Date unavailable';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(value: string): string {
  const date = getDate(value);

  if (!date) return 'Time unavailable';

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function isSafeMeetingUrl(value?: string | null): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function InterviewCardSkeleton() {
  return (
    <div
      className="interview-card interview-card--skeleton"
      aria-label="Loading interview"
      aria-busy="true"
    >
      <div className="interview-card__skeleton-header">
        <span />
        <div>
          <span />
          <span />
        </div>
        <span />
      </div>
      <div className="interview-card__skeleton-details">
        <span />
        <span />
        <span />
      </div>
      <div className="interview-card__skeleton-footer">
        <span />
        <span />
      </div>
    </div>
  );
}

export function InterviewCard({
  interview,
  onView,
  onEdit,
  onCancel,
  onJoin,
  loading = false,
  actionLoading = false,
  disabled = false,
  readOnly = false,
  showNotes = false,
}: InterviewCardProps) {
  if (loading) {
    return <InterviewCardSkeleton />;
  }

  const {
    applicantName,
    applicantEmail,
    applicantAvatarUrl,
    jobTitle,
    scheduledAt,
    durationMinutes,
    status,
    interviewType,
    location,
    meetingUrl,
    interviewerName,
    notes,
  } = interview;

  const canModify =
    !disabled &&
    !readOnly &&
    status !== 'completed' &&
    status !== 'cancelled';

  const canJoin =
    !disabled &&
    status !== 'cancelled' &&
    status !== 'completed' &&
    Boolean(onJoin);

  const safeMeetingUrl = isSafeMeetingUrl(meetingUrl);

  const showJoinAction =
    Boolean(onJoin) && (interviewType === 'video' || safeMeetingUrl);

  return (
    <article className="interview-card">
      <div className="interview-card__header">
        <div className="interview-card__candidate">
          <div className="interview-card__avatar">
            {applicantAvatarUrl ? (
              <img src={applicantAvatarUrl} alt="" loading="lazy" />
            ) : (
              <span aria-hidden="true">
                {getInitials(applicantName) || 'C'}
              </span>
            )}
          </div>

          <div className="interview-card__identity">
            <h3>{applicantName || 'Candidate'}</h3>

            {applicantEmail && (
              <a href={`mailto:${applicantEmail}`}>
                {applicantEmail}
              </a>
            )}

            <span className="interview-card__job">{jobTitle}</span>
          </div>
        </div>

        <span
          className={`interview-card__status interview-card__status--${status}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="interview-card__details">
        <div className="interview-card__detail">
          <span className="interview-card__detail-icon" aria-hidden="true">
            ◷
          </span>
          <div>
            <span className="interview-card__detail-label">
              Date and time
            </span>
            <strong>{formatDate(scheduledAt)}</strong>
            <span>{formatTime(scheduledAt)}</span>
          </div>
        </div>

        <div className="interview-card__detail">
          <span className="interview-card__detail-icon" aria-hidden="true">
            ◉
          </span>
          <div>
            <span className="interview-card__detail-label">
              Interview format
            </span>
            <strong>
              {interviewType
                ? TYPE_LABELS[interviewType]
                : 'Not specified'}
            </strong>
            {location && <span>{location}</span>}
          </div>
        </div>

        {typeof durationMinutes === 'number' && durationMinutes > 0 && (
          <div className="interview-card__detail">
            <span className="interview-card__detail-icon" aria-hidden="true">
              ◷
            </span>
            <div>
              <span className="interview-card__detail-label">
                Duration
              </span>
              <strong>{durationMinutes} minutes</strong>
            </div>
          </div>
        )}

        {interviewerName && (
          <div className="interview-card__detail">
            <span className="interview-card__detail-icon" aria-hidden="true">
              ♙
            </span>
            <div>
              <span className="interview-card__detail-label">
                Interviewer
              </span>
              <strong>{interviewerName}</strong>
            </div>
          </div>
        )}
      </div>

      {showNotes && notes && (
        <div className="interview-card__notes">
          <strong>Interview notes</strong>
          <p>{notes}</p>
        </div>
      )}

      <footer className="interview-card__footer">
        <div className="interview-card__actions">
          {onView && (
            <button
              type="button"
              className="interview-card__button interview-card__button--secondary"
              onClick={() => onView(interview)}
              disabled={disabled || actionLoading}
            >
              View details
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              className="interview-card__button interview-card__button--secondary"
              onClick={() => onEdit(interview)}
              disabled={!canModify || actionLoading}
            >
              Edit
            </button>
          )}

          {showJoinAction && onJoin && (
            <button
              type="button"
              className="interview-card__button interview-card__button--primary"
              onClick={() => onJoin(interview)}
              disabled={!canJoin || actionLoading}
            >
              {actionLoading ? 'Please wait…' : 'Join interview'}
            </button>
          )}

          {onCancel && (
            <button
              type="button"
              className="interview-card__button interview-card__button--danger"
              onClick={() => onCancel(interview)}
              disabled={!canModify || actionLoading}
            >
              Cancel
            </button>
          )}
        </div>

        {safeMeetingUrl && (
          <a
            className="interview-card__meeting-link"
            href={meetingUrl!}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open meeting link ↗
          </a>
        )}
      </footer>
    </article>
  );
}

export default InterviewCard;
