import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

const CATEGORIES: Record<string, string[]> = {
  Smileys: ['😀', '😂', '🥰', '😎', '🤔', '😴', '😭', '😡', '🥳', '😇', '🙃', '😜'],
  Gestures: ['👍', '👎', '👏', '🙏', '👌', '✌️', '🤝', '💪', '🙌', '👋'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💕', '💯'],
  Animals: ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐨', '🐵', '🐧', '🦄'],
  Food: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍩', '☕', '🍺', '🍰', '🍎'],
  Objects: ['🎉', '🔥', '✨', '💡', '🎁', '📸', '🎮', '🎧', '📱', '💻'],
};

const RECENTS_KEY = 'fockis_recent_emojis';

function getRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setRecents(getRecents());
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const allEmojis = useMemo(() => Object.entries(CATEGORIES), []);

  const filtered = useMemo(() => {
    if (!query) return allEmojis;
    return allEmojis.map(([cat, emojis]) => [cat, emojis] as [string, string[]]);
  }, [allEmojis, query]);

  const handleSelect = (emoji: string) => {
    const next = [emoji, ...recents.filter((e) => e !== emoji)].slice(0, 12);
    setRecents(next);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* best-effort only */
    }
    onSelect(emoji);
  };

  return (
    <div ref={ref} className="emoji-picker">
      <div className="emoji-picker__search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search emoji"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className="emoji-picker__scroll">
        {recents.length > 0 && !query && (
          <div className="emoji-picker__category">
            <h4>Recently used</h4>
            <div className="emoji-picker__grid">
              {recents.map((e, i) => (
                <button key={`${e}-${i}`} type="button" onClick={() => handleSelect(e)}>{e}</button>
              ))}
            </div>
          </div>
        )}
        {filtered.map(([category, emojis]) => (
          <div key={category} className="emoji-picker__category">
            <h4>{category}</h4>
            <div className="emoji-picker__grid">
              {emojis.map((emoji) => (
                <button key={emoji} type="button" onClick={() => handleSelect(emoji)}>{emoji}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
