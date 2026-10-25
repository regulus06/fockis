import { Clock, EyeOff, Globe, MapPin, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { categoryMeta } from "../constants/eventCategories";
import { useSyncedEvent } from "../hooks/eventSync";
import type { FockisEvent } from "../types/event.types";
import { eventPlace, eventUrl } from "../utils/eventMedia";
import { countdown, getEventStatus, relativeDay, timeLabel } from "../utils/eventTime";
import EventAvatar from "./EventAvatar";
import EventCover from "./EventCover";
import EventDateBadge from "./EventDateBadge";
import EventRsvpActions from "./EventRsvpActions";
import EventShareButton from "./EventShareButton";
import EventSocialProof from "./EventSocialProof";
import EventStatusBadge from "./EventStatusBadge";

import "../styles/EventFeedCard.scss";

interface Props {
  event: FockisEvent;
  now: number;
  onDismiss?: (eventId: string) => void;
}

/**
 * An event shown between ordinary posts. Same card frame as FockisPostCard
 * (.fk-post) so it reads as native, with a clear "Event" label, a date
 * badge and Going / Interested actions.
 */
export default function EventFeedCard({ event: source, now, onDismiss }: Props) {
  const navigate = useNavigate();
  const event = useSyncedEvent(source);
  const category = categoryMeta(event.category);
  const organizer = event.organizer;
  const status = getEventStatus(event, now);
  const open = () => navigate(eventUrl(event.id));

  return (
    <article className="fk-post fke-feed-card" aria-label={`Event: ${event.title}`}>
      <header className="fke-feed-card__header">
        {organizer ? (
          <Link to={`/profile/${organizer.id}`} className="fke-feed-card__author">
            <EventAvatar name={organizer.name || organizer.username} src={organizer.avatar} size={40} />
            <span>
              <strong>{organizer.name || organizer.username}</strong>
              <small>
                is hosting an event · {category.label}
              </small>
            </span>
          </Link>
        ) : (
          <span className="fke-feed-card__author">
            <span>
              <strong>Event</strong>
              <small>{category.label}</small>
            </span>
          </span>
        )}

        <span className="fke-feed-card__label">
          <category.icon size={13} strokeWidth={2.2} aria-hidden="true" />
          Event
        </span>

        {onDismiss && (
          <button
            type="button"
            className="fke-icon-btn fke-feed-card__dismiss"
            onClick={() => onDismiss(event.id)}
            aria-label="Hide this event from your feed"
            title="Hide"
          >
            <EyeOff size={17} />
          </button>
        )}
      </header>

      <button type="button" className="fke-feed-card__hero" onClick={open} aria-label={`Open ${event.title}`}>
        <EventCover event={event} />
        <span className="fke-feed-card__scrim" aria-hidden="true" />
        <EventDateBadge date={event.startDate} size="lg" className="fke-feed-card__date" />
        <span className="fke-feed-card__status">
          <EventStatusBadge event={event} now={now} />
        </span>
        {status === "live" || status === "upcoming" ? (
          <span className="fke-feed-card__countdown">{countdown(event, now)}</span>
        ) : null}
      </button>

      <div className="fke-feed-card__body">
        <h3 className="fke-feed-card__title">
          <Link to={eventUrl(event.id)}>{event.title}</Link>
        </h3>

        <ul className="fke-feed-card__facts">
          <li>
            <Clock size={15} aria-hidden="true" />
            {relativeDay(event.startDate, now)} · {timeLabel(event.startDate)} – {timeLabel(event.endDate)}
          </li>
          <li>
            {event.isOnline ? <Globe size={15} aria-hidden="true" /> : <MapPin size={15} aria-hidden="true" />}
            <span className="fke-truncate">
              {eventPlace(event)}
              {typeof event.distanceKm === "number" && !event.isOnline ? ` · ${event.distanceKm} km away` : ""}
            </span>
          </li>
          <li>
            <Users size={15} aria-hidden="true" />
            <EventSocialProof event={event} />
          </li>
        </ul>
      </div>

      <footer className="fke-feed-card__actions">
        <EventRsvpActions event={event} now={now} />
        <EventShareButton event={event} />
      </footer>
    </article>
  );
}
