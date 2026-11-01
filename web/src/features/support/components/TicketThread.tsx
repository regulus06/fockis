import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

import type { SupportAttachment, SupportMessage } from "../types";
import { formatDateTime } from "../utils/helpFormat";
import { AttachmentList, AttachmentPicker } from "./Attachments";

export function MessageList({
  messages,
  userName = "You",
  resolveFile,
}: {
  messages: SupportMessage[];
  userName?: string;
  resolveFile?: (key: string) => Promise<{ url: string }>;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="fk-help-thread" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id} className={`fk-help-msg fk-help-msg--${m.author}`}>
          {m.body && <div className="fk-help-msg__bubble">{m.body}</div>}
          {resolveFile && m.attachments?.length > 0 && <AttachmentList files={m.attachments} resolve={resolveFile} />}
          <span className="fk-help-msg__meta">
            {m.author === "agent" ? "Fockis Support" : userName} · {formatDateTime(m.createdAt)}
          </span>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

/** Message box with attachments; Enter sends, Shift+Enter adds a line. */
export function Composer({
  onSend,
  disabled,
  placeholder = "Write a reply…",
}: {
  onSend: (body: string, attachments: SupportAttachment[]) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<SupportAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const ready = Boolean(body.trim() || files.length);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!ready || sending) return;
    setSending(true);
    const ok = await onSend(body.trim(), files);
    setSending(false);
    if (ok) {
      setBody("");
      setFiles([]);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <form className="fk-help-composer" onSubmit={send}>
      <div className="fk-help-composer__main">
        <textarea
          className="fk-help-textarea"
          rows={2}
          value={body}
          maxLength={5000}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Message"
          disabled={disabled}
        />
        <AttachmentPicker value={files} onChange={setFiles} disabled={disabled || sending} />
      </div>
      <button type="submit" className="fk-help-btn fk-help-btn--primary" disabled={disabled || sending || !ready} aria-label="Send">
        <Send size={16} /> {sending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
