import { Link } from "react-router-dom";
import type { AppNotification } from "../type/Notification";
import NotificationList from "./NotificationList";

interface NotificationDropdownProps {
  notifications: AppNotification[];
  loading: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRemove: (id: string) => void;
}

export default function NotificationDropdown({
  notifications,
  loading,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onRemove,
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <>
      <button
        type="button"
        className="fockis-notification-backdrop"
        aria-label="Close notifications"
        onClick={onClose}
      />

      <section className="fockis-notification-dropdown">
        <header className="fockis-notification-dropdown__header">
          <div>
            <h3>Notifications</h3>
            <span>{unreadCount} unread</span>
          </div>

          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
        </header>

        <NotificationList
          notifications={notifications.slice(0, 8)}
          loading={loading}
          compact
          onMarkAsRead={onMarkAsRead}
          onDelete={onRemove}
        />

        <Link
          to="/notifications"
          className="fockis-notification-dropdown__footer"
          onClick={onClose}
        >
          View all notifications
        </Link>
      </section>
    </>
  );
}
