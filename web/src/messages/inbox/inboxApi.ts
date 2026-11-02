import { FOCKIS_API_URL } from "../../config/fockisConfig";
import type { Attachment, MessageType, Reaction, ReplyReference } from "../types";

/* ============================================================================
   FOCKIS MESSAGES — REST CLIENT FOR THE REDESIGNED INBOX
   Every action in the UI goes through one of these calls.
============================================================================ */

export const API_BASE = (import.meta.env.VITE_API_URL || FOCKIS_API_URL).replace(/\/+$/, "");

export function authToken(): string | null {
  for (const key of ["access_token", "accessToken", "token", "jwt", "authToken"]) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

export function currentUserId(): string {
  const stored = localStorage.getItem("userId");
  if (stored) return stored.trim();
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return String(user?._id ?? user?.id ?? user?.userId ?? "").trim();
  } catch {
    return "";
  }
}

export function currentUserProfile(): { id: string; name: string; username: string; avatar: string } {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null") ?? {};
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name || user.username || "You";
    return { id: currentUserId(), name, username: user.username ?? "", avatar: user.profilePicture ?? user.avatar ?? "" };
  } catch {
    return { id: currentUserId(), name: "You", username: "", avatar: "" };
  }
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body?: any) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = authToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, body });
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const raw = data && typeof data === "object" ? data.message : data;
    const message = Array.isArray(raw) ? raw.join(", ") : String(raw || `Request failed (${response.status})`);
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

/* ---------------------------------------------------------------------------
   TYPES
--------------------------------------------------------------------------- */

export type Presence = "online" | "offline";

export interface InboxUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  fockisId?: string;
  presence?: Presence;
  lastSeen?: string;
  verified?: boolean;
  bio?: string;
}

export interface LastMessageSummary {
  id: string;
  senderId: string;
  type: MessageType;
  text: string;
  attachmentKind?: string;
  attachmentCount?: number;
  deletedForEveryone?: boolean;
  systemLabel?: string;
  status?: string;
  createdAt: string;
}

export interface InboxConversation {
  id: string;
  participantIds: string[];
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  otherUser?: InboxUser;
  members?: InboxUser[];
  unreadCount: number;
  updatedAt: string;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  markedUnread?: boolean;
  request?: boolean;
  lastMessage?: LastMessageSummary;
}

export interface InboxMessage {
  id: string;
  localId?: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  attachments: Attachment[];
  reactions: Reaction[];
  replyTo?: ReplyReference;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  createdAt: string;
  editedAt?: string;
  deletedForEveryone?: boolean;
  deletedForMe?: boolean;
  starred?: boolean;
  pinned?: boolean;
  pinnedAt?: string;
  forwarded?: boolean;
  callId?: string;
  systemLabel?: string;
  error?: string;
}

export type CallMedia = "voice" | "video";
export type CallStatus = "ringing" | "accepted" | "ended" | "rejected" | "missed" | "canceled" | "busy" | "failed";

