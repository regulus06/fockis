import type { LucideIcon } from "lucide-react";

import { useActiveEvents } from "../hooks/useEventClock";
import type { FockisEvent } from "../types/event.types";
import EventCard from "./EventCard";
import EventSkeleton from "./EventSkeleton";

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  events: FockisEvent[];
  loading?: boolean;
  layout?: "rail" | "grid";
  action?: React.ReactNode;
  hideWhenEmpty?: boolean;
  empty?: React.ReactNode;
}

export default function EventDiscoverySection({
  id,
  title,
  subtitle,
  icon: Icon,
  events,
  loading = false,
  layout = "rail",
  action,
  hideWhenEmpty = true,
  empty,
}: Props) {
  const { active, now } = useActiveEvents(events);

  if (!loading && active.length === 0 && hideWhenEmpty && !empty) return null;

  return (
    <section className={`fke-section fke-section--${layout}`} aria-labelledby={`fke-section-${id}`}>
      <header className="fke-section__header">
        <h2 id={`fke-section-${id}`}>
          {Icon && (
            <span className="fke-section__icon" aria-hidden="true">
              <Icon size={18} strokeWidth={2} />
            </span>
          )}
          {title}
        </h2>
        {subtitle && <p>{subtitle}</p>}
        {action && <div className="fke-section__action">{action}</div>}
      </header>

      <div className={layout === "rail" ? "fke-rail__scroller" : "fke-grid"} role="list">
        {loading && active.length === 0 ? (
          <EventSkeleton variant={layout === "rail" ? "rail" : "card"} count={layout === "rail" ? 3 : 6} />
        ) : active.length === 0 ? (
          empty
        ) : (
          active.map((event) => (
            <div className={layout === "rail" ? "fke-rail__item" : "fke-grid__item"} role="listitem" key={event.id}>
              <EventCard event={event} variant={layout === "rail" ? "rail" : "grid"} now={now} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
