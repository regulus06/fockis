import React, { useEffect, useState } from "react";
import { eventsApi } from "../services/eventsApi";

interface Props {
  eventId: string;
  initiallyGoing?: boolean;
  onChanged?: (going: boolean, attendeeCount: number) => void;
}

export default function EventRsvpButton({ eventId, initiallyGoing = false, onChanged }: Props) {
  const [going, setGoing] = useState(initiallyGoing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setGoing(initiallyGoing), [eventId, initiallyGoing]);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = going
        ? await eventsApi.cancelRsvp(eventId)
        : await eventsApi.rsvp(eventId);
      setGoing(response.going);
      onChanged?.(response.going, response.attendeeCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your RSVP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="fk-event-rsvp-wrap">
      <button type="button" className={`fk-event-rsvp ${going ? "going" : ""}`}
        onClick={toggle} disabled={loading} aria-pressed={going}>
        {loading ? "Saving…" : going ? "✓ Going" : "I'm Going"}
      </button>
      {error && <span className="fk-event-rsvp-error" role="alert">{error}</span>}
    </span>
  );
}
