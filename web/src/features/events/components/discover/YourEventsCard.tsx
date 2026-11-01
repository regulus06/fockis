import { ArrowRight, CalendarCheck, Check, Crown, Star } from "lucide-react";
import { Link } from "react-router-dom";

import type { FockisEvent } from "../../types/event.types";
import { eventUrl } from "../../utils/eventMedia";
import { dateBadgeParts, isEventActive, timeLabel } from "../../utils/eventTime";
import EventCover from "../EventCover";

interface Props {
  events: FockisEvent[];
  loading: boolean;
  error: string;
  now: number;
  limit?: number;
}

function shortDate(value: string): string {
  const { month, day } = dateBadgeParts(value);

  return month ? `${month.charAt(0)}${month.slice(1).toLowerCase()} ${day}` : "";
}

function StatusPill({ event }: { event: FockisEvent }) {
  if (event.isOwner) {
    return (
      <span className="fkd-pill fkd-pill--navy">
        <Crown size={13} aria-hidden="true" /> Hosting
      </span>
    );
  }

  if (event.viewerRsvp === "going") {
    return (
      <span className="fkd-pill fkd-pill--green">
        <Check size={13} strokeWidth={2.8} aria-hidden="true" /> Going
      </span>
    );
  }

  return (
    <span className="fkd-pill fkd-pill--blue">
      <Star size={13} aria-hidden="true" /> Interested
    </span>
  );
}

export default function YourEventsCard({ events, loading, error, now, limit = 3 }: Props) {
  const upcoming = events.filter((event) => isEventActive(event, now)).slice(0, limit);

  return (
    <section className="fkd-card fkd-yours" aria-labelledby="fkd-yours-title">
      <header className="fkd-card__head">
        <CalendarCheck size={22} className="fkd-card__icon" aria-hidden="true" />
        <h2 id="fkd-yours-title">Your Events</h2>
        <Link to="/events/my-events" className="fkd-viewall">
          View All <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      {loading && upcoming.length === 0 && (
        <div className="fkd-yours__list" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="fkd-yours__item">
              <span className="fkd-yours__thumb fke-shimmer" />
              <span className="fkd-yours__skeleton fke-shimmer" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && upcoming.length === 0 && <p className="fkd-yours__empty">{error}</p>}

      {!loading && !error && upcoming.length === 0 && (
        <p className="fkd-yours__empty">
          Events you're going to, interested in or hosting will show up here.
        </p>
      )}

      {upcoming.length > 0 && (
        <ul className="fkd-yours__list">
          {upcoming.map((event) => (
            <li key={event.id}>
              <Link to={eventUrl(event.id)} className="fkd-yours__item">
                <span className="fkd-yours__thumb">
                  <EventCover event={event} />
                </span>
                <span className="fkd-yours__text">
                  <strong className="fke-truncate">{event.title}</strong>
                  <small>
                    {shortDate(event.startDate)} • {timeLabel(event.startDate)}
                  </small>
                </span>
                <StatusPill event={event} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
