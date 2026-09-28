import React from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import EventCreateForm from "../components/EventCreateForm";

import { eventsApi } from "../services/eventsApi";

import type {
  CreateEventInput,
} from "../types/event.types";

import "../styles/EventsPage.scss";

export default function CreateEventPage() {
  const navigate =
    useNavigate();

  const {
    organizationId,
  } = useParams<{
    organizationId?: string;
  }>();

  const isOrganizationEvent =
    Boolean(
      organizationId,
    );

  async function handleCreate(
    values: CreateEventInput,
  ) {
    const payload: CreateEventInput =
      isOrganizationEvent &&
      organizationId
        ? {
            ...values,
            organizationId,
          }
        : values;

    const created =
      await eventsApi.create(
        payload,
      );

    if (
      isOrganizationEvent &&
      organizationId
    ) {
      navigate(
        `/organizations/${organizationId}/events/${created.id}`,
      );

      return;
    }

    navigate(
      `/events/${created.id}`,
    );
  }

  function handleBack() {
    if (
      isOrganizationEvent &&
      organizationId
    ) {
      navigate(
        `/organizations/${organizationId}/events`,
      );

      return;
    }

    navigate("/events");
  }

  return (
    <main className="fk-events-page">
      <div className="fk-events-container">

        {/* ====================================================================
            HEADER
        ===================================================================== */}

        <div className="fk-events-header">
          <div>

            <button
              type="button"
              className="fk-event-back"
              onClick={handleBack}
            >
              ←{" "}
              {isOrganizationEvent
                ? "Organization Events"
                : "Events"}
            </button>

            <span className="fk-events-eyebrow">
              {isOrganizationEvent
                ? "ORGANIZATION EVENT"
                : "FOCKIS EVENT"}
            </span>

            <h1>
              {isOrganizationEvent
                ? "Create Organization Event"
                : "Create Event"}
            </h1>

            <p>
              {isOrganizationEvent
                ? "Create an event for this organization and share it with your community."
                : "Create an event and invite people on Fockis."}
            </p>

          </div>
        </div>

        {/* ====================================================================
            FORM
        ===================================================================== */}

        <section className="fk-event-form-card">
          <EventCreateForm
            onSubmit={
              handleCreate
            }
            onCancel={
              handleBack
            }
          />
        </section>

      </div>
    </main>
  );
}