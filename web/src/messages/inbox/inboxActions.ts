import { messageSocket } from "../services/messageSocket";
import { messageUploadApi } from "../services/messageUploadApi";
import type { Attachment, AttachmentKind, ReplyReference } from "../types";
import {
  conversationsService,
  currentUserId,
  messagesService,
  peopleService,
  toMessage,
  type InboxConversation,
  type InboxMessage,
} from "./inboxApi";
import { useInbox } from "./inboxStore";

/* ============================================================================
   INBOX ACTIONS
   Every button in the Messages UI calls one of these. Each one talks to the
   real API, updates the store optimistically where it is safe to, and rolls
   back with a visible error when the server refuses.
============================================================================ */

const store = () => useInbox.getState();
const PAGE = 40;

function fail(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  store().toast(message, "error");
}

/* ---------------------------------------------------------------------------
   CONVERSATIONS
--------------------------------------------------------------------------- */

export async function loadConversations() {
  try {
    const list = await conversationsService.list();
    store().setConversations(list);
    for (const c of list) messageSocket.joinConversation(c.id);
  } catch (error) {
    store().setLoadError(error instanceof Error ? error.message : "Couldn't load your conversations.");
  }
}

export async function ensureConversation(id: string) {
  if (store().conversations[id]) return store().conversations[id];
  try {
    const conversation = await conversationsService.get(id);
    store().upsertConversation(conversation);
    messageSocket.joinConversation(id);
    return conversation;
  } catch {
    return null;
  }
}

export async function openConversation(id: string) {
  store().setActive(id);
  messageSocket.joinConversation(id);
  if (!store().messages[id]) {
    try {
      const list = await messagesService.list(id, undefined, PAGE);
      store().setMessages(id, list, "replace", list.length >= PAGE);
    } catch (error) {
      store().setMessages(id, [], "replace", false);
      fail(error, "Couldn't load messages.");
    }
  }
  void markConversationRead(id);
}

export async function loadOlder(conversationId: string) {
  const list = store().messages[conversationId] ?? [];
  const oldest = list.find((m) => m.id && !m.localId);
  if (!oldest || store().hasMore[conversationId] === false) return 0;
  try {
    const older = await messagesService.list(conversationId, oldest.id, PAGE);
    store().setMessages(conversationId, older, "prepend", older.length >= PAGE);
    return older.length;
  } catch (error) {
    fail(error, "Couldn't load earlier messages.");
    return 0;
  }
}

export async function markConversationRead(id: string) {
  const conversation = store().conversations[id];
  if (!conversation) return;
  const lastIncoming = [...(store().messages[id] ?? [])].reverse().find((m) => m.senderId !== currentUserId() && m.id && !m.localId);
  if (!conversation.unreadCount && !conversation.markedUnread && !lastIncoming) return;
  store().patchConversation(id, { unreadCount: 0, markedUnread: false });
  try {
    if (lastIncoming) messageSocket.emitRaw("message:read", { conversationId: id, messageId: lastIncoming.id });
    if (conversation.unreadCount || conversation.markedUnread) await conversationsService.markRead(id);
  } catch {
    /* the counter is refreshed on the next list load */
  }
}

async function applyConversation(id: string, run: () => Promise<InboxConversation>, optimistic: Partial<InboxConversation>, failure: string) {
  const before = store().conversations[id];
  store().patchConversation(id, optimistic);
  try {
    const updated = await run();
    store().upsertConversation({ ...updated, lastMessage: updated.lastMessage ?? before?.lastMessage });
    return true;
  } catch (error) {
    if (before) store().upsertConversation(before);
    fail(error, failure);
    return false;
  }
}

export const toggleMute = (c: InboxConversation) =>
  applyConversation(c.id, () => conversationsService.setMuted(c.id, !c.muted), { muted: !c.muted }, "Couldn't change notifications.").then(
    (ok) => ok && store().toast(c.muted ? "Notifications on" : "Conversation muted", "success"),
  );

export const togglePinConversation = (c: InboxConversation) =>
  applyConversation(c.id, () => conversationsService.setFlag(c.id, "pin", !c.pinned), { pinned: !c.pinned }, "Couldn't pin the conversation.");

export async function toggleArchive(c: InboxConversation) {
  const ok = await applyConversation(c.id, () => conversationsService.setFlag(c.id, "archive", !c.archived), { archived: !c.archived }, "Couldn't archive.");
  if (ok) {
    if (!c.archived && store().activeId === c.id) store().setActive(null);
    store().toast(c.archived ? "Moved back to your chats" : "Conversation archived", "success", {
      label: "Undo",
      run: () => void toggleArchive({ ...c, archived: !c.archived }),
    });
  }
}

