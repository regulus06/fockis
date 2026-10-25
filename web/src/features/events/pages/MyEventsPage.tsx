import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import EventCard from "../components/EventCard";
import EventEmptyState from "../components/EventEmptyState";
import EventSkeleton from "../components/EventSkeleton";
import EventsShell from "../components/EventsShell";
import { useEventClock } from "../hooks/useEventClock";
import { eventsApi, isAbortError } from "../services/eventsApi";
import type { FockisEvent } from "../types/event.types";
import { getEventStatus } from "../utils/eventTime";

export type MyEventsTab = "upcoming" | "hosting" | "going" | "interested" | "past" | "cancelled";

const TABS: Array<{ id: MyEventsTab; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "hosting", label: "Hosting" },
  { id: "going", label: "Going" },
  { id: "interested", label: "Interested" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const EMPTY: Record<MyEventsTab, string> = {
  upcoming: "Nothing on your calendar yet.",
  hosting: "You haven't created any events yet.",
  going: "You haven't said you're going to anything yet.",
  interested: "Events you mark as Interested show up here.",
  past: "Events you went to or hosted will be kept here.",
  cancelled: "No cancelled events.",
};

function isTab(value: string | null): value is MyEventsTab {
  return TABS.some((tab) => tab.id === value);
}

export default function MyEventsPage({ initialTab = "upcoming" }: { initialTab?: MyEventsTab }) {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: MyEventsTab = isTab(tabParam) ? tabParam : initialTab;
  const [created, setCreated] = useState<FockisEvent[]>([]);
  const [rsvps, setRsvps] = useState<FockisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    Promise.all([eventsApi.getMyEvents(controller.signal), eventsApi.getMyRsvps(controller.signal)])
      .then(([mine, joined]) => {
        setCreated(mine);
        setRsvps(joined);
      })
      .catch((caught) => {
        if (!isAbortError(caught)) setError(caught instanceof Error ? caught.message : "Unable to load your events.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reload]);

  const all = useMemo(() => {
    const byId = new Map<string, FockisEvent>();

    [...created, ...rsvps].forEach((event) => byId.set(event.id, event));

    return Array.from(byId.values());
  }, [created, rsvps]);

  const now = useEventClock(all);

  const lists = useMemo(() => {
    const status = (event: FockisEvent) => getEventStatus(event, now);
    const isActive = (event: FockisEvent) => ["upcoming", "live"].includes(status(event));
    const asc = (a: FockisEvent, b: FockisEvent) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    const desc = (a: FockisEvent, b: FockisEvent) => -asc(a, b);

    return {
      upcoming: all.filter(isActive).sort(asc),
      hosting: created.filter(isActive).sort(asc),
      going: rsvps.filter((event) => event.viewerRsvp === "going" && isActive(event)).sort(asc),
      interested: rsvps.filter((event) => event.viewerRsvp === "interested" && isActive(event)).sort(asc),
      past: all.filter((event) => status(event) === "ended").sort(desc),
      cancelled: all.filter((event) => status(event) === "cancelled").sort(desc),
    } satisfies Record<MyEventsTab, FockisEvent[]>;
  }, [all, created, rsvps, now]);

  const items = lists[tab];

  return (
    <EventsShell>
      <header className="fke-page-header">
        <div>
          <span className="fke-eyebrow">Your events</span>
          <h1>My events</h1>
          <p>Everything you're hosting, going to or interested in — including past events.</p>
        </div>
        <Link to="/events/create" className="fke-btn fke-btn--primary">
          Create event
        </Link>
      </header>

      <div className="fke-tabs" role="tablist" aria-label="My events">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`fke-tab ${tab === item.id ? "is-active" : ""}`}
            onClick={() => setParams(item.id === "upcoming" ? {} : { tab: item.id }, { replace: true })}
          >
            {item.label}
            {!loading && <span className="fke-tab__count">{lists[item.id].length}</span>}
          </button>
        ))}
      </div>

      {error && (
        <EventEmptyState
          tone="error"
          title="Your events couldn't load"
          body={error}
          action={
            <button type="button" className="fke-btn fke-btn--primary" onClick={() => setReload((value) => value + 1)}>
              Try again
            </button>
          }
        />
      )}

      {!error && !loading && items.length === 0 && (
        <EventEmptyState
          title={EMPTY[tab]}
          action={
            <Link to="/events" className="fke-btn fke-btn--ghost">
              Discover events
            </Link>
          }
        />
      )}

      <div className="fke-grid" role="tabpanel">
        {loading && <EventSkeleton variant="card" count={6} />}
        {!loading &&
          items.map((event) => (
            <div className="fke-grid__item" key={event.id}>
              <EventCard
                event={event}
                now={now}
                footer={
                  event.isOwner ? (
                    <div className="fke-card__manage">
                      <Link to={`/events/${event.id}`} className="fke-btn fke-btn--ghost fke-btn--sm">
                        <Eye size={15} aria-hidden="true" /> View
                      </Link>
                      {!event.isCancelled && (
                        <Link to={`/events/${event.id}/edit`} className="fke-btn fke-btn--outline fke-btn--sm">
                          <Pencil size={15} aria-hidden="true" /> Edit
                        </Link>
                      )}
                    </div>
                  ) : undefined
                }
              />
            </div>
          ))}
      </div>
    </EventsShell>
  );
}
