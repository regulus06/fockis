import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import EventCard from "../components/EventCard";
import EventEmptyState from "../components/EventEmptyState";
import EventSkeleton from "../components/EventSkeleton";
import EventsShell from "../components/EventsShell";
import MyRegistrationCard from "../registrations/MyRegistrationCard";
import { registrationApi, type Registration } from "../registrations/registrationApi";
import { useEventClock } from "../hooks/useEventClock";
import { eventsApi, isAbortError } from "../services/eventsApi";
import type { FockisEvent } from "../types/event.types";
import { getEventStatus } from "../utils/eventTime";

export type MyEventsTab = "all" | "registered" | "upcoming" | "going" | "interested" | "hosting" | "past" | "cancelled";

/* "going" = Attending and "interested" = Saved (ids kept so old links work). */
const TABS: Array<{ id: MyEventsTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "registered", label: "Registered" },
  { id: "upcoming", label: "Upcoming" },
  { id: "going", label: "Attending" },
  { id: "interested", label: "Saved" },
  { id: "hosting", label: "Hosting" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const EMPTY: Record<MyEventsTab, string> = {
  all: "No events yet.",
  registered: "Events you register for appear here with your ticket.",
  upcoming: "Nothing on your calendar yet.",
  hosting: "You haven't created any events yet.",
  going: "You haven't said you're attending anything yet.",
  interested: "Events you save (Interested) show up here.",
  past: "Events you went to or hosted will be kept here.",
  cancelled: "No cancelled events or registrations.",
};

const ACTIVE_REG = ["confirmed", "pending_payment", "pending_approval", "waitlisted"];

function isTab(value: string | null): value is MyEventsTab {
  return TABS.some((tab) => tab.id === value);
}

export default function MyEventsPage({ initialTab = "all" }: { initialTab?: MyEventsTab }) {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: MyEventsTab = isTab(tabParam) ? tabParam : initialTab;
  const [created, setCreated] = useState<FockisEvent[]>([]);
  const [rsvps, setRsvps] = useState<FockisEvent[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    Promise.all([
      eventsApi.getMyEvents(controller.signal),
      eventsApi.getMyRsvps(controller.signal),
      // Registrations are optional here: an older API without them still shows events.
      registrationApi.mine(controller.signal).catch((caught) => {
        if (isAbortError(caught)) throw caught;
        return { items: [] as Registration[] };
      }),
    ])
      .then(([mine, joined, regs]) => {
        setCreated(mine);
        setRsvps(joined);
        setRegistrations(regs.items);
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
      all: [...all].sort(asc),
      registered: [],
      upcoming: all.filter(isActive).sort(asc),
      hosting: created.filter(isActive).sort(asc),
      going: rsvps.filter((event) => event.viewerRsvp === "going" && isActive(event)).sort(asc),
      interested: rsvps.filter((event) => event.viewerRsvp === "interested" && isActive(event)).sort(asc),
      past: all.filter((event) => status(event) === "ended").sort(desc),
      cancelled: all.filter((event) => status(event) === "cancelled").sort(desc),
    } satisfies Record<MyEventsTab, FockisEvent[]>;
  }, [all, created, rsvps, now]);

  const regLists = useMemo(() => {
    const ended = (r: Registration) => !r.event || new Date(r.event.endDate).getTime() <= now;
    const byStart = (a: Registration, b: Registration) => new Date(a.event?.startDate ?? 0).getTime() - new Date(b.event?.startDate ?? 0).getTime();
    return {
      active: registrations.filter((r) => ACTIVE_REG.includes(r.status) && !ended(r)).sort(byStart),
      history: registrations.filter((r) => !ACTIVE_REG.includes(r.status) || ended(r)).sort((a, b) => -byStart(a, b)),
      cancelled: registrations.filter((r) => r.status === "cancelled" || r.status === "rejected"),
    };
  }, [registrations, now]);

  const items = lists[tab];
  const count = (id: MyEventsTab) =>
    id === "registered" ? regLists.active.length : id === "cancelled" ? lists.cancelled.length + regLists.cancelled.length : lists[id].length;
  const updateReg = (next: Registration) => setRegistrations((list) => list.map((r) => (r.id === next.id ? next : r)));

  return (
    <EventsShell>
      <header className="fke-page-header">
        <div>
          <span className="fke-eyebrow">Your events</span>
          <h1>My events</h1>
          <p>Your registrations and tickets, events you're hosting, attending or saved — including past events.</p>
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
            onClick={() => setParams(item.id === initialTab ? {} : { tab: item.id }, { replace: true })}
          >
            {item.label}
            {!loading && <span className="fke-tab__count">{count(item.id)}</span>}
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

      {!error && !loading && tab === "registered" && (
        <div className="fkr-mylist" role="tabpanel">
          {regLists.active.length === 0 && (
            <EventEmptyState
              title={EMPTY.registered}
              action={
                <Link to="/events" className="fke-btn fke-btn--ghost">
                  Discover events
                </Link>
              }
            />
          )}
          {regLists.active.map((reg) => (
            <MyRegistrationCard key={reg.id} reg={reg} onChanged={updateReg} />
          ))}
          {regLists.history.length > 0 && (
            <details className="fkr-history">
              <summary>Registration history ({regLists.history.length})</summary>
              {regLists.history.map((reg) => (
                <MyRegistrationCard key={reg.id} reg={reg} onChanged={updateReg} />
              ))}
            </details>
          )}
        </div>
      )}

      {!error && !loading && tab === "cancelled" && regLists.cancelled.length > 0 && (
        <div className="fkr-mylist">
          <h2 className="fkr-mylist__title">Cancelled registrations</h2>
          {regLists.cancelled.map((reg) => (
            <MyRegistrationCard key={reg.id} reg={reg} onChanged={updateReg} />
          ))}
        </div>
      )}

      {!error && !loading && tab !== "registered" && items.length === 0 && !(tab === "cancelled" && regLists.cancelled.length > 0) && (
        <EventEmptyState
          title={EMPTY[tab]}
          action={
            <Link to="/events" className="fke-btn fke-btn--ghost">
              Discover events
            </Link>
          }
        />
      )}

      <div className="fke-grid" role="tabpanel" hidden={tab === "registered"}>
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
