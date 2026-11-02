import { useEffect } from "react";

import { messageSocket } from "../services/messageSocket";
import { callsService, currentUserId, toConversation, toMessage } from "./inboxApi";
import { ensureConversation, loadConversations, markConversationRead, openConversation } from "./inboxActions";
import { useInbox } from "./inboxStore";

/* ============================================================================
   REAL-TIME SYNC
   Keeps the inbox in step with every other tab and device over Socket.IO.
============================================================================ */

const store = () => useInbox.getState();

export function useInboxSocket() {
  useEffect(() => {
    messageSocket.connect();
    store().setConnected(messageSocket.isConnected());
    void loadConversations();
    callsService
      .missedCount()
      .then((r) => store().setMissedCalls(r.count))
      .catch(() => undefined);

    const me = currentUserId();
    let wasConnected = messageSocket.isConnected();

    const offs = [
      messageSocket.onConnectionChange((connected) => {
        store().setConnected(connected);
        // Catch up on anything missed while offline and re-join rooms.
        if (connected && !wasConnected) void loadConversations();
        wasConnected = connected;
      }),

      messageSocket.listen("message:new", async (payload) => {
        if (!payload?.message) return;
        const message = toMessage(payload.message);
        const incoming = message.senderId !== me;
        if (!store().conversations[message.conversationId]) await ensureConversation(message.conversationId);
        store().upsertMessage(message, { incoming });
        if (!incoming) return;
        const visible = store().activeId === message.conversationId && document.visibilityState === "visible";
        messageSocket.emitRaw(visible ? "message:read" : "message:delivered", { messageId: message.id, conversationId: message.conversationId });
        if (visible) store().patchConversation(message.conversationId, { unreadCount: 0 });
        else notifyIncoming(message.conversationId, message.text);
      }),

      messageSocket.listen("message:edited", (payload) => {
        if (!payload?.message) return;
        const m = toMessage(payload.message);
        store().patchMessage(m.conversationId, m.id, { text: m.text, editedAt: m.editedAt });
      }),

      messageSocket.listen("message:deleted", (payload) => {
        if (!payload?.messageId || !payload?.conversationId) return;
        store().patchMessage(String(payload.conversationId), String(payload.messageId), {
          deletedForEveryone: true,
          text: "",
          attachments: [],
          reactions: [],
          pinned: false,
        });
      }),

      messageSocket.listen("message:deleted-for-me", (payload) => {
        const ids: string[] = Array.isArray(payload?.messageIds) ? payload.messageIds.map(String) : [];
        if (ids.length) store().removeMessageEverywhere(ids);
      }),

      messageSocket.listen("message:deleted:me", (payload) => {
        if (payload?.messageId) store().removeMessageEverywhere([String(payload.messageId)]);
      }),

      messageSocket.listen("message:updated", (payload) => {
        if (!payload?.message) return;
        const m = toMessage(payload.message);
        const mine = String(payload.actorId) === me;
        // Starred is per-user: only take it from my own actions.
        store().patchMessage(m.conversationId, m.id, {
          reactions: m.reactions,
          pinned: m.pinned,
          pinnedAt: m.pinnedAt,
          ...(mine ? { starred: m.starred } : {}),
        });
      }),

      messageSocket.listen("message:delivered", (payload) => {
        const conversationId = String(payload?.conversationId ?? "");
        if (!conversationId || String(payload?.userId) === me) return;
        const list = store().messages[conversationId] ?? [];
        for (const m of list) if (m.senderId === me && m.status === "sent") store().patchMessage(conversationId, m.id, { status: "delivered" });
        const last = store().conversations[conversationId]?.lastMessage;
        if (last?.senderId === me && last.status === "sent") store().patchConversation(conversationId, { lastMessage: { ...last, status: "delivered" } });
      }),

      messageSocket.listen("message:read", (payload) => {
        const conversationId = String(payload?.conversationId ?? "");
        if (!conversationId || String(payload?.userId) === me) return;
        const list = store().messages[conversationId] ?? [];
        for (const m of list) if (m.senderId === me && (m.status === "sent" || m.status === "delivered")) store().patchMessage(conversationId, m.id, { status: "read" });
        const last = store().conversations[conversationId]?.lastMessage;
        if (last?.senderId === me) store().patchConversation(conversationId, { lastMessage: { ...last, status: "read" } });
      }),

      messageSocket.listen("typing:start", (payload) => {
        if (payload?.conversationId && payload.userId && String(payload.userId) !== me) store().setTyping(String(payload.conversationId), String(payload.userId), true);
      }),
      messageSocket.listen("typing:stop", (payload) => {
        if (payload?.conversationId && payload.userId) store().setTyping(String(payload.conversationId), String(payload.userId), false);
      }),

      messageSocket.listen("presence:update", (payload) => {
        if (payload?.userId) store().setPresence(String(payload.userId), payload.presence === "online" ? "online" : "offline", payload.lastSeen);
      }),

      messageSocket.listen("conversation:updated", (payload) => {
        if (!payload?.conversation) return;
        const c = toConversation(payload.conversation);
        const before = store().conversations[c.id];
        store().upsertConversation({ ...c, lastMessage: c.lastMessage ?? before?.lastMessage });
      }),

      messageSocket.listen("conversation:cleared", (payload) => {
        if (payload?.conversationId) store().clearMessages(String(payload.conversationId));
      }),

      messageSocket.listen("call:ended", (payload) => {
        if (payload?.missed && String(payload?.receiverId) === me) store().setMissedCalls(store().missedCalls + 1);
      }),
    ];

    // Expire typing indicators that never got a "stop".
    const sweep = window.setInterval(() => {
      const now = Date.now();
      const typing = store().typing;
      for (const [conversationId, users] of Object.entries(typing)) {
        for (const [userId, until] of Object.entries(users)) if (until && until < now) store().setTyping(conversationId, userId, false);
      }
    }, 2000);

    // Opening the tab again marks the open chat as read.
    const onVisible = () => {
      const id = store().activeId;
      if (document.visibilityState === "visible" && id) {
        void markConversationRead(id);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      offs.forEach((off) => off());
      window.clearInterval(sweep);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

/** Desktop notification for new messages while Fockis is in the background. */
function notifyIncoming(conversationId: string, text?: string) {
  const conversation = store().conversations[conversationId];
  if (!conversation || conversation.muted || document.visibilityState === "visible") return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const title = conversation.isGroup ? conversation.groupName || "Group" : conversation.otherUser?.name || "New message";
    const n = new Notification(title, { body: text || "New message", tag: `fockis-msg-${conversationId}`, icon: conversation.otherUser?.avatar || undefined });
    n.onclick = () => {
      window.focus();
      store().setView("messages");
      void openConversation(conversationId);
      n.close();
    };
  } catch {
    /* notifications blocked */
  }
}
