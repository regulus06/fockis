/**
 * =============================================================================
 * FOCKIS ORGANIZATION EVENTS
 * =============================================================================
 *
 * Organization-wide event listing page.
 *
 * This page is intentionally organization-generic.
 *
 * Any organization can use it:
 * - Church
 * - School
 * - Business
 * - Nonprofit
 * - Sports organization
 * - Community organization
 * - Association
 * - Club
 * - Other organization types
 *
 * Existing ChurchEventsPage imports are preserved through the compatibility
 * export at the bottom of this file.
 * =============================================================================
 */

import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import ChurchEventCard from "../components/ChurchEventCard";

import {
  cancelRsvp,
  listEvents,
  rsvpToEvent,
} from "../api/eventsApi";

import {
  EventType,
  RsvpStatus,
  type ChurchEvent,
} from "../types/church.types";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchOrganizationPage.scss";

/* =============================================================================
   HELPERS
   ========================================================================== */

/**
 * Validate a MongoDB ObjectId without importing mongoose.
 */
function isValidOrganizationId(
  value: string | undefined,
): value is string {
  const organizationId =
    value?.trim();

  if (
    !organizationId ||
    organizationId === "YOUR_ORG_ID" ||
    organizationId === "undefined" ||
    organizationId === "null"
  ) {
    return false;
  }

  return /^[a-fA-F0-9]{24}$/.test(
    organizationId,
  );
}

/**
 * Safely encode an organization ID for use in a URL.
 */
function organizationEventsPath(
  organizationId: string,
): string {
  return `/organizations/${encodeURIComponent(
    organizationId,
  )}/events`;
}

/**
 * Safely encode the organization admin events path.
 */
function organizationAdminEventsPath(
  organizationId: string,
): string {
  return `/organizations/${encodeURIComponent(
    organizationId,
  )}/admin/events`;
}

/* =============================================================================
   PAGE
   ========================================================================== */

