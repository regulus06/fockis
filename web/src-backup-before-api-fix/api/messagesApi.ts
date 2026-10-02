import { api } from "./api";

// =====================
// INBOX (CONVERSATIONS)
// =====================
export function getInbox(userId: string) {
  return api.get(`/messages/inbox/${userId}`);
}

// =====================
// GET MESSAGES BY CONVERSATION
// =====================
export function getMessages(conversationId: string) {
  return api.get(`/messages/${conversationId}`);
}

// =====================
// SEND MESSAGE
// =====================
export function sendMessage(data: {
  conversationId: string;
  senderId: string;
  content?: string;
  mediaUrl?: string;
  voiceUrl?: string;
}) {
  return api.post("/messages", data);
}

// =====================
// CREATE CONVERSATION
// =====================
export function createConversation(data: {
  userId: string;
  receiverId: string;
}) {
  return api.post("/messages/conversation", data);
}

// =====================
// EDIT MESSAGE
// =====================
export function editMessage(messageId: string, content: string) {
  return api.patch(`/messages/${messageId}`, { content });
}

// =====================
// DELETE MESSAGE
// =====================
export function deleteMessage(messageId: string) {
  return api.delete(`/messages/${messageId}`);
}