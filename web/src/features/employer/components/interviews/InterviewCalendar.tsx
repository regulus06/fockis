
import { useMemo, useState } from 'react';
import '../styles/InterviewCalendar.scss';

export type InterviewStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type InterviewCalendarEvent = {
  id: string;
  applicantName: string;
  applicantEmail?: string | null;
  jobTitle: string;
  scheduledAt: string;
  durationMinutes?: number;
  status: InterviewStatus;
  interviewType?: 'in_person' | 'video' | 'phone' | 'other';
  location?: string | null;
  meetingUrl?: string | null;
  interviewerName?: string | null;
};

export type InterviewCalendarProps = {
  events: InterviewCalendarEvent[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectInterview?: (event: InterviewCalendarEvent) => void;
  onCreateInterview?: (date: Date) => void;
  onViewAll?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  initialDate?: Date;
  weekStartsOn?: 0 | 1;
  emptyMessage?: string;
};

const STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

const TYPE_LABELS: Record<
  NonNullable<InterviewCalendarEvent['interviewType']>,
  string
> = {
  in_person: 'In person',
  video: 'Video call',
  phone: 'Phone call',
  other: 'Other',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getEventDate(value: string): Date | null {
  const date = new Date(value);
  return isValidDate(date) ? date : null;
}

function formatTime(value: string): string {
  const date = getEventDate(value);

  if (!date) return 'Time unavailable';

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getCalendarDays(
  currentMonth: Date,
  weekStartsOn: 0 | 1,
): Date[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() - weekStartsOn + 7) % 7;
  const gridStart = new Date(year, month, 1 - offset);

  return Array.from({ length: 42 }, (_, index) => {
    return new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );
  });
}

function getWeekdayLabels(weekStartsOn: 0 | 1): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    return WEEKDAYS[(weekStartsOn + index) % 7];
  });
}

function getEventTypeLabel(
  type?: InterviewCalendarEvent['interviewType'],
): string {
  return type ? TYPE_LABELS[type] : 'Interview';
}

function isSameDay(a: Date, b: Date): boolean {
  return getDateKey(a) === getDateKey(b);
}

