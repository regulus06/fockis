import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  Lock,
  UserCheck,
  Users,
} from "lucide-react";

import {
  FormField,
} from "../components/scheduling/FormField";

import {
  ToggleRow,
} from "../components/scheduling/ToggleRow";

import {
  AgendaEditor,
} from "../components/scheduling/AgendaEditor";

import {
  SecretaryConsentCard,
} from "../components/scheduling/SecretaryConsentCard";

import MeetingParticipantPicker from "../components/scheduling/MeetingParticipantPicker";

import {
  Button,
} from "../components/common/Button";

import type {
  MeetingAgendaItem,
  MeetingSecuritySettings,
  AiSecretaryConfig,
} from "../types";

import {
  meetingsApi,
} from "../services/meetingsApi";

import {
  MEETING_ROUTES,
} from "../constants";

import "../styles/global.scss";
import "../styles/pages.scss";

/* ============================================================================
 * DEFAULT SECURITY
 * ========================================================================== */

const DEFAULT_SECURITY: MeetingSecuritySettings = {
  waitingRoomEnabled: true,

  allowJoinBeforeHost: false,

  muteParticipantsOnEntry: true,

  screenShareWhoCanShare: "host_only",

  locked: false,
};

/* ============================================================================
 * DEFAULT AI SECRETARY
 * ========================================================================== */

const DEFAULT_SECRETARY: AiSecretaryConfig = {
  enabled: true,

  takeNotes: true,

  generateTranscript: true,

  identifyMainPoints: true,

  identifyDecisions: true,

  identifyActionItems: true,

  identifyQuestions: true,

  generateSummary: true,

  generatePdfReport: true,
};

/* ============================================================================
 * DATE DEFAULT
 * ========================================================================== */

function getTodayDate(): string {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ============================================================================
 * TIMEZONE HELPERS
 * ========================================================================== */

function localDateTimeToDate(
  date: string,
  time: string,
  timezone: string,
): Date {
  const [
    year,
    month,
    day,
  ] =
    date
      .split("-")
      .map(Number);

  const [
    hour,
    minute,
  ] =
    time
      .split(":")
      .map(Number);

  /*
   * Start with the requested wall-clock values interpreted as UTC.
   *
   * This is only an intermediate value used to calculate
   * the timezone offset correctly.
   */

  const approximateUtc =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0,
      ),
    );

  /*
   * Format the approximate date in the requested timezone.
   */

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          timezone,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23",
      },
    );

  const parts =
    formatter.formatToParts(
      approximateUtc,
    );

  const values: Record<
    string,
    string
  > = {};

  for (
    const part of parts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      values[
        part.type
      ] =
        part.value;
    }
  }

  const zonedAsUtc =
    Date.UTC(
      Number(
        values.year,
      ),

      Number(
        values.month,
      ) - 1,

      Number(
        values.day,
      ),

      Number(
        values.hour,
      ),

      Number(
        values.minute,
      ),

      Number(
        values.second,
      ),
    );

  /*
   * Difference between the requested wall-clock time
   * and what the timezone formatter produced.
   */

  const offset =
    zonedAsUtc -
    approximateUtc.getTime();

  /*
   * Correct the approximate timestamp by the timezone offset.
   */

  return new Date(
    approximateUtc.getTime() -
      offset,
  );
}

/* ============================================================================
 * BUILD MEETING DATE TIMES
 * ========================================================================== */

