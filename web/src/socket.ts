import { FOCKIS_API_URL } from "config/fockisConfig";

import { io } from "socket.io-client";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || FOCKIS_API_URL;

const socket = io(API_BASE_URL, {
  transports: ["websocket"],
  autoConnect: false,
  query: {
    userId: localStorage.getItem("userId") || "",
  },
});

// ======================
// CONNECTION EVENTS
// ======================
socket.on("connect", () => {
  console.log("🟢 socket connected");
});

socket.on("disconnect", () => {
  console.log("🔴 socket disconnected");
});

socket.on("connect_error", (error) => {
  console.error("🔴 socket connection error:", error.message);
});

// ======================
// CHAT EVENTS
// ======================
socket.on("messageSeen", (data) => {
  console.log("👁 seen:", data);
});

socket.on("messageDelivered", (data) => {
  console.log("📦 delivered:", data);
});

socket.on("userStatus", (data) => {
  console.log("🟢 status:", data);
});

socket.on("voiceMessage", (msg) => {
  console.log("🎤 voice:", msg);
});

export default socket;
export { socket };