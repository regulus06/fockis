import { useCallback, useRef, useState } from "react";

import { eventsApi } from "../services/eventsApi";
import type { FockisEvent } from "../types/event.types";
import { publishEventPatch } from "./eventSync";

/**
 * Save / unsave an event (a private bookmark, separate from RSVP).
 * The heart changes at once; if the server refuses, it flips back and the
 * server's reason is shown.
 */
export function useEventSave(event: FockisEvent) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const toggle = useCallback(async () => {
    if (inFlight.current) return;

    inFlight.current = true;

    const previous = Boolean(event.isSaved);
    const next = !previous;

    setError("");
    setPending(true);
    publishEventPatch({ id: event.id, isSaved: next });

    try {
      const result = await eventsApi.setSaved(event.id, next);

      publishEventPatch({ id: event.id, isSaved: Boolean(result.saved) });
    } catch (failure) {
      publishEventPatch({ id: event.id, isSaved: previous });
      setError(failure instanceof Error ? failure.message : "Unable to save this event.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [event.id, event.isSaved]);

  return { saved: Boolean(event.isSaved), toggle, pending, error };
}
