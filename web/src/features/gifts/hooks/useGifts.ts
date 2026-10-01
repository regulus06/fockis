import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useEffect,
} from "react";

import {
  io,
  Socket,
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

GiftsGateway namespace:

/gifts

Therefore this MUST connect to:

${FOCKIS_API_URL}/gifts
============================================================================ */

const socket: Socket = io(
  FOCKIS_API_URL + "/gifts",
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
  } =
    useGiftsStore();

  /* ========================================================================
     LOAD AVAILABLE GIFTS
     ======================================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadGifts() {
      try {
        const data =
          await giftsApi.getGifts();

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

    void loadGifts();

    return () => {
      cancelled = true;
    };
  }, [setGifts]);

  /* ========================================================================
     JOIN LIVE GIFT ROOM
     ======================================================================== */

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
        {
          liveId,
        },
      );
    };

    /* ======================================================================
       RECEIVE GIFT
       ====================================================================== */

    const handleGiftReceived = (
      gift: ReceivedGift,
    ) => {
      console.log(
        "[Gifts] LIVE GIFT RECEIVED:",
        gift,
      );

      /*
       * Make absolutely sure this event belongs
       * to the currently watched live.
       */
      if (
        gift.liveId !== liveId
      ) {
        return;
      }

      /*
       * This updates Zustand.
       *
       * Every viewer that receives the Socket.IO
       * event will therefore display the gift.
       */
      showGift(gift);
    };

    /* ======================================================================
       CONNECTION
       ====================================================================== */

    socket.on(
      "connect",
      joinLive,
    );

    /* ======================================================================
       GIFT EVENT
       ====================================================================== */

    socket.on(
      "gift_received",
      handleGiftReceived,
    );

    /*
     * If socket is already connected,
     * join immediately.
     */
    if (socket.connected) {
      joinLive();
    }

    /* ======================================================================
       CLEANUP
       ====================================================================== */

    return () => {
      console.log(
        "[Gifts] Leaving live gift listener:",
        liveId,
      );

      socket.off(
        "connect",
        joinLive,
      );

      socket.off(
        "gift_received",
        handleGiftReceived,
      );

      /*
       * Tell backend that this client is leaving
       * the gift room.
       */
      socket.emit(
        "leave_live_gifts",
        {
          liveId,
        },
      );
    };
  }, [
    liveId,
    showGift,
  ]);

  /* ========================================================================
     RETURN
     ======================================================================== */

  return {
    gifts,

    selectedGift,

    selectGift,

    sendGift:
      giftsApi.sendGift,
  };
}

export default useGifts;