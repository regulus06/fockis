import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Flame, Globe, LocateFixed, MapPin, Radio, Sparkles, Sun } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import EventDiscoverySection from "../components/EventDiscoverySection";
import EventEmptyState from "../components/EventEmptyState";
import EventFilters, {
  DEFAULT_EVENT_FILTERS,
  isFiltered,
  type EventFilterValues,
} from "../components/EventFilters";
import EventCard from "../components/EventCard";
import EventSkeleton from "../components/EventSkeleton";
import EventsShell from "../components/EventsShell";
import { useActiveEvents } from "../hooks/useEventClock";
import { useViewerLocation } from "../hooks/useViewerLocation";
import { eventsApi, isAbortError } from "../services/eventsApi";
import type { EventSections, FockisEvent } from "../types/event.types";

const PAGE_SIZE = 18;
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

function readFilters(params: URLSearchParams): EventFilterValues {
  const radius = Number(params.get("radiusKm"));

  return {
    ...DEFAULT_EVENT_FILTERS,
    q: params.get("q") ?? "",
    category: (params.get("category") as EventFilterValues["category"]) ?? "",
    when: (params.get("when") as EventFilterValues["when"]) || "any",
    format: (params.get("format") as EventFilterValues["format"]) || "any",
    availability: (params.get("availability") as EventFilterValues["availability"]) || "any",
    sort: (params.get("sort") as EventFilterValues["sort"]) || "relevance",
    radiusKm: Number.isFinite(radius) && radius > 0 ? radius : "",
  };
}

