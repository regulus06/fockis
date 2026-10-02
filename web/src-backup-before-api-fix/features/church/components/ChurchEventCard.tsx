import React, { useState } from "react";
import { Link } from "react-router-dom";

import {
  EVENT_TYPE_LABELS,
  RsvpStatus,
  type ChurchEvent,
} from "../types/church.types";

import { getLanguage } from "../../../i18n";
import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchComponents.scss";

/* ============================================================================
   TYPES
========================================================================== */

export interface ChurchEventCardProps {
  organizationId: string;
  event: ChurchEvent;

  onRsvp?: (eventId: string, status: RsvpStatus) => Promise<void> | void;

  onCancelRsvp?: (eventId: string) => Promise<void> | void;

  className?: string;
}

/* ============================================================================
   ICONS
========================================================================== */

function CalendarIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="2.5"
        y="4"
        width="15"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path d="M2.5 8h15" stroke="currentColor" strokeWidth="1.3" />

      <path
        d="M6.5 2.5v3M13.5 2.5v3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="10"
        cy="10"
        r="7.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path
        d="M10 6v4.2l3 1.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10 1.5c-3.04 0-5.5 2.46-5.5 5.5 0 4.13 5.5 11.5 5.5 11.5s5.5-7.37 5.5-11.5c0-3.04-2.46-5.5-5.5-5.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/* ============================================================================
   DATE / TIME HELPERS
========================================================================== */

