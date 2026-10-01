import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useEffect,
  useState,
} from "react";

import {
  io,
  Socket,
} from "socket.io-client";

/* ============================================================================
TYPES
============================================================================ */

export interface ReceivedGift {
  giftId: string;
  giftName: string;
  emoji: string;
  animation: string;
  sound: string;
  duration: number;
  fullScreenAnimation: boolean;
  senderId: string;
  receiverId: string;
  liveId: string;
}

/* ============================================================================
SOCKET

IMPORTANT:
GiftsGateway uses:

@WebSocketGateway({
  namespace: "/gifts",
})

Therefore the client MUST connect to:

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

export default function useGiftSocket(
  liveId?: string,
) {
  const [
    receivedGift,
    setReceivedGift,
  ] = useState<ReceivedGift | null>(
    null,
  );

  useEffect(() => {
    if (!liveId) {
      return;
    }

    const joinLive = () => {
      console.log(
        "[GiftSocket] Joining gift room:",
        liveId,
      );

      socket.emit(
        "join_live_gifts",
        {
          liveId,
        },
      );
    };

    const handleGiftReceived = (
      data: ReceivedGift,
    ) => {
      console.log(
        "[GiftSocket] Gift received:",
        data,
      );

      /*
       * IMPORTANT:
       * Every client connected to this live room
       * receives this event.
       */
      if (
        data.liveId !== liveId
      ) {
        return;
      }

      setReceivedGift(data);
    };

    socket.on(
      "connect",
      joinLive,
    );

    socket.on(
      "gift_received",
      handleGiftReceived,
    );

    /*
     * Socket may already be connected.
     */
    if (socket.connected) {
      joinLive();
    }

    return () => {
      socket.off(
        "connect",
        joinLive,
      );

      socket.off(
        "gift_received",
        handleGiftReceived,
      );
    };
  }, [liveId]);

  return {
    receivedGift,
    socket,
  };
}