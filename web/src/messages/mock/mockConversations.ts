import type { Conversation } from '../types';
import { CURRENT_USER_ID } from './mockUsers';
import { mockMessagesByConversation, conversationIds } from './mockMessages';

function buildConversation(
  id: string,
  participantId: string,
  unreadCount: number,
  opts: Partial<Conversation> = {},
): Conversation {
  const messages = mockMessagesByConversation[id];
  const last = messages[messages.length - 1];
  return {
    id,
    participantIds: [CURRENT_USER_ID, participantId],
    isGroup: false,
    lastMessageId: last?.id,
    unreadCount,
    updatedAt: last?.createdAt ?? new Date().toISOString(),
    ...opts,
  };
}

export const mockConversations: Conversation[] = [
  buildConversation(conversationIds.john, 'u-john', 0, { pinned: true }),
  buildConversation(conversationIds.sarah, 'u-sarah', 1),
  buildConversation(conversationIds.michael, 'u-michael', 2),
  buildConversation(conversationIds.david, 'u-david', 0),
  buildConversation(conversationIds.jessica, 'u-jessica', 1),
  buildConversation(conversationIds.daniel, 'u-daniel', 0, { muted: true }),
].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
