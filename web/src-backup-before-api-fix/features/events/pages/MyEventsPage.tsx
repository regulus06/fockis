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

export default function MyEventsPage() {
  const navigate = useNavigate();

  const [events, setEvents] =
    useState<FockisEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    eventsApi
      .getMyEvents()
      .then(setEvents)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load your events.',
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

            <h1>My Events</h1>
          </div>

          <button
            className="fk-event-create-button"
            onClick={() =>
              navigate('/events/create')
            }
          >
            + Create Event
          </button>
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
              You haven't created any events yet.
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