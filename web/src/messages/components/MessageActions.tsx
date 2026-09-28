import { Reply, Smile, MoreHorizontal } from 'lucide-react';
import { REACTION_EMOJIS, type ReactionEmoji } from '../types';

interface MessageActionsProps {
  isOwn: boolean;
  onReply: () => void;
  onReact: (emoji: ReactionEmoji) => void;
  onOpenMenu: () => void;
}

export default function MessageActions({ isOwn, onReply, onReact, onOpenMenu }: MessageActionsProps) {
  return (
    <div className={`message-actions ${isOwn ? 'message-actions--own' : ''}`}>
      <div className="message-actions__quick-reactions">
        {REACTION_EMOJIS.slice(0, 3).map((emoji) => (
          <button key={emoji} type="button" onClick={() => onReact(emoji)} aria-label={`React ${emoji}`}>
            {emoji}
          </button>
        ))}
      </div>
      <button type="button" className="message-actions__icon-btn" onClick={onReply} aria-label="Reply">
        <Reply size={16} />
      </button>
      <button type="button" className="message-actions__icon-btn" onClick={onOpenMenu} aria-label="More reactions">
        <Smile size={16} />
      </button>
      <button type="button" className="message-actions__icon-btn" onClick={onOpenMenu} aria-label="More actions">
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}
