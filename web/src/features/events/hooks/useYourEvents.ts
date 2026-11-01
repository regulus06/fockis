import { useCallback, useEffect, useState } from "react";

import { eventsApi, isAbortError } from "../services/eventsApi";
import type { FockisEvent } from "../types/event.types";
import { subscribeEventPatches } from "./eventSync";

/**
 * Events the viewer is attending, interested in, or hosting
 * (GET /events/my-rsvps + GET /events/my-events), deduplicated and sorted
 * by start time. Used by the "Your Events" card and the My Interests tab.
 */
export function useYourEvents(revalidateKey = 0) {
  const [events, setEvents] = useState<FockisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    Promise.allSettled([eventsApi.getMyRsvps(controller.signal), eventsApi.getMyEvents(controller.signal)])
      .then(([rsvps, hosting]) => {
        if (controller.signal.aborted) return;

        if (rsvps.status === "rejected" && hosting.status === "rejected") {
          if (!isAbortError(rsvps.reason)) {
            setError(rsvps.reason instanceof Error ? rsvps.reason.message : "Unable to load your events.");
          }

          return;
        }

        const seen = new Set<string>();
        const merged = [
          ...(rsvps.status === "fulfilled" ? rsvps.value : []),
          ...(hosting.status === "fulfilled" ? hosting.value : []),
        ].filter((event) => {
          if (seen.has(event.id)) return false;
          seen.add(event.id);
          return true;
        });

        merged.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setEvents(merged);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [revalidateKey, reload]);

  // When the viewer RSVPs anywhere on the page, re-read the list shortly
  // after so the event appears (or disappears) here as well.
  useEffect(() => {
    let timer = 0;
    const unsubscribe = subscribeEventPatches((patch) => {
      if (!("viewerRsvp" in patch)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setReload((value) => value + 1), 900);
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => setReload((value) => value + 1), []);

  return { events, loading, error, refresh };
}
