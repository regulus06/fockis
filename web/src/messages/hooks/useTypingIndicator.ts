import { useCallback, useEffect, useRef } from 'react';
import { useMessagesStore } from '../store/messagesStore';
import { messageSocket } from '../services/messageSocket';
import { useCurrentUserId } from './useCurrentUserId';

const TYPING_TIMEOUT = 2500;

export function useTypingIndicator(conversationId: string | null) {
  const currentUserId = useCurrentUserId();
  const typingByConversation = useMessagesStore((s) => s.typingByConversation);
  const setTyping = useMessagesStore((s) => s.setTyping);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const othersTyping = conversationId
    ? (typingByConversation[conversationId] ?? []).filter((id) => id !== currentUserId)
    : [];

  const startTyping = useCallback(() => {
    if (!conversationId || !currentUserId) return;
    setTyping(conversationId, currentUserId, true);
    messageSocket.startTyping(conversationId);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTyping(conversationId, currentUserId, false);
      messageSocket.stopTyping(conversationId);
    }, TYPING_TIMEOUT);
  }, [conversationId, currentUserId, setTyping]);

  const stopTyping = useCallback(() => {
    if (!conversationId || !currentUserId) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTyping(conversationId, currentUserId, false);
    messageSocket.stopTyping(conversationId);
  }, [conversationId, currentUserId, setTyping]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { othersTyping, startTyping, stopTyping };
}