import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";

import type { FockisEvent } from "../../types/event.types";
import EventSkeleton from "../EventSkeleton";
import FeaturedEventCard from "./FeaturedEventCard";

interface Props {
  events: FockisEvent[];
  loading: boolean;
  now: number;
  onViewAll: () => void;
}

/** Horizontal, snap-scrolling row with prev/next arrows. */
export default function FeaturedEventsCarousel({ events, loading, now, onViewAll }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const element = scroller.current;

    if (!element) return;

    setEdges({
      start: element.scrollLeft <= 4,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();

    const element = scroller.current;

    if (!element) return;

    element.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      element.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, events.length, loading]);

  const page = (direction: 1 | -1) => {
    const element = scroller.current;

    if (!element) return;

    element.scrollBy({ left: direction * element.clientWidth * 0.9, behavior: "smooth" });
  };

  if (!loading && events.length === 0) return null;

  return (
    <section className="fkd-section" aria-labelledby="fkd-featured-title">
      <header className="fkd-section__head">
        <span className="fkd-section__icon fkd-section__icon--star" aria-hidden="true">
          <Star size={26} fill="currentColor" strokeWidth={0} />
        </span>
        <div>
          <h2 id="fkd-featured-title">Featured Events</h2>
          <p>Top events you don't want to miss</p>
        </div>
        <button type="button" className="fkd-viewall" onClick={onViewAll}>
          View All <ArrowRight size={15} aria-hidden="true" />
        </button>
      </header>

      <div className="fkd-carousel">
        <div className="fkd-carousel__track" ref={scroller} role="list">
          {loading
            ? <EventSkeleton variant="card" count={4} />
            : events.map((event) => (
                <div className="fkd-carousel__item" role="listitem" key={event.id}>
                  <FeaturedEventCard event={event} now={now} />
                </div>
              ))}
        </div>

        {!edges.start && (
          <button type="button" className="fkd-arrow fkd-arrow--prev" onClick={() => page(-1)} aria-label="Previous featured events">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        {!edges.end && (
          <button type="button" className="fkd-arrow fkd-arrow--next" onClick={() => page(1)} aria-label="More featured events">
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
