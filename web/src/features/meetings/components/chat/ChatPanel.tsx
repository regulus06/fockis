import { useRef, useEffect } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { PanelHeader } from '../common/PanelHeader';
import { EmptyState } from '../common/EmptyState';
import { MessageSquare } from 'lucide-react';
import { mockCurrentUser } from '../../services/dev-mock/devMockData';
import '../../styles/components/chat.scss';

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const messages = useRoomStore((s) => s.chatMessages);
  const sendChatMessage = useRoomStore((s) => s.sendChatMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <div className="fm-panel">
      <PanelHeader title="Chat" onClose={onClose} />
      <div className="fm-panel__scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyState icon={<MessageSquare size={28} />} title="No messages yet" description="Say hello to the meeting." />
        ) : (
          messages.map((m) => (
            <ChatMessageItem key={m.id} message={m} isOwn={m.authorId === mockCurrentUser.id} />
          ))
        )}
      </div>
      <ChatInput onSend={(body) => sendChatMessage(body, mockCurrentUser.id, mockCurrentUser.displayName)} />
    </div>
  );
}
