import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bell, CheckCheck, ExternalLink, Search, Settings2 } from "lucide-react";

import { Pager, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery } from "../support/components/SmParts";
import { securityError } from "../security/securityAdminApi";
import {
  adminNotificationsApi,
  safeLink,
  type AdminNotificationItem,
  type NotificationCategory,
  type NotificationPreferences,
} from "./adminNotificationsApi";
import { setRealtimeToasts, startAdminNotifications, useAdminNotificationFeed } from "./adminNotificationFeed";
import { CATEGORY_META, CategoryIcon, PRIORITY_LABEL, timeAgo } from "./notificationMeta";

import "../support/styles/SupportMod.scss";
import "./AdminNotifications.scss";

const PAGE_SIZE = 20;

/**
 * /admin/notifications — every notification the administrator has
 * received, filtered on the server by their current permissions.
 */
export default function AdminNotificationsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const navigate = useNavigate();

  const version = useAdminNotificationFeed((s) => s.version);
  const refreshFeed = useAdminNotificationFeed((s) => s.refresh);

  useEffect(() => startAdminNotifications(), []);

  const filters = useMemo(
    () => ({
      status: (params.get("status") as "all" | "unread" | "read" | null) ?? "all",
      category: params.get("category") ?? "",
      priority: params.get("priority") ?? "",
      actionState: params.get("action") ?? "",
      search: params.get("search") ?? "",
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      page: Number(params.get("page") ?? 1) || 1,
    }),
    [params],
  );

  const query = useMemo(
    () => ({
      status: filters.status,
      category: filters.category || undefined,
      priority: filters.priority || undefined,
      actionState: filters.actionState || undefined,
      search: filters.search || undefined,
      from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
      to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
      page: filters.page,
      pageSize: PAGE_SIZE,
    }),
    [filters],
  );

  // Refetch when the filters change or a real-time update arrives.
  const list = useAdminQuery(() => adminNotificationsApi.list(query), [JSON.stringify(query), version]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  };

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
      await refreshFeed();
    } catch (error) {
      setActionError(securityError(error, "That didn't work. Try again."));
    }
  };

  const open = (item: AdminNotificationItem) => {
    if (!item.read) void adminNotificationsApi.markRead(item.id).then(() => refreshFeed()).catch(() => undefined);
    navigate(safeLink(item.link));
  };

  const data = list.data;
  const filtered = Boolean(filters.category || filters.priority || filters.actionState || filters.search || filters.from || filters.to || filters.status !== "all");

  return (
    <div className="fksm fkn-page">
      <header className="fkn-head">
        <div>
          <h1>Notifications</h1>
          <p>Alerts from security monitoring, account recovery, marketplace disputes, support and legal. Reading a notification never changes the case it points to.</p>
        </div>
        <div className="fkn-row__actions">
          <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setShowPrefs((v) => !v)} aria-expanded={showPrefs}>
            <Settings2 size={15} aria-hidden="true" /> Preferences
          </button>
          <button
            type="button"
            className="fksm-btn fksm-btn--primary fksm-btn--sm"
            disabled={!data?.unread}
            onClick={() => void run(() => adminNotificationsApi.markAllRead(filters.category || undefined))}
          >
            <CheckCheck size={15} aria-hidden="true" /> Mark all{filters.category ? ` ${CATEGORY_META[filters.category as NotificationCategory]?.label ?? ""}` : ""} as read
          </button>
        </div>
      </header>

      {showPrefs && <PreferencesCard />}

      {actionError && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {actionError}
        </p>
      )}

      <div className="fksm-card">
        <form
          className="fksm-filters fkn-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setFilter("search", search.trim());
          }}
        >
          <label className="fksm-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Search notifications" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search notifications" />
          </label>
          <select className="fksm-select" value={filters.status} onChange={(e) => setFilter("status", e.target.value === "all" ? "" : e.target.value)} aria-label="Read status">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select className="fksm-select" value={filters.category} onChange={(e) => setFilter("category", e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_META) as NotificationCategory[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORY_META[key].label}
              </option>
            ))}
          </select>
          <select className="fksm-select" value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)} aria-label="Priority">
            <option value="">Any priority</option>
            {(["critical", "high", "medium", "low"] as const).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <select className="fksm-select" value={filters.actionState} onChange={(e) => setFilter("action", e.target.value)} aria-label="Action">
            <option value="">Any action state</option>
            <option value="open">Needs action</option>
            <option value="resolved">Resolved</option>
            <option value="none">Information only</option>
          </select>
          <label className="fksec-date">
            <span>From</span>
            <input type="date" className="fksm-input" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
          </label>
          <label className="fksec-date">
            <span>To</span>
            <input type="date" className="fksm-input" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
          </label>
          <button type="submit" className="fksm-btn fksm-btn--secondary">
            Search
          </button>
        </form>

        {list.loading && !data ? (
          <SmLoading />
        ) : list.error ? (
          <SmError message={list.error} onRetry={() => void list.refetch()} />
        ) : !data?.items.length ? (
          <SmEmpty
            icon={<Bell size={22} />}
            title={filtered ? "Nothing matches" : "No notifications yet."}
            text={filtered ? "No notifications match these filters." : "Alerts appear here when something needs your attention."}
          />
        ) : (
          <>
            <ul className="fkn-list">
              {data.items.map((item) => (
                <li key={item.id} className={`fkn-row fkn-row--${item.priority}${item.read ? "" : " is-unread"}`}>
                  <CategoryIcon category={item.category} size={17} />
                  <div className="fkn-row__main">
                    <h3>
                      {!item.read && <span className="fk-notif-dot" aria-label="Unread" />}
                      {item.title}
                    </h3>
                    <p>{item.message}</p>
                    <div className="fkn-row__meta">
                      <span className={`fk-notif-sev fk-notif-sev--${item.priority}`}>{PRIORITY_LABEL[item.priority]}</span>
                      {item.actionState === "open" && <span className="fk-notif-sev fk-notif-sev--high">Needs action</span>}
                      {item.actionState === "resolved" && <span className="fk-notif-sev fk-notif-sev--resolved">Resolved</span>}
                      <span>{CATEGORY_META[item.category]?.label}</span>
                      <time dateTime={item.lastOccurredAt} title={formatDateTime(item.lastOccurredAt)}>
                        {timeAgo(item.lastOccurredAt)}
                      </time>
                      {item.occurrences > 1 && <span>Happened {item.occurrences} times since {formatDateTime(item.firstOccurredAt)}</span>}
                    </div>
                  </div>
                  <div className="fkn-row__actions">
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => open(item)}>
                      Open <ExternalLink size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="fksm-btn fksm-btn--secondary fksm-btn--sm"
                      onClick={() => void run(() => (item.read ? adminNotificationsApi.markUnread(item.id) : adminNotificationsApi.markRead(item.id)))}
                    >
                      Mark {item.read ? "unread" : "read"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <Pager
              page={data.page}
              total={data.total}
              hasMore={data.page < data.pages}
              onPage={(page) => {
                const next = new URLSearchParams(params);
                next.set("page", String(page));
                setParams(next, { replace: true });
              }}
            />
          </>
        )}
      </div>

      <p className="fksm-muted">
        Security alert thresholds are set in <Link to="/admin/security/login-protection">Security &amp; Identity → Login Protection</Link>.
      </p>
    </div>
  );
}

function PreferencesCard() {
  const prefs = useAdminQuery(() => adminNotificationsApi.preferences(), []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (prefs.data) setLocal(prefs.data);
  }, [prefs.data]);

  const save = async (next: NotificationPreferences) => {
    setLocal(next);
    setSaving(true);
    setError(null);
    try {
      const saved = await adminNotificationsApi.updatePreferences({ mutedCategories: next.mutedCategories, realtimeToasts: next.realtimeToasts });
      setLocal(saved);
      setRealtimeToasts(saved.realtimeToasts);
    } catch (err) {
      setError(securityError(err, "Couldn't save your preferences."));
      setLocal(prefs.data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fksm-card">
      <h2 className="fksm-card__title">Your notification preferences</h2>
      {prefs.loading && !local ? (
        <SmLoading />
      ) : prefs.error ? (
        <SmError message={prefs.error} onRetry={() => void prefs.refetch()} />
      ) : local ? (
        <div className="fkn-prefs">
          <p className="fksm-muted">Muted categories stop new low, medium and high notifications for you. Critical notifications are always delivered.</p>
          {local.categories.map((category) => {
            const muted = local.mutedCategories.includes(category);
            return (
              <label key={category}>
                <input
                  type="checkbox"
                  checked={!muted}
                  disabled={saving}
                  onChange={() =>
                    void save({
                      ...local,
                      mutedCategories: muted ? local.mutedCategories.filter((c) => c !== category) : [...local.mutedCategories, category],
                    })
                  }
                />
                {CATEGORY_META[category]?.label ?? category}
              </label>
            );
          })}
          <label>
            <input type="checkbox" checked={local.realtimeToasts} disabled={saving} onChange={() => void save({ ...local, realtimeToasts: !local.realtimeToasts })} />
            Pop-up alert for new high and critical notifications
          </label>
          {error && (
            <p className="fksm-notice fksm-notice--error" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
