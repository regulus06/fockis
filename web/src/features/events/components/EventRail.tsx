import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { useActiveEvents } from "../hooks/useEventClock";
import type { FockisEvent } from "../types/event.types";
import EventCard from "./EventCard";
import EventSkeleton from "./EventSkeleton";

import "../styles/EventRail.scss";

interface Props {
  events: FockisEvent[];
  title?: string;
  subtitle?: string;
  maxEvents?: number;
  loading?: boolean;
  seeAllTo?: string;
  /** Rendered when there are no active events (default: nothing). */
  empty?: React.ReactNode;
  className?: string;
}

/**
 * Horizontally scrollable, touch-friendly rail of event cards. Events that
 * end or are cancelled while the rail is on screen disappear at that moment.
 */
export default function EventRail({
  events,
  title = "Upcoming Events",
  subtitle,
  maxEvents = 10,
  loading = false,
  seeAllTo = "/events",
  empty = null,
  className = "",
}: Props) {
  const { active, now } = useActiveEvents(events);
  const scroller = useRef<HTMLDivElement>(null);
  const visible = active.slice(0, maxEvents);

  if (!loading && visible.length === 0) return <>{empty}</>;

  const scrollBy = (direction: 1 | -1) => {
    const element = scroller.current;

    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className={`fke-rail fk-social-scope ${className}`} aria-label={title}>
      <header className="fke-rail__header">
        <div>
          <span className="fke-eyebrow">Fockis Events</span>
          <h2 className="fke-rail__title">{title}</h2>
          {subtitle && <p className="fke-rail__subtitle">{subtitle}</p>}
        </div>
        <div className="fke-rail__controls">
          <button type="button" className="fke-icon-btn" onClick={() => scrollBy(-1)} aria-label="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="fke-icon-btn" onClick={() => scrollBy(1)} aria-label="Scroll right">
            <ChevronRight size={18} />
          </button>
          {seeAllTo && (
            <Link className="fke-link" to={seeAllTo}>
              See all
            </Link>
          )}
        </div>
      </header>

      <div className="fke-rail__scroller" ref={scroller} role="list">
        {loading && visible.length === 0 ? (
          <EventSkeleton variant="rail" count={3} />
        ) : (
          visible.map((event) => (
            <div className="fke-rail__item" role="listitem" key={event.id}>
              <EventCard event={event} variant="rail" now={now} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
