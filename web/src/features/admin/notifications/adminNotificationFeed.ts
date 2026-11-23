import { create } from "zustand";
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL, getAuthToken } from "../../../api/api";
import { useAdminNotificationStore } from "../store/adminNotificationStore";
import { adminNotificationsApi, type AdminNotificationItem } from "./adminNotificationsApi";

/* ============================================================================
   ADMIN NOTIFICATION FEED (shared by the bell and the notifications page)

   One store, one socket per tab. The socket only carries "something
   changed" signals for the signed-in administrator; the data always comes
   from the authenticated REST API, so a reconnect simply re-reads it.
============================================================================ */

type Status = "idle" | "loading" | "ready" | "error";
export type BellFilter = "all" | "unread";

interface FeedState {
  unread: number;
  items: AdminNotificationItem[];
  status: Status;
  error: string | null;
  filter: BellFilter;
  connected: boolean;
  /** Increments on every change, so pages can refetch. */
  version: number;
  setFilter: (filter: BellFilter) => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const BELL_SIZE = 15;
let request = 0;

export const useAdminNotificationFeed = create<FeedState>((set, get) => ({
  unread: 0,
  items: [],
  status: "idle",
  error: null,
  filter: "all",
  connected: false,
  version: 0,

  setFilter: (filter) => {
    set({ filter });
    void get().refresh();
  },

  refresh: async () => {
    const id = ++request;
    if (get().status !== "ready") set({ status: "loading" });

    try {
      const page = await adminNotificationsApi.list({ status: get().filter, pageSize: BELL_SIZE });
      if (id !== request) return;
      set((state) => ({ items: page.items, unread: page.unread, status: "ready", error: null, version: state.version + 1 }));
    } catch {
      if (id !== request) return;
      set({ status: get().items.length ? "ready" : "error", error: "Couldn't load notifications." });
    }
  },

  markRead: async (id) => {
    const previous = get().items;
    set({ items: previous.map((n) => (n.id === id ? { ...n, read: true } : n)) });

    try {
      const result = await adminNotificationsApi.markRead(id);
      set((state) => ({ unread: result.unread, version: state.version + 1 }));
    } catch {
      set({ items: previous });
    }
  },

  markAllRead: async () => {
    const previous = get().items;
    set({ items: previous.map((n) => ({ ...n, read: true })) });

    try {
      const result = await adminNotificationsApi.markAllRead();
      set((state) => ({ unread: result.unread, version: state.version + 1 }));
      if (get().filter === "unread") void get().refresh();
    } catch {
      set({ items: previous });
    }
  },
}));

/* ----------------------------------------------------------------------------
   CONNECTION (ref-counted: the bell and the page share it)
---------------------------------------------------------------------------- */

let socket: Socket | null = null;
let users = 0;
let refreshTimer: number | null = null;
let pollTimer: number | null = null;
let retryTimer: number | null = null;
let toastsEnabled = true;

function scheduleRefresh() {
  if (refreshTimer) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => void useAdminNotificationFeed.getState().refresh(), 250);
}

function onFocus() {
  scheduleRefresh();
}

function connect() {
  if (socket || !getAuthToken()) return;

  socket = io(`${API_BASE_URL}/admin-notifications`, {
    // A function, so every reconnect sends the current token.
    auth: (cb) => cb({ token: getAuthToken() }),
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
  });

  socket.on("connect", () => {
    useAdminNotificationFeed.setState({ connected: true });
    scheduleRefresh();
  });

  socket.on("disconnect", (reason) => {
    useAdminNotificationFeed.setState({ connected: false });

    // The server closes the socket when the token expires or is revoked;
    // try again later with whatever token the app has then.
    if (reason === "io server disconnect" && users > 0) {
      if (retryTimer) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (socket && users > 0 && getAuthToken()) socket.connect();
      }, 30000);
    }
  });

  socket.on("admin-notification", (signal: { kind?: string; alert?: boolean; priority?: string; title?: string }) => {
    scheduleRefresh();

    if (signal?.kind === "notification" && signal.alert && toastsEnabled && (signal.priority === "high" || signal.priority === "critical")) {
      useAdminNotificationStore
        .getState()
        .pushToast(signal.priority === "critical" ? "error" : "warning", String(signal.title ?? "New notification"));
    }
  });
}

export function startAdminNotifications(): () => void {
  users += 1;

  if (users === 1) {
    void useAdminNotificationFeed.getState().refresh();
    connect();

    adminNotificationsApi
      .preferences()
      .then((prefs) => {
        toastsEnabled = prefs.realtimeToasts;
      })
      .catch(() => undefined);

    window.addEventListener("focus", onFocus);

    // Safety net while the socket is down (network loss, proxies).
    pollTimer = window.setInterval(() => {
      if (!useAdminNotificationFeed.getState().connected) void useAdminNotificationFeed.getState().refresh();
    }, 60000);
  }

  return () => {
    users = Math.max(0, users - 1);

    if (users === 0) {
      window.removeEventListener("focus", onFocus);
      if (pollTimer) window.clearInterval(pollTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
      if (refreshTimer) window.clearTimeout(refreshTimer);
      pollTimer = retryTimer = refreshTimer = null;
      socket?.disconnect();
      socket = null;
      useAdminNotificationFeed.setState({ connected: false });
    }
  };
}

export function setRealtimeToasts(enabled: boolean) {
  toastsEnabled = enabled;
}
