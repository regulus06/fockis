import { create } from "zustand";

import type { InboxConversation, InboxMessage, LastMessageSummary, Presence } from "./inboxApi";

/* ============================================================================
   INBOX STATE
   Conversations, loaded messages, typing and presence for the redesigned
   Messages experience. Server events and REST responses both land here.
============================================================================ */

export type InboxView = "messages" | "calls" | "contacts" | "requests" | "archived" | "blocked" | "starred" | "settings";

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "error" | "success";
  action?: { label: string; run: () => void };
}

interface InboxState {
  connected: boolean;
  loaded: boolean;
  loadError: string;
  conversations: Record<string, InboxConversation>;
  messages: Record<string, InboxMessage[]>;
  hasMore: Record<string, boolean>;
  typing: Record<string, Record<string, number>>;
  presence: Record<string, { presence: Presence; lastSeen?: string }>;
  activeId: string | null;
  view: InboxView;
  missedCalls: number;
  toasts: Toast[];

  setConnected(connected: boolean): void;
  setConversations(list: InboxConversation[]): void;
  setLoadError(message: string): void;
  upsertConversation(conversation: InboxConversation): void;
  patchConversation(id: string, patch: Partial<InboxConversation>): void;
  setActive(id: string | null): void;
  setView(view: InboxView): void;
  setMessages(conversationId: string, list: InboxMessage[], mode: "replace" | "prepend", hasMore: boolean): void;
  upsertMessage(message: InboxMessage, opts?: { incoming?: boolean }): void;
  patchMessage(conversationId: string, id: string, patch: Partial<InboxMessage>): void;
  removeMessages(conversationId: string, ids: string[]): void;
  removeMessageEverywhere(ids: string[]): void;
  clearMessages(conversationId: string): void;
  setTyping(conversationId: string, userId: string, typing: boolean): void;
  setPresence(userId: string, presence: Presence, lastSeen?: string): void;
  setMissedCalls(count: number): void;
  toast(text: string, tone?: Toast["tone"], action?: Toast["action"]): void;
  dismissToast(id: number): void;
}

let toastSeq = 0;

export function summarize(message: InboxMessage): LastMessageSummary {
  return {
    id: message.id,
    senderId: message.senderId,
    type: message.type,
    text: message.deletedForEveryone ? "" : (message.text ?? "").slice(0, 160),
    attachmentKind: message.attachments[0]?.kind,
    attachmentCount: message.attachments.length,
    deletedForEveryone: message.deletedForEveryone,
    systemLabel: message.systemLabel,
    status: message.status,
    createdAt: message.createdAt,
  };
}

const sameMessage = (a: InboxMessage, b: InboxMessage) =>
  (a.id && b.id && a.id === b.id) || (a.localId && b.localId && a.localId === b.localId);

