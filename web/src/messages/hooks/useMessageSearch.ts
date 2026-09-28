import { useEffect, useMemo, useState } from 'react';
import { useConversationsStore } from '../store/conversationsStore';
import { useCurrentUserId } from './useCurrentUserId';

export function useMessageSearch() {
  const [query, setQuery] = useState('');
  const currentUserId = useCurrentUserId();
  const conversations = useConversationsStore((s) => s.conversations);
  const participants = useConversationsStore((s) => s.participants);

  const results = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return conversations;
    return conversations.filter((conversation) => {
      const otherId = conversation.participantIds.find((id) => id !== currentUserId);
      const participant = otherId ? participants[otherId] : undefined;
      const name = conversation.isGroup ? conversation.groupName : participant?.name;
      return name?.toLowerCase().includes(lower);
    });
  }, [query, conversations, participants, currentUserId]);

  useEffect(() => () => setQuery(''), []);

  return { query, setQuery, results };
}