export interface CallParty {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export interface CallView {
  callId: string;
  callerId: string;
  receiverId: string;
  type: CallMedia;
  status: CallStatus;
  direction: "outgoing" | "incoming";
  peer: CallParty | null;
  caller: CallParty | null;
  receiver: CallParty | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  endReason: string;
  durationSec: number;
  missed: boolean;
  delivered?: { socket: boolean; push: number };
}

/* ---------------------------------------------------------------------------
   NORMALISERS
--------------------------------------------------------------------------- */

export function toMessage(raw: any): InboxMessage {
  return {
    ...raw,
    id: String(raw?.id ?? raw?._id ?? ""),
    conversationId: String(raw?.conversationId ?? ""),
    senderId: String(raw?.senderId ?? ""),
    type: raw?.type ?? "text",
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    reactions: Array.isArray(raw?.reactions) ? raw.reactions : [],
    status: raw?.status ?? "sent",
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    deletedForEveryone: Boolean(raw?.deletedForEveryone),
    deletedForMe: Boolean(raw?.deletedForMe),
    starred: Boolean(raw?.starred),
    pinned: Boolean(raw?.pinned),
  };
}

function toUser(raw: any): InboxUser {
  const name = raw?.name || [raw?.firstName, raw?.lastName].filter(Boolean).join(" ").trim() || raw?.username || "Fockis user";
  return {
    id: String(raw?.id ?? raw?._id ?? ""),
    name,
    username: raw?.username ?? "",
    avatar: raw?.avatar ?? raw?.profilePicture ?? "",
    fockisId: raw?.fockisId ?? "",
    presence: raw?.presence ?? (raw?.online ? "online" : "offline"),
    lastSeen: raw?.lastSeen ?? "",
    verified: Boolean(raw?.verified),
    bio: raw?.bio ?? "",
  };
}

export function toConversation(raw: any): InboxConversation {
  return {
    ...raw,
    id: String(raw?.id ?? raw?._id ?? ""),
    participantIds: Array.isArray(raw?.participantIds) ? raw.participantIds.map(String) : [],
    isGroup: Boolean(raw?.isGroup),
    otherUser: raw?.otherUser ? toUser(raw.otherUser) : undefined,
    members: Array.isArray(raw?.members) ? raw.members.map(toUser) : undefined,
    unreadCount: Number(raw?.unreadCount || 0),
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  };
}

function list<T>(data: any, key: string): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

const enc = encodeURIComponent;

/* ---------------------------------------------------------------------------
   CONVERSATIONS
--------------------------------------------------------------------------- */

export const conversationsService = {
  async list() {
    return list<any>(await api("/messages/conversations"), "conversations").map(toConversation);
  },
  async get(id: string) {
    return toConversation(await api(`/messages/conversations/${enc(id)}`));
  },
  async openDirect(userId: string) {
    return toConversation(await api("/messages/conversations", { method: "POST", json: { participantIds: [userId] } }));
  },
  async createGroup(name: string, userIds: string[]) {
    return toConversation(
      await api("/messages/conversations", { method: "POST", json: { participantIds: userIds, isGroup: true, groupName: name } }),
    );
  },
  markRead: (id: string) => api(`/messages/conversations/${enc(id)}/read`, { method: "PATCH" }),
  setMuted: async (id: string, muted: boolean) =>
    toConversation(await api(`/messages/conversations/${enc(id)}/mute`, { method: "PATCH", json: { muted } })),
  setFlag: async (id: string, flag: "pin" | "archive" | "unread", value: boolean) =>
    toConversation(await api(`/messages/conversations/${enc(id)}/${flag}`, { method: "PATCH", json: { value } })),
  acceptRequest: async (id: string) => toConversation(await api(`/messages/conversations/${enc(id)}/accept-request`, { method: "PATCH" })),
  clear: (id: string) => api(`/messages/conversations/${enc(id)}/clear`, { method: "POST" }),
  async pinned(id: string) {
    return list<any>(await api(`/messages/conversations/${enc(id)}/pinned`), "messages").map(toMessage);
  },
};

/* ---------------------------------------------------------------------------
   MESSAGES
--------------------------------------------------------------------------- */

export const messagesService = {
  async list(conversationId: string, before?: string, limit = 40) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    return list<any>(await api(`/messages/conversations/${enc(conversationId)}/messages?${params}`), "messages").map(toMessage);
  },
  async search(conversationId: string, q: string) {
    return list<any>(await api(`/messages/conversations/${enc(conversationId)}/search?q=${enc(q)}`), "messages").map(toMessage);
  },
  async send(body: { conversationId: string; type: string; text?: string; attachments?: Attachment[]; replyTo?: ReplyReference }) {
    const data: any = await api("/messages", { method: "POST", json: body });
    return toMessage(data?.message && data.message.id ? data.message : data?.data ?? data);
  },
  async edit(conversationId: string, id: string, text: string) {
    const data: any = await api(`/messages/${enc(id)}`, { method: "PATCH", json: { conversationId, text } });
    return toMessage(data?.data ?? data);
  },
  deleteForMe: (conversationId: string, id: string) => api(`/messages/${enc(id)}`, { method: "DELETE", json: { conversationId } }),
  async deleteForEveryone(conversationId: string, id: string) {
    const data: any = await api(`/messages/${enc(id)}/everyone`, { method: "DELETE", json: { conversationId } });
    return toMessage(data?.data ?? data);
  },
  async star(conversationId: string, id: string) {
    return toMessage(await api(`/messages/${enc(id)}/star`, { method: "POST", json: { conversationId } }));
  },
  async react(conversationId: string, id: string, emoji: string) {
    return toMessage(await api(`/messages/${enc(id)}/reactions`, { method: "POST", json: { conversationId, emoji } }));
  },
  async pin(id: string) {
    return toMessage(await api(`/messages/${enc(id)}/pin`, { method: "POST" }));
  },
  async forward(messageId: string, conversationIds: string[]) {
    return list<any>(await api("/messages/forward", { method: "POST", json: { messageId, conversationIds } }), "messages").map(toMessage);
  },
  bulkDelete: (messageIds: string[], scope: "me" | "everyone") =>
    api<{ scope: string; deletedIds: string[]; skippedIds: string[] }>("/messages/bulk-delete", { method: "POST", json: { messageIds, scope } }),
  async starred() {
    return list<any>(await api("/messages/starred"), "messages").map(toMessage);
  },
};

