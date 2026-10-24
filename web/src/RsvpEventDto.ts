import React, { useEffect, useState } from "react";
import type { FockisEvent } from "../types/event.types";
import EventRsvpButton from "./EventRsvpButton";

interface Props {
  event: FockisEvent;
  onOpen: (event: FockisEvent) => void;
  onRsvp?: (event: FockisEvent) => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(date);
}

export default function EventCard({ event, onOpen }: Props) {
  const [attendeeCount, setAttendeeCount] = useState(event.attendeeCount ?? 0);
  useEffect(() => setAttendeeCount(event.attendeeCount ?? 0), [event.attendeeCount]);

  return (
    <article className="fk-event-card" aria-label={event.title}>
      <button type="button" className="fk-event-card-open" onClick={() => onOpen(event)}
        aria-label={`View event ${event.title}`}>
        <div className="fk-event-card-image">
          {event.coverMediaType === "video" && event.coverVideoUrl ? (
            <video src={event.coverVideoUrl} muted playsInline preload="metadata" aria-label={`${event.title} cover video`} />
          ) : event.coverImageUrl ? (
            <img src={event.coverImageUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : <div className="fk-event-card-placeholder" aria-hidden="true">📅</div>}
          <span className={`fk-event-status ${event.status}`}>
            {event.status === "live" ? "Live now" : event.status === "upcoming" ? "Upcoming" : event.status === "cancelled" ? "Cancelled" : "Ended"}
          </span>
        </div>
        <div className="fk-event-card-body">
          <div className="fk-event-category">{String(event.category).replace(/_/g, " ")}</div>
          <h3>{event.title}</h3>
          {event.description && <p className="fk-event-card-description">{event.description}</p>}
          <div className="fk-event-date">🗓 {formatDate(event.startDate)}</div>
          <div className="fk-event-location">
            {event.isOnline ? "🌐 Online event" : `📍 ${event.locationName || event.address || "Location not specified"}`}
          </div>
        </div>
      </button>
      <div className="fk-event-card-footer">
        <span>{attendeeCount} {attendeeCount === 1 ? "person" : "people"} going</span>
        {event.status !== "ended" && event.status !== "cancelled" &&
          <EventRsvpButton eventId={event.id} initiallyGoing={event.isGoing}
            onChanged={(_going, count) => setAttendeeCount(count)} />}
      </div>
    </article>
  );
}
