
import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useCallback,
  useEffect,
} from "react";

import {
  io,
  type Socket,
} from "socket.io-client";

import {
  giftsApi,
} from "../services/giftsApi";

import {
  useGiftsStore,
} from "../store/giftsStore";

import type {
  ReceivedGift,
} from "../store/giftsStore";

/* ============================================================================
GIFT SOCKET
============================================================================ */

const socket: Socket = io(
  `${FOCKIS_API_URL}/gifts`,
  {
    transports: [
      "websocket",
      "polling",
    ],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  },
);

/* ============================================================================
SHARED GIFT CATALOG CACHE
============================================================================ */

const GIFTS_CACHE_TTL = 60_000;

type GiftCatalog = Awaited<
  ReturnType<typeof giftsApi.getGifts>
>;

let cachedGifts: GiftCatalog | null = null;
let cachedAt = 0;
let giftsRequest: Promise<GiftCatalog> | null = null;

/**
 * Clear the cached catalog when gifts are added, removed,
 * or updated by the backend.
 */
export function invalidateGiftsCache(): void {
  cachedGifts = null;
  cachedAt = 0;
}

/**
 * Reuse the same request when multiple components load the catalog.
 */
async function loadGifts(
  force = false,
): Promise<GiftCatalog> {
  const now = Date.now();

  if (
    !force &&
    cachedGifts !== null &&
    now - cachedAt < GIFTS_CACHE_TTL
  ) {
    return cachedGifts;
  }

  if (giftsRequest !== null) {
    return giftsRequest;
  }

  const request = giftsApi
    .getGifts()
    .then((data) => {
      cachedGifts = data;
      cachedAt = Date.now();

      return data;
    })
    .finally(() => {
      if (giftsRequest === request) {
        giftsRequest = null;
      }
    });

  giftsRequest = request;

  return request;
}

/* ============================================================================
HOOK
============================================================================ */

export function useGifts(
  liveId?: string,
) {
  const {
    gifts,
    setGifts,
    selectedGift,
    selectGift,
    showGift,
  } = useGiftsStore();

  /* ==========================================================================
  LOAD AVAILABLE GIFTS
  ========================================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const data = await loadGifts();

        if (!cancelled) {
          setGifts(data);
        }
      } catch (error) {
        console.error(
          "[Gifts] Failed loading gifts:",
          error,
        );
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [setGifts]);

  /* ==========================================================================
  JOIN LIVE GIFT ROOM AND RECEIVE GIFTS
  ========================================================================== */

  useEffect(() => {
    if (!liveId) {
      return;
    }

    const joinLive = () => {
      console.log(
        "[Gifts] Joining live gift room:",
        liveId,
      );

      socket.emit(
        "join_live_gifts",
        { liveId },
      );
    };

    const handleGiftReceived = (
      gift: ReceivedGift,
    ) => {
      if (gift.liveId !== liveId) {
        return;
      }

      console.log(
        "[Gifts] LIVE GIFT RECEIVED:",
        gift,
      );

      showGift(gift);
    };

    socket.on("connect", joinLive);
    socket.on(
      "gift_received",
      handleGiftReceived,
    );

    if (socket.connected) {
      joinLive();
    }

    return () => {
      console.log(
        "[Gifts] Leaving live gift listener:",
        liveId,
      );

      socket.off("connect", joinLive);

      socket.off(
        "gift_received",
        handleGiftReceived,
      );

      if (socket.connected) {
        socket.emit(
          "leave_live_gifts",
          { liveId },
        );
      }
    };
  }, [
    liveId,
    showGift,
  ]);

  /* ==========================================================================
  SEND GIFT
  ========================================================================== */

  const sendGift = useCallback(
    (...args: Parameters<typeof giftsApi.sendGift>) =>
      giftsApi.sendGift(...args),
    [],
  );

  /* ==========================================================================
  RETURN
  ========================================================================== */

  return {
    gifts,
    selectedGift,
    selectGift,
    sendGift,
  };
}

export default useGifts;