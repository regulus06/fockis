import type { AppNotification } from "./type/Notificantion";
import NotificationItem from "./NotificationItem";

interface NotificationListProps {
  notifications: AppNotification[];
  loading?: boolean;
  compact?: boolean;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NotificationList({
  notifications,
  loading = false,
  compact = false,
  onMarkAsRead,
  onDelete,
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="fockis-notification-list fockis-notification-list--loading">
        {[1, 2, 3].map((item) => (
          <div className="fockis-notification-skeleton" key={item}>
            <span />
            <div>
              <b />
              <i />
              <i />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="fockis-notification-empty">
        <span className="fockis-notification-empty__icon">🔔</span>
        <h3>No notifications</h3>
        <p>You're all caught up.</p>
      </div>
    );
  }

  return (
    <div className="fockis-notification-list">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification._id}
          notification={notification}
          compact={compact}
          onRead={onMarkAsRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
