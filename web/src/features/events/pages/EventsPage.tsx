import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, SlidersHorizontal, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import EventEmptyState from "../components/EventEmptyState";
import { DEFAULT_EVENT_FILTERS, type EventFilterValues } from "../components/EventFilters";
import EventSkeleton from "../components/EventSkeleton";
import EventsShell from "../components/EventsShell";
import CreateEventCard from "../components/discover/CreateEventCard";
import EventCalendar from "../components/discover/EventCalendar";
import EventCategoryBar from "../components/discover/EventCategoryBar";
import EventsHero from "../components/discover/EventsHero";
import FeaturedEventsCarousel from "../components/discover/FeaturedEventsCarousel";
import UpcomingEventRow from "../components/discover/UpcomingEventRow";
import YourEventsCard from "../components/discover/YourEventsCard";
import { useActiveEvents, useEventClock } from "../hooks/useEventClock";
import { useViewerLocation } from "../hooks/useViewerLocation";
import { useYourEvents } from "../hooks/useYourEvents";
import { eventsApi, isAbortError } from "../services/eventsApi";
import type {
  EventAvailability,
  EventFormat,
  EventSections,
  EventSort,
  EventWhen,
  FockisEvent,
} from "../types/event.types";
import { eventCover } from "../utils/eventMedia";
import { eventDayKey, eventsByDay, isSameMonth, longDayLabel, parseDayKey } from "../utils/eventCalendar";

/* ============================================================================
   FOCKIS EVENTS — DISCOVER

   Hero search · categories · Featured carousel · Upcoming list with
   Upcoming / This Week / This Month / My Interests · right rail with
   Create, a month calendar and Your Events.

   Everything is backed by the existing Events API:
     GET /events/sections   → Featured (falls back to recommended/upcoming)
     GET /events/discover   → Upcoming list (paged) and calendar dots
     GET /events/my-rsvps + /events/my-events → Your Events, My Interests
   All filters live in the URL so a filtered view can be shared.
============================================================================ */

type View = "upcoming" | "week" | "month" | "interests";

const VIEWS: Array<[View, string]> = [
  ["upcoming", "Upcoming"],
  ["week", "This Week"],
  ["month", "This Month"],
  ["interests", "My Interests"],
];

const PAGE_SIZE = 18;
const CALENDAR_PAGE = 50;
const CALENDAR_PAGES = 3;
const REVALIDATE_MS = 5 * 60_000;

const EMPTY_SECTIONS: EventSections = {
  happeningNow: [],
  today: [],
  featured: [],
  recommended: [],
  nearby: [],
  online: [],
  upcoming: [],
  serverTime: "",
};

interface PageState extends EventFilterValues {
  view: View;
  date: string;
}

function readState(params: URLSearchParams): PageState {
  const radius = Number(params.get("radiusKm"));
  const view = params.get("view") as View | null;

  return {
    ...DEFAULT_EVENT_FILTERS,
    q: params.get("q") ?? "",
    category: (params.get("category") as EventFilterValues["category"]) ?? "",
    when: (params.get("when") as EventWhen) || "any",
    format: (params.get("format") as EventFormat) || "any",
    availability: (params.get("availability") as EventAvailability) || "any",
    sort: (params.get("sort") as EventSort) || "relevance",
    radiusKm: Number.isFinite(radius) && radius > 0 ? radius : "",
    view: view && VIEWS.some(([id]) => id === view) ? view : "upcoming",
    date: parseDayKey(params.get("date")) ? (params.get("date") as string) : "",
  };
}

function writeState(values: PageState): URLSearchParams {
  const params = new URLSearchParams();

  if (values.q.trim()) params.set("q", values.q.trim());
  if (values.category) params.set("category", values.category);
  if (values.when !== "any") params.set("when", values.when);
  if (values.format !== "any") params.set("format", values.format);
  if (values.availability !== "any") params.set("availability", values.availability);
  if (values.sort !== "relevance") params.set("sort", values.sort);
  if (values.radiusKm !== "") params.set("radiusKm", String(values.radiusKm));
  if (values.view !== "upcoming") params.set("view", values.view);
  if (values.date) params.set("date", values.date);

  return params;
}

