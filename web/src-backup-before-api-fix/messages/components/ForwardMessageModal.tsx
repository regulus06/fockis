import { useState } from 'react';
import { X, Check, Send } from 'lucide-react';
import { useConversationsStore } from '../store/conversationsStore';
import { useMessagesStore } from '../store/messagesStore';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import type { Message } from '../types';

interface ForwardMessageModalProps {
  message: Message;
  onClose: () => void;
}

export default function ForwardMessageModal({ message, onClose }: ForwardMessageModalProps) {
  const currentUserId = useCurrentUserId();
  const conversations = useConversationsStore((s) => s.conversations);
  const participants = useConversationsStore((s) => s.participants);
  const sendMessage = useMessagesStore((s) => s.sendMessage);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleForward = async () => {
    await Promise.all(
      Array.from(selected).map((conversationId) =>
        sendMessage(conversationId, {
          type: message.type,
          text: message.text,
          attachments: message.attachments,
        }),
      ),
    );
    setSent(true);
    setTimeout(onClose, 900);
  };

  return (
    <div className="forward-modal-backdrop" onClick={onClose}>
      <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="forward-modal__header">
          <h3>Forward message</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="forward-modal__list">
          {conversations.map((conversation) => {
            const otherId = conversation.participantIds.find((id) => id !== currentUserId);
            const participant = otherId ? participants[otherId] : undefined;
            const isSelected = selected.has(conversation.id);
            return (
              <button
                key={conversation.id}
                type="button"
                className={`forward-modal__item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => toggle(conversation.id)}
              >
                <img src={participant?.avatar} alt={participant?.name} />
                <span>{conversation.isGroup ? conversation.groupName : participant?.name}</span>
                <span className="forward-modal__checkbox">{isSelected && <Check size={14} />}</span>
              </button>
            );
          })}
        </div>

        <div className="forward-modal__footer">
          <button
            type="button"
            className="forward-modal__send-btn"
            disabled={selected.size === 0 || sent}
            onClick={handleForward}
          >
            <Send size={16} />
            {sent ? 'Forwarded!' : `Forward to ${selected.size || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}