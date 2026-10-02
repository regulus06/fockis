import { io, type Socket } from "socket.io-client";

/* ============================================================================
GIFTS SOCKET

Connects to the backend's /gifts namespace (see gifts.gateway.ts).

Reused as a singleton so every FockisPostCard shares one connection
instead of opening a new socket per post.
============================================================================ */

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function getGiftsSocket(): Socket {
  if (!socket) {
    socket = io(`${SOCKET_URL}/gifts`, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("[giftsSocket] connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("[giftsSocket] disconnected");
    });
  }

  return socket;
}