function matchesText(event: FockisEvent, q: string): boolean {
  const needle = q.trim().toLowerCase();

  if (!needle) return true;

  return [event.title, event.description, event.locationName, event.address, event.category]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
}

function dedupe(...lists: FockisEvent[][]): FockisEvent[] {
  const seen = new Set<string>();

  return lists.flat().filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

export default function EventsPage() {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => readState(params), [params]);
  const [draftQuery, setDraftQuery] = useState(state.q);
  const [showFilters, setShowFilters] = useState(
    state.format !== "any" || state.availability !== "any" || state.sort !== "relevance" || state.when !== "any",
  );
  const upcomingRef = useRef<HTMLElement>(null);
  const { location, status: locationStatus, request: requestLocation, clear: clearLocation } = useViewerLocation();

  // Keep the hero input in sync when the URL changes elsewhere (top bar, back button).
  useEffect(() => setDraftQuery(state.q), [state.q]);

  const update = useCallback(
    (patch: Partial<PageState>) => setParams(writeState({ ...readState(params), ...patch }), { replace: true }),
    [params, setParams],
  );

  const nearbyActive = Boolean(location) && (state.radiusKm !== "" || state.sort === "distance");

  /* --------------------------------------------------- revalidation tick */

  const [revalidate, setRevalidate] = useState(0);

  useEffect(() => {
    const bump = () => setRevalidate((value) => value + 1);
    const interval = window.setInterval(bump, REVALIDATE_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  /* ------------------------------------------------------------ sections */

  const [sections, setSections] = useState<EventSections>(EMPTY_SECTIONS);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    setSectionsLoading(true);
    setSectionsError("");

    eventsApi
      .sections({ location, radiusKm: 50, limit: 12 }, controller.signal)
      .then(setSections)
      .catch((error) => {
        if (!isAbortError(error)) setSectionsError(error instanceof Error ? error.message : "Unable to load events.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSectionsLoading(false);
      });

    return () => controller.abort();
  }, [location, revalidate]);

  /* ------------------------------------------------ upcoming (paged list) */

  const serverWhen: EventWhen =
    state.view === "week" ? "this-week" : state.view === "month" ? "next-30-days" : state.when;

  const [results, setResults] = useState<FockisEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  const queryKey = JSON.stringify({
    q: state.q,
    category: state.category,
    when: serverWhen,
    format: state.format,
    availability: state.availability,
    sort: state.sort,
    radiusKm: state.radiusKm,
    location: nearbyActive ? location : null,
  });

  const loadPage = useCallback(
    async (nextPage: number) => {
      controllerRef.current?.abort();

      const controller = new AbortController();

      controllerRef.current = controller;
      setResultsLoading(true);
      setResultsError("");

      try {
        const result = await eventsApi.discover(
          {
            q: state.q || undefined,
            category: state.category || undefined,
            when: serverWhen,
            format: state.format,
            availability: state.availability,
            // Upcoming is chronological unless the viewer picked a sort.
            sort: state.sort === "relevance" && !state.q ? "date" : state.sort,
            radiusKm: nearbyActive && state.radiusKm !== "" ? state.radiusKm : undefined,
            lat: nearbyActive ? location?.latitude : undefined,
            lng: nearbyActive ? location?.longitude : undefined,
            page: nextPage,
            limit: PAGE_SIZE,
          },
          controller.signal,
        );

        setResults((previous) => {
          if (nextPage === 1) return result.items;

          const seen = new Set(previous.map((event) => event.id));

          return [...previous, ...result.items.filter((event) => !seen.has(event.id))];
        });
        setPage(nextPage);
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (error) {
        if (!isAbortError(error)) setResultsError(error instanceof Error ? error.message : "Unable to load events.");
      } finally {
        if (controllerRef.current === controller) setResultsLoading(false);
      }
    },
    // queryKey captures every input of the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey],
  );

  useEffect(() => {
    if (state.view === "interests") return;

    void loadPage(1);

    return () => controllerRef.current?.abort();
  }, [loadPage, revalidate, state.view]);

  /* ---------------------------------------------- calendar (dots + days) */

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const selected = parseDayKey(state.date);
    const base = selected ?? new Date();

    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [calendarEvents, setCalendarEvents] = useState<FockisEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    setCalendarLoading(true);

    (async () => {
      const collected: FockisEvent[] = [];

      for (let index = 1; index <= CALENDAR_PAGES; index += 1) {
        const result = await eventsApi.discover(
          {
            q: state.q || undefined,
            category: state.category || undefined,
            sort: "date",
            page: index,
            limit: CALENDAR_PAGE,
          },
          controller.signal,
        );

        collected.push(...result.items);

        if (!result.hasMore) break;
      }

      return collected;
    })()
      .then((items) => setCalendarEvents(dedupe(items)))
      .catch(() => {
        // Calendar dots are a convenience; the list shows its own errors.
      })
      .finally(() => {
        if (!controller.signal.aborted) setCalendarLoading(false);
      });

    return () => controller.abort();
  }, [state.q, state.category, revalidate]);

  /* ----------------------------------------------------- your events */

  const yours = useYourEvents(revalidate);

  /* ------------------------------------------------------- derived lists */

  const { active: activeResults, now } = useActiveEvents(results);
  const clockNow = useEventClock(calendarEvents);
  const activeCalendar = useMemo(
    () => calendarEvents.filter((event) => !event.isCancelled && new Date(event.endDate).getTime() > clockNow),
    [calendarEvents, clockNow],
  );

  const eventDays = useMemo(() => {
    const counts = new Map<string, number>();

    eventsByDay(activeCalendar).forEach((list, key) => counts.set(key, list.length));

    return counts;
  }, [activeCalendar]);

  const featured = useMemo(() => {
    const pool = sections.featured.length
      ? dedupe(sections.happeningNow, sections.featured)
      : dedupe(sections.happeningNow, sections.recommended, sections.upcoming, sections.today);

    return pool
      .filter((event) => !state.category || event.category === state.category)
      .filter((event) => matchesText(event, state.q))
      .filter((event) => !event.isCancelled && new Date(event.endDate).getTime() > now)
      .slice(0, 12);
  }, [sections, state.category, state.q, now]);

  const listed = useMemo(() => {
    if (state.date) {
      return activeCalendar.filter((event) => eventDayKey(event) === state.date);
    }

    if (state.view === "interests") {
      return yours.events
        .filter((event) => !event.isCancelled && new Date(event.endDate).getTime() > now)
        .filter((event) => !state.category || event.category === state.category)
        .filter((event) => matchesText(event, state.q));
    }

    if (state.view === "month") {
      const month = new Date(now);

      return activeResults.filter((event) => isSameMonth(event.startDate, month));
    }

    return activeResults;
  }, [state.date, state.view, state.category, state.q, activeCalendar, yours.events, activeResults, now]);

  const listLoading = state.date
    ? calendarLoading && calendarEvents.length === 0
    : state.view === "interests"
      ? yours.loading && yours.events.length === 0
      : resultsLoading;
  const listError = state.date ? "" : state.view === "interests" ? yours.error : resultsError;
  const paged = !state.date && state.view !== "interests";
  const filtered = Boolean(state.q || state.category || state.radiusKm !== "" || state.date);
  const heroCover = featured.map((event) => eventCover(event)).find((cover) => cover.type === "image")?.url;

  const resetAll = () => {
    setDraftQuery("");
    setParams(new URLSearchParams(), { replace: true });
  };

  const scrollToList = () =>
    window.requestAnimationFrame(() => upcomingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  /* --------------------------------------------------------------- render */

  const rightRail = (
    <>
      <CreateEventCard />
      <EventCalendar
        month={calendarMonth}
        onMonthChange={setCalendarMonth}
        eventDays={eventDays}
        selected={state.date}
        loading={calendarLoading}
        onSelect={(key) => {
          update({ date: key });
          if (key) scrollToList();
        }}
      />
      <YourEventsCard events={yours.events} loading={yours.loading} error={yours.error} now={now} />
    </>
  );

  return (
    <EventsShell
      hideTabs
      rightRail={rightRail}
      onSearch={(text) => {
        setDraftQuery(text);
        update({ q: text, date: "" });
        scrollToList();
      }}
    >
      <EventsHero
        query={draftQuery}
        onQueryChange={setDraftQuery}
        onSubmit={() => {
          update({ q: draftQuery.trim(), date: "" });
          scrollToList();
        }}
        hasLocation={Boolean(location)}
        locationStatus={locationStatus}
        radiusKm={location ? state.radiusKm : ""}
        onRequestLocation={requestLocation}
        onRadiusChange={(radiusKm) => update({ radiusKm, sort: radiusKm === "" && state.sort === "distance" ? "relevance" : state.sort })}
        onClearLocation={() => {
          clearLocation();
          update({ radiusKm: "", sort: state.sort === "distance" ? "relevance" : state.sort });
        }}
        backgroundUrl={heroCover}
      />

      <EventCategoryBar value={state.category} onChange={(category) => update({ category })} />

      {sectionsError && !sectionsLoading && (
        <EventEmptyState
          tone="error"
          title="Featured events couldn't load"
          body={sectionsError}
          action={
            <button type="button" className="fke-btn fke-btn--primary" onClick={() => setRevalidate((value) => value + 1)}>
              Try again
            </button>
          }
        />
      )}

      <FeaturedEventsCarousel
        events={featured}
        loading={sectionsLoading && sections.featured.length === 0 && sections.upcoming.length === 0}
        now={now}
        onViewAll={() => {
          update({ view: "upcoming", sort: "popularity", date: "" });
          setShowFilters(true);
          scrollToList();
        }}
      />

      <section className="fkd-section fkd-upcoming" aria-labelledby="fkd-upcoming-title" ref={upcomingRef}>
        <header className="fkd-section__head fkd-upcoming__head">
          <span className="fkd-section__icon fkd-section__icon--box" aria-hidden="true">
            <CalendarDays size={22} />
          </span>
          <div>
            <h2 id="fkd-upcoming-title">{filtered && !state.date ? "Matching Events" : "Upcoming Events"}</h2>
            <p>
              {state.date
                ? `Events on ${longDayLabel(state.date)}`
                : nearbyActive && state.radiusKm !== ""
                  ? `Within ${state.radiusKm} km of you`
                  : "Events coming up in your area"}
              {paged && filtered && !resultsLoading ? ` · ${total.toLocaleString()} found` : ""}
            </p>
          </div>

          <div className="fkd-tabs" role="tablist" aria-label="Show">
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={!state.date && state.view === id}
                className={`fkd-tab ${!state.date && state.view === id ? "is-active" : ""}`}
                onClick={() => update({ view: id, date: "" })}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={`fkd-tab fkd-tab--icon ${showFilters ? "is-open" : ""}`}
              aria-expanded={showFilters}
              aria-controls="fkd-more-filters"
              aria-label="More filters"
              title="More filters"
              onClick={() => setShowFilters((open) => !open)}
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        {showFilters && (
          <div className="fkd-filters" id="fkd-more-filters">
            {state.view === "upcoming" && (
              <label>
                <span>When</span>
                <select value={state.when} onChange={(changeEvent) => update({ when: changeEvent.target.value as EventWhen, date: "" })}>
                  <option value="any">Any time</option>
                  <option value="live">Happening now</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this-weekend">This weekend</option>
                  <option value="next-30-days">Next 30 days</option>
                </select>
              </label>
            )}
            <label>
              <span>Format</span>
              <select value={state.format} onChange={(changeEvent) => update({ format: changeEvent.target.value as EventFormat })}>
                <option value="any">In person &amp; online</option>
                <option value="in-person">In person</option>
                <option value="online">Online</option>
              </select>
            </label>
            <label>
              <span>Availability</span>
              <select
                value={state.availability}
                onChange={(changeEvent) => update({ availability: changeEvent.target.value as EventAvailability })}
              >
                <option value="any">Any</option>
                <option value="open">Spots available</option>
              </select>
            </label>
            <label>
              <span>Sort by</span>
              <select value={state.sort} onChange={(changeEvent) => update({ sort: changeEvent.target.value as EventSort })}>
                <option value="relevance">Date</option>
                <option value="popularity">Most popular</option>
                <option value="distance" disabled={!location}>
                  Nearest{location ? "" : " (share location)"}
                </option>
              </select>
            </label>
          </div>
        )}

        {filtered && (
          <div className="fkd-active-filters" aria-label="Active filters">
            {state.date && (
              <button type="button" className="fkd-chip" onClick={() => update({ date: "" })}>
                {longDayLabel(state.date)} <X size={14} aria-label="Remove" />
              </button>
            )}
            {state.q && (
              <button type="button" className="fkd-chip" onClick={() => update({ q: "" })}>
                “{state.q}” <X size={14} aria-label="Remove" />
              </button>
            )}
            {state.category && (
              <button type="button" className="fkd-chip" onClick={() => update({ category: "" })}>
                {state.category.charAt(0).toUpperCase() + state.category.slice(1)} <X size={14} aria-label="Remove" />
              </button>
            )}
            {state.radiusKm !== "" && location && (
              <button type="button" className="fkd-chip" onClick={() => update({ radiusKm: "" })}>
                Within {state.radiusKm} km <X size={14} aria-label="Remove" />
              </button>
            )}
            <button type="button" className="fkd-chip fkd-chip--clear" onClick={resetAll}>
              Clear all
            </button>
          </div>
        )}

        {listError && (
          <EventEmptyState
            tone="error"
            title="Something went wrong"
            body={listError}
            action={
              <button
                type="button"
                className="fke-btn fke-btn--primary"
                onClick={() => (state.view === "interests" ? yours.refresh() : void loadPage(1))}
              >
                Try again
              </button>
            }
          />
        )}

        {!listError && !listLoading && listed.length === 0 && (
          <EventEmptyState
            title={
              state.view === "interests" && !state.date
                ? "Nothing saved yet"
                : state.date
                  ? "No events on this day"
                  : filtered
                    ? "No events match"
                    : "No upcoming events yet"
            }
            body={
              state.view === "interests" && !state.date
                ? "Tap Interested or Going on any event and it will be listed here."
                : state.date
                  ? "Pick another day in the calendar, or browse everything coming up."
                  : filtered
                    ? "Try a different search, category or distance."
                    : "Be the first to put something on the calendar."
            }
            action={
              filtered ? (
                <button type="button" className="fke-btn fke-btn--ghost" onClick={resetAll}>
                  Show all events
                </button>
              ) : (
                <Link to="/events/create" className="fke-btn fke-btn--primary">
                  Create an event
                </Link>
              )
            }
          />
        )}

        <div className="fkd-rows" role="list">
          {listed.map((event) => (
            <div role="listitem" key={event.id}>
              <UpcomingEventRow event={event} now={now} />
            </div>
          ))}
          {listLoading && <EventSkeleton variant="feed" count={page === 1 ? 4 : 2} />}
        </div>

        {paged && hasMore && !resultsLoading && (
          <button type="button" className="fkd-loadmore" onClick={() => void loadPage(page + 1)}>
            Load more events
          </button>
        )}
      </section>
    </EventsShell>
  );
}