/* ---------------------------------------------------------------------------
   PEOPLE
--------------------------------------------------------------------------- */

export const peopleService = {
  async search(q: string) {
    if (!q.trim()) return [];
    return list<any>(await api(`/users/search?q=${enc(q.trim())}`), "users").map(toUser).filter((u) => u.id && u.id !== currentUserId());
  },
  async friends() {
    return list<any>(await api("/friends"), "friends").map(toUser);
  },
  async blocked() {
    return list<any>(await api("/friends/blocked"), "users").map(toUser);
  },
  block: (userId: string) => api(`/friends/${enc(userId)}/block`, { method: "POST" }),
  unblock: (userId: string) => api(`/friends/${enc(userId)}/block`, { method: "DELETE" }),
  report: (body: { targetId: string; messageId?: string; reason: string; description?: string }) =>
    api("/reports", { method: "POST", json: { targetType: "account", ...body } }),
};

/* ---------------------------------------------------------------------------
   CALLS
--------------------------------------------------------------------------- */

export const callsService = {
  start: (receiverId: string, type: CallMedia, deviceId?: string) =>
    api<CallView>("/calls", { method: "POST", json: { receiverId, type, ...(deviceId ? { deviceId } : {}) } }),
  accept: (callId: string, deviceId?: string) =>
    api<CallView>(`/calls/${enc(callId)}/accept`, { method: "POST", json: deviceId ? { deviceId } : {} }),
  decline: (callId: string) => api<CallView>(`/calls/${enc(callId)}/decline`, { method: "POST" }),
  end: (callId: string) => api<CallView>(`/calls/${enc(callId)}/end`, { method: "POST" }),
  get: (callId: string) => api<CallView>(`/calls/${enc(callId)}`),
  pending: () => api<CallView[]>("/calls/pending"),
  token: (callId: string) => api<{ token: string; url: string; roomName: string }>(`/calls/${enc(callId)}/token`, { method: "POST" }),
  history: (filter = "all", before?: string) =>
    api<{ items: CallView[]; nextCursor: string | null }>(`/calls/history?filter=${enc(filter)}${before ? `&before=${enc(before)}` : ""}`),
  missedCount: () => api<{ count: number }>("/calls/missed-count"),
  markMissedSeen: () => api("/calls/missed/seen", { method: "POST" }),
};

export const devicesService = {
  list: () =>
    api<Array<{ deviceId: string; platform: string; deviceName: string; appVersion: string; lastSeenAt: string | null; pushEnabled: boolean }>>(
      "/devices",
    ),
  remove: (deviceId: string) => api(`/devices/${enc(deviceId)}`, { method: "DELETE" }),
};
