import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";
import "../styles/notifications.scss";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const {
    unreadCount,
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  return (
    <div className="fockis-notifications">
      <button
        type="button"
        className="fockis-notification-bell"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="fockis-notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          onClose={() => setOpen(false)}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onRemove={removeNotification}
        />
      )}
    </div>
  );
}
