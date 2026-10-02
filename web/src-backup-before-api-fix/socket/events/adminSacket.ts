import { createSocket } from "./createSocket";

export const adminSocket = createSocket("/admin");

// ======================
// ADMIN EVENTS
// ======================
adminSocket.on("connect", () => {
  console.log("🟢 admin socket connected");
});

adminSocket.on("disconnect", () => {
  console.log("🔴 admin socket disconnected");
});

// LIVE METRICS FROM BACKEND
adminSocket.on("metrics", (data) => {
  console.log("📊 admin metrics:", data);
});