import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import EventCard from "../components/EventCard";
import EventFilters from "../components/EventFilters";
import { eventsApi } from "../services/eventsApi";

import type {
  EventCategory,
  FockisEvent,
} from "../types/event.types";

import "../styles/EventsPage.scss";

export default function EventsPage() {
  const navigate =
    useNavigate();

  const {
    organizationId,
  } = useParams<{
    organizationId?: string;
  }>();

  const isOrganizationEvents =
    Boolean(
      organizationId,
    );

  const [events, setEvents] =
    useState<FockisEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState<
      EventCategory | "all"
    >("all");

  const [status, setStatus] =
    useState<
      | "all"
      | "upcoming"
      | "live"
      | "ended"
    >("all");

  /* ==========================================================================
     LOAD EVENTS
  ========================================================================== */

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result =
          isOrganizationEvents &&
          organizationId
            ? await eventsApi.getOrganizationEvents(
                organizationId,
              )
            : await eventsApi.getAll();

        if (active) {
          setEvents(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load events.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [
    organizationId,
    isOrganizationEvents,
  ]);

  /* ==========================================================================
     FILTER
  ========================================================================== */

  const filteredEvents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return events.filter(
        (event) => {
          const matchesSearch =
            !query ||
            event.title
              .toLowerCase()
              .includes(query) ||
            event.description
              .toLowerCase()
              .includes(query) ||
            event.locationName
              .toLowerCase()
              .includes(query) ||
            event.organization
              ?.name
              ?.toLowerCase()
              .includes(query);

          const matchesCategory =
            category === "all" ||
            event.category ===
              category;

          const matchesStatus =
            status === "all" ||
            event.status ===
              status;

          return (
            matchesSearch &&
            matchesCategory &&
            matchesStatus
          );
        },
      );
    }, [
      events,
      search,
      category,
      status,
    ]);

  /* ==========================================================================
     ROUTES
  ========================================================================== */

  const createRoute =
    isOrganizationEvents &&
    organizationId
      ? `/organizations/${organizationId}/events/create`
      : "/events/create";

  const eventRoute = (
    eventId: string,
  ) =>
    isOrganizationEvents &&
    organizationId
      ? `/organizations/${organizationId}/events/${eventId}`
      : `/events/${eventId}`;

  const backRoute =
    isOrganizationEvents &&
    organizationId
      ? `/organizations/${organizationId}`
      : "/events";

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <main className="fk-events-page">
      <div className="fk-events-container">

        {/* ====================================================================
            HEADER
        ===================================================================== */}

        <header className="fk-events-header">
          <div>

            <span className="fk-events-eyebrow">
              {isOrganizationEvents
                ? "ORGANIZATION EVENTS"
                : "FOCKIS EVENTS"}
            </span>

            <h1>
              {isOrganizationEvents
                ? "Organization Events"
                : "Events"}
            </h1>

            <p>
              {isOrganizationEvents
                ? "Discover events, activities, meetings, and programs from this organization."
                : "Discover what is happening around you on Fockis."}
            </p>

          </div>

          <button
            type="button"
            className="fk-event-create-button"
            onClick={() =>
              navigate(createRoute)
            }
          >
            + Create Event
          </button>
        </header>

        {/* ====================================================================
            FILTERS
        ===================================================================== */}

        <EventFilters
          search={search}
          category={category}
          status={status}
          onSearchChange={
            setSearch
          }
          onCategoryChange={
            setCategory
          }
          onStatusChange={
            setStatus
          }
        />

        {/* ====================================================================
            LOADING
        ===================================================================== */}

        {loading && (
          <div className="fk-events-state">
            Loading events...
          </div>
        )}

        {/* ====================================================================
            ERROR
        ===================================================================== */}

        {error && (
          <div className="fk-events-state error">
            {error}
          </div>
        )}

        {/* ====================================================================
            EMPTY
        ===================================================================== */}

        {!loading &&
          !error &&
          filteredEvents.length ===
            0 && (
            <div className="fk-events-state">

              <div className="fk-events-empty-icon">
                📅
              </div>

              <h2>
                No events found
              </h2>

              <p>
                {isOrganizationEvents
                  ? "This organization has no events matching your filters."
                  : "Try changing your filters or create your first event."}
              </p>

              <button
                type="button"
                className="fk-event-create-button"
                onClick={() =>
                  navigate(
                    createRoute,
                  )
                }
              >
                Create Event
              </button>

            </div>
          )}

        {/* ====================================================================
            EVENTS
        ===================================================================== */}

        {!loading &&
          !error &&
          filteredEvents.length >
            0 && (
            <section className="fk-events-grid">

              {filteredEvents.map(
                (event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onOpen={(selected) =>
                      navigate(
                        eventRoute(
                          selected.id,
                        ),
                      )
                    }
                  />
                ),
              )}

            </section>
          )}

        {/* ====================================================================
            BACK TO ORGANIZATION
        ===================================================================== */}

        {isOrganizationEvents && (
          <button
            type="button"
            className="fk-event-back"
            onClick={() =>
              navigate(
                backRoute,
              )
            }
          >
            ← Back to Organization
          </button>
        )}

      </div>
    </main>
  );
}