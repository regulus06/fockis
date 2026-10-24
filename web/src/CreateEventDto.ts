import React from "react";
import { useNavigate } from "react-router-dom";
import type { FockisEvent } from "../types/event.types";

interface Props { events: FockisEvent[]; title?: string; maxEvents?: number; }

export default function EventRail({ events, title = "Upcoming Events", maxEvents = 10 }: Props) {
  const navigate = useNavigate();
  const visible = events.slice(0, Math.max(0, maxEvents));
  if (!visible.length) return null;

  const date = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Date unavailable" :
      new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(parsed);
  };

  return (
    <section className="fk-event-rail" aria-label={title}>
      <header className="fk-event-rail__header">
        <div><h2 className="fk-event-rail__title">{title}</h2>
          <p className="fk-event-rail__subtitle">Discover what's happening on Fockis</p></div>
        <button type="button" className="fk-event-rail__view-all" onClick={() => navigate("/events")}>View all</button>
      </header>
      <div className="fk-event-rail__scroller">
        {visible.map((event) => (
          <article className="fk-event-rail__card" key={event.id}>
            <button type="button" className="fk-event-rail__open" onClick={() => navigate(`/events/${event.id}`)}>
              <div className="fk-event-rail__media">
                {event.coverImageUrl ? <img src={event.coverImageUrl} alt="" loading="lazy" /> :
                  <div className="fk-event-rail__placeholder" aria-hidden="true">🎉</div>}
                <span className={`fk-event-rail__status ${event.status}`}>{event.status.toUpperCase()}</span>
              </div>
              <div className="fk-event-rail__content">
                <span className="fk-event-rail__category">{event.category}</span>
                <strong>{event.title}</strong>
                <span>{date(event.startDate)}</span>
                <span>{event.isOnline ? "Online event" : event.locationName || event.address || "Location not specified"}</span>
              </div>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
