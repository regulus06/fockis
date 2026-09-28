import React, {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import EventRsvpButton from '../components/EventRsvpButton';

import {
  eventsApi,
} from '../services/eventsApi';

import type {
  FockisEvent,
} from '../types/event.types';

import '../styles/EventsPage.scss';

// ============================================================================
// DATE FORMATTER
// ============================================================================

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: 'full',
      timeStyle: 'short',
    },
  ).format(date);
}

// ============================================================================
// AUTHENTICATED USER ID
// ============================================================================

function getCurrentUserId(): string | null {
  const token =
    localStorage.getItem('token') ??
    localStorage.getItem('accessToken');

  if (!token) {
    return null;
  }

  try {
    const parts =
      token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const base64Payload =
      parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const paddedPayload =
      base64Payload.padEnd(
        Math.ceil(
          base64Payload.length / 4,
        ) * 4,
        '=',
      );

    const payload =
      JSON.parse(
        atob(paddedPayload),
      ) as Record<
        string,
        unknown
      >;

    const userId =
      payload.id ??
      payload._id ??
      payload.userId ??
      payload.sub;

    if (
      userId === undefined ||
      userId === null ||
      String(userId).trim() === ''
    ) {
      return null;
    }

    return String(userId);
  } catch (error) {
    console.error(
      '[EventDetailsPage] Unable to read authenticated user from token:',
      error,
    );

    return null;
  }
}

// ============================================================================
// PAGE
// ============================================================================

