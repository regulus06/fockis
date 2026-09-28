import { Avatar } from '../common/Avatar';
import type { ChatMessage } from '../../types';
import '../../styles/components/chat.scss';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ChatMessageItem({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={`fm-chat-msg ${isOwn ? 'fm-chat-msg--own' : ''}`}>
      <Avatar name={message.authorName} size="sm" />
      <div className="fm-chat-msg__body">
        <div className="fm-chat-msg__meta">
          <span className="fm-chat-msg__author">{message.authorName}</span>
          <span className="fm-chat-msg__time">{formatTime(message.sentAt)}</span>
        </div>
        <div className="fm-chat-msg__text">{message.body}</div>
      </div>
    </div>
  );
}
