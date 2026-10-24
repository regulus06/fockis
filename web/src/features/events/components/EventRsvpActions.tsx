import { Check, Star } from "lucide-react";

import { useEventRsvp } from "../hooks/useEventRsvp";
import type { FockisEvent } from "../types/event.types";
import { isEventActive } from "../utils/eventTime";

interface Props {
  /** Pass the synced event (useSyncedEvent) so counts stay consistent. */
  event: FockisEvent;
  now?: number;
  size?: "sm" | "md";
  /** Render only one of the two toggles. */
  only?: "going" | "interested";
  className?: string;
}

/**
 * Going and Interested toggles. Distinct states, optimistic, with rollback.
 * Not offered once an event has ended or was cancelled; organizers see a
 * "Hosting" pill instead.
 */
export default function EventRsvpActions({
  event,
  now = Date.now(),
  size = "md",
  only,
  className = "",
}: Props) {
  const { choose, pending, error } = useEventRsvp(event);

  if (!isEventActive(event, now)) return null;

  if (event.isOwner) {
    return (
      <div className={`fke-rsvp fke-rsvp--${size} ${className}`}>
        <span className="fke-rsvp__hosting">You're hosting</span>
      </div>
    );
  }

  const going = event.viewerRsvp === "going";
  const interested = event.viewerRsvp === "interested";
  const fullForViewer = event.isFull && !going;
  const busy = pending !== null;

  return (
    <div className={`fke-rsvp fke-rsvp--${size} ${className}`} aria-busy={busy || undefined}>
      {only !== "interested" && (
      <button
        type="button"
        className={`fke-btn fke-btn--going ${going ? "is-active" : ""}`}
        aria-pressed={going}
        disabled={busy || fullForViewer}
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          void choose("going");
        }}
        title={fullForViewer ? "This event is full" : undefined}
      >
        <Check size={16} strokeWidth={2.4} aria-hidden="true" />
        {going ? "Going" : fullForViewer ? "Full" : "Going?"}
      </button>
      )}

      {only !== "going" && (
        <button
          type="button"
          className={`fke-btn fke-btn--interested ${interested ? "is-active" : ""}`}
          aria-pressed={interested}
          disabled={busy}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            void choose("interested");
          }}
        >
          <Star size={16} strokeWidth={2.2} fill={interested ? "currentColor" : "none"} aria-hidden="true" />
          Interested
        </button>
      )}

      {error && (
        <small className="fke-rsvp__error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
