import { api } from "../../../api/api";

export interface ChatMessage {
_id: string;
conversationId: string;
senderId: string;
content: string;
mediaUrl?: string;
voiceUrl?: string;
status?: "sent" | "delivered" | "read";
isDeleted?: boolean;
isEdited?: boolean;
createdAt: string;
updatedAt?: string;
}

export interface Conversation {
_id: string;
participants: string[];
lastMessageAt?: string;
createdAt?: string;
updatedAt?: string;
}

export interface SendMessageData {
conversationId: string;
senderId: string;
content?: string;
mediaUrl?: string;
voiceUrl?: string;
}

export interface CreateConversationData {
userId: string;
receiverId: string;
}

export const chatApi = {
// =========================
// GET SELLER INBOX
// Backend: GET /messages/inbox
// =========================
getSellerMessages: async (): Promise<Conversation[]> => {
const response = await api.get<Conversation[]>("/messages/inbox");

return response.data;
},

// =========================
// GET MESSAGES
// Backend: GET /messages/:conversationId
// =========================
getMessages: async (
conversationId: string,
): Promise<ChatMessage[]> => {
const response = await api.get<ChatMessage[]>(
`/messages/${conversationId}`,
);

return response.data;

},

// =========================
// SEND MESSAGE
// Backend: POST /messages
// =========================
sendMessage: async (
data: SendMessageData,
): Promise<ChatMessage> => {
const response = await api.post<ChatMessage>(
"/messages",
data,
);
return response.data;

},

// =========================
// CREATE CONVERSATION
// Backend: POST /messages/conversation
// =========================
createConversation: async (
data: CreateConversationData,
): Promise<Conversation> => {
const response = await api.post<Conversation>(
"/messages/conversation",
data,
);

return response.data;

},

// =========================
// EDIT MESSAGE
// Backend: PATCH /messages/:messageId
// =========================
editMessage: async (
messageId: string,
content: string,
): Promise<ChatMessage> => {
const response = await api.patch<ChatMessage>(
`/messages/${messageId}`,
{
content,
},
);

return response.data;

},

// =========================
// DELETE MESSAGE
// Backend: DELETE /messages/:messageId
// =========================
deleteMessage: async (
messageId: string,
): Promise<ChatMessage> => {
const response = await api.delete<ChatMessage>(
`/messages/${messageId}`,
);
return response.data;

},
};
