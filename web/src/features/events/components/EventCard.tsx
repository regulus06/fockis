import { Clock, Globe, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { categoryMeta } from "../constants/eventCategories";
import { useSyncedEvent } from "../hooks/eventSync";
import type { FockisEvent } from "../types/event.types";
import { eventPlace, eventUrl } from "../utils/eventMedia";
import { isEventActive, shortWhen } from "../utils/eventTime";
import EventCover from "./EventCover";
import EventDateBadge from "./EventDateBadge";
import EventRsvpActions from "./EventRsvpActions";
import EventSocialProof from "./EventSocialProof";
import EventStatusBadge from "./EventStatusBadge";

interface Props {
  event: FockisEvent;
  /** Legacy: called instead of navigating. */
  onOpen?: (event: FockisEvent) => void;
  variant?: "grid" | "rail";
  now?: number;
  /** Management row for My Events. */
  footer?: React.ReactNode;
}

/**
 * Event card for grids and horizontal rails. The whole card opens the
 * details page; RSVP buttons stop propagation.
 */
export default function EventCard({ event: source, onOpen, variant = "grid", now = Date.now(), footer }: Props) {
  const navigate = useNavigate();
  const event = useSyncedEvent(source);
  const category = categoryMeta(event.category);
  const active = isEventActive(event, now);

  const open = () => (onOpen ? onOpen(event) : navigate(eventUrl(event.id)));

  return (
    <article className={`fke-card fke-card--${variant} ${active ? "" : "is-inactive"}`}>
      <button
        type="button"
        className="fke-card__open"
        onClick={open}
        aria-label={`${event.title}, ${shortWhen(event, now)}, ${eventPlace(event)}`}
      >
        <div className="fke-card__media">
          <EventCover event={event} />
          <EventDateBadge date={event.startDate} size="sm" className="fke-card__date" />
          <span className="fke-card__status">
            <EventStatusBadge event={event} now={now} />
          </span>
        </div>

        <div className="fke-card__body">
          <span className="fke-card__category">
            <category.icon size={13} strokeWidth={2} aria-hidden="true" />
            {category.label}
          </span>
          <h3 className="fke-card__title">{event.title}</h3>

          <span className="fke-card__line">
            <Clock size={14} aria-hidden="true" />
            {shortWhen(event, now)}
          </span>
          <span className="fke-card__line">
            {event.isOnline ? <Globe size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}
            <span className="fke-truncate">
              {eventPlace(event)}
              {typeof event.distanceKm === "number" && !event.isOnline ? ` · ${event.distanceKm} km` : ""}
            </span>
          </span>

          {event.organizer && (
            <span className="fke-card__organizer fke-truncate">by {event.organizer.name || event.organizer.username}</span>
          )}
        </div>
      </button>

      <footer className="fke-card__footer">
        <EventSocialProof event={event} />
        {footer ?? <EventRsvpActions event={event} now={now} size="sm" only={variant === "rail" ? "going" : undefined} />}
      </footer>
    </article>
  );
}
