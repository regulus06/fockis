import { useNotifications } from "../hooks/useNotifications";
import NotificationList from "../NotificationList";
import "../styles/notifications.scss";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  return (
    <main className="fockis-notifications-page">
      <div className="fockis-notifications-page__container">
        <header className="fockis-notifications-page__header">
          <div>
            <span className="fockis-eyebrow">FOCKIS</span>
            <h1>Notifications</h1>
            <p>
              Stay up to date with activity, connections, messages, and LIVE
              invitations.
            </p>
          </div>

          <div className="fockis-notifications-page__actions">
            <button type="button" onClick={() => void refresh()}>
              Refresh
            </button>
            <button type="button" onClick={markAllAsRead} disabled={!unreadCount}>
              Mark all as read
            </button>
          </div>
        </header>

        <div className="fockis-notifications-page__summary">
          <strong>{unreadCount}</strong>
          <span>unread notification{unreadCount === 1 ? "" : "s"}</span>
        </div>

        <section className="fockis-notifications-card">
          <NotificationList
            notifications={notifications}
            loading={loading}
            onMarkAsRead={markAsRead}
            onDelete={removeNotification}
          />
        </section>
      </div>
    </main>
  );
}
