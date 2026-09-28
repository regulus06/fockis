import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
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