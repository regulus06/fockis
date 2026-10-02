import { formatConversationTimestamp } from '../utils/dateHelpers';
import type { Conversation, Participant } from '../types';

interface ConversationItemProps {
  conversation: Conversation;
  participant?: Participant;
  title: string;
  avatar?: string;
  preview: string;
  active: boolean;
  onClick: () => void;
}

export default function ConversationItem({
  conversation,
  participant,
  title,
  avatar,
  preview,
  active,
  onClick,
}: ConversationItemProps) {
  return (
    <button type="button" className={`conversation-item ${active ? 'is-active' : ''}`} onClick={onClick}>
      <div className="conversation-item__avatar">
        <img src={avatar} alt={title} />
        {participant?.presence === 'online' && <span className="conversation-item__presence-dot" />}
      </div>
      <div className="conversation-item__body">
        <div className="conversation-item__row">
          <span className="conversation-item__name">{title}</span>
          <span className="conversation-item__time">{formatConversationTimestamp(conversation.updatedAt)}</span>
        </div>
        <div className="conversation-item__row">
          <span className="conversation-item__preview">{preview}</span>
          {conversation.unreadCount > 0 && (
            <span className="conversation-item__badge">{conversation.unreadCount}</span>
          )}
        </div>
      </div>
    </button>
  );
}
