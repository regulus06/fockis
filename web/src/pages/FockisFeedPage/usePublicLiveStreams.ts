import { useEffect, useState } from "react";

import { createSocket } from "../../socket/events/createSocket";

import {
  fetchPublicLiveStreams,
  getLiveAuthToken,
  isActivePublicLiveStream,
  normalizePublicLiveStream,
  type PublicLiveStream,
} from "./liveStreams";

/* ============================================================================
   PUBLIC LIVE STREAMS FOR THE FEED

   Real time, no polling:
   - The list is loaded from GET /live/public whenever the /live socket
     connects or reconnects, so nothing announced while offline is missed.
   - The backend broadcasts "live:public-started" and "live:public-ended"
     on the /live namespace (LiveGateway); the list is updated in place.
   - Without a login token (the /live gateway requires one) the list is
     loaded once, and again when the tab becomes visible.

   A failed request keeps the current list instead of clearing it.
============================================================================ */

const LIVE_STARTED_EVENT = "live:public-started";
const LIVE_ENDED_EVENT = "live:public-ended";

/** When the tab comes back without a live socket, refresh if older. */
const STALE_AFTER_MS = 30_000;

/**
 * Keeps streams already on screen in place (so cards do not jump around),
 * updates their data, drops streams that ended and appends new ones.
 */
function mergeKeepingOrder(
  current: PublicLiveStream[],
  next: PublicLiveStream[],
): PublicLiveStream[] {
  const nextById = new Map(next.map((stream) => [stream.id, stream]));
  const merged: PublicLiveStream[] = [];

  for (const stream of current) {
    const updated = nextById.get(stream.id);

    if (updated) {
      merged.push(updated);
      nextById.delete(stream.id);
    }
  }

  for (const stream of nextById.values()) {
    merged.push(stream);
  }

  const unchanged =
    merged.length === current.length &&
    merged.every((stream, index) => stream === current[index]);

  return unchanged ? current : merged;
}

export function usePublicLiveStreams(): PublicLiveStream[] {
  const [streams, setStreams] = useState<PublicLiveStream[]>([]);

  useEffect(() => {
    let active = true;
    let requestId = 0;
    let lastLoadedAt = 0;
    let controller: AbortController | null = null;

    // Streams that ended while a list request was in flight must not come
    // back when that (older) response arrives.
    const endedDuringRequest = new Set<string>();

    const load = async () => {
      const id = ++requestId;

      controller?.abort();
      controller = new AbortController();
      endedDuringRequest.clear();

      try {
        const result = await fetchPublicLiveStreams(controller.signal);

        if (!active || id !== requestId) {
          return;
        }

        lastLoadedAt = Date.now();

        setStreams((current) =>
          mergeKeepingOrder(
            current,
            result.filter((stream) => !endedDuringRequest.has(stream.id)),
          ),
        );
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        console.warn(
          "[FockisFeedPage] Could not refresh live streams:",
          error,
        );
      }
    };

    const handleStarted = (payload: unknown) => {
      const raw =
        payload && typeof payload === "object" && "stream" in payload
          ? (payload as { stream: unknown }).stream
          : payload;

      const stream = normalizePublicLiveStream(raw);

      if (!stream || !isActivePublicLiveStream(stream)) {
        return;
      }

      endedDuringRequest.delete(stream.id);

      setStreams((current) => {
        const index = current.findIndex((item) => item.id === stream.id);

        if (index === -1) {
          return [...current, stream];
        }

        const next = current.slice();
        next[index] = stream;
        return next;
      });
    };

    const handleEnded = (payload: unknown) => {
      const streamId =
        payload && typeof payload === "object"
          ? String(
              (payload as { streamId?: unknown; id?: unknown }).streamId ??
                (payload as { id?: unknown }).id ??
                "",
            )
          : String(payload ?? "");

      if (!streamId) {
        return;
      }

      endedDuringRequest.add(streamId);

      setStreams((current) =>
        current.some((stream) => stream.id === streamId)
          ? current.filter((stream) => stream.id !== streamId)
          : current,
      );
    };

    const token = getLiveAuthToken();
    const socket = token ? createSocket("/live") : null;
    let fallbackLoaded = false;

    const handleConnect = () => {
      // Covers the first connection and every reconnection.
      void load();
    };

    const handleConnectError = () => {
      // The socket could not connect: still show what is live now.
      if (!fallbackLoaded && lastLoadedAt === 0) {
        fallbackLoaded = true;
        void load();
      }
    };

    if (socket) {
      socket.auth = {
        userId: localStorage.getItem("userId") || "",
        token,
      };

      socket.on("connect", handleConnect);
      socket.on("connect_error", handleConnectError);
      socket.on(LIVE_STARTED_EVENT, handleStarted);
      socket.on(LIVE_ENDED_EVENT, handleEnded);
      socket.connect();
    } else {
      void load();
    }

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        !socket?.connected &&
        Date.now() - lastLoadedAt > STALE_AFTER_MS
      ) {
        void load();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      controller?.abort();
      document.removeEventListener("visibilitychange", handleVisibility);

      if (socket) {
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleConnectError);
        socket.off(LIVE_STARTED_EVENT, handleStarted);
        socket.off(LIVE_ENDED_EVENT, handleEnded);
        socket.disconnect();
      }
    };
  }, []);

  return streams;
}