export default function EventDetailsPage() {
  const {
    eventId,
  } = useParams<{
    eventId: string;
  }>();

  const navigate =
    useNavigate();

  const [
    event,
    setEvent,
  ] = useState<FockisEvent | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(
    Boolean(eventId),
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    cancelling,
    setCancelling,
  ] = useState(false);

  // ==========================================================================
  // AUTHORIZATION
  //
  // The frontend uses this only to decide whether owner controls should be
  // displayed. The NestJS backend must still enforce ownership.
  // ==========================================================================

  const currentUserId =
    getCurrentUserId();

  const isEventOwner =
    Boolean(
      event &&
      currentUserId &&
      String(event.creatorId) ===
        String(currentUserId),
    );

  // ==========================================================================
  // LOAD EVENT
  // ==========================================================================

  useEffect(() => {
    let active = true;

    if (!eventId) {
      setLoading(false);

      setError(
        'No event ID was provided.',
      );

      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    setEvent(null);

    eventsApi
      .getById(eventId)
      .then((result) => {
        if (!active) {
          return;
        }

        if (!result) {
          setError(
            'Event not found.',
          );

          setEvent(null);

          return;
        }

        setEvent(result);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        console.error(
          '[EventDetailsPage] Failed to load event:',
          err,
        );

        setEvent(null);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load event.',
        );
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  // ==========================================================================
  // CANCEL EVENT
  // ==========================================================================

  async function handleCancelEvent() {
    if (
      !eventId ||
      !event ||
      !isEventOwner
    ) {
      return;
    }

    const reason =
      window.prompt(
        'Why are you cancelling this event?\n\nThis message will be shown to people who view the event.',
        '',
      );

    if (reason === null) {
      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to cancel this event?\n\nThe public will be able to see that the event has been cancelled.',
      );

    if (!confirmed) {
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      const updated =
        await eventsApi.cancel(
          eventId,
          reason.trim() ||
            'This event has been cancelled by the organizer.',
        );

      setEvent(updated);
    } catch (err) {
      console.error(
        '[EventDetailsPage] Failed to cancel event:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to cancel event.',
      );
    } finally {
      setCancelling(false);
    }
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (loading) {
    return (
      <main className="fk-events-page">
        <div className="fk-events-state">
          Loading event...
        </div>
      </main>
    );
  }

  // ==========================================================================
  // ERROR / NOT FOUND
  // ==========================================================================

  if (error || !event) {
    return (
      <main className="fk-events-page">
        <div className="fk-events-state error">

          <h2>
            Unable to load event
          </h2>

          <p>
            {error ??
              'Event not found.'}
          </p>

          <button
            type="button"
            className="fk-event-back"
            onClick={() =>
              navigate('/events')
            }
          >
            ← Back to Events
          </button>

        </div>
      </main>
    );
  }

  // ==========================================================================
  // EVENT STATUS
  // ==========================================================================

  const isCancelled =
    event.status === 'cancelled' ||
    event.isCancelled;

  const isEnded =
    event.status === 'ended';

  const canRsvp =
    !isCancelled &&
    !isEnded;

  // ==========================================================================
  // EVENT DETAILS
  // ==========================================================================

  return (
    <main className="fk-events-page">

      <div className="fk-events-container">

        {/* ====================================================================
            BACK BUTTON
        ===================================================================== */}

        <button
          type="button"
          className="fk-event-back"
          onClick={() =>
            navigate('/events')
          }
        >
          ← Back to Events
        </button>

        <article className="fk-event-details">

          {/* ==================================================================
              COVER IMAGE
          =================================================================== */}

          {event.coverImageUrl && (
            <div className="fk-event-details-cover">

              <img
                src={event.coverImageUrl}
                alt={event.title}
                onError={() =>
                  setError(
                    'Unable to load the event cover image.',
                  )
                }
              />

            </div>
          )}

          {/* ==================================================================
              EVENT VIDEO
          =================================================================== */}

          {event.eventVideoUrl && (
            <div className="fk-event-details-video">

              <video
                src={event.eventVideoUrl}
                controls
                playsInline
                preload="metadata"
                className="fk-event-details-cover-video"
              />

            </div>
          )}

          {/* ==================================================================
              CONTENT
          =================================================================== */}

          <div className="fk-event-details-content">

            {/* ================================================================
                CANCELLATION NOTICE
            ================================================================ */}

            {isCancelled && (
              <div
                className="fk-event-cancelled-notice"
                role="alert"
              >

                <div className="fk-event-cancelled-title">
                  🔴 Event Cancelled
                </div>

                <p>
                  This event has been
                  cancelled by the
                  organizer.
                </p>

                {(
                  event as FockisEvent & {
                    cancellationReason?: string;
                  }
                ).cancellationReason && (
                  <p>
                    <strong>
                      Reason:
                    </strong>{' '}
                    {
                      (
                        event as FockisEvent & {
                          cancellationReason?: string;
                        }
                      ).cancellationReason
                    }
                  </p>
                )}

              </div>
            )}

            {/* ================================================================
                STATUS
            ================================================================ */}

            <div
              className={`fk-event-status ${event.status}`}
            >
              {event.status ===
                'upcoming' &&
                'Upcoming'}

              {event.status ===
                'live' &&
                'Live now'}

              {event.status ===
                'ended' &&
                'Ended'}

              {event.status ===
                'cancelled' &&
                'Cancelled'}
            </div>

            {/* ================================================================
                CATEGORY
            ================================================================ */}

            <span className="fk-events-eyebrow">
              {event.category}
            </span>

            {/* ================================================================
                TITLE
            ================================================================ */}

            <h1>
              {event.title}
            </h1>

            {/* ================================================================
                DESCRIPTION
            ================================================================ */}

            {event.description && (
              <p className="fk-event-description">
                {event.description}
              </p>
            )}

            {/* ================================================================
                EVENT INFORMATION
            ================================================================ */}

            <div className="fk-event-detail-list">

              <div>
                <strong>
                  Begin
                </strong>

                <span>
                  {formatDate(
                    event.startDate,
                  )}
                </span>
              </div>

              <div>
                <strong>
                  End / expiration
                </strong>

                <span>
                  {formatDate(
                    event.endDate,
                  )}
                </span>
              </div>

              <div>
                <strong>
                  Location
                </strong>

                <span>
                  {event.isOnline
                    ? 'Online event'
                    : event.locationName ||
                      event.address ||
                      'Location not specified'}
                </span>
              </div>

              {event.isOnline &&
                event.onlineUrl && (
                  <div>
                    <strong>
                      Online link
                    </strong>

                    <a
                      href={
                        event.onlineUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open online event
                    </a>
                  </div>
                )}

              <div>
                <strong>
                  Attendees
                </strong>

                <span>
                  {event.attendeeCount}
                </span>
              </div>

            </div>

            {/* ================================================================
                CANCELLED EVENT INFORMATION
            ================================================================ */}

            {isCancelled && (
              <div className="fk-event-cancelled-details">

                <strong>
                  This event is no longer
                  accepting RSVPs.
                </strong>

                <p>
                  The event organizer has
                  cancelled this event.
                </p>

              </div>
            )}

            {/* ================================================================
                ONLINE EVENT BUTTON
            ================================================================ */}

            {event.isOnline &&
              event.onlineUrl &&
              canRsvp && (
                <a
                  className="fk-event-online-button"
                  href={
                    event.onlineUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Join Online Event
                </a>
              )}

            {/* ================================================================
                RSVP
            ================================================================ */}

            {eventId &&
              canRsvp && (
                <EventRsvpButton
                  eventId={eventId}
                  onChanged={(
                    _going,
                    attendeeCount,
                  ) => {
                    setEvent(
                      (current) =>
                        current
                          ? {
                              ...current,
                              attendeeCount,
                            }
                          : current,
                    );
                  }}
                />
              )}

            {/* ================================================================
                OWNER ACTIONS
               
                IMPORTANT:
                These controls are ONLY rendered when the authenticated
                user's ID matches event.creatorId.
               
                Backend authorization is still required and already protects
                PATCH /events/:id and DELETE /events/:id.
            ================================================================ */}

            {isEventOwner && (
              <div className="fk-event-owner-actions">

                <button
                  type="button"
                  className="fk-event-button primary"
                  onClick={() =>
                    navigate(
                      `/events/${event.id}/edit`,
                    )
                  }
                >
                  ✏️ Edit Event
                </button>

                {!isCancelled &&
                  !isEnded && (
                    <button
                      type="button"
                      className="fk-event-button danger"
                      onClick={
                        handleCancelEvent
                      }
                      disabled={
                        cancelling
                      }
                    >
                      {cancelling
                        ? 'Cancelling...'
                        : 'Cancel Event'}
                    </button>
                  )}

              </div>
            )}

          </div>
        </article>

      </div>
    </main>
  );
}