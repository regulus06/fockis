import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import EventCard from "../components/EventCard";
import EventEmptyState from "../components/EventEmptyState";
import EventSkeleton from "../components/EventSkeleton";
import EventsShell from "../components/EventsShell";
import { eventsApi, isAbortError } from "../services/eventsApi";
import type { FockisEvent } from "../types/event.types";

type Scope = "public" | "mine";

const PAGE_SIZE = 18;

/**
 * Past events archive (GET /events/past). Ended events are never deleted;
 * they stay reachable here and by their own link.
 */
export default function PastEventsPage() {
  const [params, setParams] = useSearchParams();
  const scope: Scope = params.get("scope") === "mine" ? "mine" : "public";
  const [items, setItems] = useState<FockisEvent[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (nextPage: number) => {
      controllerRef.current?.abort();

      const controller = new AbortController();

      controllerRef.current = controller;
      setLoading(true);
      setError("");

      try {
        const result = await eventsApi.past({ scope, page: nextPage, limit: PAGE_SIZE }, controller.signal);

        setItems((previous) => {
          if (nextPage === 1) return result.items;

          const seen = new Set(previous.map((event) => event.id));

          return [...previous, ...result.items.filter((event) => !seen.has(event.id))];
        });
        setPage(result.page);
        setHasMore(result.hasMore);
        setTotal(result.total);
      } catch (caught) {
        if (!isAbortError(caught)) setError(caught instanceof Error ? caught.message : "Unable to load past events.");
      } finally {
        if (controllerRef.current === controller) setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    void load(1);

    return () => controllerRef.current?.abort();
  }, [load]);

  return (
    <EventsShell>
      <Link to="/events" className="fke-back">
        <ArrowLeft size={16} aria-hidden="true" /> All events
      </Link>

      <header className="fke-page-header">
        <div>
          <span className="fke-eyebrow">Archive</span>
          <h1>Past events</h1>
          <p>Events that have already taken place. Their pages, photos and details stay available.</p>
        </div>
      </header>

      <div className="fke-tabs" role="tablist" aria-label="Past events">
        {(
          [
            ["public", "All past events"],
            ["mine", "Attended or hosted"],
          ] as Array<[Scope, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={scope === id}
            className={`fke-tab ${scope === id ? "is-active" : ""}`}
            onClick={() => setParams(id === "public" ? {} : { scope: id }, { replace: true })}
          >
            {label}
            {!loading && scope === id && <span className="fke-tab__count">{total.toLocaleString()}</span>}
          </button>
        ))}
      </div>

      {error && (
        <EventEmptyState
          tone="error"
          title="Past events couldn't load"
          body={error}
          action={
            <button type="button" className="fke-btn fke-btn--primary" onClick={() => void load(1)}>
              Try again
            </button>
          }
        />
      )}

      {!error && !loading && items.length === 0 && (
        <EventEmptyState
          title={scope === "mine" ? "No past events yet" : "No past events to show"}
          body={
            scope === "mine"
              ? "Events you attended or hosted will be kept here after they end."
              : "Once public events have taken place they are listed here."
          }
          action={
            <Link to="/events" className="fke-btn fke-btn--ghost">
              Browse upcoming events
            </Link>
          }
        />
      )}

      <div className="fke-grid" role="tabpanel">
        {items.map((event) => (
          <div className="fke-grid__item" key={event.id}>
            <EventCard event={event} />
          </div>
        ))}
        {loading && <EventSkeleton variant="card" count={items.length ? 3 : 6} />}
      </div>

      {!error && hasMore && !loading && (
        <div className="fke-load-more">
          <button type="button" className="fke-btn fke-btn--ghost" onClick={() => void load(page + 1)}>
            Show more
          </button>
        </div>
      )}
    </EventsShell>
  );
}
