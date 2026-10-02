import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { notificationApi } from "../services/notificationApi";

import type { AppNotification } from "../type/Notification";

import { createSocket } from "../../../socket/events/createSocket";

import { NOTIFICATION_EVENTS } from "../../../socket/events/notification.events";

import { api } from "../../../my-live/api";

const POLL_INTERVAL_MS = 30_000;

interface LiveGuestInvitationPayload {
  _id?: string;
  id?: string;

  hostId?: string;
  guestUserId?: string;
  streamId?: string;

  status?: string;

  message?: string;

  createdAt?: string;
  updatedAt?: string;

  host?: {
    id?: string;
    _id?: string;
    name?: string;
    displayName?: string;
    username?: string;
    profilePicture?: string;
    avatar?: string;
  };
}

/* ============================================================================
   HELPERS
============================================================================ */

function getStoredUserId(): string {
  return String(
    localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("id") ||
      "",
  ).trim();
}

function getStoredToken(): string {
  return String(
    localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      "",
  ).trim();
}

function getInvitationId(
  invitation: LiveGuestInvitationPayload,
): string {
  return String(
    invitation?._id ||
      invitation?.id ||
      "",
  ).trim();
}

function createGuestInvitationNotification(
  invitation: LiveGuestInvitationPayload,
  userId: string,
): AppNotification | null {
  const invitationId =
    getInvitationId(invitation);

  if (!invitationId) {
    return null;
  }

  const streamId = String(
    invitation.streamId || "",
  ).trim();

  const hostName =
    invitation.host?.displayName ||
    invitation.host?.name ||
    invitation.host?.username ||
    "A Fockis creator";

  return {
    _id: `live-guest-${invitationId}`,

    recipientId: userId,

    senderId:
      invitation.hostId,

    type:
      "live_guest_invitation",

    title:
      "LIVE guest invitation",

    message:
      invitation.message ||
      `${hostName} invited you to join a LIVE stream.`,

    entityId:
      invitationId,

    entityType:
      "live_guest_invitation",

    link:
      streamId
        ? `/my-live/${streamId}`
        : "/my-live",

    read: false,

    createdAt:
      invitation.createdAt ||
      new Date().toISOString(),

    updatedAt:
      invitation.updatedAt ||
      new Date().toISOString(),
  };
}

function mergeNotifications(
  normalNotifications: AppNotification[],
  liveInvitations: AppNotification[],
): AppNotification[] {
  const result: AppNotification[] = [];

  const seenIds = new Set<string>();
  const seenEntities = new Set<string>();

  const add = (
    notification: AppNotification,
  ) => {
    if (!notification?._id) {
      return;
    }

    const id =
      String(notification._id);

    const entityKey =
      notification.type &&
      notification.entityId
        ? `${notification.type}:${notification.entityId}`
        : "";

    if (seenIds.has(id)) {
      return;
    }

    if (
      entityKey &&
      seenEntities.has(entityKey)
    ) {
      return;
    }

    seenIds.add(id);

    if (entityKey) {
      seenEntities.add(entityKey);
    }

    result.push(notification);
  };

  /*
   * LIVE invitations first so the newest invitation
   * appears immediately at the top.
   */
  [...liveInvitations]
    .sort(
      (a, b) =>
        new Date(
          b.createdAt || 0,
        ).getTime() -
        new Date(
          a.createdAt || 0,
        ).getTime(),
    )
    .forEach(add);

  normalNotifications.forEach(add);

  return result;
}

/* ============================================================================
   HOOK
============================================================================ */

