import { MessageCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatWindowsStore } from '../store/chatWindowsStore';
import { useConversationsStore } from '../store/conversationsStore';
import { useCurrentUserId } from '../hooks/useCurrentUserId';

export default function ChatBubbleLauncher() {
  const currentUserId = useCurrentUserId();
  const { launcherOpen, toggleLauncher, closeLauncher, openWindow } = useChatWindowsStore();
  const conversations = useConversationsStore((s) => s.conversations);
  const participants = useConversationsStore((s) => s.participants);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const navigate = useNavigate();

  return (
    <div className="floating-chat-launcher">
      {launcherOpen && (
        <div className="floating-chat-launcher__panel">
          <div className="floating-chat-launcher__header">
            <h4>Messages</h4>
            <button type="button" onClick={() => navigate('/messages')}>Open full view</button>
          </div>
          <div className="floating-chat-launcher__list">
            {conversations.slice(0, 6).map((conversation) => {
              const otherId = conversation.participantIds.find((id) => id !== currentUserId);
              const participant = otherId ? participants[otherId] : undefined;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  className="floating-chat-launcher__item"
                  onClick={() => {
                    openWindow(conversation.id);
                    closeLauncher();
                  }}
                >
                  <img src={participant?.avatar} alt={participant?.name} />
                  <span>{participant?.name}</span>
                  {conversation.unreadCount > 0 && <span className="floating-chat-launcher__badge">{conversation.unreadCount}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button type="button" className="floating-chat-launcher__btn" onClick={toggleLauncher} aria-label="Open messages">
        {launcherOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!launcherOpen && totalUnread > 0 && <span className="floating-chat-launcher__unread-badge">{totalUnread}</span>}
      </button>
    </div>
  );
}