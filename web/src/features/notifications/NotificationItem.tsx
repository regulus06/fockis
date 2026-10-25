import {
  Bell,
  Check,
  Heart,
  MessageCircle,
  Radio,
  UserPlus,
  X,
} from "lucide-react";
import type { AppNotification } from "./type/Notificantion";
import LiveGuestInvitation from "./LiveGuestInvitation";

interface NotificationItemProps {
  notification: AppNotification;
  compact?: boolean;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function getIcon(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("guest") || normalized.includes("live")) return <Radio size={19} />;
  if (normalized.includes("like")) return <Heart size={19} />;
  if (normalized.includes("comment")) return <MessageCircle size={19} />;
  if (normalized.includes("follow") || normalized.includes("friend")) return <UserPlus size={19} />;

  return <Bell size={19} />;
}

export default function NotificationItem({
  notification,
  compact = false,
  onRead,
  onDelete,
}: NotificationItemProps) {
  const isGuestInvitation =
    notification.type.toLowerCase().includes("guest") ||
    notification.type.toLowerCase().includes("live_guest");

  const handleOpen = () => {
    if (!notification.read) {
      void onRead(notification._id);
    }

    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  if (isGuestInvitation) {
    return (
      <div
        className={`fockis-notification-item ${
          notification.read ? "" : "is-unread"
        } ${compact ? "is-compact" : ""}`}
      >
        <LiveGuestInvitation
          notification={notification}
          onAccept={handleOpen}
          onDecline={() => void onRead(notification._id)}
        />

        <button
          type="button"
          className="fockis-notification-delete"
          aria-label="Delete notification"
          onClick={() => void onDelete(notification._id)}
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <article
      className={`fockis-notification-item ${
        notification.read ? "" : "is-unread"
      } ${compact ? "is-compact" : ""}`}
      onClick={handleOpen}
    >
      <div className="fockis-notification-item__icon">{getIcon(notification.type)}</div>

      <div className="fockis-notification-item__body">
        <div className="fockis-notification-item__top">
          <strong>{notification.title}</strong>
          {!notification.read && <span className="fockis-notification-dot" />}
        </div>

        <p>{notification.message}</p>

        {notification.createdAt && (
          <time dateTime={notification.createdAt}>
            {new Date(notification.createdAt).toLocaleString()}
          </time>
        )}
      </div>

      <button
        type="button"
        className="fockis-notification-read"
        aria-label={notification.read ? "Read notification" : "Mark as read"}
        onClick={(event) => {
          event.stopPropagation();
          if (!notification.read) void onRead(notification._id);
        }}
      >
        <Check size={15} />
      </button>

      <button
        type="button"
        className="fockis-notification-delete"
        aria-label="Delete notification"
        onClick={(event) => {
          event.stopPropagation();
          void onDelete(notification._id);
        }}
      >
        <X size={15} />
      </button>
    </article>
  );
}
