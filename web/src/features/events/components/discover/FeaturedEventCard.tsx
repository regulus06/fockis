import { Clock, Globe, Heart, MapPin, Radio, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { categoryMeta } from "../../constants/eventCategories";
import { useSyncedEvent } from "../../hooks/eventSync";
import { useEventRsvp } from "../../hooks/useEventRsvp";
import type { FockisEvent } from "../../types/event.types";
import { eventPlace, eventUrl } from "../../utils/eventMedia";
import { getEventStatus, relativeDay, timeLabel } from "../../utils/eventTime";
import EventCover from "../EventCover";
import EventDateTile from "./EventDateTile";
import { categoryTone } from "./eventTone";

interface Props {
  event: FockisEvent;
  now: number;
  /** Static rendering for the create-form live preview (no links/actions). */
  preview?: boolean;
}

const SOON_MS = 3 * 60 * 60 * 1000;

function whenLine(event: FockisEvent, now: number): string {
  const day = relativeDay(event.startDate, now);

  return `${day} • ${timeLabel(event.startDate)}`;
}

/**
 * Featured card: photo, live/soon flag, heart (= Interested), date tile,
 * title, place, time, tags and attendance. The heart uses the real RSVP
 * endpoint, so saving here shows up in "Your Events".
 */
export default function FeaturedEventCard({ event: source, now, preview = false }: Props) {
  const event = useSyncedEvent(source);
  const { choose, pending, error } = useEventRsvp(event);
  const category = categoryMeta(event.category);
  const status = getEventStatus(event, now);
  const startsIn = new Date(event.startDate).getTime() - now;
  const flag =
    status === "live" ? "Live now" : status === "upcoming" && startsIn > 0 && startsIn <= SOON_MS ? "Live soon" : "";
  const hearted = event.viewerRsvp === "interested" || event.viewerRsvp === "going";
  const canHeart = !event.isOwner && (status === "upcoming" || status === "live") && event.viewerRsvp !== "going";
  const href = eventUrl(event.id);

  return (
    <article className="fkd-feat">
      <div className="fkd-feat__media">
        {preview ? (
          <EventCover event={event} />
        ) : (
          <Link to={href} tabIndex={-1} aria-hidden="true" className="fkd-feat__media-link">
            <EventCover event={event} />
          </Link>
        )}

        {flag && (
          <span className={`fkd-flag ${status === "live" ? "fkd-flag--live" : ""}`}>
            <Radio size={13} strokeWidth={2.4} aria-hidden="true" />
            {flag}
          </span>
        )}

        {!event.isOwner && !preview && (
          <button
            type="button"
            className={`fkd-heart ${hearted ? "is-active" : ""}`}
            aria-pressed={hearted}
            aria-label={
              event.viewerRsvp === "going"
                ? `You're going to ${event.title}`
                : hearted
                  ? `Remove ${event.title} from your interests`
                  : `Save ${event.title} as interested`
            }
            title={event.viewerRsvp === "going" ? "You're going" : hearted ? "Interested" : "Mark as interested"}
            disabled={!canHeart || pending !== null}
            onClick={() => void choose("interested")}
          >
            <Heart size={20} strokeWidth={2.2} fill={hearted ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="fkd-feat__body">
        <EventDateTile date={event.startDate} />

        <div className="fkd-feat__info">
          <h3 className="fkd-feat__title">
            {preview ? <span>{event.title}</span> : <Link to={href}>{event.title}</Link>}
          </h3>

          <span className="fkd-meta">
            {event.isOnline ? <Globe size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}
            <span className="fke-truncate">{eventPlace(event)}</span>
          </span>
          <span className="fkd-meta">
            <Clock size={14} aria-hidden="true" />
            <span className="fke-truncate">{whenLine(event, now)}</span>
          </span>

          <div className="fkd-feat__foot">
            <span className={`fkd-tag fkd-tag--${categoryTone(event.category)}`}>{category.label}</span>
            {event.isOnline && <span className="fkd-tag fkd-tag--muted">Online</span>}
            <span className="fkd-feat__going" title={`${event.attendeeCount} going`}>
              <Users size={13} aria-hidden="true" />
              {event.attendeeCount.toLocaleString()}
            </span>
          </div>

          {error && (
            <small className="fke-rsvp__error" role="alert">
              {error}
            </small>
          )}
        </div>
      </div>
    </article>
  );
}