function InterviewCalendarSkeleton() {
  return (
    <div
      className="interview-calendar__skeleton"
      aria-label="Loading interview calendar"
      aria-busy="true"
    >
      <div className="interview-calendar__skeleton-toolbar" />
      <div className="interview-calendar__skeleton-grid">
        {Array.from({ length: 35 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

export function InterviewCalendar({
  events,
  loading = false,
  error = null,
  onRetry,
  onSelectInterview,
  onCreateInterview,
  onViewAll,
  disabled = false,
  readOnly = false,
  initialDate,
  weekStartsOn = 0,
  emptyMessage = 'Scheduled interviews will appear here.',
}: InterviewCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const candidate = initialDate ? new Date(initialDate) : new Date();

    return isValidDate(candidate) ? candidate : new Date();
  });

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const candidate = initialDate ? new Date(initialDate) : new Date();

    return isValidDate(candidate) ? candidate : new Date();
  });

  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth, weekStartsOn),
    [currentMonth, weekStartsOn],
  );

  const weekdayLabels = useMemo(
    () => getWeekdayLabels(weekStartsOn),
    [weekStartsOn],
  );

  const validEvents = useMemo(() => {
    return events
      .filter((event) => Boolean(getEventDate(event.scheduledAt)))
      .slice()
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime(),
      );
  }, [events]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, InterviewCalendarEvent[]>();

    validEvents.forEach((event) => {
      const date = getEventDate(event.scheduledAt);

      if (!date) return;

      const key = getDateKey(date);
      const existing = grouped.get(key) ?? [];

      existing.push(event);
      grouped.set(key, existing);
    });

    return grouped;
  }, [validEvents]);

  const selectedEvents = eventsByDate.get(getDateKey(selectedDate)) ?? [];

  const monthEventCount = validEvents.filter((event) => {
    const date = getEventDate(event.scheduledAt);

    return (
      date &&
      date.getFullYear() === currentMonth.getFullYear() &&
      date.getMonth() === currentMonth.getMonth() &&
      event.status !== 'cancelled'
    );
  }).length;

  const today = new Date();

  const changeMonth = (amount: number) => {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1,
        ),
    );
  };

  const goToToday = () => {
    const now = new Date();

    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    setSelectedDate(now);
  };

  const selectCalendarDate = (date: Date) => {
    setSelectedDate(date);

    if (
      date.getMonth() !== currentMonth.getMonth() ||
      date.getFullYear() !== currentMonth.getFullYear()
    ) {
      setCurrentMonth(
        new Date(date.getFullYear(), date.getMonth(), 1),
      );
    }
  };

  const handleCreateInterview = () => {
    if (!onCreateInterview || disabled || readOnly) return;
    onCreateInterview(selectedDate);
  };

  return (
    <section
      className="interview-calendar"
      aria-label="Interview calendar"
      aria-busy={loading}
    >
      <header className="interview-calendar__header">
        <div>
          <span className="interview-calendar__eyebrow">
            RECRUITMENT SCHEDULE
          </span>
          <h2>Interview calendar</h2>
          <p>Keep track of upcoming candidate interviews.</p>
        </div>

        <div className="interview-calendar__header-actions">
          {onViewAll && (
            <button
              type="button"
              className="interview-calendar__view-all"
              onClick={onViewAll}
              disabled={disabled}
            >
              All interviews
              <span aria-hidden="true">→</span>
            </button>
          )}

          {onCreateInterview && (
            <button
              type="button"
              className="interview-calendar__create"
              onClick={handleCreateInterview}
              disabled={disabled || readOnly}
            >
              <span aria-hidden="true">+</span>
              Schedule interview
            </button>
          )}
        </div>
      </header>

      {error ? (
        <div className="interview-calendar__error" role="alert">
          <div>
            <strong>Unable to load interviews</strong>
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
        <InterviewCalendarSkeleton />
      ) : (
        <>
          <div className="interview-calendar__toolbar">
            <div className="interview-calendar__month-navigation">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                disabled={disabled}
                aria-label="Previous month"
              >
                ‹
              </button>

              <h3 aria-live="polite">{formatMonth(currentMonth)}</h3>

              <button
                type="button"
                onClick={() => changeMonth(1)}
                disabled={disabled}
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="interview-calendar__toolbar-actions">
              <span className="interview-calendar__month-count">
                {monthEventCount} interview{monthEventCount === 1 ? '' : 's'} this month
              </span>

              <button
                type="button"
                className="interview-calendar__today"
                onClick={goToToday}
                disabled={disabled}
              >
                Today
              </button>
            </div>
          </div>

          <div className="interview-calendar__layout">
            <div className="interview-calendar__calendar">
              <div className="interview-calendar__weekdays">
                {weekdayLabels.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="interview-calendar__days">
                {calendarDays.map((date) => {
                  const key = getDateKey(date);
                  const dayEvents = eventsByDate.get(key) ?? [];
                  const isCurrentMonth =
                    date.getMonth() === currentMonth.getMonth() &&
                    date.getFullYear() === currentMonth.getFullYear();
                  const isToday = isSameDay(date, today);
                  const isSelected = isSameDay(date, selectedDate);
                  const activeEvents = dayEvents.filter(
                    (event) => event.status !== 'cancelled',
                  );

                  return (
                    <button
                      type="button"
                      key={key}
                      className={[
                        'interview-calendar__day',
                        !isCurrentMonth && 'interview-calendar__day--outside',
                        isToday && 'interview-calendar__day--today',
                        isSelected && 'interview-calendar__day--selected',
                        activeEvents.length > 0 && 'interview-calendar__day--has-events',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => selectCalendarDate(date)}
                      disabled={disabled}
                      aria-pressed={isSelected}
                      aria-label={`${formatFullDate(date)}. ${activeEvents.length} active interviews.`}
                    >
                      <span className="interview-calendar__day-number">
                        {date.getDate()}
                      </span>

                      {activeEvents.length > 0 && (
                        <span className="interview-calendar__day-events">
                          {activeEvents.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className={`interview-calendar__event-dot interview-calendar__event-dot--${event.status}`}
                            />
                          ))}

                          {activeEvents.length > 3 && (
                            <span className="interview-calendar__more">
                              +{activeEvents.length - 3}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="interview-calendar__legend">
                <span><i className="interview-calendar__legend-dot interview-calendar__legend-dot--scheduled" /> Scheduled</span>
                <span><i className="interview-calendar__legend-dot interview-calendar__legend-dot--confirmed" /> Confirmed</span>
                <span><i className="interview-calendar__legend-dot interview-calendar__legend-dot--completed" /> Completed</span>
              </div>
            </div>

            <aside className="interview-calendar__agenda">
              <div className="interview-calendar__agenda-heading">
                <div>
                  <span className="interview-calendar__eyebrow">
                    DAILY AGENDA
                  </span>
                  <h3>{formatFullDate(selectedDate)}</h3>
                </div>

                <span className="interview-calendar__agenda-count">
                  {selectedEvents.length}
                </span>
              </div>

              {selectedEvents.length === 0 ? (
                <div className="interview-calendar__agenda-empty">
                  <span aria-hidden="true">◷</span>
                  <strong>No interviews scheduled</strong>
                  <p>
                    {emptyMessage}
                  </p>

                  {onCreateInterview && (
                    <button
                      type="button"
                      onClick={handleCreateInterview}
                      disabled={disabled || readOnly}
                    >
                      Schedule for this day
                    </button>
                  )}
                </div>
              ) : (
                <div className="interview-calendar__agenda-list">
                  {selectedEvents.map((event) => (
                    <article
                      className={`interview-calendar__agenda-item interview-calendar__agenda-item--${event.status}`}
                      key={event.id}
                    >
                      <div className="interview-calendar__agenda-time">
                        {formatTime(event.scheduledAt)}
                        {event.durationMinutes && event.durationMinutes > 0 && (
                          <span>{event.durationMinutes} min</span>
                        )}
                      </div>

                      <div className="interview-calendar__agenda-details">
                        <strong>{event.applicantName}</strong>
                        <span>{event.jobTitle}</span>

                        <div className="interview-calendar__agenda-meta">
                          <span>{getEventTypeLabel(event.interviewType)}</span>
                          <span
                            className={`interview-calendar__status interview-calendar__status--${event.status}`}
                          >
                            {STATUS_LABELS[event.status]}
                          </span>
                        </div>

                        {event.interviewerName && (
                          <small>With {event.interviewerName}</small>
                        )}

                        {event.location && (
                          <small>{event.location}</small>
                        )}
                      </div>

                      {onSelectInterview && (
                        <button
                          type="button"
                          className="interview-calendar__open"
                          onClick={() => onSelectInterview(event)}
                          disabled={disabled}
                          aria-label={`View interview with ${event.applicantName}`}
                        >
                          View
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}

export default InterviewCalendar;
