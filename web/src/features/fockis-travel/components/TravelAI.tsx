import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export interface TravelAIProps {
  variant?: 'preview' | 'chat';
  initialMessages?: AIChatMessage[];
}

const DEFAULT_MESSAGES: AIChatMessage[] = [
  {
    id: 'm1',
    role: 'user',
    text:
      "I'm visiting Haiti for 7 days. I need a comfortable hotel, airport pickup, a rental car, two cultural experiences and a meeting room for one afternoon.",
  },
];

/**
 * Fockis Travel AI assistant. This is a frontend-only shell: it does not
 * call a real model. It renders the conversation and forwards the trip
 * request to the trip planner page, ready to be wired up to a live
 * assistant service later.
 */
export default function TravelAI({ variant = 'preview', initialMessages = DEFAULT_MESSAGES }: TravelAIProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', text: draft.trim() }]);
    setDraft('');
    // Frontend-only placeholder response — replace with a real assistant call.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${prev.length}`,
          role: 'ai',
          text: "Got it — I'll put together a suggested itinerary based on that. Open the trip planner to review and adjust it.",
        },
      ]);
    }, 400);
  }

  if (variant === 'chat') {
    return (
      <div className="ai-shell ai-shell--compact">
        <div className="ai-chat" role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`ai-chat__bubble ai-chat__bubble--${m.role}`}>
              {m.text}
            </div>
          ))}
        </div>
        <form className="ai-chat-input" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Tell Fockis where you want to go…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Message the Fockis Travel AI assistant"
          />
          <button type="submit" className="icon-btn" aria-label="Send message">
            <Send size={15} aria-hidden="true" />
          </button>
        </form>
      </div>
    );
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  return (
    <div className="ai-shell">
      <div className="ai-prompt">"{lastUserMessage?.text}"</div>
      <div className="ai-response">
        <span className="k"><Sparkles size={11} aria-hidden="true" style={{ verticalAlign: -1, marginRight: 4 }} />Suggested trip</span>
        <div className="item"><span>🏨 Hotel</span><span className="mono">7 nights</span></div>
        <div className="item"><span>🚐 Airport transfer</span><span className="mono">Round trip</span></div>
        <div className="item"><span>🚗 Rental car</span><span className="mono">7 days</span></div>
        <div className="item"><span>💼 Meeting room</span><span className="mono">1 afternoon</span></div>
        <div className="item"><span>🏝️ Cultural experiences</span><span className="mono">×2</span></div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          onClick={() => navigate('/travel/trip-planner')}
        >
          Plan my trip →
        </button>
      </div>
    </div>
  );
}
