import { api } from "../../../api/api";

/* ============================================================================
   ADMIN NOTIFICATIONS — API

   Notifications are created by the backend from real events only. The
   backend also decides who receives each one (RBAC) and filters every read
   by the administrator's current permissions.
============================================================================ */

export type NotificationCategory = "security" | "accounts" | "marketplace" | "support" | "legal" | "system";
export type NotificationPriority = "low" | "medium" | "high" | "critical";
export type NotificationActionState = "none" | "open" | "resolved";

export interface AdminNotificationItem {
  id: string;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  /** Built and validated by the server (internal /admin path only). */
  link: string;
  entityType: string;
  entityId: string;
  actionState: NotificationActionState;
  resolvedAt: string | null;
  read: boolean;
  readAt: string | null;
  occurrences: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface NotificationPage {
  items: AdminNotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  unread: number;
  categories: NotificationCategory[];
}

export interface NotificationQuery {
  status?: "all" | "unread" | "read";
  category?: string;
  priority?: string;
  actionState?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface NotificationPreferences {
  mutedCategories: NotificationCategory[];
  realtimeToasts: boolean;
  categories: NotificationCategory[];
  criticalAlwaysDelivered: boolean;
}

const BASE = "/admin/notifications";

function clean(query: NotificationQuery): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== null) out[key] = value as string | number;
  }
  return out;
}

export const adminNotificationsApi = {
  async list(query: NotificationQuery = {}): Promise<NotificationPage> {
    return (await api.get(BASE, { params: clean(query) })).data;
  },

  async unreadCount(): Promise<number> {
    return Number((await api.get(`${BASE}/unread-count`)).data?.unread ?? 0);
  },

  async get(id: string): Promise<AdminNotificationItem> {
    return (await api.get(`${BASE}/${encodeURIComponent(id)}`)).data;
  },

  async markRead(id: string): Promise<AdminNotificationItem & { unread: number }> {
    return (await api.patch(`${BASE}/${encodeURIComponent(id)}/read`)).data;
  },

  async markUnread(id: string): Promise<AdminNotificationItem & { unread: number }> {
    return (await api.patch(`${BASE}/${encodeURIComponent(id)}/unread`)).data;
  },

  async markAllRead(category?: string): Promise<{ updated: number; unread: number }> {
    return (await api.patch(`${BASE}/read-all`, category ? { category } : {})).data;
  },

  async preferences(): Promise<NotificationPreferences> {
    return (await api.get(`${BASE}/preferences`)).data;
  },

  async updatePreferences(input: { mutedCategories?: string[]; realtimeToasts?: boolean }): Promise<NotificationPreferences> {
    return (await api.patch(`${BASE}/preferences`, input)).data;
  },
};

/** Only follow links that are internal Admin Center paths. */
export function safeLink(link: string | null | undefined): string {
  const value = String(link ?? "");
  return /^\/admin\/[A-Za-z0-9/_\-?=&.%]*$/.test(value) && !value.includes("//") && !value.includes("..")
    ? value
    : "/admin/notifications";
}