function buildMeetingDateTimes(
  date: string,
  time: string,
  durationMinutes: number,
  timezone: string,
) {
  const startDate =
    localDateTimeToDate(
      date,
      time,
      timezone,
    );

  if (
    Number.isNaN(
      startDate.getTime(),
    )
  ) {
    throw new Error(
      "Invalid meeting start date/time.",
    );
  }

  const endDate =
    new Date(
      startDate.getTime() +
        durationMinutes *
          60 *
          1000,
    );

  return {
    startTime:
      startDate.toISOString(),

    endTime:
      endDate.toISOString(),
  };
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export function ScheduleMeetingPage() {
  const navigate =
    useNavigate();

  /* --------------------------------------------------------------------------
   * BASIC INFORMATION
   * ------------------------------------------------------------------------ */

  const [
    topic,
    setTopic,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  /* --------------------------------------------------------------------------
   * DATE / TIME
   * ------------------------------------------------------------------------ */

  const [
    date,
    setDate,
  ] = useState(
    getTodayDate(),
  );

  const [
    time,
    setTime,
  ] = useState(
    "10:00",
  );

  const [
    duration,
    setDuration,
  ] = useState(30);

  const [
    timezone,
    setTimezone,
  ] = useState(
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone ||
      "America/New_York",
  );

  /* --------------------------------------------------------------------------
   * PASSCODE
   * ------------------------------------------------------------------------ */

  const [
    passcode,
    setPasscode,
  ] = useState("");

  /* --------------------------------------------------------------------------
   * MAXIMUM PARTICIPANTS
   *
   * Empty by default.
   *
   * There is intentionally no hardcoded participant count.
   * ------------------------------------------------------------------------ */

  const [
    maxParticipants,
    setMaxParticipants,
  ] =
    useState<
      number | ""
    >("");

  /* --------------------------------------------------------------------------
   * AGENDA
   * ------------------------------------------------------------------------ */

  const [
    agenda,
    setAgenda,
  ] = useState<
    MeetingAgendaItem[]
  >([]);

  /* --------------------------------------------------------------------------
   * INVITEES
   * ------------------------------------------------------------------------ */

  const [
    inviteeIds,
    setInviteeIds,
  ] = useState<string[]>(
    [],
  );

  /* --------------------------------------------------------------------------
   * SECURITY
   * ------------------------------------------------------------------------ */

  const [
    security,
    setSecurity,
  ] =
    useState<MeetingSecuritySettings>(
      DEFAULT_SECURITY,
    );

  /* --------------------------------------------------------------------------
   * AI SECRETARY
   * ------------------------------------------------------------------------ */

  const [
    secretary,
    setSecretary,
  ] =
    useState<AiSecretaryConfig>(
      DEFAULT_SECRETARY,
    );

  /* --------------------------------------------------------------------------
   * SUBMISSION
   * ------------------------------------------------------------------------ */

  const [
    submitError,
    setSubmitError,
  ] = useState<
    string | null
  >(null);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  /* ==========================================================================
   * DERIVED PARTICIPANT VALUES
   * ======================================================================== */

  const numericMaxParticipants =
    typeof maxParticipants ===
      "number" &&
    Number.isFinite(
      maxParticipants,
    )
      ? maxParticipants
      : null;

  /*
   * The host counts as one participant.
   *
   * Example:
   *
   * 10 maximum participants
   * = host + 9 invited people
   */

  const maximumInvitees =
    numericMaxParticipants !==
      null &&
    numericMaxParticipants >=
      2
      ? Math.max(
          0,
          numericMaxParticipants -
            1,
        )
      : null;

  /* ==========================================================================
   * SUBMIT
   * ======================================================================== */

  const handleSubmit =
    async () => {
      /* ----------------------------------------------------------------------
       * BASIC VALIDATION
       * -------------------------------------------------------------------- */

      if (
        !topic.trim()
      ) {
        setSubmitError(
          "Please enter a meeting topic.",
        );

        return;
      }

      if (!date) {
        setSubmitError(
          "Please select a meeting date.",
        );

        return;
      }

      if (!time) {
        setSubmitError(
          "Please select a meeting start time.",
        );

        return;
      }

      if (
        !Number.isFinite(
          duration,
        ) ||
        duration < 1 ||
        duration > 1440
      ) {
        setSubmitError(
          "Meeting duration must be between 1 and 1440 minutes.",
        );

        return;
      }

      /* ----------------------------------------------------------------------
       * PARTICIPANT COUNT
       * -------------------------------------------------------------------- */

      if (
        numericMaxParticipants ===
        null
      ) {
        setSubmitError(
          "Please enter the maximum number of participants.",
        );

        return;
      }

      if (
        numericMaxParticipants <
        2
      ) {
        setSubmitError(
          "A private meeting must allow at least 2 participants.",
        );

        return;
      }

      /* ----------------------------------------------------------------------
       * CLEAN INVITEE IDS
       * -------------------------------------------------------------------- */

      const cleanInviteeIds =
        Array.from(
          new Set(
            inviteeIds
              .filter(
                (
                  id,
                ): id is string =>
                  typeof id ===
                  "string",
              )
              .map(
                (id) =>
                  id.trim(),
              )
              .filter(
                (id) =>
                  id.length >
                  0,
              ),
          ),
        );

      /*
       * Invitees are optional.
       *
       * A private meeting may be scheduled with zero or more
       * explicitly invited people. The private join link can also
       * be used by people who receive/possess the valid link.
       *
       * The participant limit is enforced by the meeting backend
       * when people actually join.
       */

      /* ----------------------------------------------------------------------
       * SUBMIT
       * -------------------------------------------------------------------- */

      setSubmitting(true);

      setSubmitError(null);

      try {
        /* --------------------------------------------------------------------
         * CLEAN AGENDA
         * ------------------------------------------------------------------ */

        const cleanAgenda =
          agenda
            .map(
              (
                item,
                index,
              ) => ({
                title:
                  typeof item.title ===
                  "string"
                    ? item.title.trim()
                    : "",

                order:
                  typeof item.order ===
                  "number"
                    ? item.order
                    : index + 1,
              }),
            )
            .filter(
              (item) =>
                item.title
                  .length >
                0,
            )
            .map(
              (
                item,
                index,
              ) => ({
                title:
                  item.title,

                order:
                  index + 1,
              }),
            );

        /* --------------------------------------------------------------------
         * CALCULATE START + END
         * ------------------------------------------------------------------ */

        const {
          startTime,
          endTime,
        } =
          buildMeetingDateTimes(
            date,
            time,
            duration,
            timezone ||
              "UTC",
          );

        /* --------------------------------------------------------------------
         * CREATE PRIVATE MEETING
         * ------------------------------------------------------------------ */

        const result =
          await meetingsApi.create(
            {
              topic:
                topic.trim(),

              description:
                description.trim() ||
                undefined,

              startTime,

              endTime,

              durationMinutes:
                duration,

              timezone:
                timezone ||
                "UTC",

              passcode:
                passcode.trim() ||
                undefined,

              /*
               * PRIVATE MEETING
               *
               * Private controls access.
               *
               * It does NOT mean one-on-one.
               */

              visibility:
                "private",

              requireApproval:
                true,

              allowGuests:
                false,

              /*
               * Exactly what the host entered.
               */

              maxParticipants:
                numericMaxParticipants,

              agenda:
                cleanAgenda.length >
                0
                  ? cleanAgenda
                  : undefined,

              inviteeIds:
                cleanInviteeIds,

              security,

              secretary,

              recordingEnabled:
                true,
            },
          );

        /* --------------------------------------------------------------------
         * API ERROR
         * ------------------------------------------------------------------ */

        if (
          !result.ok
        ) {
          setSubmitError(
            result.error,
          );

          return;
        }

        /* --------------------------------------------------------------------
         * VALIDATE CREATED MEETING ID
         * ------------------------------------------------------------------ */

        const meetingId =
          result.data?.id;

        if (
          !meetingId ||
          typeof meetingId !==
            "string"
        ) {
          setSubmitError(
            "Meeting was created, but the server did not return a valid meeting ID.",
          );

          return;
        }

        /* --------------------------------------------------------------------
         * SUCCESS
         * ------------------------------------------------------------------ */

        navigate(
          MEETING_ROUTES.details(
            meetingId,
          ),
        );
      } catch (
        error
      ) {
        setSubmitError(
          error instanceof
          Error
            ? error.message
            : "Unable to schedule the meeting.",
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">

      <div className="fm-subpage">

        {/* --------------------------------------------------------------------
         * BACK
         * ------------------------------------------------------------------ */}

        <Link
          to={
            MEETING_ROUTES.root
          }
          className="fm-back-link"
        >
          <ArrowLeft
            size={14}
          />

          Back to Meetings
        </Link>

        {/* --------------------------------------------------------------------
         * HEADER
         * ------------------------------------------------------------------ */}

        <div className="fm-subpage-header">

          <h1>
            Schedule a private meeting
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",

              color:
                "#6b7280",

              fontSize:
                "14px",

              lineHeight:
                1.5,
            }}
          >
            Schedule a private meeting with as many people as you choose.
          </p>

        </div>

        {/* --------------------------------------------------------------------
         * PRIVATE MEETING BANNER
         * ------------------------------------------------------------------ */}

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "12px",

            marginBottom:
              "22px",

            padding:
              "14px 16px",

            border:
              "1px solid #dbe7ff",

            borderRadius:
              "12px",

            background:
              "#f5f8ff",
          }}
        >

          <div
            style={{
              width:
                "38px",

              height:
                "38px",

              flexShrink:
                0,

              display:
                "inline-flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              borderRadius:
                "10px",

              background:
                "#e7efff",

              color:
                "#315efb",
            }}
          >
            <Lock
              size={18}
            />
          </div>

          <div
            style={{
              minWidth:
                0,
            }}
          >

            <strong
              style={{
                display:
                  "block",

                color:
                  "#172033",

                fontSize:
                  "14px",
              }}
            >
              Private meeting
            </strong>

            <span
              style={{
                display:
                  "block",

                marginTop:
                  "3px",

                color:
                  "#667085",

                fontSize:
                  "12px",

                lineHeight:
                  1.5,
              }}
            >
              Only you and the people you invite can participate.
            </span>

          </div>

        </div>

        {/* --------------------------------------------------------------------
         * TOPIC
         * ------------------------------------------------------------------ */}

        <FormField
          label="Meeting topic"
        >
          <input
            className="fm-input"
            placeholder="e.g. Project Planning"
            value={
              topic
            }
            onChange={(
              event,
            ) =>
              setTopic(
                event.target
                  .value,
              )
            }
          />
        </FormField>

        {/* --------------------------------------------------------------------
         * DESCRIPTION
         * ------------------------------------------------------------------ */}

        <FormField
          label="Description"
          hint="Optional context for the people you are inviting"
        >
          <textarea
            className="fm-textarea"
            value={
              description
            }
            onChange={(
              event,
            ) =>
              setDescription(
                event.target
                  .value,
              )
            }
          />
        </FormField>

        {/* --------------------------------------------------------------------
         * DATE / TIME / DURATION
         * ------------------------------------------------------------------ */}

        <div className="fm-field-row">

          <FormField
            label="Date"
          >
            <input
              type="date"
              className="fm-input"
              value={
                date
              }
              min={
                getTodayDate()
              }
              onChange={(
                event,
              ) =>
                setDate(
                  event.target
                    .value,
                )
              }
            />
          </FormField>

          <FormField
            label="Start time"
          >
            <input
              type="time"
              className="fm-input"
              value={
                time
              }
              onChange={(
                event,
              ) =>
                setTime(
                  event.target
                    .value,
                )
              }
            />
          </FormField>

          <FormField
            label="Duration (minutes)"
          >
            <input
              type="number"
              min={1}
              max={1440}
              step={15}
              className="fm-input"
              value={
                duration
              }
              onChange={(
                event,
              ) => {
                const value =
                  Number(
                    event.target
                      .value,
                  );

                setDuration(
                  Number.isFinite(
                    value,
                  )
                    ? value
                    : 0,
                );
              }}
            />
          </FormField>

        </div>

        {/* --------------------------------------------------------------------
         * TIMEZONE / MEETING ID / PASSCODE
         * ------------------------------------------------------------------ */}

        <div className="fm-field-row">

          <FormField
            label="Timezone"
          >
            <select
              className="fm-select"
              value={
                timezone
              }
              onChange={(
                event,
              ) =>
                setTimezone(
                  event.target
                    .value,
                )
              }
            >

              <option value="America/New_York">
                Eastern Time
              </option>

              <option value="America/Chicago">
                Central Time
              </option>

              <option value="America/Denver">
                Mountain Time
              </option>

              <option value="America/Los_Angeles">
                Pacific Time
              </option>

              <option value="UTC">
                UTC
              </option>

            </select>
          </FormField>

          <FormField
            label="Meeting ID"
            hint="Generated automatically"
          >
            <input
              className="fm-input mono"
              disabled
              placeholder="Assigned on save"
            />
          </FormField>

          <FormField
            label="Passcode"
            hint="Optional"
          >
            <input
              className="fm-input"
              value={
                passcode
              }
              maxLength={64}
              onChange={(
                event,
              ) =>
                setPasscode(
                  event.target
                    .value,
                )
              }
              placeholder="Optional passcode"
            />
          </FormField>

        </div>

        {/* --------------------------------------------------------------------
         * MAXIMUM PARTICIPANTS
         * ------------------------------------------------------------------ */}

        <div
          className="fm-field"
          style={{
            marginTop:
              "6px",
          }}
        >

          <span className="fm-field__label">
            Maximum participants
          </span>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "12px",

              marginTop:
                "8px",
            }}
          >

            <Users
              size={18}
              style={{
                color:
                  "#315efb",

                flexShrink:
                  0,
              }}
            />

            <input
              type="number"
              className="fm-input"
              min={2}
              step={1}
              value={
                maxParticipants
              }
              onChange={(
                event,
              ) => {
                const raw =
                  event.target
                    .value;

                if (
                  raw ===
                  ""
                ) {
                  setMaxParticipants(
                    "",
                  );

                  setSubmitError(
                    null,
                  );

                  return;
                }

                const value =
                  Number(
                    raw,
                  );

                if (
                  Number.isFinite(
                    value,
                  )
                ) {
                  const nextValue =
                    Math.max(
                      2,
                      Math.floor(
                        value,
                      ),
                    );

                  setMaxParticipants(
                    nextValue,
                  );

                  /*
                   * If the participant limit is reduced below
                   * the current number of invitees, keep the
                   * earliest selected invitees and remove only
                   * those that no longer fit.
                   */

                  const nextMaximumInvitees =
                    nextValue -
                    1;

                  setInviteeIds(
                    (
                      current,
                    ) =>
                      current.slice(
                        0,
                        nextMaximumInvitees,
                      ),
                  );

                  setSubmitError(
                    null,
                  );
                }
              }}
              placeholder="Enter number"
              style={{
                maxWidth:
                  "220px",
              }}
            />

          </div>

          <p
            style={{
              margin:
                "8px 0 0",

              fontSize:
                "12px",

              color:
                "#667085",

              lineHeight:
                1.5,
            }}
          >
            Enter the maximum number of participants for this meeting.
            You are automatically counted as the host.
          </p>

        </div>

        {/* --------------------------------------------------------------------
         * INVITE PEOPLE
         *
         * IMPORTANT:
         *
         * The picker is available immediately.
         *
         * The participant limit does NOT have to be entered first.
         *
         * This allows the picker to display:
         *
         * Everyone
         * People
         * Groups
         * Organizations
         * Academies
         * Churches
         * Departments
         * ------------------------------------------------------------------ */}

        <div
          className="fm-field"
          style={{
            position:
              "relative",

            zIndex:
              20,
          }}
        >

          <span className="fm-field__label">
            Invite people
          </span>

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "8px",

              marginTop:
                "5px",

              marginBottom:
                "10px",

              color:
                "#667085",

              fontSize:
                "12px",
            }}
          >

            <UserCheck
              size={14}
            />

            Select people or other Fockis groups and organizations to invite.
          </div>

          <MeetingParticipantPicker
            value={
              inviteeIds
            }

            onChange={(
              ids,
            ) => {
              /*
               * The user is allowed to select invitees
               * BEFORE entering a participant limit.
               */

              if (
                numericMaxParticipants !==
                null
              ) {
                setInviteeIds(
                  ids.slice(
                    0,
                    maximumInvitees ??
                      0,
                  ),
                );
              } else {
                setInviteeIds(
                  ids,
                );
              }

              setSubmitError(
                null,
              );
            }}

            /*
             * When a limit exists, pass the number of available
             * invitee slots.
             *
             * When there is no limit yet, pass undefined so the
             * picker is not artificially restricted.
             */
            maxParticipants={
              numericMaxParticipants !==
              null
                ? maximumInvitees ??
                  undefined
                : undefined
            }

            /*
             * NEVER disable the picker simply because the
             * participant limit is empty.
             */
            disabled={
              submitting
            }

            placeholder="Search for people, groups, organizations, academies, churches, or departments..."
          />

          <p
            style={{
              margin:
                "8px 0 0",

              fontSize:
                "12px",

              color:
                "#7b8491",

              lineHeight:
                1.5,
            }}
          >
            {numericMaxParticipants !==
            null
              ? `${inviteeIds.length} invited of ${
                  maximumInvitees ??
                  0
                } available invitation slots.`
              : `${inviteeIds.length} people selected. You can set the participant limit above at any time.`}
          </p>

        </div>

        {/* --------------------------------------------------------------------
         * AGENDA
         * ------------------------------------------------------------------ */}

        <AgendaEditor
          items={
            agenda
          }
          onChange={
            setAgenda
          }
        />

        {/* --------------------------------------------------------------------
         * AI SECRETARY
         * ------------------------------------------------------------------ */}

        <SecretaryConsentCard
          config={
            secretary
          }
          onChange={
            setSecretary
          }
        />

        {/* --------------------------------------------------------------------
         * MEETING OPTIONS
         * ------------------------------------------------------------------ */}

        <div className="fm-field">

          <span className="fm-field__label">
            Meeting options
          </span>

          <ToggleRow
            label="Waiting room"
            description="Invited people wait until the host admits them"
            checked={
              security.waitingRoomEnabled
            }
            onChange={(
              value,
            ) =>
              setSecurity(
                (
                  current,
                ) => ({
                  ...current,

                  waitingRoomEnabled:
                    value,
                }),
              )
            }
          />

          <ToggleRow
            label="Allow participants to join before host"
            checked={
              security.allowJoinBeforeHost
            }
            onChange={(
              value,
            ) =>
              setSecurity(
                (
                  current,
                ) => ({
                  ...current,

                  allowJoinBeforeHost:
                    value,
                }),
              )
            }
          />

          <ToggleRow
            label="Mute participants on entry"
            checked={
              security.muteParticipantsOnEntry
            }
            onChange={(
              value,
            ) =>
              setSecurity(
                (
                  current,
                ) => ({
                  ...current,

                  muteParticipantsOnEntry:
                    value,
                }),
              )
            }
          />

          <ToggleRow
            label="Only host can share screen"
            checked={
              security.screenShareWhoCanShare ===
              "host_only"
            }
            onChange={(
              value,
            ) =>
              setSecurity(
                (
                  current,
                ) => ({
                  ...current,

                  screenShareWhoCanShare:
                    value
                      ? "host_only"
                      : "everyone",
                }),
              )
            }
          />

        </div>

        {/* --------------------------------------------------------------------
         * PRIVATE MEETING SUMMARY
         * ------------------------------------------------------------------ */}

        <div
          style={{
            marginTop:
              "20px",

            padding:
              "15px 16px",

            border:
              "1px solid #e5e7eb",

            borderRadius:
              "12px",

            background:
              "#fafafa",
          }}
        >

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "8px",

              marginBottom:
                "6px",

              color:
                "#172033",

              fontSize:
                "13px",

              fontWeight:
                700,
            }}
          >

            <Lock
              size={15}
            />

            Private meeting

          </div>

          <div
            style={{
              color:
                "#667085",

              fontSize:
                "12px",

              lineHeight:
                1.6,
            }}
          >

            Host: You

            <br />

            Maximum participants:{" "}
            {numericMaxParticipants !==
            null
              ? numericMaxParticipants
              : "Not set"}

            <br />

            People invited:{" "}
            {inviteeIds.length}

            {numericMaxParticipants !==
              null && (
              <>
                <br />

                Available invitation slots:{" "}
                {maximumInvitees! -
                  inviteeIds.length}
              </>
            )}

          </div>

        </div>

        {/* --------------------------------------------------------------------
         * ERROR
         * ------------------------------------------------------------------ */}

        {submitError && (
          <div
            className="fm-form-error"
            role="alert"
            style={{
              marginTop:
                "16px",
            }}
          >
            {
              submitError
            }
          </div>
        )}

        {/* --------------------------------------------------------------------
         * ACTIONS
         * ------------------------------------------------------------------ */}

        <div className="fm-form-actions">

          <Button
            variant="secondary"
            onClick={() =>
              navigate(
                MEETING_ROUTES.root,
              )
            }
            disabled={
              submitting
            }
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={
              handleSubmit
            }
            disabled={
              !topic.trim() ||
              !date ||
              !time ||
              !Number.isFinite(
                duration,
              ) ||
              duration < 1 ||
              duration > 1440 ||
              numericMaxParticipants ===
                null ||
              numericMaxParticipants <
                2 ||
              submitting
            }
          >
            {submitting
              ? "Sending invitations…"
              : "Schedule & Send Invitations"}
          </Button>

        </div>

      </div>

    </div>
  );
}

export default ScheduleMeetingPage;