import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users2 } from "lucide-react";

import { useMeetingsStore } from "../store/meetingsStore";

import { AttendanceRow } from "../components/attendance/AttendanceRow";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";

import { MEETING_ROUTES } from "../constants";

import type {
  AttendanceRecord,
  AttendanceStatus,
} from "../types";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/attendance.scss";

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function normalizeAttendanceStatus(
  value: unknown,
): AttendanceStatus {
  switch (value) {
    case "present":
      return "present";

    case "late":
      return "late";

    case "absent":
      return "absent";

    /*
     * "left" is a meeting participant lifecycle state,
     * but it is not part of the shared AttendanceStatus type.
     *
     * For attendance reporting, a participant who has left
     * is still considered attended, so preserve the attendance
     * as "present".
     */
    case "left":
      return "present";

    default:
      return "absent";
  }
}

function getParticipantId(
  participant: unknown,
): string {
  if (
    participant &&
    typeof participant === "object"
  ) {
    const value =
      participant as {
        id?: unknown;
        _id?: unknown;
        userId?: unknown;
      };

    return String(
      value.userId ??
        value.id ??
        value._id ??
        "",
    ).trim();
  }

  return "";
}

function getParticipantName(
  participant: unknown,
): string {
  if (
    participant &&
    typeof participant === "object"
  ) {
    const value =
      participant as {
        displayName?: unknown;
        name?: unknown;
        username?: unknown;
        firstName?: unknown;
        lastName?: unknown;
        user?: unknown;
      };

    if (
      typeof value.displayName ===
      "string" &&
      value.displayName.trim()
    ) {
      return value.displayName.trim();
    }

    if (
      typeof value.name ===
      "string" &&
      value.name.trim()
    ) {
      return value.name.trim();
    }

    if (
      typeof value.username ===
      "string" &&
      value.username.trim()
    ) {
      return value.username.trim();
    }

    const firstName =
      typeof value.firstName ===
      "string"
        ? value.firstName.trim()
        : "";

    const lastName =
      typeof value.lastName ===
      "string"
        ? value.lastName.trim()
        : "";

    const fullName = [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fullName) {
      return fullName;
    }

    if (
      value.user &&
      typeof value.user ===
        "object"
    ) {
      const user =
        value.user as {
          displayName?: unknown;
          name?: unknown;
          username?: unknown;
          firstName?: unknown;
          lastName?: unknown;
        };

      if (
        typeof user.displayName ===
          "string" &&
        user.displayName.trim()
      ) {
        return user.displayName.trim();
      }

      if (
        typeof user.name ===
          "string" &&
        user.name.trim()
      ) {
        return user.name.trim();
      }

      if (
        typeof user.username ===
          "string" &&
        user.username.trim()
      ) {
        return user.username.trim();
      }

      const userFullName = [
        typeof user.firstName ===
        "string"
          ? user.firstName.trim()
          : "",
        typeof user.lastName ===
        "string"
          ? user.lastName.trim()
          : "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (userFullName) {
        return userFullName;
      }
    }
  }

  return "Fockis user";
}

function getParticipantStatus(
  participant: unknown,
): AttendanceStatus {
  if (
    participant &&
    typeof participant ===
      "object"
  ) {
    const value =
      participant as {
        attendanceStatus?: unknown;
        status?: unknown;
        attendance?: unknown;
      };

    return normalizeAttendanceStatus(
      value.attendanceStatus ??
        value.status ??
        value.attendance,
    );
  }

  return "absent";
}

/* ============================================================================
 * CONVERT PARTICIPANT → ATTENDANCE RECORD
 * ========================================================================== */

function toAttendanceRecord(
  participant: unknown,
  index: number,
): AttendanceRecord {
  const id =
    getParticipantId(
      participant,
    );

  const name =
    getParticipantName(
      participant,
    );

  const status =
    getParticipantStatus(
      participant,
    );

  return {
    userId:
      id ||
      `participant-${index}`,

    userName:
      name,

    status:
      status,
  };
}

/* ============================================================================
 * ATTENDANCE RATE
 * ========================================================================== */

function computeAttendanceRate(
  records: AttendanceRecord[],
): number {
  if (records.length === 0) {
    return 0;
  }

  const attended =
    records.filter(
      (record) =>
        record.status ===
          "present" ||
        record.status ===
          "late",
    ).length;

  return Math.round(
    (attended /
      records.length) *
      100,
  );
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export function MeetingAttendancePage() {
  const { id } =
    useParams<{
      id: string;
    }>();

  const meeting =
    useMeetingsStore((state) =>
      state.getById(id ?? ""),
    );

  /* --------------------------------------------------------------------------
   * MEETING NOT FOUND
   * ------------------------------------------------------------------------ */

  if (!meeting) {
    return (
      <div className="fockis-meetings-root fm-page fm-page--light">
        <div className="fm-subpage">
          <EmptyState
            title="Meeting not found"
            description="This meeting may have been cancelled or the link is incorrect."
          />
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
   * PARTICIPANTS
   * ------------------------------------------------------------------------ */

  const participants =
    Array.isArray(
      meeting.participants,
    )
      ? meeting.participants
      : [];

  /* --------------------------------------------------------------------------
   * ATTENDANCE RECORDS
   * ------------------------------------------------------------------------ */

  const attendanceRecords =
    participants.map(
      (
        participant,
        index,
      ) =>
        toAttendanceRecord(
          participant,
          index,
        ),
    );

  const rate =
    computeAttendanceRate(
      attendanceRecords,
    );

  /* --------------------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------------------ */

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">
      <div className="fm-subpage">

        {/* ------------------------------------------------------------------
         * BACK
         * ---------------------------------------------------------------- */}

        <Link
          to={MEETING_ROUTES.details(
            id ?? "",
          )}
          className="fm-back-link"
        >
          <ArrowLeft size={14} />
          Back to meeting
        </Link>

        {/* ------------------------------------------------------------------
         * HEADER
         * ---------------------------------------------------------------- */}

        <div className="fm-subpage-header">
          <div>
            <h1>Attendance</h1>

            <p
              style={{
                color:
                  "#5b5f76",
                marginTop: 6,
              }}
            >
              {meeting.topic}
            </p>
          </div>

          <Badge
            tone={
              rate >= 75
                ? "success"
                : rate >= 50
                  ? "warning"
                  : "danger"
            }
          >
            {rate}% present
          </Badge>
        </div>

        {/* ------------------------------------------------------------------
         * ATTENDANCE LIST
         * ---------------------------------------------------------------- */}

        {attendanceRecords.length ===
        0 ? (
          <EmptyState
            icon={
              <Users2
                size={28}
              />
            }
            title="No attendance recorded"
            description="Attendance is captured automatically once participants join this meeting."
          />
        ) : (
          <div
            className="fm-details-card"
            style={{
              padding: 0,
            }}
          >
            {attendanceRecords.map(
              (
                record,
                index,
              ) => (
                <AttendanceRow
                  key={`${record.userId}-${index}`}
                  record={
                    record
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingAttendancePage;