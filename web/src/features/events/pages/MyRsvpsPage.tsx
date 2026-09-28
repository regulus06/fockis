import React, {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import EventCard from '../components/EventCard';

import { eventsApi } from '../services/eventsApi';

import type {
  FockisEvent,
} from '../types/event.types';

import '../styles/EventsPage.scss';

export default function MyRsvpsPage() {
  const navigate = useNavigate();

  const [events, setEvents] =
    useState<FockisEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    eventsApi
      .getMyRsvps()
      .then(setEvents)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load RSVPs.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="fk-events-page">
      <div className="fk-events-container">
        <header className="fk-events-header">
          <div>
            <button
              className="fk-event-back"
              onClick={() =>
                navigate('/events')
              }
            >
              ← Events
            </button>

            <h1>Events I'm Going To</h1>
          </div>
        </header>

        {loading && (
          <div className="fk-events-state">
            Loading...
          </div>
        )}

        {error && (
          <div className="fk-events-state error">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          events.length === 0 && (
            <div className="fk-events-state">
              You haven't RSVP'd to any events yet.
            </div>
          )}

        {!loading &&
          !error &&
          events.length > 0 && (
            <section className="fk-events-grid">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onOpen={() =>
                    navigate(
                      `/events/${event.id}`,
                    )
                  }
                />
              ))}
            </section>
          )}
      </div>
    </main>
  );
}