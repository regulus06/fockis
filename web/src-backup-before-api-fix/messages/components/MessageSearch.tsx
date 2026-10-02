import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Message } from '../types';
import { messagesApi } from '../services/messagesApi';
import { formatMessageDateLabel } from '../utils/dateHelpers';
import { truncate } from '../utils/messageFormatting';

interface MessageSearchProps {
  conversationId: string;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
}

export default function MessageSearch({ conversationId, onClose, onJumpToMessage }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);

  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    messagesApi.search(query).then((all) => {
      if (active) setResults(all.filter((m) => m.conversationId === conversationId));
    });
    return () => {
      active = false;
    };
  }, [query, conversationId]);

  return (
    <div className="message-search">
      <div className="message-search__bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search in this conversation"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="button" onClick={onClose} aria-label="Close search"><X size={18} /></button>
      </div>
      {query && (
        <div className="message-search__results">
          {results.length === 0 && <p className="message-search__empty">No messages found</p>}
          {results.map((m) => (
            <button key={m.id} type="button" className="message-search__result" onClick={() => onJumpToMessage(m.id)}>
              <span className="message-search__result-date">{formatMessageDateLabel(m.createdAt)}</span>
              <span className="message-search__result-text">{truncate(m.text ?? '', 90)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
