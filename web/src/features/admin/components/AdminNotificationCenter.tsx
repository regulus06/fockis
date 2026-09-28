import { useEffect, useRef, useState } from 'react';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminNotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useAdminNotificationStore((s) => s.notifications);
  const markAllRead = useAdminNotificationStore((s) => s.markAllRead);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="fk-menu-wrap" ref={ref}>
      <button
        className="fk-icon-btn"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllRead();
        }}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && <span className="fk-icon-btn__badge">{unread}</span>}
      </button>
      {open && (
        <div className="fk-notif-panel">
          <div className="fk-notif-panel__header">
            <span>Notifications</span>
            <span className="fk-badge fk-badge--neutral">{notifications.length}</span>
          </div>
          {notifications.map((n) => (
            <div key={n.id} className={`fk-notif-item ${n.read ? '' : 'unread'}`}>
              <div className="fk-notif-item__title">{n.title}</div>
              <div className="fk-notif-item__msg">{n.message}</div>
              <div className="fk-notif-item__time">{timeAgo(n.timestamp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
