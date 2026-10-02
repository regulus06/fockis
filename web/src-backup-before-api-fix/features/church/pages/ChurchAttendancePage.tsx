/**
 * ChurchAttendancePage.tsx
 * -----------------------------------------------------------------------------
 * Member attendance experience:
 * - View authenticated member attendance history.
 * - View upcoming organization events.
 * - Submit an absence report.
 * - Centralized Fockis language support.
 * -----------------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import ChurchSidebar from "../components/ChurchSidebar";

import {
  getMyAttendanceHistory,
  submitAbsenceReport,
} from "../api/attendanceApi";

import { listEvents } from "../api/eventsApi";

import {
  ATTENDANCE_TYPE_LABELS,
  AbsenceReasonCategory,
  type AttendanceRecord,
  type ChurchEvent,
} from "../types/church.types";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchOrganizationPage.scss";

const REASON_TRANSLATION_KEYS: Record<
  AbsenceReasonCategory,
  string
> = {
  [AbsenceReasonCategory.Illness]:
    "church.attendance.reasons.illness",
  [AbsenceReasonCategory.Travel]:
    "church.attendance.reasons.travel",
  [AbsenceReasonCategory.Family]:
    "church.attendance.reasons.family",
  [AbsenceReasonCategory.Work]:
    "church.attendance.reasons.work",
  [AbsenceReasonCategory.Other]:
    "church.attendance.reasons.other",
};

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function formatDate(
  value: string | Date,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

function formatDateTime(
  value: string | Date,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export default function ChurchAttendancePage(): React.JSX.Element {
  const { organizationId = "" } =
    useParams<{ organizationId: string }>();

  const { t } = useFockisTranslation();

  const [history, setHistory] =
    useState<AttendanceRecord[]>([]);

  const [upcomingEvents, setUpcomingEvents] =
    useState<ChurchEvent[]>([]);

  const [selectedEventId, setSelectedEventId] =
    useState("");

  const [reasonCategory, setReasonCategory] =
    useState<AbsenceReasonCategory>(
      AbsenceReasonCategory.Other,
    );

  const [note, setNote] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitMessage, setSubmitMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const loadAttendance = useCallback(
    async (signal?: AbortSignal) => {
      if (!organizationId) {
        setHistory([]);
        setUpcomingEvents([]);
        setSelectedEventId("");
        setIsLoading(false);

        setError(
          t("church.attendance.errors.noOrganization"),
        );

        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [historyResult, eventsResult] =
          await Promise.all([
            getMyAttendanceHistory(
              organizationId,
              {
                pageSize: 20,
              },
              signal,
            ),

            listEvents(
              organizationId,
              {
                pageSize: 10,
                from: new Date().toISOString(),
              },
              signal,
            ),
          ]);

        if (signal?.aborted) {
          return;
        }

        const historyItems =
          historyResult.items ?? [];

        const eventItems =
          eventsResult.items ?? [];

        setHistory(historyItems);
        setUpcomingEvents(eventItems);

        setSelectedEventId((currentId) => {
          if (
            currentId &&
            eventItems.some(
              (event) => event.id === currentId,
            )
          ) {
            return currentId;
          }

          return eventItems[0]?.id ?? "";
        });
      } catch (err) {
        if (
          isAbortError(err) ||
          signal?.aborted
        ) {
          return;
        }

        setError(
          getErrorMessage(
            err,
            t(
              "church.attendance.errors.load",
            ),
          ),
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [organizationId, t],
  );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadAttendance(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadAttendance]);

  const handleSubmitAbsence = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!organizationId) {
      setError(
        t(
          "church.attendance.errors.noOrganization",
        ),
      );
      return;
    }

    if (!selectedEventId) {
      setError(
        t(
          "church.attendance.errors.selectEvent",
        ),
      );
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);
    setError(null);

    try {
      await submitAbsenceReport({
        organizationId,
        eventId: selectedEventId,
        reasonCategory,
        note: note.trim() || undefined,
      });

      setSubmitMessage(
        t(
          "church.attendance.success.absenceSubmitted",
        ),
      );

      setNote("");

      await loadAttendance();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t(
            "church.attendance.errors.submit",
          ),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="church-page">
      <ChurchHeader />

      <div className="church-container church-org-layout">
        <ChurchSidebar
          organizationId={organizationId}
        />

        <main className="church-org-content">
          <div className="church-section__heading church-section__heading--with-action">
            <div>
              <h1>
                {t("church.attendance.title")}
              </h1>

              <p>
                {t(
                  "church.attendance.description",
                )}
              </p>
            </div>

            <LanguageSelector />
          </div>

          {!organizationId && (
            <div
              className="church-alert church-alert--error"
              role="alert"
            >
              {t(
                "church.attendance.errors.noOrganization",
              )}
            </div>
          )}

          {error && organizationId && (
            <div
              className="church-alert church-alert--error"
              role="alert"
            >
              {error}
            </div>
          )}

          <section className="church-org-section">
            <h2>
              {t(
                "church.attendance.reportAbsence",
              )}
            </h2>

            {isLoading ? (
              <p className="church-empty-state">
                {t(
                  "church.attendance.loadingUpcoming",
                )}
              </p>
            ) : upcomingEvents.length === 0 ? (
              <p className="church-empty-state">
                {t(
                  "church.attendance.noUpcomingEvents",
                )}
              </p>
            ) : (
              <form
                className="church-form"
                onSubmit={
                  handleSubmitAbsence
                }
              >
                <label className="church-field">
                  <span>
                    {t(
                      "church.attendance.event",
                    )}
                  </span>

                  <select
                    className="church-select"
                    value={
                      selectedEventId
                    }
                    onChange={(event) => {
                      setSelectedEventId(
                        event.target.value,
                      );

                      setSubmitMessage(null);
                      setError(null);
                    }}
                    disabled={
                      isSubmitting
                    }
                    required
                  >
                    <option value="">
                      {t(
                        "church.attendance.selectEvent",
                      )}
                    </option>

                    {upcomingEvents.map(
                      (event) => (
                        <option
                          key={event.id}
                          value={event.id}
                        >
                          {event.title} —{" "}
                          {formatDate(
                            event.startsAt,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="church-field">
                  <span>
                    {t(
                      "church.attendance.reason",
                    )}
                  </span>

                  <select
                    className="church-select"
                    value={
                      reasonCategory
                    }
                    onChange={(event) => {
                      setReasonCategory(
                        event.target
                          .value as AbsenceReasonCategory,
                      );

                      setSubmitMessage(null);
                    }}
                    disabled={
                      isSubmitting
                    }
                    required
                  >
                    {Object.values(
                      AbsenceReasonCategory,
                    ).map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {t(
                          REASON_TRANSLATION_KEYS[
                            value
                          ],
                        )}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="church-field">
                  <span>
                    {t(
                      "church.attendance.noteOptional",
                    )}
                  </span>

                  <textarea
                    className="church-textarea"
                    value={note}
                    onChange={(event) => {
                      setNote(
                        event.target.value,
                      );
                      setSubmitMessage(null);
                    }}
                    rows={4}
                    maxLength={1000}
                    disabled={
                      isSubmitting
                    }
                    placeholder={t(
                      "church.attendance.notePlaceholder",
                    )}
                  />

                  <small>
                    {note.length}/1000{" "}
                    {t(
                      "church.attendance.characters",
                    )}
                  </small>
                </label>

                <button
                  type="submit"
                  className="church-btn church-btn--primary"
                  disabled={
                    isSubmitting ||
                    !organizationId ||
                    !selectedEventId
                  }
                >
                  {isSubmitting
                    ? t(
                        "church.attendance.submitting",
                      )
                    : t(
                        "church.attendance.submit",
                      )}
                </button>

                {submitMessage && (
                  <p
                    className="church-alert church-alert--success"
                    role="status"
                  >
                    {submitMessage}
                  </p>
                )}
              </form>
            )}
          </section>

          <section className="church-org-section">
            <h2>
              {t(
                "church.attendance.history",
              )}
            </h2>

            {isLoading ? (
              <p
                className="church-empty-state"
                role="status"
              >
                {t(
                  "church.attendance.loadingHistory",
                )}
              </p>
            ) : history.length === 0 ? (
              <p className="church-empty-state">
                {t(
                  "church.attendance.noHistory",
                )}
              </p>
            ) : (
              <div className="church-table-wrapper">
                <table className="church-table">
                  <thead>
                    <tr>
                      <th scope="col">
                        {t(
                          "church.attendance.table.event",
                        )}
                      </th>

                      <th scope="col">
                        {t(
                          "church.attendance.table.type",
                        )}
                      </th>

                      <th scope="col">
                        {t(
                          "church.attendance.table.checkedIn",
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map(
                      (record) => (
                        <tr
                          key={record.id}
                        >
                          <td>
                            {record.eventTitle ||
                              t(
                                "church.attendance.churchEvent",
                              )}
                          </td>

                          <td>
                            {ATTENDANCE_TYPE_LABELS[
                              record.attendanceType
                            ] ??
                              record.attendanceType}
                          </td>

                          <td>
                            {formatDateTime(
                              record.checkedInAt,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}