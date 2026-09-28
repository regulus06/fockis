import React, { useState } from 'react';

import type { FockisEvent } from '../types/event.types';
import EventRsvpButton from './EventRsvpButton';

interface Props {
  event: FockisEvent;
  onOpen: (event: FockisEvent) => void;
  onRsvp?: (event: FockisEvent) => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function EventCard({
  event,
  onOpen,
}: Props) {
  /*
   * Keep the attendee count locally so the card immediately changes:
   *
   * 1 attendee
   *      ↓
   * I’m Going
   *      ↓
   * 2 attendees
   */
  const [attendeeCount, setAttendeeCount] = useState(
    event.attendeeCount ?? 0,
  );

  /*
   * If the parent refreshes/reloads the event with a new attendee count,
   * you can still use the latest event value when the component mounts.
   */

  return (
    <article
      className="fk-event-card"
      onClick={() => onOpen(event)}
    >
      {/* ================================================================
          EVENT IMAGE
      ================================================================ */}

      <div className="fk-event-card-image">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.title}
          />
        ) : (
          <div className="fk-event-card-placeholder">
            <span>📅</span>
          </div>
        )}

        <div
          className={`fk-event-status ${event.status}`}
        >
          {event.status === 'upcoming' &&
            'Upcoming'}

          {event.status === 'live' &&
            'Live now'}

          {event.status === 'ended' &&
            'Ended'}

          {event.status === 'cancelled' &&
            'Cancelled'}
        </div>
      </div>

      {/* ================================================================
          EVENT BODY
      ================================================================ */}

      <div className="fk-event-card-body">

        <div className="fk-event-category">
          {event.category}
        </div>

        <h3>{event.title}</h3>

        <div className="fk-event-date">
          🗓 {formatDate(event.startDate)}
        </div>

        <div className="fk-event-end">
          Ends: {formatDate(event.endDate)}
        </div>

        <div className="fk-event-location">
          {event.isOnline
            ? '🌐 Online event'
            : `📍 ${
                event.locationName ||
                event.address ||
                'Location not specified'
              }`}
        </div>

        {/* ==============================================================
            FOOTER
        ============================================================== */}

        <div className="fk-event-card-footer">

          <span>
            {attendeeCount}{' '}
            {attendeeCount === 1
              ? 'person'
              : 'people'}{' '}
            going
          </span>

          {/* ============================================================
              RSVP BUTTON
          ============================================================ */}

          {event.status !== 'ended' &&
            event.status !== 'cancelled' && (

            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <EventRsvpButton
                eventId={event.id}
                onChanged={(
                  _going,
                  newAttendeeCount,
                ) => {
                  setAttendeeCount(
                    newAttendeeCount,
                  );
                }}
              />
            </div>

          )}

        </div>
      </div>
    </article>
  );
}