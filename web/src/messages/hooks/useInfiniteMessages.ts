import { useCallback, useRef, useState } from 'react';
import { useMessagesStore } from '../store/messagesStore';

/** Loads older messages when the user scrolls near the top of the chat. */
export function useInfiniteMessages(conversationId: string | null) {
  const loadMore = useMessagesStore((s) => s.loadMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const guard = useRef(false);

  const handleScroll = useCallback(
    async (event: React.UIEvent<HTMLDivElement>) => {
      if (!conversationId || guard.current) return;
      const target = event.currentTarget;
      if (target.scrollTop < 80) {
        guard.current = true;
        setLoadingMore(true);
        const prevHeight = target.scrollHeight;
        await loadMore(conversationId);
        requestAnimationFrame(() => {
          target.scrollTop = target.scrollHeight - prevHeight;
        });
        setLoadingMore(false);
        guard.current = false;
      }
    },
    [conversationId, loadMore],
  );

  return { handleScroll, loadingMore };
}
