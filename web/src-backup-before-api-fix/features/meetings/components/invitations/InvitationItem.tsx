import { useState } from "react";

import {
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { Avatar } from "../common/Avatar";
import { Button } from "../common/Button";

import type {
  Meeting,
  MeetingInvitation,
} from "../../types";

import { MEETING_ROUTES } from "../../constants";

import "../../styles/components/invitations.scss";

interface InvitationItemProps {
  meeting: Meeting;
  invitation?: MeetingInvitation;
  onAccepted?: (
    meeting: Meeting,
  ) => void;
  onDeclined?: (
    meeting: Meeting,
  ) => void;
}

function formatDate(
  value?: string,
): string {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(
  value?: string,
): string {
  if (!value) {
    return "Time unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(
  minutes?: number,
): string {
  const value = Number(minutes);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "Duration unavailable";
  }

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);

  const remaining = value % 60;

  if (remaining === 0) {
    return `${hours} ${
      hours === 1 ? "hour" : "hours"
    }`;
  }

  return `${hours}h ${remaining}m`;
}

export function InvitationItem({
  meeting,
  invitation,
  onAccepted,
  onDeclined,
}: InvitationItemProps) {
  const navigate = useNavigate();

  const [processing, setProcessing] =
    useState<
      "accept" | "decline" | null
    >(null);

  const [error, setError] =
    useState<string | null>(null);

  const hostName =
    meeting.hostName?.trim() ||
    invitation?.invitedBy?.trim() ||
    "Meeting host";

  const topic =
    meeting.topic?.trim() ||
    "Untitled meeting";

  const handleAccept = async () => {
    setError(null);
    setProcessing("accept");

    try {
      /*
       * Accepting the invitation is handled by
       * the parent/API layer.
       *
       * After acceptance, send the user to
       * the meeting lobby rather than using
       * MEETING_ROUTES.join(), because the
       * current route constants expose lobby()
       * and room(), not join().
       */
      onAccepted?.(meeting);

      navigate(
        MEETING_ROUTES.lobby(
          meeting.id,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open this meeting.",
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async () => {
    setError(null);
    setProcessing("decline");

    try {
      onDeclined?.(meeting);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to decline this invitation.",
      );
    } finally {
      setProcessing(null);
    }
  };

  return (
    <article className="fm-invite-item">
      <div className="fm-invite-item__avatar">
        <Avatar
          name={hostName}
          size="md"
        />
      </div>

      <div className="fm-invite-item__info">
        <div className="fm-invite-item__top">
          <div>
            <div className="fm-invite-item__title">
              {topic}
            </div>

            <div className="fm-invite-item__meta">
              <UserRound size={13} />

              <span>
                Hosted by {hostName}
              </span>
            </div>
          </div>

          <span className="fm-invite-item__badge">
            Invitation
          </span>
        </div>

        <div className="fm-invite-item__details">
          <span>
            <CalendarDays size={14} />

            {formatDate(
              meeting.startTime,
            )}
          </span>

          <span>
            <Clock3 size={14} />

            {formatTime(
              meeting.startTime,
            )}
          </span>

          <span>
            <Clock3 size={14} />

            {formatDuration(
              meeting.durationMinutes,
            )}
          </span>

          {meeting.participantCount !==
            undefined && (
            <span>
              <Users size={14} />

              {meeting.participantCount}
            </span>
          )}
        </div>

        {meeting.description && (
          <p className="fm-invite-item__description">
            {meeting.description}
          </p>
        )}

        {error && (
          <div className="fm-invite-item__error">
            {error}
          </div>
        )}
      </div>

      <div className="fm-invite-item__actions">
        <Button
          size="sm"
          variant="primary"
          icon={
            processing === "accept" ? (
              <span className="fm-button-spinner" />
            ) : (
              <Check size={14} />
            )
          }
          disabled={processing !== null}
          onClick={() => {
            void handleAccept();
          }}
        >
          {processing === "accept"
            ? "Opening..."
            : "Accept & Join"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          icon={
            processing === "decline" ? (
              <span className="fm-button-spinner" />
            ) : (
              <X size={14} />
            )
          }
          disabled={processing !== null}
          onClick={() => {
            void handleDecline();
          }}
        >
          {processing === "decline"
            ? "Removing..."
            : "Decline"}
        </Button>

        <button
          type="button"
          className="fm-invite-item__details-link"
          onClick={() =>
            navigate(
              MEETING_ROUTES.details(
                meeting.id,
              ),
            )
          }
        >
          <ExternalLink size={13} />

          Details
        </button>
      </div>
    </article>
  );
}

export default InvitationItem;