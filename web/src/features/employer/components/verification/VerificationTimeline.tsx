
import EmployerStatusBadge from './EmployerStatusBadge';
import '../styles/VerificationTimeline.scss';

export type VerificationTimelineEventType =
  | 'submitted'
  | 'document_uploaded'
  | 'document_reviewed'
  | 'under_review'
  | 'changes_requested'
  | 'resubmitted'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'renewed'
  | 'note'
  | 'other';

export interface VerificationTimelineEvent {
  id: string;
  type: VerificationTimelineEventType;
  title: string;
  description?: string;
  timestamp: string;
  actor?: {
    name: string;
    role?: string;
    avatarUrl?: string;
  };
  statusLabel?: string;
  statusTone?: 'neutral' | 'warning' | 'info' | 'success' | 'danger';
  metadata?: {
    label: string;
    value: string;
  }[];
}

export interface VerificationTimelineProps {
  events: VerificationTimelineEvent[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  compact?: boolean;
  newestFirst?: boolean;
  showActor?: boolean;
  showMetadata?: boolean;
  showAvatars?: boolean;
  maxEvents?: number;
}

const EVENT_CONFIG: Record<
  VerificationTimelineEventType,
  { label: string; icon: string; tone: string }
> = {
  submitted: {
    label: 'Submitted',
    icon: '↑',
    tone: 'info',
  },
  document_uploaded: {
    label: 'Document uploaded',
    icon: '▤',
    tone: 'info',
  },
  document_reviewed: {
    label: 'Document reviewed',
    icon: '✓',
    tone: 'success',
  },
  under_review: {
    label: 'Under review',
    icon: '⌕',
    tone: 'info',
  },
  changes_requested: {
    label: 'Changes requested',
    icon: '↻',
    tone: 'warning',
  },
  resubmitted: {
    label: 'Resubmitted',
    icon: '↑',
    tone: 'info',
  },
  approved: {
    label: 'Approved',
    icon: '✓',
    tone: 'success',
  },
  rejected: {
    label: 'Rejected',
    icon: '!',
    tone: 'danger',
  },
  expired: {
    label: 'Expired',
    icon: '!',
    tone: 'danger',
  },
  renewed: {
    label: 'Renewed',
    icon: '↻',
    tone: 'success',
  },
  note: {
    label: 'Note',
    icon: '▤',
    tone: 'neutral',
  },
  other: {
    label: 'Activity',
    icon: '•',
    tone: 'neutral',
  },
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getValidTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function VerificationTimeline({
  events,
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  title = 'Verification timeline',
  description = 'Review the history of your business verification.',
  emptyTitle = 'No verification activity yet',
  emptyMessage = 'Verification events will appear here when your submission is processed.',
  compact = false,
  newestFirst = true,
  showActor = true,
  showMetadata = true,
  showAvatars = true,
  maxEvents,
}: VerificationTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => {
    const difference =
      getValidTimestamp(a.timestamp) - getValidTimestamp(b.timestamp);

    return newestFirst ? -difference : difference;
  });

  const visibleEvents =
    maxEvents && maxEvents > 0
      ? sortedEvents.slice(0, maxEvents)
      : sortedEvents;

  if (loading) {
    return (
      <section
        className={`verification-timeline verification-timeline--loading${compact ? ' verification-timeline--compact' : ''}`}
        aria-label={title}
        aria-busy="true"
      >
        <div className="verification-timeline__skeleton verification-timeline__skeleton--heading" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="verification-timeline__skeleton verification-timeline__skeleton--event"
            key={index}
          />
        ))}
        <span className="verification-timeline__sr-only">
          Loading verification history
        </span>
      </section>
    );
  }

  return (
    <section
      className={`verification-timeline${compact ? ' verification-timeline--compact' : ''}`}
      aria-label={title}
    >
      <header className="verification-timeline__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>

        <span className="verification-timeline__count">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </header>

      {error && (
        <div className="verification-timeline__error" role="alert">
          <span>{error}</span>
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
      )}

      {visibleEvents.length === 0 ? (
        <div className="verification-timeline__empty">
          <span aria-hidden="true">◷</span>
          <strong>{emptyTitle}</strong>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <ol
          className={`verification-timeline__list${newestFirst ? ' verification-timeline__list--newest' : ''}`}
        >
          {visibleEvents.map((event, index) => {
            const config = EVENT_CONFIG[event.type];

            return (
              <li
                className="verification-timeline__item"
                key={event.id}
              >
                <div
                  className={`verification-timeline__marker verification-timeline__marker--${config.tone}`}
                  aria-hidden="true"
                >
                  {config.icon}
                </div>

                <article className="verification-timeline__content">
                  <div className="verification-timeline__event-heading">
                    <div>
                      <h3>{event.title}</h3>
                      <span className="verification-timeline__event-type">
                        {config.label}
                      </span>
                    </div>

                    {event.statusLabel && (
                      <EmployerStatusBadge
                        status={event.statusLabel}
                        label={event.statusLabel}
                        tone={event.statusTone ?? 'neutral'}
                      />
                    )}
                  </div>

                  {event.description && (
                    <p className="verification-timeline__description">
                      {event.description}
                    </p>
                  )}

                  <time
                    className="verification-timeline__date"
                    dateTime={event.timestamp}
                  >
                    {formatDate(event.timestamp)}
                  </time>

                  {showActor && event.actor && (
                    <div className="verification-timeline__actor">
                      {showAvatars && event.actor.avatarUrl ? (
                        <img
                          src={event.actor.avatarUrl}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : showAvatars ? (
                        <span className="verification-timeline__actor-fallback">
                          {event.actor.name.trim().charAt(0).toUpperCase() || '?'}
                        </span>
                      ) : null}

                      <div>
                        <strong>{event.actor.name}</strong>
                        {event.actor.role && <small>{event.actor.role}</small>}
                      </div>
                    </div>
                  )}

                  {showMetadata &&
                    event.metadata &&
                    event.metadata.length > 0 && (
                      <dl className="verification-timeline__metadata">
                        {event.metadata.map((item, metadataIndex) => (
                          <div key={`${event.id}-metadata-${metadataIndex}`}>
                            <dt>{item.label}</dt>
                            <dd>{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {maxEvents &&
        maxEvents > 0 &&
        events.length > visibleEvents.length && (
          <p className="verification-timeline__more">
            Showing {visibleEvents.length} of {events.length} events.
          </p>
        )}
    </section>
  );
}

export default VerificationTimeline;
