import { useRef, useEffect } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { PanelHeader } from '../common/PanelHeader';
import { EmptyState } from '../common/EmptyState';
import { MessageSquare } from 'lucide-react';
import { mockCurrentUser } from '../../services/dev-mock/devMockData';
import '../../styles/components/chat.scss';

interface ChatPanelProps {
  onClose: () => void;
  /** Rendered inside the room sidebar tabs, which provide their own header. */
  embedded?: boolean;
  /** Author for messages sent from this browser. */
  authorId?: string;
  authorName?: string;
}

export function ChatPanel({ onClose, embedded = false, authorId, authorName }: ChatPanelProps) {
  const messages = useRoomStore((s) => s.chatMessages);
  const sendChatMessage = useRoomStore((s) => s.sendChatMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selfId = authorId || mockCurrentUser.id;
  const selfName = authorName || mockCurrentUser.displayName;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const handleSend = (body: string) => {
    // The store expects a complete ChatMessage object.
    sendChatMessage({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId: selfId,
      authorName: selfName,
      body,
      sentAt: new Date().toISOString(),
    });
  };

  return (
    <div className={`fm-panel${embedded ? ' fm-panel--embedded' : ''}`}>
      {!embedded && <PanelHeader title="Chat" onClose={onClose} />}
      <div className="fm-panel__scroll" ref={scrollRef} aria-live="polite">
        {messages.length === 0 ? (
          <EmptyState icon={<MessageSquare size={28} />} title="No messages yet" description="Say hello to the meeting." />
        ) : (
          messages.map((m) => (
            <ChatMessageItem key={m.id} message={m} isOwn={m.authorId === selfId} />
          ))
        )}
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
}