export function useNotifications() {
  const [unreadCount, setUnreadCount] =
    useState(0);

  const [
    notifications,
    setNotifications,
  ] = useState<AppNotification[]>([]);

  const [loading, setLoading] =
    useState(true);

  const mounted =
    useRef(true);

  /*
   * Prevents the same LIVE invitation from
   * increasing the badge more than once.
   */
  const liveInvitationIds =
    useRef<Set<string>>(
      new Set(),
    );

  /* ==========================================================================
     REFRESH
  ========================================================================== */

  const refresh =
    useCallback(async () => {
      try {
        const userId =
          getStoredUserId();

        /*
         * Load normal notifications AND
         * pending LIVE guest invitations.
         *
         * This is the important fallback.
         */
        const [
          notificationResult,
          guestInvitations,
        ] = await Promise.all([
          Promise.all([
            notificationApi.getNotifications(),
            notificationApi.getUnreadCount(),
          ]),

          userId
            ? api.getGuestInvitations()
            : Promise.resolve([]),
        ]);

        if (!mounted.current) {
          return;
        }

        const [
          normalNotifications,
          normalUnreadCount,
        ] = notificationResult;

        /*
         * Convert pending LIVE invitations
         * into normal AppNotification objects.
         */
        const liveNotifications =
          guestInvitations
            .filter(
              (invitation) =>
                invitation.status ===
                "invited",
            )
            .map((invitation) =>
              createGuestInvitationNotification(
                invitation,
                userId,
              ),
            )
            .filter(
              (
                notification,
              ): notification is AppNotification =>
                Boolean(notification),
            );

        /*
         * Remember currently pending invitations.
         */
        liveNotifications.forEach(
          (notification) => {
            if (
              notification.entityId
            ) {
              liveInvitationIds.current.add(
                notification.entityId,
              );
            }
          },
        );

        /*
         * Merge regular notifications with
         * pending LIVE invitations.
         */
        const merged =
          mergeNotifications(
            normalNotifications,
            liveNotifications,
          );

        setNotifications(merged);

        /*
         * Normal backend notification count
         * + pending LIVE invitations.
         *
         * Each pending LIVE invitation is unread.
         */
        const pendingLiveCount =
          liveNotifications.length;

        setUnreadCount(
          normalUnreadCount +
            pendingLiveCount,
        );
      } catch (error) {
        console.error(
          "[FOCKIS NOTIFICATIONS] Notification loading failed:",
          error,
        );
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    }, []);

  /* ==========================================================================
     INITIAL LOAD + POLLING
  ========================================================================== */

  useEffect(() => {
    mounted.current = true;

    void refresh();

    const interval =
      window.setInterval(() => {
        void refresh();
      }, POLL_INTERVAL_MS);

    return () => {
      mounted.current = false;

      window.clearInterval(
        interval,
      );
    };
  }, [refresh]);

  /* ==========================================================================
     SOCKETS
  ========================================================================== */

  useEffect(() => {
    const userId =
      getStoredUserId();

    const token =
      getStoredToken();

    if (!userId) {
      console.warn(
        "[FOCKIS NOTIFICATIONS] No userId found. Notification sockets will not start.",
      );

      return;
    }

    /* ------------------------------------------------------------------------
       NORMAL NOTIFICATION SOCKET
    ------------------------------------------------------------------------ */

    const notificationSocket =
      createSocket(
        "/notifications",
      );

    notificationSocket.auth = {
      userId,
      token,
    };

    const handleNotification = (
      notification: AppNotification,
    ) => {
      if (!mounted.current) {
        return;
      }

      setNotifications(
        (previous) => {
          const exists =
            previous.some(
              (item) =>
                item._id ===
                  notification._id ||
                (
                  item.type ===
                    notification.type &&
                  item.entityId &&
                  item.entityId ===
                    notification.entityId
                ),
            );

          if (exists) {
            return previous;
          }

          return [
            notification,
            ...previous,
          ];
        },
      );

      /*
       * Do not blindly increase the count if
       * this notification already exists.
       */
      setUnreadCount(
        (previous) =>
          previous + 1,
      );
    };

    notificationSocket.on(
      NOTIFICATION_EVENTS.NEW,
      handleNotification,
    );

    notificationSocket.on(
      "connect",
      () => {
        console.log(
          "[FOCKIS NOTIFICATIONS] Notification socket connected:",
          notificationSocket.id,
        );
      },
    );

    notificationSocket.on(
      "connect_error",
      (error) => {
        console.warn(
          "[FOCKIS NOTIFICATIONS] Notification socket error:",
          error,
        );
      },
    );

    notificationSocket.connect();

    /* ------------------------------------------------------------------------
       LIVE SOCKET
    ------------------------------------------------------------------------ */

    const liveSocket =
      createSocket("/live");

    /*
     * IMPORTANT:
     *
     * LiveGateway requires the JWT.
     */
    liveSocket.auth = {
      userId,
      token,
    };

    const handleGuestInvitation = (
      invitation: LiveGuestInvitationPayload,
    ) => {
      console.log(
        "[FOCKIS LIVE] Guest invitation received:",
        invitation,
      );

      if (
        invitation.status &&
        invitation.status !==
          "invited"
      ) {
        return;
      }

      const invitationId =
        getInvitationId(
          invitation,
        );

      if (!invitationId) {
        console.warn(
          "[FOCKIS LIVE] Guest invitation is missing an ID:",
          invitation,
        );

        return;
      }

      /*
       * Prevent duplicate socket events.
       */
      if (
        liveInvitationIds.current.has(
          invitationId,
        )
      ) {
        console.log(
          "[FOCKIS LIVE] Duplicate guest invitation ignored:",
          invitationId,
        );

        /*
         * Still refresh in case the REST
         * state is newer.
         */
        void refresh();

        return;
      }

      liveInvitationIds.current.add(
        invitationId,
      );

      const notification =
        createGuestInvitationNotification(
          invitation,
          userId,
        );

      if (!notification) {
        return;
      }

      setNotifications(
        (previous) => {
          const exists =
            previous.some(
              (item) =>
                item._id ===
                  notification._id ||
                (
                  item.type ===
                    "live_guest_invitation" &&
                  item.entityId ===
                    invitationId
                ),
            );

          if (exists) {
            return previous;
          }

          return [
            notification,
            ...previous,
          ];
        },
      );

      setUnreadCount(
        (previous) =>
          previous + 1,
      );
    };

    liveSocket.on(
      "live:guest-invited",
      handleGuestInvitation,
    );

    /*
     * Helpful authentication diagnostics.
     */
    liveSocket.on(
      "connect",
      () => {
        console.log(
          "[FOCKIS LIVE] Guest notification socket connected:",
          liveSocket.id,
        );
      },
    );

    liveSocket.on(
      "live:authenticated",
      (payload) => {
        console.log(
          "[FOCKIS LIVE] Notification socket authenticated:",
          payload,
        );
      },
    );

    liveSocket.on(
      "live:error",
      (payload) => {
        console.error(
          "[FOCKIS LIVE] Notification socket error:",
          payload,
        );
      },
    );

    liveSocket.on(
      "connect_error",
      (error) => {
        console.error(
          "[FOCKIS LIVE] Guest notification socket connection error:",
          error,
        );
      },
    );

    liveSocket.connect();

    /* ------------------------------------------------------------------------
       CLEANUP
    ------------------------------------------------------------------------ */

    return () => {
      notificationSocket.off(
        NOTIFICATION_EVENTS.NEW,
        handleNotification,
      );

      notificationSocket.disconnect();

      liveSocket.off(
        "live:guest-invited",
        handleGuestInvitation,
      );

      liveSocket.off(
        "connect",
      );

      liveSocket.off(
        "live:authenticated",
      );

      liveSocket.off(
        "live:error",
      );

      liveSocket.off(
        "connect_error",
      );

      liveSocket.disconnect();
    };
  }, [refresh]);

  /* ==========================================================================
     MARK AS READ
  ========================================================================== */

  const markAsRead =
    useCallback(
      async (id: string) => {
        /*
         * Synthetic LIVE invitations have IDs such as:
         *
         * live-guest-xxxxxxxx
         *
         * They are stored in the LiveGuest collection,
         * not the normal notifications collection.
         */
        if (
          id.startsWith(
            "live-guest-",
          )
        ) {
          setNotifications(
            (previous) =>
              previous.map(
                (notification) =>
                  notification._id ===
                  id
                    ? {
                        ...notification,
                        read: true,
                      }
                    : notification,
              ),
          );

          setUnreadCount(
            (previous) =>
              Math.max(
                0,
                previous - 1,
              ),
          );

          return;
        }

        try {
          const success =
            await notificationApi.markAsRead(
              id,
            );

          if (!success) {
            return;
          }

          setNotifications(
            (previous) =>
              previous.map(
                (notification) =>
                  notification._id ===
                  id
                    ? {
                        ...notification,
                        read: true,
                      }
                    : notification,
              ),
          );

          setUnreadCount(
            (previous) =>
              Math.max(
                0,
                previous - 1,
              ),
          );
        } catch (error) {
          console.error(
            "Mark read failed:",
            error,
          );
        }
      },
      [],
    );

  /* ==========================================================================
     MARK ALL AS READ
  ========================================================================== */

  const markAllAsRead =
    useCallback(async () => {
      try {
        const success =
          await notificationApi.markAllAsRead();

        if (!success) {
          return;
        }

        setNotifications(
          (previous) =>
            previous.map(
              (notification) => ({
                ...notification,
                read: true,
              }),
            ),
        );

        setUnreadCount(0);
      } catch (error) {
        console.error(
          "Mark all as read failed:",
          error,
        );
      }
    }, []);

  /* ==========================================================================
     REMOVE NOTIFICATION
  ========================================================================== */

  const removeNotification =
    useCallback(
      async (id: string) => {
        /*
         * LIVE invitations are synthetic
         * notifications. There is no
         * /notifications/:id endpoint for them.
         */
        if (
          id.startsWith(
            "live-guest-",
          )
        ) {
          setNotifications(
            (previous) =>
              previous.filter(
                (notification) =>
                  notification._id !==
                  id,
              ),
          );

          return;
        }

        try {
          const success =
            await notificationApi.deleteNotification(
              id,
            );

          if (!success) {
            return;
          }

          setNotifications(
            (previous) =>
              previous.filter(
                (notification) =>
                  notification._id !==
                  id,
              ),
          );
        } catch (error) {
          console.error(
            "Delete notification failed:",
            error,
          );
        }
      },
      [],
    );

  return {
    unreadCount,
    notifications,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
}

export default useNotifications;