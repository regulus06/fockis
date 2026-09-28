import { socket } from "../client";

export function registerSystemEvents() {
  socket.on("connect", () => {
    console.log("🟢 socket connected");
  });

  socket.on("disconnect", () => {
    console.log("🔴 socket disconnected");
  });
}