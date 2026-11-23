// ============================================================================
// ADMIN NOTIFICATIONS — SHARED TYPES
//
// Any module raises an admin notification by emitting ADMIN_NOTIFICATION_EVENT
// on the global EventEmitter2 with an AdminNotificationEvent payload. The
// admin notifications module resolves recipients from real RBAC permissions,
// stores one record per recipient and pushes it over the authenticated
// /admin-notifications socket namespace.
// ============================================================================

export const ADMIN_NOTIFICATION_EVENT = "admin.notification";
export const ADMIN_NOTIFICATION_RESOLVED_EVENT = "admin.notification.resolved";
/** Emitted whenever an account's sessions are revoked (sockets are closed). */
export const SESSIONS_REVOKED_EVENT = "security.sessions.revoked";

export const ADMIN_NOTIFICATION_CATEGORIES = [
  "security",
  "accounts",
  "marketplace",
  "support",
  "legal",
  "system",
] as const;

export type AdminNotificationCategory =
  (typeof ADMIN_NOTIFICATION_CATEGORIES)[number];

export const ADMIN_NOTIFICATION_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type AdminNotificationPriority =
  (typeof ADMIN_NOTIFICATION_PRIORITIES)[number];

export const PRIORITY_RANK: Record<AdminNotificationPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export type AdminNotificationActionState = "none" | "open" | "resolved";

export interface AdminNotificationEvent {
  /** Machine type, e.g. "security.login_pattern". */
  type: string;
  category: AdminNotificationCategory;
  priority: AdminNotificationPriority;
  title: string;
  message: string;
  /**
   * Same groupKey = same notification (escalated / re-counted, never
   * duplicated). Usually "<entityType>:<entityId>".
   */
  groupKey: string;
  entityType: string;
  entityId: string;
  /** Internal admin path only (validated: must start with /admin/). */
  link: string;
  /**
   * The recipient needs at least ONE of these permissions. Re-checked
   * against the reader's current permissions on every read.
   */
  requiredPermissions: string[];
  /** Whether the notification represents something that needs action. */
  actionRequired?: boolean;
  /** Never include passwords, codes, tokens or secrets. */
  metadata?: Record<string, string | number | boolean | null>;
  /** User the notification is about; never notified about themselves. */
  excludeUserIds?: string[];
}

export interface AdminNotificationResolvedEvent {
  entityType: string;
  entityId: string;
  resolvedBy?: string | null;
}

const LINK_PATTERN = /^\/admin\/[A-Za-z0-9/_\-?=&.%]*$/;

/**
 * Links are built by the server. Anything that is not a plain internal
 * /admin path is replaced with the notifications page.
 */
export function safeAdminLink(link: unknown): string {
  const value = String(link ?? "").trim();

  if (
    value.length > 300 ||
    !LINK_PATTERN.test(value) ||
    value.includes("//") ||
    value.includes("..")
  ) {
    return "/admin/notifications";
  }

  return value;
}

export function higherPriority(
  a: AdminNotificationPriority,
  b: AdminNotificationPriority,
): AdminNotificationPriority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

export function isPriority(value: unknown): value is AdminNotificationPriority {
  return (ADMIN_NOTIFICATION_PRIORITIES as readonly string[]).includes(String(value));
}

export function isCategory(value: unknown): value is AdminNotificationCategory {
  return (ADMIN_NOTIFICATION_CATEGORIES as readonly string[]).includes(String(value));
}

/** Can a reader with these permissions see a notification with these requirements? */
export function canSee(
  required: string[] | undefined,
  permissions: string[],
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (!required || required.length === 0) return false;

  const owned = new Set(permissions.map((p) => p.toLowerCase()));

  return required.some((p) => owned.has(p.toLowerCase()));
}
