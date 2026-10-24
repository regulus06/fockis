import { useCallback, useRef, useState } from "react";

import { eventsApi } from "../services/eventsApi";
import type { EventRsvpStatus, FockisEvent } from "../types/event.types";
import { publishEventPatch } from "./eventSync";

interface RsvpState {
  viewerRsvp: EventRsvpStatus | null;
  attendeeCount: number;
  interestedCount: number;
}

function stateOf(event: FockisEvent): RsvpState {
  return {
    viewerRsvp: event.viewerRsvp,
    attendeeCount: event.attendeeCount,
    interestedCount: event.interestedCount,
  };
}

function apply(state: RsvpState, next: EventRsvpStatus | null): RsvpState {
  let { attendeeCount, interestedCount } = state;

  if (state.viewerRsvp === "going") attendeeCount -= 1;
  if (state.viewerRsvp === "interested") interestedCount -= 1;
  if (next === "going") attendeeCount += 1;
  if (next === "interested") interestedCount += 1;

  return {
    viewerRsvp: next,
    attendeeCount: Math.max(0, attendeeCount),
    interestedCount: Math.max(0, interestedCount),
  };
}

function patch(event: FockisEvent, state: RsvpState) {
  publishEventPatch({
    id: event.id,
    viewerRsvp: state.viewerRsvp,
    isGoing: state.viewerRsvp === "going",
    isInterested: state.viewerRsvp === "interested",
    attendeeCount: state.attendeeCount,
    interestedCount: state.interestedCount,
    spotsLeft: event.capacity === null ? null : Math.max(0, event.capacity - state.attendeeCount),
    isFull: event.capacity !== null && state.attendeeCount >= event.capacity,
  });
}

/**
 * Going / Interested with immediate feedback. The UI changes at once; if
 * the request fails the previous state is restored and the error shown.
 * Tapping the active choice again removes the RSVP.
 */
export function useEventRsvp(event: FockisEvent) {
  const [pending, setPending] = useState<EventRsvpStatus | "none" | null>(null);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const choose = useCallback(
    async (target: EventRsvpStatus) => {
      if (inFlight.current) return;

      inFlight.current = true;

      const previous = stateOf(event);
      const next = previous.viewerRsvp === target ? null : target;
      const optimistic = apply(previous, next);

      setError("");
      setPending(next ?? "none");
      patch(event, optimistic);

      try {
        const result = next ? await eventsApi.setRsvp(event.id, next) : await eventsApi.cancelRsvp(event.id);

        patch(event, {
          viewerRsvp: result.status,
          attendeeCount: result.attendeeCount,
          interestedCount: result.interestedCount,
        });
      } catch (caught) {
        patch(event, previous);
        setError(caught instanceof Error ? caught.message : "Could not update your RSVP.");
      } finally {
        inFlight.current = false;
        setPending(null);
      }
    },
    [event],
  );

  return { choose, pending, error, clearError: () => setError("") };
}
