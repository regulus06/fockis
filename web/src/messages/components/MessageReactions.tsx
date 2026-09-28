import type { Reaction } from '../types';
import { useCurrentUserId } from '../hooks/useCurrentUserId';

interface MessageReactionsProps {
  reactions?: Reaction[];
  onToggle: (emoji: Reaction['emoji']) => void;
}

export default function MessageReactions({ reactions, onToggle }: MessageReactionsProps) {
  const currentUserId = useCurrentUserId();

  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="message-reactions">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          className={`message-reactions__pill ${reaction.userIds.includes(currentUserId) ? 'is-active' : ''}`}
          onClick={() => onToggle(reaction.emoji)}
          aria-label={`${reaction.emoji} reacted by ${reaction.userIds.length}`}
        >
          <span>{reaction.emoji}</span>
          {reaction.userIds.length > 1 && <span className="message-reactions__count">{reaction.userIds.length}</span>}
        </button>
      ))}
    </div>
  );
}