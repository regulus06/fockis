import {
  MessageCircle,
  SendHorizontal,
  X,
} from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  ViewerChatMessage,
} from "../hooks/useLiveViewer";

import { formatRelativeTime } from "../utils";

const MAX_RENDERED_MESSAGES = 200;

interface ViewerChatProps {
  messages: ViewerChatMessage[];
  onSend: (message: string) => void | Promise<void>;
  title?: string;
  description?: string;
  onClose?: () => void;
}

/**
 * Full chat panel. Docked beside the video on desktop, a bottom sheet on
 * phones. Messages are newest-first like the studio.
 */
export function ViewerChat({
  messages,
  onSend,
  title,
  description,
  onClose,
}: ViewerChatProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const visible = messages.slice(-MAX_RENDERED_MESSAGES).reverse();

  useLayoutEffect(() => {
    if (listRef.current && stickRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [visible.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const value = message.trim();
    if (!value || sending) return;

    setSending(true);
    setError(null);

    try {
      await onSend(value);
      setMessage("");
      stickRef.current = true;
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Your message couldn't be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className="viewer-chat" aria-label="Live chat">
      {(title || description) && (
        <div className="viewer-chat__about">
          {title && <h1>{title}</h1>}
          {description && <p>{description}</p>}
        </div>
      )}

      <div className="viewer-chat__header">
        <h2>
          <MessageCircle size={18} aria-hidden="true" />
          Live chat
        </h2>

        <span className="viewer-chat__count">{messages.length}</span>

        {onClose && (
          <button type="button" className="viewer-chat__close" onClick={onClose} aria-label="Close chat">
            <X size={18} />
          </button>
        )}
      </div>

      <div
        className="viewer-chat__messages"
        ref={listRef}
        onScroll={(event) => {
          stickRef.current = event.currentTarget.scrollTop < 48;
        }}
        aria-live="polite"
        aria-relevant="additions"
      >
        {visible.length === 0 ? (
          <div className="viewer-chat__empty">
            <MessageCircle size={26} aria-hidden="true" />
            <strong>Welcome to the live</strong>
            <span>Be the first to say something.</span>
          </div>
        ) : (
          <ul>
            {visible.map((item, index) => {
              const name = item.displayName || item.username || "Viewer";

              return (
                <li className="viewer-chat__message" key={item.id || `${index}-${item.createdAt ?? ""}`}>
                  <span className="viewer-chat__avatar" aria-hidden="true">
                    {item.avatarUrl ? <img src={item.avatarUrl} alt="" loading="lazy" /> : name.charAt(0).toUpperCase()}
                  </span>

                  <div className="viewer-chat__body">
                    <span className="viewer-chat__username">
                      {name}
                      {item.createdAt && <time>{formatRelativeTime(item.createdAt)}</time>}
                    </span>
                    <p>{item.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="viewer-chat__error" role="alert">{error}</p>}

      <form className="viewer-chat__form" onSubmit={submit}>
        <label htmlFor="viewer-chat-input" className="viewer-sr-only">Chat message</label>
        <input
          id="viewer-chat-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Say something…"
          maxLength={500}
          autoComplete="off"
          enterKeyHint="send"
          disabled={sending}
        />

        <button type="submit" disabled={!message.trim() || sending} aria-label="Send message">
          <SendHorizontal size={19} />
        </button>
      </form>
    </aside>
  );
}
