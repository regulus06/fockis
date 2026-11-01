
import '../styles/ApplicantTimeline.scss';

export type ApplicantTimelineEventType =
  | 'application_submitted'
  | 'application_viewed'
  | 'status_changed'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_declined'
  | 'rejected'
  | 'note_added'
  | 'email_sent'
  | 'document_uploaded'
  | 'other';

export type ApplicantTimelineEvent = {
  id: string;
  type: ApplicantTimelineEventType;
  title: string;
  description?: string | null;
  createdAt: string;
  actor?: {
    id?: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
    interviewDate?: string;
    documentName?: string;
  } | null;
};

export type ApplicantTimelineProps = {
  events: ApplicantTimelineEvent[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  emptyMessage?: string;
  newestFirst?: boolean;
  maxEvents?: number;
};

const EVENT_PRESENTATION: Record<
  ApplicantTimelineEventType,
  { label: string; icon: string; color: string }
> = {
  application_submitted: {
    label: 'Application submitted',
    icon: 'file',
    color: 'blue',
  },
  application_viewed: {
    label: 'Application viewed',
    icon: 'eye',
    color: 'slate',
  },
  status_changed: {
    label: 'Status changed',
    icon: 'refresh',
    color: 'blue',
  },
  shortlisted: {
    label: 'Shortlisted',
    icon: 'star',
    color: 'purple',
  },
  interview_scheduled: {
    label: 'Interview scheduled',
    icon: 'calendar',
    color: 'orange',
  },
  interview_completed: {
    label: 'Interview completed',
    icon: 'check',
    color: 'green',
  },
  offer_sent: {
    label: 'Offer sent',
    icon: 'send',
    color: 'green',
  },
  offer_accepted: {
    label: 'Offer accepted',
    icon: 'check',
    color: 'green',
  },
  offer_declined: {
    label: 'Offer declined',
    icon: 'close',
    color: 'red',
  },
  rejected: {
    label: 'Application rejected',
    icon: 'close',
    color: 'red',
  },
  note_added: {
    label: 'Internal note added',
    icon: 'note',
    color: 'slate',
  },
  email_sent: {
    label: 'Email sent',
    icon: 'mail',
    color: 'blue',
  },
  document_uploaded: {
    label: 'Document uploaded',
    icon: 'file',
    color: 'purple',
  },
  other: {
    label: 'Activity',
    icon: 'activity',
    color: 'slate',
  },
};

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const difference = date.getTime() - Date.now();
  const absoluteDifference = Math.abs(difference);

  const units: {
    value: number;
    unit: Intl.RelativeTimeFormatUnit;
  }[] = [
    { value: 60_000, unit: 'minute' },
    { value: 3_600_000, unit: 'hour' },
    { value: 86_400_000, unit: 'day' },
    { value: 604_800_000, unit: 'week' },
  ];

  const formatter = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
  });

  if (absoluteDifference < 60_000) {
    return formatter.format(Math.round(difference / 1000), 'second');
  }

  for (const item of units) {
    if (absoluteDifference < item.value * 7 || item.unit === 'week') {
      return formatter.format(
        Math.round(difference / item.value),
        item.unit,
      );
    }
  }

  return formatDateTime(value);
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || '?'
  );
}

function EventIcon({ icon }: { icon: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (icon) {
    case 'file':
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </svg>
      );

    case 'eye':
      return (
        <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    case 'star':
      return (
        <svg {...common}>
          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </svg>
      );

    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case 'close':
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );

    case 'send':
      return (
        <svg {...common}>
          <path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" />
        </svg>
      );

    case 'note':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M8 13h8M8 17h8" />
        </svg>
      );

    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );

    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}

export function ApplicantTimeline({
  events,
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  emptyMessage = 'Activity will appear here as this application progresses.',
  newestFirst = true,
  maxEvents,
}: ApplicantTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => {
    const first = new Date(a.createdAt).getTime();
    const second = new Date(b.createdAt).getTime();

    const firstTime = Number.isNaN(first) ? 0 : first;
    const secondTime = Number.isNaN(second) ? 0 : second;

    return newestFirst
      ? secondTime - firstTime
      : firstTime - secondTime;
  });

  const visibleEvents =
    maxEvents && maxEvents > 0
      ? sortedEvents.slice(0, maxEvents)
      : sortedEvents;

  return (
    <section
      className="applicant-timeline"
      aria-label="Applicant activity timeline"
      aria-busy={loading}
    >
      <header className="applicant-timeline__header">
        <div>
          <h2>Application timeline</h2>
          <p>Follow the activity and progress of this candidate.</p>
        </div>

        <span className="applicant-timeline__count">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </header>

      {error && (
        <div className="applicant-timeline__error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={loading || disabled}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="applicant-timeline__loading">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="applicant-timeline__skeleton"
              key={`timeline-skeleton-${index}`}
            >
              <span />
              <div>
                <span />
                <span />
              </div>
            </div>
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="applicant-timeline__empty">
          <span className="applicant-timeline__empty-icon">
            <EventIcon icon="activity" />
          </span>
          <h3>No activity yet</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <ol className="applicant-timeline__list">
          {visibleEvents.map((event) => {
            const presentation =
              EVENT_PRESENTATION[event.type] ??
              EVENT_PRESENTATION.other;

            return (
              <li className="applicant-timeline__item" key={event.id}>
                <div
                  className={`applicant-timeline__icon applicant-timeline__icon--${presentation.color}`}
                >
                  <EventIcon icon={presentation.icon} />
                </div>

                <div className="applicant-timeline__event">
                  <div className="applicant-timeline__event-header">
                    <div>
                      <h3>{event.title || presentation.label}</h3>
                      <span className="applicant-timeline__type">
                        {presentation.label}
                      </span>
                    </div>

                    <time
                      dateTime={event.createdAt}
                      title={formatDateTime(event.createdAt)}
                    >
                      {formatRelativeTime(event.createdAt)}
                    </time>
                  </div>

                  {event.description && (
                    <p className="applicant-timeline__description">
                      {event.description}
                    </p>
                  )}

                  {event.metadata?.previousStatus &&
                    event.metadata?.newStatus && (
                      <div className="applicant-timeline__transition">
                        <span>{event.metadata.previousStatus}</span>
                        <span aria-hidden="true">→</span>
                        <strong>{event.metadata.newStatus}</strong>
                      </div>
                    )}

                  {event.metadata?.interviewDate && (
                    <p className="applicant-timeline__metadata">
                      Interview: {formatDateTime(event.metadata.interviewDate)}
                    </p>
                  )}

                  {event.metadata?.documentName && (
                    <p className="applicant-timeline__metadata">
                      Document: {event.metadata.documentName}
                    </p>
                  )}

                  <div className="applicant-timeline__actor">
                    {event.actor?.avatarUrl ? (
                      <img
                        src={event.actor.avatarUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="applicant-timeline__actor-initials">
                        {event.actor?.name
                          ? getInitials(event.actor.name)
                          : 'S'}
                      </span>
                    )}

                    <span>
                      {event.actor?.name || 'System'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={event.createdAt}>
                      {formatDateTime(event.createdAt)}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!loading && maxEvents && maxEvents > 0 &&
        sortedEvents.length > maxEvents && (
          <p className="applicant-timeline__more">
            Showing {maxEvents} of {sortedEvents.length} events.
          </p>
        )}
    </section>
  );
}

export default ApplicantTimeline;
