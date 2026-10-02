import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import EventCreateForm from "../components/EventCreateForm";

import {
  eventsApi,
} from "../services/eventsApi";

import type {
  CreateEventInput,
  FockisEvent,
} from "../types/event.types";

import "../styles/EventsPage.scss";

/* ============================================================================
   AUTHENTICATED USER ID
============================================================================ */

function getCurrentUserId(): string | null {
  const token =
    localStorage.getItem("token") ??
    localStorage.getItem("accessToken");

  if (!token) {
    return null;
  }

  try {
    const parts =
      token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const base64Payload =
      parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const paddedPayload =
      base64Payload.padEnd(
        Math.ceil(
          base64Payload.length / 4,
        ) * 4,
        "=",
      );

    const payload =
      JSON.parse(
        atob(paddedPayload),
      ) as Record<string, unknown>;

    const userId =
      payload.id ??
      payload._id ??
      payload.userId ??
      payload.sub;

    if (
      userId === undefined ||
      userId === null ||
      String(userId).trim() === ""
    ) {
      return null;
    }

    return String(userId);
  } catch (error) {
    console.error(
      "[EditEventPage] Unable to read authenticated user:",
      error,
    );

    return null;
  }
}

/* ============================================================================
   GET EVENT CREATOR ID
============================================================================ */

function getEventCreatorId(
  event: FockisEvent,
): string | null {
  const creator =
    event.creatorId as unknown;

  if (
    creator === undefined ||
    creator === null
  ) {
    return null;
  }

  /*
   * Supports either:
   *
   * creatorId: "123"
   *
   * OR populated creatorId:
   *
   * creatorId: {
   *   _id: "123"
   * }
   */

  if (
    typeof creator === "object" &&
    creator !== null
  ) {
    const populated =
      creator as {
        _id?: unknown;
        id?: unknown;
      };

    const id =
      populated._id ??
      populated.id;

    return id === undefined ||
      id === null
      ? null
      : String(id);
  }

  return String(creator);
}

/* ============================================================================
   EDIT EVENT PAGE
============================================================================ */

export default function EditEventPage() {
  const {
    eventId,
  } = useParams<{
    eventId: string;
  }>();

  const navigate =
    useNavigate();

  const [
    event,
    setEvent,
  ] = useState<FockisEvent | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  /* ==========================================================================
     LOAD EVENT
  ========================================================================== */

  useEffect(() => {
    let active = true;

    if (!eventId) {
      setLoading(false);

      setError(
        "No event ID was provided.",
      );

      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    eventsApi
      .getById(eventId)
      .then((result) => {
        if (!active) {
          return;
        }

        if (!result) {
          setEvent(null);

          setError(
            "Event not found.",
          );

          return;
        }

        /* ================================================================
           FRONTEND OWNERSHIP CHECK

           This prevents another user from opening the edit form.

           The backend must ALSO enforce ownership.
        ================================================================ */

        const currentUserId =
          getCurrentUserId();

        const creatorId =
          getEventCreatorId(result);

        if (
          !currentUserId ||
          !creatorId ||
          String(currentUserId) !==
            String(creatorId)
        ) {
          setEvent(null);

          setError(
            "You are not authorized to edit this event. Only the event organizer can edit it.",
          );

          return;
        }

        setEvent(result);
      })
      .catch((err) => {
        if (!active) {
          return;
        }

        console.error(
          "[EditEventPage] Failed to load event:",
          err,
        );

        setEvent(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load event.",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  /* ==========================================================================
     UPDATE EVENT
  ========================================================================== */

  async function handleUpdate(
    values: CreateEventInput,
  ) {
    if (!eventId) {
      throw new Error(
        "Event ID is missing.",
      );
    }

    if (!event) {
      throw new Error(
        "Event could not be loaded.",
      );
    }

    const currentUserId =
      getCurrentUserId();

    const creatorId =
      getEventCreatorId(event);

    if (
      !currentUserId ||
      !creatorId ||
      String(currentUserId) !==
        String(creatorId)
    ) {
      throw new Error(
        "You are not authorized to edit this event.",
      );
    }

    setSaving(true);
    setError(null);

    try {
      await eventsApi.update(
        eventId,
        values,
      );

      navigate(
        `/events/${eventId}`,
        {
          replace: true,
        },
      );
    } catch (err) {
      console.error(
        "[EditEventPage] Failed to update event:",
        err,
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unable to update event.";

      setError(message);

      throw err;
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (loading) {
    return (
      <main className="fk-events-page">
        <div className="fk-events-state">
          Loading event...
        </div>
      </main>
    );
  }

  /* ==========================================================================
     ERROR / NOT FOUND / UNAUTHORIZED
  ========================================================================== */

  if (error || !event) {
    return (
      <main className="fk-events-page">

        <div className="fk-events-container">

          <div className="fk-events-state error">

            <h2>
              Unable to edit event
            </h2>

            <p>
              {error ??
                "Event not found."}
            </p>

            <button
              type="button"
              className="fk-event-back"
              onClick={() =>
                navigate("/events")
              }
            >
              ← Back to Events
            </button>

          </div>

        </div>

      </main>
    );
  }

  /* ==========================================================================
     EDIT FORM
  ========================================================================== */

  return (
    <main className="fk-events-page">

      <div className="fk-events-container">

        {/* ====================================================================
            BACK BUTTON
        ===================================================================== */}

        <button
          type="button"
          className="fk-event-back"
          onClick={() =>
            navigate(
              `/events/${event.id}`,
            )
          }
        >
          ← Back to Event
        </button>

        {/* ====================================================================
            EDIT CARD
        ===================================================================== */}

        <section className="fk-event-form-card">

          <div className="fk-event-details-content">

            <span className="fk-events-eyebrow">
              Edit Event
            </span>

            <h1>
              {event.title}
            </h1>

            {error && (
              <div
                className="fk-event-form-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* ================================================================
                FORM
            ================================================================ */}

            <EventCreateForm
              initialValues={{
                title:
                  event.title,

                description:
                  event.description,

                category:
                  event.category,

                visibility:
                  event.visibility,

                startDate:
                  event.startDate,

                endDate:
                  event.endDate,

                locationName:
                  event.locationName,

                address:
                  event.address,

                latitude:
                  event.latitude ??
                  undefined,

                longitude:
                  event.longitude ??
                  undefined,

                isOnline:
                  event.isOnline,

                onlineUrl:
                  event.onlineUrl,

                coverImageUrl:
                  event.coverImageUrl,

                eventVideoUrl:
                  event.eventVideoUrl,
              }}

              submitLabel={
                saving
                  ? "Saving..."
                  : "Save Changes"
              }

              onSubmit={
                handleUpdate
              }

              onCancel={() =>
                navigate(
                  `/events/${event.id}`,
                )
              }
            />

          </div>

        </section>

      </div>

    </main>
  );
}