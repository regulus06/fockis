
import { useMemo, useState } from 'react';
import '../styles/EmployerActivityFeed.scss';

export type EmployerActivityType =
  | 'job_created'
  | 'job_updated'
  | 'job_published'
  | 'job_closed'
  | 'application_received'
  | 'application_status_changed'
  | 'interview_scheduled'
  | 'interview_updated'
  | 'interview_cancelled'
  | 'team_member_added'
  | 'team_member_removed'
  | 'company_profile_updated'
  | 'company_verified'
  | 'billing_updated'
  | 'promotion_created'
  | 'other';

export type EmployerActivity = {
  id: string;
  type: EmployerActivityType;
  title: string;
  description?: string | null;
  createdAt: string;
  actor?: {
    id?: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  target?: {
    label: string;
    url?: string;
  } | null;
};

export type EmployerActivityFilter =
  | 'all'
  | 'jobs'
  | 'applicants'
  | 'interviews'
  | 'team'
  | 'company'
  | 'billing';

export type EmployerActivityFeedProps = {
  activities: EmployerActivity[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onLoadMore?: () => void | Promise<void>;
  hasMore?: boolean;
  loadingMore?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  initialFilter?: EmployerActivityFilter;
  pageSize?: number;
  emptyMessage?: string;
  onActivityClick?: (activity: EmployerActivity) => void;
};

const FILTERS: Array<{
  id: EmployerActivityFilter;
  label: string;
}> = [
  { id: 'all', label: 'All activity' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'applicants', label: 'Applicants' },
  { id: 'interviews', label: 'Interviews' },
  { id: 'team', label: 'Team' },
  { id: 'company', label: 'Company' },
  { id: 'billing', label: 'Billing' },
];

const ACTIVITY_META: Record<
  EmployerActivityType,
  { label: string; icon: string; category: EmployerActivityFilter }
> = {
  job_created: {
    label: 'Job created',
    icon: '＋',
    category: 'jobs',
  },
  job_updated: {
    label: 'Job updated',
    icon: '✎',
    category: 'jobs',
  },
  job_published: {
    label: 'Job published',
    icon: '↗',
    category: 'jobs',
  },
  job_closed: {
    label: 'Job closed',
    icon: '✓',
    category: 'jobs',
  },
  application_received: {
    label: 'New application',
    icon: '↓',
    category: 'applicants',
  },
  application_status_changed: {
    label: 'Applicant update',
    icon: '⇄',
    category: 'applicants',
  },
  interview_scheduled: {
    label: 'Interview scheduled',
    icon: '▦',
    category: 'interviews',
  },
  interview_updated: {
    label: 'Interview updated',
    icon: '◷',
    category: 'interviews',
  },
  interview_cancelled: {
    label: 'Interview cancelled',
    icon: '×',
    category: 'interviews',
  },
  team_member_added: {
    label: 'Team member added',
    icon: '＋',
    category: 'team',
  },
  team_member_removed: {
    label: 'Team member removed',
    icon: '−',
    category: 'team',
  },
  company_profile_updated: {
    label: 'Profile updated',
    icon: '▤',
    category: 'company',
  },
  company_verified: {
    label: 'Company verified',
    icon: '✓',
    category: 'company',
  },
  billing_updated: {
    label: 'Billing update',
    icon: '$',
    category: 'billing',
  },
  promotion_created: {
    label: 'Promotion created',
    icon: '✦',
    category: 'jobs',
  },
  other: {
    label: 'Activity',
    icon: '•',
    category: 'all',
  },
};

function formatActivityDate(value: string): {
  relative: string;
  full: string;
} {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { relative: 'Date unavailable', full: 'Date unavailable' };
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

function ActivitySkeleton() {
  return (
    <div className="employer-activity-feed__skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="employer-activity-feed__skeleton-item" key={index}>
          <span className="employer-activity-feed__skeleton-icon" />
          <div>
            <span className="employer-activity-feed__skeleton-line" />
            <span className="employer-activity-feed__skeleton-line employer-activity-feed__skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function EmployerActivityFeed({
  activities,
  loading = false,
  error = null,
  onRetry,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  disabled = false,
  readOnly = true,
  initialFilter = 'all',
  pageSize = 8,
  emptyMessage = 'There is no employer activity to display yet.',
  onActivityClick,
}: EmployerActivityFeedProps) {
  const [activeFilter, setActiveFilter] =
    useState<EmployerActivityFilter>(initialFilter);

  const filteredActivities = useMemo(() => {
    const filtered =
      activeFilter === 'all'
        ? activities
        : activities.filter(
            (activity) =>
              ACTIVITY_META[activity.type]?.category === activeFilter,
          );

    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
  }, [activities, activeFilter]);

  const visibleActivities = filteredActivities.slice(
    0,
    Math.max(1, pageSize),
  );

  const canOpenActivity = Boolean(onActivityClick) && !disabled;

  return (
    <section
      className="employer-activity-feed"
      aria-label="Employer activity feed"
      aria-busy={loading || loadingMore}
    >
      <header className="employer-activity-feed__header">
        <div>
          <span className="employer-activity-feed__eyebrow">
            EMPLOYER CENTER
          </span>
          <h2>Recent activity</h2>
          <p>Keep track of important updates across your employer account.</p>
        </div>

        <span className="employer-activity-feed__count">
          {filteredActivities.length} {filteredActivities.length === 1 ? 'event' : 'events'}
        </span>
      </header>

      <div
        className="employer-activity-feed__filters"
        role="group"
        aria-label="Filter activity"
      >
        {FILTERS.map((filter) => (
          <button
            type="button"
            key={filter.id}
            className={
              activeFilter === filter.id
                ? 'employer-activity-feed__filter employer-activity-feed__filter--active'
                : 'employer-activity-feed__filter'
            }
            aria-pressed={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
            disabled={disabled}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="employer-activity-feed__error"
          role="alert"
        >
          <div>
            <strong>Activity could not be loaded</strong>
            <p>{error}</p>
          </div>

          {onRetry && (
            <button type="button" onClick={onRetry} disabled={disabled}>
              Retry
            </button>
          )}
        </div>
      )}

      {loading ? (
        <ActivitySkeleton />
      ) : filteredActivities.length === 0 ? (
        <div className="employer-activity-feed__empty">
          <span aria-hidden="true">◷</span>
          <h3>No activity found</h3>
          <p>
            {activeFilter === 'all'
              ? emptyMessage
              : `There are no ${activeFilter} events in this activity feed.`}
          </p>
        </div>
      ) : (
        <div className="employer-activity-feed__timeline">
          {visibleActivities.map((activity, index) => {
            const meta = ACTIVITY_META[activity.type] ?? ACTIVITY_META.other;
            const date = formatActivityDate(activity.createdAt);

            return (
              <article
                className="employer-activity-feed__item"
                key={activity.id}
              >
                <div className="employer-activity-feed__timeline-marker">
                  <span
                    className={`employer-activity-feed__icon employer-activity-feed__icon--${meta.category}`}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>

                  {index < visibleActivities.length - 1 && (
                    <span className="employer-activity-feed__connector" />
                  )}
                </div>

                <div className="employer-activity-feed__content">
                  <div className="employer-activity-feed__item-top">
                    <span className="employer-activity-feed__type">
                      {meta.label}
                    </span>

                    <time
                      className="employer-activity-feed__time"
                      dateTime={activity.createdAt}
                      title={date.full}
                    >
                      {date.relative}
                    </time>
                  </div>

                  {onActivityClick ? (
                    <button
                      type="button"
                      className="employer-activity-feed__title employer-activity-feed__title--button"
                      onClick={() => onActivityClick(activity)}
                      disabled={!canOpenActivity}
                    >
                      {activity.title}
                    </button>
                  ) : (
                    <h3 className="employer-activity-feed__title">
                      {activity.title}
                    </h3>
                  )}

                  {activity.description && (
                    <p className="employer-activity-feed__description">
                      {activity.description}
                    </p>
                  )}

                  <div className="employer-activity-feed__metadata">
                    {activity.actor && (
                      <span className="employer-activity-feed__actor">
                        {activity.actor.avatarUrl ? (
                          <img
                            src={activity.actor.avatarUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="employer-activity-feed__avatar-fallback">
                            {getInitials(activity.actor.name)}
                          </span>
                        )}
                        {activity.actor.name}
                      </span>
                    )}

                    {activity.target && (
                      <span className="employer-activity-feed__target">
                        {activity.target.label}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading &&
        !error &&
        filteredActivities.length > visibleActivities.length && (
          <div className="employer-activity-feed__load-more">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={disabled || loadingMore || !onLoadMore}
            >
              {loadingMore ? 'Loading…' : 'Show more activity'}
            </button>
          </div>
        )}

      {!loading &&
        !error &&
        filteredActivities.length <= visibleActivities.length &&
        hasMore &&
        onLoadMore && (
          <div className="employer-activity-feed__load-more">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={disabled || loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load older activity'}
            </button>
          </div>
        )}
    </section>
  );
}

export default EmployerActivityFeed;
