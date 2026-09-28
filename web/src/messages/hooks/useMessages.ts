import { useEffect, useMemo } from 'react';
import { useMessagesStore } from '../store/messagesStore';
import { groupMessagesByDay } from '../utils/messageGrouping';
import { formatMessageDateLabel } from '../utils/dateHelpers';

export function useMessages(conversationId: string | null) {
  const messagesByConversation = useMessagesStore((s) => s.messagesByConversation);
  const loadingByConversation = useMessagesStore((s) => s.loadingByConversation);
  const loadMessages = useMessagesStore((s) => s.loadMessages);

  useEffect(() => {
    if (conversationId) loadMessages(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const messages = useMemo(
    () => (conversationId ? messagesByConversation[conversationId] ?? [] : []),
    [conversationId, messagesByConversation],
  );

  const visibleMessages = useMemo(() => messages.filter((m) => !m.deletedForMe), [messages]);

  const groups = useMemo(() => groupMessagesByDay(visibleMessages, formatMessageDateLabel), [visibleMessages]);

  return {
    messages: visibleMessages,
    groups,
    loading: conversationId ? !!loadingByConversation[conversationId] : false,
  };
}
