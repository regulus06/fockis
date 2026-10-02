import { Minus, X } from 'lucide-react';
import { useConversationsStore } from '../store/conversationsStore';
import { useChatWindowsStore } from '../store/chatWindowsStore';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import { useMessages } from '../hooks/useMessages';
import MessageBubble from '../components/MessageBubble';
import MessageComposer from '../components/MessageComposer';
import { useMessageScroll } from '../hooks/useMessageScroll';
import { isFirstInCluster, isLastInCluster } from '../utils/messageGrouping';

interface ChatPopupProps {
  conversationId: string;
  minimized: boolean;
  unread: number;
}

export default function ChatPopup({ conversationId, minimized, unread }: ChatPopupProps) {
  const currentUserId = useCurrentUserId();
  const conversations = useConversationsStore((s) => s.conversations);
  const participants = useConversationsStore((s) => s.participants);
  const { closeWindow, minimizeWindow, restoreWindow } = useChatWindowsStore();
  const conversation = conversations.find((c) => c.id === conversationId);
  const otherId = conversation?.participantIds.find((id) => id !== currentUserId);
  const participant = otherId ? participants[otherId] : undefined;
  const { messages } = useMessages(conversationId);
  const { containerRef, bottomRef } = useMessageScroll(messages);

  if (!conversation) return null;

  if (minimized) {
    return (
      <button type="button" className="chat-popup chat-popup--minimized" onClick={() => restoreWindow(conversationId)}>
        <img src={participant?.avatar} alt={participant?.name} />
        <span>{participant?.name}</span>
        {unread > 0 && <span className="chat-popup__badge">{unread}</span>}
      </button>
    );
  }

  return (
    <div className="chat-popup">
      <div className="chat-popup__header">
        <img src={participant?.avatar} alt={participant?.name} />
        <span className="chat-popup__name">{participant?.name}</span>
        <div className="chat-popup__actions">
          <button type="button" onClick={() => minimizeWindow(conversationId)} aria-label="Minimize"><Minus size={16} /></button>
          <button type="button" onClick={() => closeWindow(conversationId)} aria-label="Close"><X size={16} /></button>
        </div>
      </div>

      <div className="chat-popup__scroll" ref={containerRef}>
        {messages.map((message, i) => {
          const prevMessage = i > 0 ? messages[i - 1] : undefined;
          const nextMessage = i < messages.length - 1 ? messages[i + 1] : undefined;
          const senderIsSelf = message.senderId === currentUserId;
          return (
            <MessageBubble
              key={message.id}
              message={message}
              showAvatar={isLastInCluster(message, nextMessage)}
              showTail={isFirstInCluster(prevMessage, message)}
              senderName={senderIsSelf ? 'You' : participant?.name ?? ''}
              senderAvatar={senderIsSelf ? undefined : participant?.avatar}
              onReply={() => undefined}
              onForward={() => undefined}
              onScrollToReply={() => undefined}
              onOpenMedia={() => undefined}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      <MessageComposer conversationId={conversationId} />
    </div>
  );
}