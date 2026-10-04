// web/src/features/admin/fockismail/services/notificationsApi.ts

// ============================================================================
// FOCKIS MAIL — NOTIFICATIONS API
// ============================================================================
//
// Notifications currently use the local platformDb implementation.
//
// The existing marketing backend does not expose:
//   GET  /marketing/notifications
//   POST /marketing/notifications/:id/read
//   POST /marketing/notifications/read-all
//
// Therefore this service intentionally keeps notification state in
// platformDb until corresponding backend notification endpoints exist.
//
// ============================================================================

import type { MarketingNotification } from "../types/platform.types";
import { platformDb } from "./platformDb";
import { uid } from "../utils/format";

type Listener = () => void;

const listeners = new Set<Listener>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A subscriber must never break the notification system.
    }
  });
}

export function subscribeNotifications(
  listener: Listener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Local notification creator.
 *
 * Notifications are currently maintained in platformDb.
 *
 * In the future, backend/domain events can create these notifications
 * once the backend notification module is implemented.
 */
export function pushNotification(
  notification: Omit<
    MarketingNotification,
    "id" | "read" | "createdAt"
  >,
): void {
  platformDb.notifications.unshift({
    ...notification,
    id: uid("ntf"),
    read: false,
    createdAt: new Date().toISOString(),
  });

  notifyListeners();
}

/**
 * Safely normalize notification data.
 *
 * Kept for compatibility with callers that may pass notification
 * collections in different shapes.
 */
function normalizeNotifications(
  response: unknown,
): MarketingNotification[] {
  if (Array.isArray(response)) {
    return response as MarketingNotification[];
  }

  if (
    response &&
    typeof response === "object"
  ) {
    const value = response as Record<string, unknown>;

    if (Array.isArray(value.notifications)) {
      return value.notifications as MarketingNotification[];
    }

    if (Array.isArray(value.data)) {
      return value.data as MarketingNotification[];
    }

    if (Array.isArray(value.items)) {
      return value.items as MarketingNotification[];
    }
  }

  return [];
}

export const notificationsApi = {
  /**
   * Get notifications for the selected business.
   *
   * Notifications are currently read from platformDb because there is
   * no matching backend /marketing/notifications endpoint.
   */
  list: async (
    businessId: string,
    includeAgency: boolean,
  ): Promise<MarketingNotification[]> => {
    const response = platformDb.notifications
      .filter(
        (notification) =>
          notification.businessId === businessId ||
          (
            includeAgency &&
            (
              notification.businessId === null ||
              notification.businessId !== businessId
            )
          ),
      )
      .slice(0, 30);

    return normalizeNotifications(response);
  },

  /**
   * Mark one notification as read.
   */
  markRead: async (
    id: string,
  ): Promise<void> => {
    const notification =
      platformDb.notifications.find(
        (item) => item.id === id,
      );

    if (notification) {
      notification.read = true;
    }

    notifyListeners();
  },

  /**
   * Mark multiple notifications as read.
   */
  markAllRead: async (
    ids: string[],
  ): Promise<void> => {
    const idSet = new Set(ids);

    platformDb.notifications.forEach(
      (notification) => {
        if (idSet.has(notification.id)) {
          notification.read = true;
        }
      },
    );

    notifyListeners();
  },
};