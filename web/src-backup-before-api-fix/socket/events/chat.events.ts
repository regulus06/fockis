import { createSocket } from "./createSocket";


export const chatSocket =
  createSocket("/messages");



// ======================
// CHAT EVENTS
// ======================

chatSocket.on(
  "messageSeen",
  (data) => {
    console.log(
      "👁 messageSeen:",
      data,
    );
  },
);


chatSocket.on(
  "messageDelivered",
  (data) => {
    console.log(
      "📦 messageDelivered:",
      data,
    );
  },
);


chatSocket.on(
  "voiceMessage",
  (data) => {
    console.log(
      "🎤 voiceMessage:",
      data,
    );
  },
);


chatSocket.on(
  "userStatus",
  (data) => {
    console.log(
      "🟢 userStatus:",
      data,
    );
  },
);



// ======================
// CLEANUP HELPER
// ======================

export function disconnectChatSocket() {

  if (chatSocket.connected) {
    chatSocket.disconnect();
  }

}