export const markUnread = (c: InboxConversation) =>
  applyConversation(c.id, () => conversationsService.setFlag(c.id, "unread", true), { markedUnread: true }, "Couldn't mark as unread.").then((ok) => {
    if (ok && store().activeId === c.id) store().setActive(null);
  });

export const acceptRequest = (c: InboxConversation) =>
  applyConversation(c.id, () => conversationsService.acceptRequest(c.id), { request: false }, "Couldn't accept the request.").then(
    (ok) => ok && store().toast("Request accepted", "success"),
  );

export async function clearConversation(c: InboxConversation) {
  try {
    await conversationsService.clear(c.id);
    store().clearMessages(c.id);
    store().toast("Chat cleared", "success");
  } catch (error) {
    fail(error, "Couldn't clear the chat.");
  }
}

export async function startDirect(userId: string) {
  try {
    const conversation = await conversationsService.openDirect(userId);
    store().upsertConversation(conversation);
    store().setView("messages");
    await openConversation(conversation.id);
    return conversation;
  } catch (error) {
    fail(error, "Couldn't start the conversation.");
    return null;
  }
}

export async function createGroup(name: string, userIds: string[]) {
  try {
    const conversation = await conversationsService.createGroup(name, userIds);
    store().upsertConversation(conversation);
    store().setView("messages");
    await openConversation(conversation.id);
    store().toast("Group created", "success");
    return conversation;
  } catch (error) {
    fail(error, "Couldn't create the group.");
    return null;
  }
}

/* ---------------------------------------------------------------------------
   SENDING
--------------------------------------------------------------------------- */

const ATTACHMENT_KEYS = ["id", "kind", "url", "name", "size", "mimeType", "width", "height", "duration", "waveform", "thumbnailUrl", "caption"] as const;

function cleanAttachment(a: Attachment): Attachment {
  const out: Record<string, unknown> = {};
  for (const key of ATTACHMENT_KEYS) if (a[key] !== undefined && a[key] !== null) out[key] = a[key];
  return out as unknown as Attachment;
}

function localMessage(conversationId: string, patch: Partial<InboxMessage>): InboxMessage {
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: "",
    localId,
    conversationId,
    senderId: currentUserId(),
    type: "text",
    attachments: [],
    reactions: [],
    status: "sending",
    createdAt: new Date().toISOString(),
    ...patch,
  };
}

async function deliver(draft: InboxMessage) {
  store().upsertMessage(draft);
  try {
    const saved = await messagesService.send({
      conversationId: draft.conversationId,
      type: draft.type,
      ...(draft.text ? { text: draft.text } : {}),
      ...(draft.attachments.length ? { attachments: draft.attachments.map(cleanAttachment) } : {}),
      ...(draft.replyTo ? { replyTo: draft.replyTo } : {}),
    });
    // The socket echo may have arrived before the REST response: keep one copy.
    const current = store().messages[draft.conversationId] ?? [];
    if (current.some((m) => m.id === saved.id && m.localId !== draft.localId)) {
      useInbox.setState((state) => ({
        messages: { ...state.messages, [draft.conversationId]: current.filter((m) => m.localId !== draft.localId) },
      }));
    } else {
      store().patchMessage(draft.conversationId, draft.localId!, { ...saved, localId: draft.localId, status: saved.status ?? "sent" });
    }
    store().upsertMessage({ ...saved, status: saved.status ?? "sent" });
  } catch (error) {
    store().patchMessage(draft.conversationId, draft.localId!, {
      status: "failed",
      error: error instanceof Error ? error.message : "Not sent",
    });
  }
}

export function sendText(conversationId: string, text: string, replyTo?: ReplyReference) {
  const clean = text.trim();
  if (!clean) return;
  messageSocket.stopTyping(conversationId);
  void deliver(localMessage(conversationId, { type: "text", text: clean, replyTo }));
}

