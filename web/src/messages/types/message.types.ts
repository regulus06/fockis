import type { Attachment } from './attachment.types';
import type { Reaction } from './reaction.types';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'file' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ReplyReference {
  messageId: string;
  senderName: string;
  preview: string;
  type: MessageType;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyTo?: ReplyReference;
  status: MessageStatus;
  createdAt: string;
  editedAt?: string;
  deletedForEveryone?: boolean;
  deletedForMe?: boolean;
  starred?: boolean;
  systemLabel?: string;
}

export interface TypingState {
  conversationId: string;
  userIds: string[];
}

export interface DraftState {
  [conversationId: string]: {
    text: string;
    replyTo?: ReplyReference;
    editingMessageId?: string;
  };
}
