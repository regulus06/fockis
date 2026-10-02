import { REACTION_EMOJIS } from '../../constants';
import '../../styles/components/reactions.scss';

export function ReactionsTray({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="fm-reactions-tray" role="menu">
      {REACTION_EMOJIS.map((emoji) => (
        <button key={emoji} className="fm-reactions-tray__item" onClick={() => onSelect(emoji)} aria-label={`React with ${emoji}`}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