function getDateLocale(): string {
  switch (getLanguage()) {
    case "ht":
      return "ht-HT";

    case "fr":
      return "fr-FR";

    case "es":
      return "es-ES";

    case "en":
    default:
      return "en-US";
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString(getDateLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleTimeString(getDateLocale(), {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ============================================================================
   TRANSLATION HELPERS
========================================================================== */

function getEventTypeTranslationKey(eventType: string): string | null {
  switch (eventType) {
    case "church_service":
      return "church.event.types.church_service";

    case "department_event":
      return "church.event.types.department_event";

    case "meeting":
      return "church.event.types.meeting";

    case "bible_study":
      return "church.event.types.bible_study";

    case "special_event":
      return "church.event.types.special_event";

    default:
      return null;
  }
}

function getFallbackEventTypeLabel(eventType: string): string {
  const label =
    EVENT_TYPE_LABELS[eventType as keyof typeof EVENT_TYPE_LABELS];

  if (typeof label === "string" && label.trim()) {
    return label;
  }

  switch (eventType) {
    case "church_service":
      return "Church Service";

    case "department_event":
      return "Department Event";

    case "meeting":
      return "Meeting";

    case "bible_study":
      return "Bible Study";

    case "special_event":
      return "Special Event";

    default:
      return "Event";
  }
}

function getSafeTranslation(
  translated: string,
  key: string,
  fallback: string,
): string {
  if (translated && translated.trim() && translated !== key) {
    return translated;
  }

  return fallback;
}

/* ============================================================================
   COMPONENT
========================================================================== */

export default function ChurchEventCard({
  organizationId,
  event,
  onRsvp,
  onCancelRsvp,
  className,
}: ChurchEventCardProps): React.JSX.Element {
  const { t } = useFockisTranslation();

  const [isUpdating, setIsUpdating] = useState(false);

  /* ==========================================================================
     RSVP
  ========================================================================== */

  const handleRsvp = async (status: RsvpStatus): Promise<void> => {
    if (isUpdating) {
      return;
    }

    if (!onRsvp && !onCancelRsvp) {
      return;
    }

    setIsUpdating(true);

    try {
      if (status === event.currentUserRsvp) {
        await onCancelRsvp?.(event.id);
      } else {
        await onRsvp?.(event.id, status);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  /* ==========================================================================
     EVENT STATE
  ========================================================================== */

  const isFull =
    typeof event.capacity === "number" &&
    event.capacity > 0 &&
    event.rsvpCount >= event.capacity;

  /* ==========================================================================
     EVENT TYPE TRANSLATION
  ========================================================================== */

  const eventTypeKey = getEventTypeTranslationKey(event.eventType);

  const fallbackEventTypeLabel = getFallbackEventTypeLabel(event.eventType);

  const eventTypeLabel = eventTypeKey
    ? getSafeTranslation(t(eventTypeKey), eventTypeKey, fallbackEventTypeLabel)
    : fallbackEventTypeLabel;

  /* ==========================================================================
     RSVP TRANSLATIONS
  ========================================================================== */

  const rsvpTranslationKeys: Record<RsvpStatus, string> = {
    [RsvpStatus.Going]: "church.event.going",

    [RsvpStatus.Interested]: "church.event.interested",

    [RsvpStatus.NotGoing]: "church.event.cantGo",

    [RsvpStatus.NoResponse]: "church.event.noResponse",
  };

  const rsvpFallbacks: Record<RsvpStatus, string> = {
    [RsvpStatus.Going]: "Going",

    [RsvpStatus.Interested]: "Interested",

    [RsvpStatus.NotGoing]: "Can't go",

    [RsvpStatus.NoResponse]: "No response",
  };

  const rsvpLabels: Record<RsvpStatus, string> = {
    [RsvpStatus.Going]: getSafeTranslation(
      t(rsvpTranslationKeys[RsvpStatus.Going]),
      rsvpTranslationKeys[RsvpStatus.Going],
      rsvpFallbacks[RsvpStatus.Going],
    ),

    [RsvpStatus.Interested]: getSafeTranslation(
      t(rsvpTranslationKeys[RsvpStatus.Interested]),
      rsvpTranslationKeys[RsvpStatus.Interested],
      rsvpFallbacks[RsvpStatus.Interested],
    ),

    [RsvpStatus.NotGoing]: getSafeTranslation(
      t(rsvpTranslationKeys[RsvpStatus.NotGoing]),
      rsvpTranslationKeys[RsvpStatus.NotGoing],
      rsvpFallbacks[RsvpStatus.NotGoing],
    ),

    [RsvpStatus.NoResponse]: getSafeTranslation(
      t(rsvpTranslationKeys[RsvpStatus.NoResponse]),
      rsvpTranslationKeys[RsvpStatus.NoResponse],
      rsvpFallbacks[RsvpStatus.NoResponse],
    ),
  };

  const startDate = new Date(event.startsAt);

  const eventUrl =
    "/church/organizations/" +
    encodeURIComponent(organizationId) +
    "/events#" +
    encodeURIComponent(event.id);

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <article
      className={["church-event-card", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ====================================================================
          DATE BLOCK
      ===================================================================== */}

      <div className="church-event-card__date-block" aria-hidden="true">
        <span className="church-event-card__date-month">
          {Number.isNaN(startDate.getTime())
            ? "\u2014"
            : startDate.toLocaleDateString(getDateLocale(), {
                month: "short",
              })}
        </span>

        <span className="church-event-card__date-day">
          {Number.isNaN(startDate.getTime()) ? "\u2014" : startDate.getDate()}
        </span>
      </div>

      {/* ====================================================================
          BODY
      ===================================================================== */}

      <div className="church-event-card__body">
        {/* ==================================================================
            HEADING
        =================================================================== */}

        <div className="church-event-card__heading">
          <span className="church-eyebrow">{eventTypeLabel}</span>

          {event.currentUserRsvp !== RsvpStatus.NoResponse && (
            <span
              className={
                "church-status-pill church-status-pill--rsvp-" +
                event.currentUserRsvp
              }
            >
              {rsvpLabels[event.currentUserRsvp]}
            </span>
          )}
        </div>

        {/* ==================================================================
            TITLE
        =================================================================== */}

        <h3 className="church-event-card__title">
          <Link to={eventUrl}>{event.title}</Link>
        </h3>

        {/* ==================================================================
            META
        =================================================================== */}

        <div className="church-event-card__meta">
          <span className="church-event-card__meta-item">
            <CalendarIcon />

            {formatDate(event.startsAt)}
          </span>

          <span className="church-event-card__meta-item">
            <ClockIcon />

            {formatTime(event.startsAt)}

            {event.endsAt ? " \u2013 " + formatTime(event.endsAt) : ""}
          </span>

          {(event.location || event.isOnline) && (
            <span className="church-event-card__meta-item">
              <PinIcon />

              {event.isOnline
                ? getSafeTranslation(
                    t("church.event.online"),
                    "church.event.online",
                    "Online",
                  )
                : event.location}
            </span>
          )}
        </div>

        {/* ==================================================================
            ORGANIZER
        =================================================================== */}

        {event.organizer && (
          <p className="church-event-card__organizer">
            {getSafeTranslation(
              t("church.event.hostedBy"),
              "church.event.hostedBy",
              "Hosted by",
            )}{" "}
            {event.organizer.displayName}
          </p>
        )}

        {/* ==================================================================
            RSVP ACTIONS
        =================================================================== */}

        {event.requiresRsvp && (
          <div className="church-event-card__rsvp-actions">
            <button
              type="button"
              className={
                "church-btn church-btn--sm " +
                (event.currentUserRsvp === RsvpStatus.Going
                  ? "church-btn--primary"
                  : "church-btn--secondary")
              }
              onClick={() => handleRsvp(RsvpStatus.Going)}
              disabled={
                isUpdating ||
                (isFull && event.currentUserRsvp !== RsvpStatus.Going)
              }
            >
              {event.currentUserRsvp === RsvpStatus.Going
                ? getSafeTranslation(
                    t("church.event.youreGoing"),
                    "church.event.youreGoing",
                    "You're going",
                  )
                : isFull
                  ? getSafeTranslation(
                      t("church.event.eventFull"),
                      "church.event.eventFull",
                      "Event full",
                    )
                  : getSafeTranslation(
                      t("church.event.imGoing"),
                      "church.event.imGoing",
                      "I'm going",
                    )}
            </button>

            <button
              type="button"
              className={
                "church-btn church-btn--sm " +
                (event.currentUserRsvp === RsvpStatus.Interested
                  ? "church-btn--primary"
                  : "church-btn--ghost")
              }
              onClick={() => handleRsvp(RsvpStatus.Interested)}
              disabled={isUpdating}
            >
              {rsvpLabels[RsvpStatus.Interested]}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}