export default function OrganizationEventsPage(): React.JSX.Element {
  const {
    organizationId: rawOrganizationId,
  } = useParams<{
    organizationId: string;
  }>();

  const navigate = useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [
    events,
    setEvents,
  ] = useState<ChurchEvent[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const organizationId =
    rawOrganizationId?.trim() ?? "";

  const {
    t,
  } = useFockisTranslation();

  const eventType =
    (searchParams.get(
      "type",
    ) as EventType | null) ??
    undefined;

  const timeframe =
    searchParams.get(
      "timeframe",
    ) ?? "upcoming";

  /* ========================================================================== 
     CREATE EVENT
     ========================================================================== */

  const handleCreateEvent = () => {
    if (
      !isValidOrganizationId(
        organizationId,
      )
    ) {
      setError(
        t(
          "church.events.errors.validOrganization",
        ),
      );

      return;
    }

    navigate(
      organizationAdminEventsPath(
        organizationId,
      ),
    );
  };

  /* ========================================================================== 
     LOAD EVENTS
     ========================================================================== */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadEvents() {
      if (
        !isValidOrganizationId(
          organizationId,
        )
      ) {
        setEvents([]);
        setIsLoading(false);

        setError(
          organizationId
            ? organizationId ===
              "YOUR_ORG_ID"
              ? t(
                  "church.events.errors.placeholderOrganizationId",
                )
              : t(
                  "church.organization.invalidId",
                )
            : t(
                "church.organization.noOrganization",
              ),
        );

        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const now =
          new Date().toISOString();

        const result =
          await listEvents(
            organizationId,
            {
              eventType,

              page: 1,

              pageSize: 30,

              from:
                timeframe === "past"
                  ? undefined
                  : now,

              to:
                timeframe === "past"
                  ? now
                  : undefined,
            },
            controller.signal,
          );

        if (
          !controller.signal.aborted
        ) {
          setEvents(
            result.items ?? [],
          );
        }
      } catch (err) {
        if (
          controller.signal.aborted
        ) {
          return;
        }

        setEvents([]);

        setError(
          err instanceof Error
            ? err.message
            : t(
                "church.events.errors.load",
              ),
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      controller.abort();
    };
  }, [
    organizationId,
    eventType,
    timeframe,
    t,
  ]);

  /* ========================================================================== 
     FILTERS
     ========================================================================== */

  const updateParam = (
    key: string,
    value: string | null,
  ) => {
    const next =
      new URLSearchParams(
        searchParams,
      );

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    setSearchParams(next);
  };

  /* ========================================================================== 
     RSVP
     ========================================================================== */

  const handleRsvp = async (
    eventId: string,
    status: RsvpStatus,
  ) => {
    if (
      !isValidOrganizationId(
        organizationId,
      )
    ) {
      setError(
        t(
          "church.events.errors.validOrganization",
        ),
      );

      return;
    }

    try {
      const updated =
        await rsvpToEvent(
          organizationId,
          eventId,
          status,
        );

      setEvents((items) =>
        items.map((item) =>
          item.id === eventId
            ? updated
            : item,
        ),
      );

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              "church.events.errors.rsvp",
            ),
      );
    }
  };

  /* ========================================================================== 
     CANCEL RSVP
     ========================================================================== */

  const handleCancelRsvp = async (
    eventId: string,
  ) => {
    if (
      !isValidOrganizationId(
        organizationId,
      )
    ) {
      setError(
        t(
          "church.events.errors.validOrganization",
        ),
      );

      return;
    }

    try {
      const updated =
        await cancelRsvp(
          organizationId,
          eventId,
        );

      setEvents((items) =>
        items.map((item) =>
          item.id === eventId
            ? updated
            : item,
        ),
      );

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              "church.events.errors.cancelRsvp",
            ),
      );
    }
  };

  /* =============================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="church-page">
      <div className="church-container church-org-layout">
        <main className="church-org-content">
          {/* ==================================================================
              HEADER
          ================================================================== */}

          <div className="church-section__heading church-section__heading--with-action">
            <div>
              <h1>
                {t(
                  "church.events.title",
                )}
              </h1>

              <p>
                {t(
                  "church.events.description",
                )}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <LanguageSelector />

              <button
                type="button"
                className="church-button church-button--primary"
                onClick={
                  handleCreateEvent
                }
                disabled={
                  !isValidOrganizationId(
                    organizationId,
                  )
                }
              >
                +{" "}
                {t(
                  "church.events.create",
                )}
              </button>
            </div>
          </div>

          {/* ==================================================================
              INVALID ORGANIZATION
          ================================================================== */}

          {!isValidOrganizationId(
            organizationId,
          ) ? (
            <div className="church-alert church-alert--error">
              {organizationId ===
              "YOUR_ORG_ID"
                ? t(
                    "church.events.errors.placeholderOrganizationId",
                  )
                : organizationId
                  ? t(
                      "church.organization.invalidId",
                    )
                  : t(
                      "church.organization.noOrganization",
                    )}
            </div>
          ) : (
            <>
              {/* ================================================================
                  FILTERS
              ================================================================ */}

              <div className="church-org-filters">
                <div
                  className="church-tab-group"
                  role="tablist"
                  aria-label={t(
                    "church.events.timeframe",
                  )}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={
                      timeframe ===
                      "upcoming"
                    }
                    className={`church-tab ${
                      timeframe ===
                      "upcoming"
                        ? "church-tab--active"
                        : ""
                    }`}
                    onClick={() =>
                      updateParam(
                        "timeframe",
                        null,
                      )
                    }
                  >
                    {t(
                      "church.events.upcoming",
                    )}
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={
                      timeframe ===
                      "past"
                    }
                    className={`church-tab ${
                      timeframe ===
                      "past"
                        ? "church-tab--active"
                        : ""
                    }`}
                    onClick={() =>
                      updateParam(
                        "timeframe",
                        "past",
                      )
                    }
                  >
                    {t(
                      "church.events.past",
                    )}
                  </button>
                </div>

                <select
                  className="church-select"
                  value={
                    eventType ?? ""
                  }
                  onChange={(event) =>
                    updateParam(
                      "type",
                      event.target
                        .value ||
                        null,
                    )
                  }
                  aria-label={t(
                    "church.events.filterByType",
                  )}
                >
                  <option value="">
                    {t(
                      "church.events.allTypes",
                    )}
                  </option>

                  {Object.values(
                    EventType,
                  ).map((value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {t(
                        `church.event.types.${value}`,
                      )}
                    </option>
                  ))}
                </select>
              </div>

              {/* ================================================================
                  ERROR
              ================================================================ */}

              {error && (
                <div className="church-alert church-alert--error">
                  {error}
                </div>
              )}

              {/* ================================================================
                  EVENTS
              ================================================================ */}

              {isLoading ? (
                <p className="church-empty-state">
                  {t(
                    "church.events.loading",
                  )}
                </p>
              ) : events.length ===
                0 ? (
                <div className="church-empty-state">
                  <p>
                    {t(
                      "church.events.empty",
                    )}
                  </p>

                  {timeframe ===
                    "upcoming" && (
                    <button
                      type="button"
                      className="church-button church-button--primary"
                      onClick={
                        handleCreateEvent
                      }
                    >
                      +{" "}
                      {t(
                        "church.events.createFirst",
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="church-event-grid">
                  {events.map(
                    (event) => (
                      <ChurchEventCard
                        key={
                          event.id
                        }
                        organizationId={
                          organizationId
                        }
                        event={event}
                        onRsvp={
                          handleRsvp
                        }
                        onCancelRsvp={
                          handleCancelRsvp
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* =============================================================================
   BACKWARD COMPATIBILITY
   =============================================================================
 *
 * Existing Church routes/components can continue importing:
 *
 *   ChurchEventsPage
 *
 * while we migrate the application to:
 *
 *   OrganizationEventsPage
 *
 * Once all routes are migrated, the compatibility export can be removed.
 * =============================================================================
 */

export {
  OrganizationEventsPage as ChurchEventsPage,
};