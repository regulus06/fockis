import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { startAdminNotifications, useAdminNotificationFeed } from '../notifications/adminNotificationFeed';
import { safeLink } from '../notifications/adminNotificationsApi';
import { CategoryIcon, PRIORITY_LABEL, timeAgo } from '../notifications/notificationMeta';
import '../notifications/AdminNotifications.scss';

/**
 * Admin Center header bell. Shows the administrator's real notifications
 * (persisted by the backend, filtered by their permissions) and updates in
 * real time. Opening the panel does not mark anything as read.
 */
export function AdminNotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const titleId = useId();
  const navigate = useNavigate();

  const { unread, items, status, error, filter, setFilter, refresh, markRead, markAllRead } = useAdminNotificationFeed();

  useEffect(() => startAdminNotifications(), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const onPanelKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const rows = Array.from(list.current?.querySelectorAll<HTMLElement>('[data-notif-row]') ?? []);
      if (!rows.length) return;
      event.preventDefault();
      const index = rows.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'ArrowDown' ? Math.min(rows.length - 1, index + 1) : Math.max(0, index - 1);
      rows[index === -1 ? 0 : next]?.focus();
    }
  };

  const openItem = (id: string, link: string, read: boolean) => {
    if (!read) void markRead(id);
    setOpen(false);
    navigate(safeLink(link));
  };

  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <div className="fk-menu-wrap" ref={ref}>
      <button
        ref={button}
        type="button"
        className="fk-icon-btn fk-icon-btn--bell"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell size={21} aria-hidden="true" />
        {unread > 0 && <span className="fk-icon-btn__badge">{badge}</span>}
      </button>
      {open && (
        <div className="fk-notif-panel" role="dialog" aria-labelledby={titleId} onKeyDown={onPanelKey}>
          <div className="fk-notif-panel__header">
            <span id={titleId}>Notifications</span>
            <span className={`fk-badge ${unread > 0 ? 'fk-badge--warning' : 'fk-badge--neutral'}`} aria-label={`${unread} unread`}>
              {badge}
            </span>
          </div>

          <div className="fk-notif-panel__tools">
            <div className="fk-notif-tabs" role="tablist" aria-label="Show">
              {(['all', 'unread'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  className={filter === value ? 'is-active' : ''}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : 'Unread'}
                </button>
              ))}
            </div>
            <button type="button" className="fk-notif-link" onClick={() => void markAllRead()} disabled={unread === 0}>
              <CheckCheck size={14} aria-hidden="true" /> Mark all as read
            </button>
          </div>

          {status === 'loading' && !items.length ? (
            <div className="fk-notif-state" role="status">Loading notifications…</div>
          ) : status === 'error' ? (
            <div className="fk-notif-state" role="alert">
              {error ?? "Couldn't load notifications."}{' '}
              <button type="button" className="fk-notif-link" onClick={() => void refresh()}>
                Try again
              </button>
            </div>
          ) : !items.length ? (
            <div className="fk-notif-state">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</div>
          ) : (
            <ul className="fk-notif-list" ref={list}>
              {items.map((n) => (
                <li key={n.id} className={`fk-notif-item ${n.read ? '' : 'unread'} fk-notif-item--${n.priority}`}>
                  <div
                    className="fk-notif-item__row"
                    role="link"
                    tabIndex={0}
                    data-notif-row
                    onClick={() => openItem(n.id, n.link, n.read)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openItem(n.id, n.link, n.read);
                      }
                    }}
                  >
                    <CategoryIcon category={n.category} />
                    <div className="fk-notif-item__body">
                      <div className="fk-notif-item__title">
                        {!n.read && <span className="fk-notif-dot" aria-label="Unread" />}
                        {n.title}
                      </div>
                      <div className="fk-notif-item__msg">{n.message}</div>
                      <div className="fk-notif-item__time">
                        <time dateTime={n.lastOccurredAt} title={new Date(n.lastOccurredAt).toLocaleString()}>
                          {timeAgo(n.lastOccurredAt)}
                        </time>
                        {(n.priority === 'high' || n.priority === 'critical') && (
                          <span className={`fk-notif-sev fk-notif-sev--${n.priority}`}>{PRIORITY_LABEL[n.priority]}</span>
                        )}
                        {n.actionState === 'resolved' && <span className="fk-notif-sev fk-notif-sev--resolved">Resolved</span>}
                        {n.occurrences > 1 && <span className="fk-notif-count">×{n.occurrences}</span>}
                      </div>
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      className="fk-notif-item__read"
                      onClick={() => void markRead(n.id)}
                      aria-label={`Mark "${n.title}" as read`}
                      title="Mark as read"
                    >
                      <Check size={14} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="fk-notif-panel__footer">
            <Link to="/admin/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
