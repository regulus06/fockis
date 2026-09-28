import { Calendar, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import type { Meeting } from "../../types";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Avatar } from "../common/Avatar";
import { MEETING_ROUTES } from "../../constants";
import "../../styles/components/dashboard.scss";

function formatTimeRange(meeting: Meeting) {
  const start = new Date(meeting.startTime);

  const end = meeting.endTime
    ? new Date(meeting.endTime)
    : new Date(
        start.getTime() +
          (meeting.durationMinutes ?? 0) * 60 * 1000,
      );

  const fmt = (date: Date) =>
    date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  return `${fmt(start)} – ${fmt(end)}`;
}

function dayLabel(meeting: Meeting) {
  const start = new Date(meeting.startTime);
  const today = new Date();

  if (start.toDateString() === today.toDateString()) {
    return "Today";
  }

  return start.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function MeetingCard({
  meeting,
  compact = false,
}: {
  meeting: Meeting;
  compact?: boolean;
}) {
  /*
   * The backend may not return participants on
   * meeting-list responses.
   *
   * Normalize the value before using .slice()
   * or .map().
   */
  const participants = Array.isArray(
    meeting.participants,
  )
    ? meeting.participants
    : [];

  const participantCount =
    typeof meeting.participantCount === "number"
      ? meeting.participantCount
      : participants.length;

  return (
    <div
      className={`fm-meeting-card ${
        compact
          ? "fm-meeting-card--compact"
          : ""
      }`}
    >
      {/* ================================================================
          TOP
      ================================================================= */}

      <div className="fm-meeting-card__top">
        <div className="fm-meeting-card__title-row">
          <h3 className="fm-meeting-card__title">
            {meeting.topic || "Untitled meeting"}
          </h3>

          {meeting.status === "live" && (
            <Badge tone="live" dot>
              Live
            </Badge>
          )}

          {meeting.status === "late" && (
            <Badge tone="warning">
              Running late
            </Badge>
          )}
        </div>

        <div className="fm-meeting-card__meta">
          <span className="fm-meeting-card__meta-item">
            <Calendar size={14} />

            {dayLabel(meeting)}

            {" · "}

            {formatTimeRange(meeting)}
          </span>
        </div>
      </div>

      {/* ================================================================
          BOTTOM
      ================================================================= */}

      <div className="fm-meeting-card__bottom">
        <div className="fm-meeting-card__people">
          <div className="fm-meeting-card__avatars">
            {participants
              .slice(0, 4)
              .map((participant) => (
                <Avatar
                  key={participant.id}
                  name={
                    participant.displayName ||
                    "Fockis User"
                  }
                  size="sm"
                  imageUrl={
                    participant.avatarUrl ??
                    undefined
                  }
                />
              ))}
          </div>

          <span className="fm-meeting-card__count">
            <Users size={13} />
            {participantCount}
          </span>
        </div>

        {/* ==============================================================
            ACTIONS
        ============================================================== */}

        <div className="fm-meeting-card__actions">
          <Link
            to={MEETING_ROUTES.details(
              meeting.id,
            )}
          >
            <Button
              variant="secondary"
              size="sm"
            >
              Details
            </Button>
          </Link>

          <Link
            to={
              meeting.status === "live"
                ? MEETING_ROUTES.room(
                    meeting.id,
                  )
                : MEETING_ROUTES.lobby(
                    meeting.id,
                  )
            }
          >
            <Button
              variant="primary"
              size="sm"
              icon={<Clock size={14} />}
            >
              Join
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}