function writeFilters(values: EventFilterValues): URLSearchParams {
  const params = new URLSearchParams();

  if (values.q.trim()) params.set("q", values.q.trim());
  if (values.category) params.set("category", values.category);
  if (values.when !== "any") params.set("when", values.when);
  if (values.format !== "any") params.set("format", values.format);
  if (values.availability !== "any") params.set("availability", values.availability);
  if (values.sort !== "relevance") params.set("sort", values.sort);
  if (values.radiusKm !== "") params.set("radiusKm", String(values.radiusKm));

  return params;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function EventsPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);
  const [draftQuery, setDraftQuery] = useState(filters.q);
  const debouncedQuery = useDebounced(draftQuery, 300);
  const { location, status: locationStatus, request: requestLocation, clear: clearLocation } = useViewerLocation();

  const updateFilters = useCallback(
    (patch: Partial<EventFilterValues>) => {
      if (patch.q !== undefined) {
        setDraftQuery(patch.q);
        return;
      }

      setParams(writeFilters({ ...filters, ...patch }), { replace: true });
    },
    [filters, setParams],
  );

  // Commit the debounced search text to the URL.
  useEffect(() => {
    if (debouncedQuery !== filters.q) {
      setParams(writeFilters({ ...filters, q: debouncedQuery }), { replace: true });
    }
  }, [debouncedQuery, filters, setParams]);

  const filtered = isFiltered(filters);

  /* ------------------------------------------------------------- sections */

  const [sections, setSections] = useState<EventSections>(EMPTY_SECTIONS);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");
  const [revalidate, setRevalidate] = useState(0);

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

  // Revalidate periodically and when the tab becomes visible again, so new
  // events appear and server-side eligibility (cancellations) is picked up.
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

  /* ------------------------------------------------------- paged results */

  const [results, setResults] = useState<FockisEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const queryKey = JSON.stringify({ filters, location: filters.radiusKm !== "" || filters.sort === "distance" ? location : null });

  const loadPage = useCallback(
    async (nextPage: number) => {
      controllerRef.current?.abort();

      const controller = new AbortController();

      controllerRef.current = controller;
      setResultsLoading(true);
      setResultsError("");

      const useLocation = Boolean(location) && (filters.radiusKm !== "" || filters.sort === "distance");

      try {
        const result = await eventsApi.discover(
          {
            q: filters.q || undefined,
            category: filters.category || undefined,
            when: filters.when,
            format: filters.format,
            availability: filters.availability,
            sort: filtered ? filters.sort : "date",
            radiusKm: useLocation && filters.radiusKm !== "" ? filters.radiusKm : undefined,
            lat: useLocation ? location?.latitude : undefined,
            lng: useLocation ? location?.longitude : undefined,
            page: nextPage,
            limit: PAGE_SIZE,
          },
          controller.signal,
        );

        setResults((previous) => {
          if (nextPage === 1) return result.items;

          // Deduplicate across pages (an event can shift when new ones arrive).
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
    // queryKey captures filters + relevant location.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey, filtered],
  );

  useEffect(() => {
    void loadPage(1);

    return () => controllerRef.current?.abort();
  }, [loadPage, revalidate]);

  useEffect(() => {
    const element = sentinel.current;

    if (!element || !hasMore || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !resultsLoading) void loadPage(page + 1);
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasMore, resultsLoading, loadPage, page]);

  const { active: activeResults, now } = useActiveEvents(results);

  // Each event appears in the first section that has it, not in several.
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const take = (list: FockisEvent[]) =>
      list.filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      });

    return {
      happeningNow: take(sections.happeningNow),
      featured: take(sections.featured),
      recommended: take(sections.recommended),
      today: take(sections.today),
      nearby: take(sections.nearby),
      online: take(sections.online),
    };
  }, [sections]);

  /* --------------------------------------------------------------- render */

  return (
    <EventsShell>
      <header className="fke-hero">
        <div className="fke-hero__text">
          <span className="fke-eyebrow fke-eyebrow--gold">Fockis Events</span>
          <h1>Discover what's happening</h1>
          <p>Concerts, meetups, classes and games from your community — find something to do today.</p>
        </div>
        <div className="fke-hero__actions">
          {location ? (
            <button type="button" className="fke-pill fke-pill--location" onClick={clearLocation} title="Stop using my location">
              <MapPin size={15} aria-hidden="true" /> Using your location
            </button>
          ) : (
            <button
              type="button"
              className="fke-btn fke-btn--glass"
              onClick={requestLocation}
              disabled={locationStatus === "locating"}
            >
              <LocateFixed size={16} aria-hidden="true" />
              {locationStatus === "locating" ? "Locating…" : "Show events near me"}
            </button>
          )}
          <Link to="/events/create" className="fke-btn fke-btn--gold">
            Create event
          </Link>
        </div>
        {locationStatus === "denied" && (
          <p className="fke-hero__note" role="status">
            Location is blocked for this site. You can still browse and search all events.
          </p>
        )}
      </header>

      <EventFilters
        value={{ ...filters, q: draftQuery }}
        onChange={updateFilters}
        onReset={() => {
          setDraftQuery("");
          setParams(new URLSearchParams(), { replace: true });
        }}
        hasLocation={Boolean(location)}
        locating={locationStatus === "locating"}
        onRequestLocation={requestLocation}
      />

      {!filtered && (
        <>
          {sectionsError && (
            <EventEmptyState
              tone="error"
              title="Events couldn't load"
              body={sectionsError}
              action={
                <button type="button" className="fke-btn fke-btn--primary" onClick={() => setRevalidate((value) => value + 1)}>
                  Try again
                </button>
              }
            />
          )}

          <EventDiscoverySection id="live" title="Happening now" icon={Radio} events={deduped.happeningNow} loading={sectionsLoading} />
          <EventDiscoverySection id="featured" title="Featured" subtitle="Popular in the next 30 days" icon={Flame} events={deduped.featured} loading={sectionsLoading} />
          <EventDiscoverySection id="recommended" title="Recommended for you" subtitle="Based on events you've joined" icon={Sparkles} events={deduped.recommended} loading={sectionsLoading} />
          <EventDiscoverySection id="today" title="Later today" icon={Sun} events={deduped.today} loading={sectionsLoading} />
          {location && (
            <EventDiscoverySection
              id="nearby"
              title="Near you"
              subtitle="Within 50 km"
              icon={MapPin}
              events={deduped.nearby}
              loading={sectionsLoading}
              hideWhenEmpty={false}
              empty={<p className="fke-muted">No in-person events near you right now.</p>}
            />
          )}
          <EventDiscoverySection id="online" title="Online" icon={Globe} events={deduped.online} loading={sectionsLoading} />
        </>
      )}

      <section className="fke-section fke-section--grid" aria-labelledby="fke-results-title">
        <header className="fke-section__header">
          <h2 id="fke-results-title">
            <span className="fke-section__icon" aria-hidden="true">
              <CalendarClock size={18} />
            </span>
            {filtered ? "Results" : "All upcoming events"}
          </h2>
          {filtered && !resultsLoading && <p>{total.toLocaleString()} {total === 1 ? "event" : "events"}</p>}
        </header>

        {resultsError && (
          <EventEmptyState
            tone="error"
            title="Something went wrong"
            body={resultsError}
            action={
              <button type="button" className="fke-btn fke-btn--primary" onClick={() => void loadPage(1)}>
                Try again
              </button>
            }
          />
        )}

        {!resultsError && !resultsLoading && activeResults.length === 0 && (
          <EventEmptyState
            title={filtered ? "No events match" : "No upcoming events yet"}
            body={filtered ? "Try a different search or fewer filters." : "Be the first to put something on the calendar."}
            action={
              filtered ? (
                <button
                  type="button"
                  className="fke-btn fke-btn--ghost"
                  onClick={() => {
                    setDraftQuery("");
                    setParams(new URLSearchParams(), { replace: true });
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link to="/events/create" className="fke-btn fke-btn--primary">
                  Create an event
                </Link>
              )
            }
          />
        )}

        <div className="fke-grid" role="list">
          {activeResults.map((event) => (
            <div className="fke-grid__item" role="listitem" key={event.id}>
              <EventCard event={event} now={now} />
            </div>
          ))}
          {resultsLoading && <EventSkeleton variant="card" count={page === 1 ? 6 : 3} />}
        </div>

        <div ref={sentinel} className="fke-sentinel" aria-hidden="true" />

        {hasMore && !resultsLoading && (
          <button type="button" className="fke-btn fke-btn--ghost fke-btn--block" onClick={() => void loadPage(page + 1)}>
            Load more events
          </button>
        )}
      </section>
    </EventsShell>
  );
}
