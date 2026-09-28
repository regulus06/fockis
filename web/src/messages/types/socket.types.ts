import type { Message } from './message.types';

export type SocketEventName =
  | 'message:new'
  | 'message:delivered'
  | 'message:read'
  | 'typing:start'
  | 'typing:stop'
  | 'presence:update';

export interface SocketEventPayloadMap {
  'message:new': { message: Message };
  'message:delivered': { messageId: string; conversationId: string };
  'message:read': { messageId: string; conversationId: string };
  'typing:start': { conversationId: string; userId: string };
  'typing:stop': { conversationId: string; userId: string };
  'presence:update': { userId: string; presence: 'online' | 'offline'; lastSeen: string };
}

export type SocketListener<E extends SocketEventName> = (payload: SocketEventPayloadMap[E]) => void;
