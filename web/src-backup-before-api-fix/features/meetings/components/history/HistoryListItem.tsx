import {
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Users,
  Video,
  XCircle,
} from "lucide-react";

import { Link } from "react-router-dom";

import type { Meeting } from "../../types";

import { Button } from "../common/Button";

import { MEETING_ROUTES } from "../../constants";

import "../../styles/components/history.scss";

interface HistoryListItemProps {
  meeting: Meeting;
}

function getDate(
  value?: string,
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(
  value?: string,
): string {
  const date = getDate(value);

  if (!date) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );
}

function formatTime(
  value?: string,
): string {
  const date = getDate(value);

  if (!date) {
    return "Time unavailable";
  }

  return date.toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function formatDuration(
  minutes?: number,
): string {
  const value = Number(minutes);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "—";
  }

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(
    value / 60,
  );

  const remaining =
    value % 60;

  return remaining === 0
    ? `${hours}h`
    : `${hours}h ${remaining}m`;
}

function getStatusLabel(
  status?: string,
): string {
  const normalized = String(
    status ?? "",
  )
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "cancelled":
      return "Cancelled";

    case "completed":
      return "Completed";

    case "ended":
      return "Ended";

    default:
      return "Past meeting";
  }
}

export function HistoryListItem({
  meeting,
}: HistoryListItemProps) {
  const cancelled =
    String(meeting.status ?? "")
      .trim()
      .toLowerCase() === "cancelled";

  return (
    <article
      className={[
        "fm-history-item",
        cancelled
          ? "fm-history-item--cancelled"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="fm-history-item__icon">
        {cancelled ? (
          <XCircle size={19} />
        ) : (
          <Video size={19} />
        )}
      </div>

      <div className="fm-history-item__main">
        <div className="fm-history-item__heading">
          <div>
            <span className="fm-history-item__status">
              {getStatusLabel(
                meeting.status,
              )}
            </span>

            <h4>
              {meeting.topic ||
                "Untitled meeting"}
            </h4>
          </div>
        </div>

        <div className="fm-history-item__meta">
          <span>
            <CalendarDays size={13} />
            {formatDate(
              meeting.startTime,
            )}
          </span>

          <span>
            <Clock3 size={13} />
            {formatTime(
              meeting.startTime,
            )}
          </span>

          <span>
            <Clock3 size={13} />
            {formatDuration(
              meeting.durationMinutes,
            )}
          </span>

          {meeting.participantCount !==
            undefined && (
            <span>
              <Users size={13} />
              {meeting.participantCount}
            </span>
          )}
        </div>
      </div>

      <div className="fm-history-item__actions">
        {!cancelled && (
          <Link
            to={MEETING_ROUTES.summary(
              meeting.id,
            )}
          >
            <Button
              variant="secondary"
              size="sm"
              icon={
                <FileText size={14} />
              }
            >
              Summary
            </Button>
          </Link>
        )}

        <Link
          to={MEETING_ROUTES.details(
            meeting.id,
          )}
          className="fm-history-item__details"
          aria-label={`View ${
            meeting.topic ||
            "meeting"
          } details`}
        >
          <ChevronRight size={18} />
        </Link>
      </div>
    </article>
  );
}

export default HistoryListItem;