export function kindOf(file: File): AttachmentKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export async function sendFiles(conversationId: string, files: File[], caption = "", replyTo?: ReplyReference) {
  for (const [index, file] of files.entries()) {
    const kind = kindOf(file);
    const previewUrl = kind === "image" || kind === "video" ? URL.createObjectURL(file) : "";
    const draft = localMessage(conversationId, {
      type: kind,
      text: index === 0 && caption.trim() ? caption.trim() : undefined,
      replyTo: index === 0 ? replyTo : undefined,
      attachments: [{ id: "uploading", kind, url: previewUrl, name: file.name, size: file.size, mimeType: file.type || "application/octet-stream" }],
    });
    store().upsertMessage(draft);
    try {
      const attachment = await messageUploadApi.upload(file, kind, {
        onProgress: (progress: number) => store().patchMessage(conversationId, draft.localId!, { error: progress < 100 ? `${progress}%` : undefined }),
      });
      await deliver({ ...draft, attachments: [attachment], error: undefined });
    } catch (error) {
      store().patchMessage(conversationId, draft.localId!, { status: "failed", error: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      if (previewUrl) window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
    }
  }
}

export async function sendVoice(conversationId: string, blob: Blob, duration: number, waveform: number[]) {
  const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
  const draft = localMessage(conversationId, {
    type: "audio",
    attachments: [{ id: "uploading", kind: "audio", url: URL.createObjectURL(blob), name: file.name, size: file.size, mimeType: file.type, duration, waveform }],
  });
  store().upsertMessage(draft);
  try {
    const attachment = await messageUploadApi.upload(file, "audio");
    await deliver({ ...draft, attachments: [{ ...attachment, duration, waveform }] });
  } catch (error) {
    store().patchMessage(conversationId, draft.localId!, { status: "failed", error: error instanceof Error ? error.message : "Upload failed" });
  }
}

export function retry(message: InboxMessage) {
  if (message.attachments.some((a) => a.id === "uploading")) {
    store().toast("Attach the file again to retry.", "info");
    store().removeMessages(message.conversationId, [message.id]);
    return;
  }
  void deliver({ ...message, status: "sending", error: undefined });
}

export function discardFailed(message: InboxMessage) {
  const list = (store().messages[message.conversationId] ?? []).filter((m) => m.localId !== message.localId);
  store().setMessages(message.conversationId, list, "replace", store().hasMore[message.conversationId] ?? false);
}

/* ---------------------------------------------------------------------------
   MESSAGE ACTIONS
--------------------------------------------------------------------------- */

export async function editMessage(message: InboxMessage, text: string) {
  const clean = text.trim();
  if (!clean || clean === message.text) return;
  const before = { text: message.text, editedAt: message.editedAt };
  store().patchMessage(message.conversationId, message.id, { text: clean, editedAt: new Date().toISOString() });
  try {
    const saved = await messagesService.edit(message.conversationId, message.id, clean);
    store().patchMessage(message.conversationId, message.id, { text: saved.text, editedAt: saved.editedAt });
  } catch (error) {
    store().patchMessage(message.conversationId, message.id, before);
    fail(error, "Couldn't edit the message.");
  }
}

export async function deleteForMe(message: InboxMessage) {
  const snapshot = store().messages[message.conversationId] ?? [];
  store().removeMessages(message.conversationId, [message.id]);
  try {
    await messagesService.deleteForMe(message.conversationId, message.id);
  } catch (error) {
    store().setMessages(message.conversationId, snapshot, "replace", store().hasMore[message.conversationId] ?? false);
    fail(error, "Couldn't delete the message.");
  }
}

export async function deleteForEveryone(message: InboxMessage) {
  store().patchMessage(message.conversationId, message.id, { deletedForEveryone: true, text: "", attachments: [], reactions: [], pinned: false });
  try {
    await messagesService.deleteForEveryone(message.conversationId, message.id);
  } catch (error) {
    store().patchMessage(message.conversationId, message.id, {
      deletedForEveryone: false,
      text: message.text,
      attachments: message.attachments,
      reactions: message.reactions,
      pinned: message.pinned,
    });
    fail(error, "Couldn't delete the message for everyone.");
  }
}

export async function toggleStar(message: InboxMessage) {
  store().patchMessage(message.conversationId, message.id, { starred: !message.starred });
  try {
    const saved = await messagesService.star(message.conversationId, message.id);
    store().patchMessage(message.conversationId, message.id, { starred: saved.starred });
    store().toast(saved.starred ? "Message starred" : "Removed from starred", "success");
  } catch (error) {
    store().patchMessage(message.conversationId, message.id, { starred: message.starred });
    fail(error, "Couldn't star the message.");
  }
}

export async function react(message: InboxMessage, emoji: string) {
  const me = currentUserId();
  const reactions = message.reactions.map((r) => ({ ...r, userIds: r.userIds.filter((id) => id !== me) })).filter((r) => r.userIds.length);
  const had = message.reactions.some((r) => r.emoji === emoji && r.userIds.includes(me));
  const optimistic = had
    ? reactions
    : (() => {
        const existing = reactions.find((r) => r.emoji === emoji);
        return existing ? reactions.map((r) => (r === existing ? { ...r, userIds: [...r.userIds, me] } : r)) : [...reactions, { emoji: emoji as any, userIds: [me] }];
      })();
  store().patchMessage(message.conversationId, message.id, { reactions: optimistic });
  try {
    const saved = await messagesService.react(message.conversationId, message.id, emoji);
    store().patchMessage(message.conversationId, message.id, { reactions: saved.reactions });
  } catch (error) {
    store().patchMessage(message.conversationId, message.id, { reactions: message.reactions });
    fail(error, "Couldn't add the reaction.");
  }
}

export async function togglePinMessage(message: InboxMessage) {
  store().patchMessage(message.conversationId, message.id, { pinned: !message.pinned });
  try {
    const saved = await messagesService.pin(message.id);
    store().patchMessage(message.conversationId, message.id, { pinned: saved.pinned, pinnedAt: saved.pinnedAt });
    store().toast(saved.pinned ? "Message pinned" : "Message unpinned", "success");
  } catch (error) {
    store().patchMessage(message.conversationId, message.id, { pinned: message.pinned });
    fail(error, "Couldn't pin the message.");
  }
}

export async function forwardMessage(message: InboxMessage, conversationIds: string[]) {
  try {
    const created = await messagesService.forward(message.id, conversationIds);
    for (const m of created) store().upsertMessage(toMessage(m));
    store().toast(conversationIds.length > 1 ? `Forwarded to ${conversationIds.length} chats` : "Message forwarded", "success");
    return true;
  } catch (error) {
    fail(error, "Couldn't forward the message.");
    return false;
  }
}

export async function bulkDelete(conversationId: string, ids: string[], scope: "me" | "everyone") {
  try {
    const result = await messagesService.bulkDelete(ids, scope);
    if (scope === "me") store().removeMessages(conversationId, result.deletedIds);
    else for (const id of result.deletedIds) store().patchMessage(conversationId, id, { deletedForEveryone: true, text: "", attachments: [], reactions: [], pinned: false });
    if (result.skippedIds.length) {
      store().toast(`${result.deletedIds.length} deleted · ${result.skippedIds.length} couldn't be deleted for everyone`, "info");
    } else {
      store().toast(`${result.deletedIds.length} message${result.deletedIds.length === 1 ? "" : "s"} deleted`, "success");
    }
    return true;
  } catch (error) {
    fail(error, "Couldn't delete the messages.");
    return false;
  }
}

export async function copyText(message: InboxMessage) {
  const text = message.text || message.attachments.map((a) => a.url).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    store().toast("Copied", "success");
  } catch {
    store().toast("Copy isn't available in this browser.", "error");
  }
}

/* ---------------------------------------------------------------------------
   PEOPLE
--------------------------------------------------------------------------- */

export async function blockUser(userId: string, name: string) {
  try {
    await peopleService.block(userId);
    store().toast(`${name} blocked`, "success");
    return true;
  } catch (error) {
    fail(error, "Couldn't block this account.");
    return false;
  }
}

export async function unblockUser(userId: string, name: string) {
  try {
    await peopleService.unblock(userId);
    store().toast(`${name} unblocked`, "success");
    return true;
  } catch (error) {
    fail(error, "Couldn't unblock this account.");
    return false;
  }
}

export async function reportUser(targetId: string, reason: string, description: string, messageId?: string) {
  try {
    await peopleService.report({ targetId, reason, ...(description.trim() ? { description: description.trim() } : {}), ...(messageId ? { messageId } : {}) });
    store().toast("Report sent. Our team will review it.", "success");
    return true;
  } catch (error) {
    fail(error, "Couldn't send the report.");
    return false;
  }
}

/** Short text for previews: "Photo", "Voice message", "This message was deleted", … */
export function previewText(m: { type: string; text?: string; deletedForEveryone?: boolean; systemLabel?: string; attachmentKind?: string; attachments?: Attachment[] }) {
  if (m.deletedForEveryone) return "This message was deleted";
  if (m.type === "system") return m.systemLabel || m.text || "";
  if (m.text) return m.text;
  const kind = m.attachmentKind ?? m.attachments?.[0]?.kind ?? m.type;
  if (kind === "image") return "📷 Photo";
  if (kind === "video") return "🎬 Video";
  if (kind === "audio") return "🎤 Voice message";
  if (kind === "document" || kind === "file") return "📄 Document";
  return "";
}
