import React, { useState } from 'react';

import { eventsApi } from '../services/eventsApi';

interface Props {
  eventId: string;
  initiallyGoing?: boolean;
  onChanged?: (
    going: boolean,
    attendeeCount: number,
  ) => void;
}

export default function EventRsvpButton({
  eventId,
  initiallyGoing = false,
  onChanged,
}: Props) {
  const [going, setGoing] =
    useState(initiallyGoing);

  const [loading, setLoading] =
    useState(false);

  async function toggle() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const response = going
        ? await eventsApi.cancelRsvp(eventId)
        : await eventsApi.rsvp(eventId);

      setGoing(response.going);

      onChanged?.(
        response.going,
        response.attendeeCount,
      );
    } catch (error) {
      console.error(
        '[EVENT RSVP] Failed:',
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`fk-event-rsvp ${
        going ? 'going' : ''
      }`}
      onClick={toggle}
      disabled={loading}
    >
      {loading
        ? 'Please wait...'
        : going
          ? '✓ Going'
          : 'I’m Going'}
    </button>
  );
}