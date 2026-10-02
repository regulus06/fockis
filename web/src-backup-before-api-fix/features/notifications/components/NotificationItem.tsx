import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Bell,
  Check,
  Heart,
  MessageCircle,
  Radio,
  UserPlus,
  X,
} from "lucide-react";

import type { AppNotification } from "../type/Notification";
import LiveGuestInvitation from "./LiveGuestInvitation";

import { api } from "../../../my-live/api";

interface NotificationItemProps {
  notification: AppNotification;
  compact?: boolean;
  onRead: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

interface AcceptedGuestInvitation {
  invitationId: string;
  streamId: string;
  hostId?: string;
  acceptedAt: string;
}

const ACCEPTED_GUEST_INVITATION_KEY =
  "fockis:live:accepted-guest-invitation";

function getIcon(type: string) {
  const normalized = type.toLowerCase();

  if (
    normalized.includes("guest") ||
    normalized.includes("live")
  ) {
    return <Radio size={19} />;
  }

  if (normalized.includes("like")) {
    return <Heart size={19} />;
  }

  if (normalized.includes("comment")) {
    return <MessageCircle size={19} />;
  }

  if (
    normalized.includes("follow") ||
    normalized.includes("friend")
  ) {
    return <UserPlus size={19} />;
  }

  return <Bell size={19} />;
}

export default function NotificationItem({
  notification,
  compact = false,
  onRead,
  onDelete,
}: NotificationItemProps) {
  const navigate = useNavigate();

  const type = String(notification.type || "").toLowerCase();

  const isGuestInvitation =
    type.includes("guest") ||
    type.includes("live_guest") ||
    type === "live:guest-invite";

  const [busy, setBusy] = useState(false);

  const openNotification = () => {
    if (!notification.read) {
      void onRead(notification._id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const acceptGuestInvitation = async () => {
    if (busy) {
      return;
    }

    const invitationId = String(
      notification.entityId || "",
    ).trim();

    if (!invitationId) {
      console.error(
        "[FOCKIS LIVE] Guest invitation notification is missing entityId.",
      );

      openNotification();
      return;
    }

    const streamIdFromLink =
      notification.link
        ?.match(/\/my-live\/([^/?#]+)/)?.[1] || "";

    const streamId = String(streamIdFromLink).trim();

    if (!streamId) {
      console.error(
        "[FOCKIS LIVE] Guest invitation notification is missing streamId.",
      );

      openNotification();
      return;
    }

    try {
      setBusy(true);

      await api.respondToGuestInvitation(
        invitationId,
        "accepted",
      );

      const acceptedInvitation: AcceptedGuestInvitation = {
        invitationId,
        streamId,
        hostId: notification.senderId,
        acceptedAt: new Date().toISOString(),
      };

      sessionStorage.setItem(
        ACCEPTED_GUEST_INVITATION_KEY,
        JSON.stringify(acceptedInvitation),
      );

      if (!notification.read) {
        await onRead(notification._id);
      }

      navigate(`/my-live/${streamId}`);
    } catch (error) {
      console.error(
        "[FOCKIS LIVE] Failed to accept guest invitation:",
        error,
      );
    } finally {
      setBusy(false);
    }
  };

  const declineGuestInvitation = async () => {
    if (busy) {
      return;
    }

    const invitationId = String(
      notification.entityId || "",
    ).trim();

    if (!invitationId) {
      await onRead(notification._id);
      return;
    }

    try {
      setBusy(true);

      await api.respondToGuestInvitation(
        invitationId,
        "declined",
      );

      await onRead(notification._id);
    } catch (error) {
      console.error(
        "[FOCKIS LIVE] Failed to decline guest invitation:",
        error,
      );
    } finally {
      setBusy(false);
    }
  };

  if (isGuestInvitation) {
    return (
      <article
        className={`fockis-notification-item ${
          notification.read ? "" : "is-unread"
        } ${compact ? "is-compact" : ""}`}
      >
        <LiveGuestInvitation
          notification={notification}
          onAccept={() => {
            void acceptGuestInvitation();
          }}
          onDecline={() => {
            void declineGuestInvitation();
          }}
        />

        {busy && (
          <div className="fockis-notification-item__loading">
            Processing...
          </div>
        )}

        <button
          type="button"
          className="fockis-notification-delete"
          onClick={() => void onDelete(notification._id)}
          aria-label="Delete notification"
          disabled={busy}
        >
          <X size={15} />
        </button>
      </article>
    );
  }

  return (
    <article
      className={`fockis-notification-item ${
        notification.read ? "" : "is-unread"
      } ${compact ? "is-compact" : ""}`}
      onClick={openNotification}
    >
      <div className="fockis-notification-item__icon">
        {getIcon(notification.type)}
      </div>

      <div className="fockis-notification-item__body">
        <div className="fockis-notification-item__top">
          <strong>{notification.title}</strong>

          {!notification.read && (
            <span className="fockis-notification-dot" />
          )}
        </div>

        <p>{notification.message}</p>

        {notification.createdAt && (
          <time dateTime={notification.createdAt}>
            {new Date(
              notification.createdAt,
            ).toLocaleString()}
          </time>
        )}
      </div>

      <button
        type="button"
        className="fockis-notification-read"
        onClick={(event) => {
          event.stopPropagation();

          if (!notification.read) {
            void onRead(notification._id);
          }
        }}
        aria-label="Mark as read"
      >
        <Check size={15} />
      </button>

      <button
        type="button"
        className="fockis-notification-delete"
        onClick={(event) => {
          event.stopPropagation();
          void onDelete(notification._id);
        }}
        aria-label="Delete notification"
        disabled={busy}
      >
        <X size={15} />
      </button>
    </article>
  );
}