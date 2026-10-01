// web/src/socket/client.ts

import { io, Socket } from "socket.io-client";
import { FOCKIS_API_URL } from "../config/fockisConfig";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const userId =
      localStorage.getItem("userId") || "";

    socket = io(
      `${FOCKIS_API_URL}/notifications`,
      {
        transports: ["websocket"],

        autoConnect: false,

        auth: {
          userId,
        },
      },
    );

    socket.on(
      "connect",
      () => {
        console.log(
          "🟢 Notification socket connected:",
          socket?.id,
        );
      },
    );

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "🔴 Notification socket disconnected:",
          reason,
        );
      },
    );

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "❌ Notification socket error:",
          error.message,
        );
      },
    );
  }

  return socket;
};

export const connectNotificationSocket =
  (): Socket => {
    const currentSocket = getSocket();

    if (!currentSocket.connected) {
      currentSocket.connect();
    }

    return currentSocket;
  };

export const disconnectNotificationSocket =
  (): void => {
    if (socket) {
      socket.disconnect();
    }
  };