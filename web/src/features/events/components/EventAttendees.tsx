import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { eventsApi, isAbortError } from "../services/eventsApi";
import type { EventPerson, EventRsvpStatus, FockisEvent } from "../types/event.types";
import EventAvatar from "./EventAvatar";

interface Props {
  event: Pick<FockisEvent, "id" | "attendeeCount" | "interestedCount">;
}

/** Going / Interested people, friends and the organizer first. */
export default function EventAttendees({ event }: Props) {
  const [tab, setTab] = useState<EventRsvpStatus>("going");
  const [people, setPeople] = useState<EventPerson[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [friendsGoing, setFriendsGoing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(
    async (status: EventRsvpStatus, nextPage: number) => {
      controller.current?.abort();

      const current = new AbortController();

      controller.current = current;
      setLoading(true);
      setError("");

      try {
        const result = await eventsApi.attendees(event.id, {
          status,
          page: nextPage,
          limit: 24,
          signal: current.signal,
        });

        setPeople((previous) => (nextPage === 1 ? result.attendees : [...previous, ...result.attendees]));
        setHasMore(result.hasMore);
        setPage(nextPage);
        setFriendsGoing(result.friendsGoingCount);
      } catch (caught) {
        if (!isAbortError(caught)) setError(caught instanceof Error ? caught.message : "Could not load attendees.");
      } finally {
        if (controller.current === current) setLoading(false);
      }
    },
    [event.id],
  );

  useEffect(() => {
    void load(tab, 1);

    return () => controller.current?.abort();
  }, [load, tab, event.attendeeCount, event.interestedCount]);

  return (
    <section className="fke-panel fke-attendees" aria-labelledby="fke-attendees-title">
      <header className="fke-panel__header">
        <h2 id="fke-attendees-title">Who's coming</h2>
        {friendsGoing > 0 && <span className="fke-pill fke-pill--gold">{friendsGoing} friends going</span>}
      </header>

      <div className="fke-tabs fke-tabs--small" role="tablist" aria-label="Attendees">
        {(["going", "interested"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`fke-tab ${tab === value ? "is-active" : ""}`}
            onClick={() => setTab(value)}
          >
            {value === "going" ? `Going · ${event.attendeeCount}` : `Interested · ${event.interestedCount}`}
          </button>
        ))}
      </div>

      {error && <p className="fke-error-text" role="alert">{error}</p>}

      {!loading && !error && people.length === 0 && (
        <p className="fke-muted">{tab === "going" ? "No one has said they're going yet." : "No one is interested yet."}</p>
      )}

      <ul className="fke-people">
        {people.map((person) => (
          <li key={person.id}>
            <Link to={`/profile/${person.id}`} className="fke-person">
              <EventAvatar name={person.name || person.username} src={person.avatar} size={40} />
              <span>
                <strong className="fke-truncate">{person.name || person.username}</strong>
                <small>{person.isOrganizer ? "Organizer" : person.isFriend ? "Friend" : `@${person.username}`}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button type="button" className="fke-btn fke-btn--ghost fke-btn--block" disabled={loading} onClick={() => void load(tab, page + 1)}>
          {loading ? "Loading…" : "Show more"}
        </button>
      )}
    </section>
  );
}
