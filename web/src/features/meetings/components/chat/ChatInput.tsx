import { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import '../../styles/components/chat.scss';

export function ChatInput({ onSend }: { onSend: (body: string) => void }) {
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <div className="fm-chat-input">
      <button className="fm-chat-input__attach" aria-label="Attach file"><Paperclip size={16} /></button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Message everyone"
      />
      <button className="fm-chat-input__send" onClick={submit} aria-label="Send message" disabled={!value.trim()}>
        <Send size={16} />
      </button>
    </div>
  );
}