export const useInbox = create<InboxState>((set, get) => ({
  connected: false,
  loaded: false,
  loadError: "",
  conversations: {},
  messages: {},
  hasMore: {},
  typing: {},
  presence: {},
  activeId: null,
  view: "messages",
  missedCalls: 0,
  toasts: [],

  setConnected: (connected) => set({ connected }),

  setConversations: (list) =>
    set((state) => {
      const conversations: Record<string, InboxConversation> = {};
      const presence = { ...state.presence };
      for (const c of list) {
        conversations[c.id] = c;
        if (c.otherUser?.id && c.otherUser.presence && !presence[c.otherUser.id]) {
          presence[c.otherUser.id] = { presence: c.otherUser.presence, lastSeen: c.otherUser.lastSeen };
        }
      }
      return { conversations, presence, loaded: true, loadError: "" };
    }),

  setLoadError: (loadError) => set({ loadError, loaded: true }),

  upsertConversation: (conversation) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversation.id]: { ...state.conversations[conversation.id], ...conversation },
      },
    })),

  patchConversation: (id, patch) =>
    set((state) =>
      state.conversations[id] ? { conversations: { ...state.conversations, [id]: { ...state.conversations[id], ...patch } } } : {},
    ),

  setActive: (activeId) => set({ activeId }),
  setView: (view) => set({ view }),

  setMessages: (conversationId, list, mode, hasMore) =>
    set((state) => {
      const current = state.messages[conversationId] ?? [];
      let next: InboxMessage[];
      if (mode === "prepend") {
        const known = new Set(current.map((m) => m.id));
        next = [...list.filter((m) => !known.has(m.id)), ...current];
      } else {
        // Keep optimistic messages still being sent.
        const pending = current.filter((m) => m.status === "sending" || m.status === "failed");
        const ids = new Set(list.map((m) => m.id));
        next = [...list, ...pending.filter((m) => !ids.has(m.id))];
      }
      return {
        messages: { ...state.messages, [conversationId]: next.filter((m) => !m.deletedForMe) },
        hasMore: { ...state.hasMore, [conversationId]: hasMore },
      };
    }),

  upsertMessage: (message, opts) =>
    set((state) => {
      const conversationId = message.conversationId;
      const current = state.messages[conversationId];
      let messages = state.messages;
      let isNew = true;
      if (current) {
        const index = current.findIndex((m) => sameMessage(m, message));
        isNew = index < 0;
        const next = [...current];
        if (index >= 0) next[index] = { ...current[index], ...message };
        else next.push(message);
        next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        messages = { ...state.messages, [conversationId]: next.filter((m) => !m.deletedForMe) };
      }

      const conversation = state.conversations[conversationId];
      let conversations = state.conversations;
      if (conversation) {
        const isLatest =
          !conversation.lastMessage ||
          conversation.lastMessage.id === message.id ||
          new Date(message.createdAt).getTime() >= new Date(conversation.lastMessage.createdAt).getTime();
        const unreadBump = opts?.incoming && isNew && state.activeId !== conversationId ? 1 : 0;
        conversations = {
          ...state.conversations,
          [conversationId]: {
            ...conversation,
            ...(isLatest ? { lastMessage: summarize(message), updatedAt: message.createdAt } : {}),
            unreadCount: conversation.unreadCount + unreadBump,
            ...(opts?.incoming && isNew ? { archived: conversation.muted ? conversation.archived : false } : {}),
          },
        };
      }

      // A message from someone ends their typing indicator.
      const typing = state.typing[conversationId]?.[message.senderId]
        ? { ...state.typing, [conversationId]: { ...state.typing[conversationId], [message.senderId]: 0 } }
        : state.typing;

      return { messages, conversations, typing };
    }),

  patchMessage: (conversationId, id, patch) =>
    set((state) => {
      const current = state.messages[conversationId];
      const conversation = state.conversations[conversationId];
      const next: Partial<InboxState> = {};
      if (current) {
        next.messages = { ...state.messages, [conversationId]: current.map((m) => (m.id === id || m.localId === id ? { ...m, ...patch } : m)) };
      }
      if (conversation?.lastMessage?.id === id) {
        const updated = (next.messages?.[conversationId] ?? []).find((m) => m.id === id);
        next.conversations = {
          ...state.conversations,
          [conversationId]: {
            ...conversation,
            lastMessage: updated ? summarize(updated) : { ...conversation.lastMessage, ...(patch.deletedForEveryone ? { deletedForEveryone: true, text: "" } : {}), ...(patch.text !== undefined ? { text: patch.text } : {}) },
          },
        };
      }
      return next;
    }),

  removeMessages: (conversationId, ids) =>
    set((state) => {
      const remove = new Set(ids);
      const current = state.messages[conversationId] ?? [];
      const next = current.filter((m) => !remove.has(m.id));
      const conversation = state.conversations[conversationId];
      const conversations =
        conversation?.lastMessage && remove.has(conversation.lastMessage.id)
          ? {
              ...state.conversations,
              [conversationId]: { ...conversation, lastMessage: next.length ? summarize(next[next.length - 1]) : undefined },
            }
          : state.conversations;
      return { messages: { ...state.messages, [conversationId]: next }, conversations };
    }),

  removeMessageEverywhere: (ids) => {
    const remove = new Set(ids);
    for (const [conversationId, list] of Object.entries(get().messages)) {
      const hits = list.filter((m) => remove.has(m.id)).map((m) => m.id);
      if (hits.length) get().removeMessages(conversationId, hits);
    }
  },

  clearMessages: (conversationId) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: [] },
      hasMore: { ...state.hasMore, [conversationId]: false },
      conversations: state.conversations[conversationId]
        ? { ...state.conversations, [conversationId]: { ...state.conversations[conversationId], lastMessage: undefined, unreadCount: 0 } }
        : state.conversations,
    })),

  setTyping: (conversationId, userId, typing) =>
    set((state) => ({
      typing: {
        ...state.typing,
        [conversationId]: { ...state.typing[conversationId], [userId]: typing ? Date.now() + 6000 : 0 },
      },
    })),

  setPresence: (userId, presence, lastSeen) =>
    set((state) => ({ presence: { ...state.presence, [userId]: { presence, lastSeen: lastSeen ?? state.presence[userId]?.lastSeen } } })),

  setMissedCalls: (missedCalls) => set({ missedCalls }),

  toast: (text, tone = "info", action) => {
    const id = ++toastSeq;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, text, tone, action }] }));
    window.setTimeout(() => get().dismissToast(id), action ? 6000 : 3500);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Who is typing in a conversation right now (excluding expired entries). */
export function typingUserIds(typing: Record<string, number> | undefined, now = Date.now()) {
  return Object.entries(typing ?? {})
    .filter(([, until]) => until > now)
    .map(([userId]) => userId);
}
