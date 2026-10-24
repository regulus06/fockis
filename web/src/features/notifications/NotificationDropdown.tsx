import { Link } from "react-router-dom";
import type { AppNotification } from "./type/Notificantion";
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
  return (
    <>
      <button
        type="button"
        className="fockis-notification-backdrop"
        aria-label="Close notifications"
        onClick={onClose}
      />

      <section className="fockis-notification-dropdown" aria-label="Notifications">
        <header className="fockis-notification-dropdown__header">
          <div>
            <h3>Notifications</h3>
            <span>{notifications.filter((item) => !item.read).length} unread</span>
          </div>

          <button type="button" onClick={onMarkAllAsRead}>
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
