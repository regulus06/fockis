import React from "react";
import { useNavigate } from "react-router-dom";

import type { FockisEvent } from "../types/event.types";

interface EventRailProps {
  events: FockisEvent[];
  title?: string;
  maxEvents?: number;
}

export default function EventRail({
  events,
  title = "Upcoming Events",
  maxEvents = 10,
}: EventRailProps) {
  const navigate = useNavigate();

  /*
   * Only show a maximum of 10 events in one rail.
   */
  const visibleEvents = events.slice(0, maxEvents);

  /*
   * Do not render an empty rail.
   */
  if (visibleEvents.length === 0) {
    return null;
  }

  function openEvent(eventId: string) {
    navigate(`/events/${eventId}`);
  }

  function formatEventDate(dateString: string) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatEventTime(dateString: string) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getEventLocation(event: FockisEvent) {
    if (event.isOnline) {
      return "Online event";
    }

    if (event.locationName) {
      return event.locationName;
    }

    if (event.address) {
      return event.address;
    }

    return "Location not specified";
  }

  return (
    <section
      className="fk-event-rail"
      aria-label={title}
    >
      {/* ============================================================
          RAIL HEADER
      ============================================================ */}

      <div className="fk-event-rail__header">
        <div className="fk-event-rail__heading">
          <span
            className="fk-event-rail__emoji"
            aria-hidden="true"
          >
            🎉
          </span>

          <div>
            <h2 className="fk-event-rail__title">
              {title}
            </h2>

            <p className="fk-event-rail__subtitle">
              Discover events happening around you
            </p>
          </div>
        </div>

        <button
          type="button"
          className="fk-event-rail__view-all"
          onClick={() => navigate("/events")}
        >
          View all
        </button>
      </div>

      {/* ============================================================
          HORIZONTAL EVENT LIST
      ============================================================ */}

      <div className="fk-event-rail__scroller">
        {visibleEvents.map((event) => (
          <article
            key={event.id}
            className="fk-event-card"
            role="button"
            tabIndex={0}
            onClick={() => openEvent(event.id)}
            onKeyDown={(keyboardEvent) => {
              if (
                keyboardEvent.key === "Enter" ||
                keyboardEvent.key === " "
              ) {
                keyboardEvent.preventDefault();
                openEvent(event.id);
              }
            }}
          >
            {/* ======================================================
                COVER IMAGE
            ====================================================== */}

            <div className="fk-event-card__image-wrapper">
              {event.coverImageUrl ? (
                <img
                  src={event.coverImageUrl}
                  alt={event.title}
                  className="fk-event-card__image"
                  loading="lazy"
                  onError={(imageEvent) => {
                    imageEvent.currentTarget.style.display =
                      "none";
                  }}
                />
              ) : (
                <div
                  className="fk-event-card__image-placeholder"
                  aria-hidden="true"
                >
                  🎉
                </div>
              )}

              {/* STATUS */}

              <span
                className={`fk-event-card__status fk-event-card__status--${event.status}`}
              >
                {event.status === "live"
                  ? "LIVE"
                  : event.status === "upcoming"
                    ? "UPCOMING"
                    : event.status.toUpperCase()}
              </span>

              {/* ONLINE BADGE */}

              {event.isOnline && (
                <span className="fk-event-card__online-badge">
                  Online
                </span>
              )}
            </div>

            {/* ======================================================
                CONTENT
            ====================================================== */}

            <div className="fk-event-card__content">
              <div className="fk-event-card__category">
                {event.category}
              </div>

              <h3 className="fk-event-card__title">
                {event.title}
              </h3>

              {event.description && (
                <p className="fk-event-card__description">
                  {event.description}
                </p>
              )}

              {/* DATE */}

              <div className="fk-event-card__meta">
                <span
                  className="fk-event-card__meta-icon"
                  aria-hidden="true"
                >
                  📅
                </span>

                <span>
                  {formatEventDate(event.startDate)}
                </span>
              </div>

              {/* TIME */}

              <div className="fk-event-card__meta">
                <span
                  className="fk-event-card__meta-icon"
                  aria-hidden="true"
                >
                  🕐
                </span>

                <span>
                  {formatEventTime(event.startDate)}
                </span>
              </div>

              {/* LOCATION */}

              <div className="fk-event-card__meta">
                <span
                  className="fk-event-card__meta-icon"
                  aria-hidden="true"
                >
                  📍
                </span>

                <span className="fk-event-card__location">
                  {getEventLocation(event)}
                </span>
              </div>

              {/* ATTENDEES */}

              <div className="fk-event-card__footer">
                <span className="fk-event-card__attendees">
                  👥 {event.attendeeCount}{" "}
                  {event.attendeeCount === 1
                    ? "person"
                    : "people"}{" "}
                  going
                </span>

                <button
                  type="button"
                  className="fk-event-card__open-button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    openEvent(event.id);
                  }}
                >
                  View
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ============================================================
          RAIL FOOTER
      ============================================================ */}

      {events.length > maxEvents && (
        <div className="fk-event-rail__footer">
          <button
            type="button"
            className="fk-event-rail__more-button"
            onClick={() => navigate("/events")}
          >
            See more events
          </button>
        </div>
      )}
    </section>
  );
}