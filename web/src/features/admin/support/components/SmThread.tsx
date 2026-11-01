import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, Image as ImageIcon, LoaderCircle, Paperclip, Send, Video, X } from "lucide-react";

import { ATTACHMENT_ACCEPT, checkAttachment } from "../../../support/services/supportApi";
import type { SupportAttachment } from "../../../support/types";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { adminError, supportAdminApi } from "../supportAdminApi";
import { formatDateTime } from "./SmParts";

const MAX_FILES = 5;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Glyph({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <ImageIcon size={14} />;
  if (mime.startsWith("video/")) return <Video size={14} />;
  return <FileText size={14} />;
}

/** Files on a message or feedback item; each opens through a short-lived signed link. */
export function SmFiles({ files, resolve }: { files: SupportAttachment[]; resolve: (key: string) => Promise<{ url: string }> }) {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const [busy, setBusy] = useState<string | null>(null);
  if (!files?.length) return null;

  const open = async (key: string) => {
    const tab = window.open("", "_blank");
    setBusy(key);
    try {
      const { url } = await resolve(key);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else window.location.assign(url);
    } catch (error) {
      tab?.close();
      toast("error", adminError(error, "Couldn't open that file."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fksm-files">
      {files.map((f) => (
        <button key={f.key} type="button" onClick={() => void open(f.key)} disabled={busy === f.key} title={`Open ${f.name}`}>
          {busy === f.key ? <LoaderCircle size={14} className="fksm-spin" /> : <Glyph mime={f.mimeType} />}
          <em>{f.name}</em>
          <small>{formatBytes(f.size)}</small>
        </button>
      ))}
    </div>
  );
}

/** Staff-side picker: files upload to the private support store as soon as they're chosen. */
export function SmAttachmentPicker({ value, onChange, disabled }: { value: SupportAttachment[]; onChange: (next: SupportAttachment[]) => void; disabled?: boolean }) {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; progress: number }[]>([]);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_FILES - value.length - pending.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > list.length) toast("info", `You can attach up to ${MAX_FILES} files.`);
    let current = value;
    for (const file of list) {
      const problem = checkAttachment(file);
      if (problem) {
        toast("error", `${file.name}: ${problem}`);
        continue;
      }
      setPending((p) => [...p, { name: file.name, progress: 0 }]);
      try {
        const stored = await supportAdminApi.upload(file, (progress) => setPending((p) => p.map((x) => (x.name === file.name ? { ...x, progress } : x))));
        current = [...current, stored];
        onChange(current);
      } catch (error) {
        toast("error", `${file.name}: ${adminError(error, "Upload failed.")}`);
      } finally {
        setPending((p) => p.filter((x) => x.name !== file.name));
      }
    }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="fksm-row">
      <input ref={input} type="file" hidden multiple accept={ATTACHMENT_ACCEPT} onChange={(e) => void pick(e.target.files)} />
      <button
        type="button"
        className="fksm-btn fksm-btn--secondary fksm-btn--sm"
        onClick={() => input.current?.click()}
        disabled={disabled || value.length + pending.length >= MAX_FILES}
      >
        <Paperclip size={15} /> Attach
      </button>
      <div className="fksm-files">
        {value.map((f) => (
          <span key={f.key}>
            <Glyph mime={f.mimeType} />
            <em>{f.name}</em>
            <small>{formatBytes(f.size)}</small>
            <button type="button" className="fksm-files__x" aria-label={`Remove ${f.name}`} onClick={() => onChange(value.filter((x) => x.key !== f.key))}>
              <X size={13} />
            </button>
          </span>
        ))}
        {pending.map((f) => (
          <span key={f.name}>
            <LoaderCircle size={14} className="fksm-spin" />
            <em>{f.name}</em>
            <small>{f.progress}%</small>
          </span>
        ))}
      </div>
    </div>
  );
}

export interface ThreadMessage {
  id: string;
  author: "user" | "agent";
  body: string;
  attachments: SupportAttachment[];
  createdAt: string;
  authorName?: string;
}

export function SmMessages({ messages, userName, resolve }: { messages: ThreadMessage[]; userName: string; resolve: (key: string) => Promise<{ url: string }> }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  return (
    <div className="fksm-thread" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id} className={`fksm-msg fksm-msg--${m.author}`}>
          {m.body && <div className="fksm-msg__bubble">{m.body}</div>}
          <SmFiles files={m.attachments ?? []} resolve={resolve} />
          <span className="fksm-msg__meta">
            {m.author === "agent" ? m.authorName || "Fockis Support" : userName} · {formatDateTime(m.createdAt)}
          </span>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

/** Reply box. Enter sends, Shift+Enter adds a line. */
export function SmComposer({
  onSend,
  disabled,
  placeholder = "Write a reply to the user…",
  extra,
  sendLabel = "Send reply",
}: {
  onSend: (body: string, attachments: SupportAttachment[]) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
  extra?: ReactNode;
  sendLabel?: string;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<SupportAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const ready = Boolean(body.trim() || files.length);

  const send = async () => {
    if (!ready || sending) return;
    setSending(true);
    const ok = await onSend(body.trim(), files);
    setSending(false);
    if (ok) {
      setBody("");
      setFiles([]);
    }
  };

  return (
    <form
      className="fksm-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <textarea
        className="fksm-input"
        rows={3}
        maxLength={5000}
        value={body}
        placeholder={placeholder}
        aria-label="Reply"
        disabled={disabled}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
      />
      <div className="fksm-composer__foot">
        <SmAttachmentPicker value={files} onChange={setFiles} disabled={disabled || sending} />
        <div className="fksm-row">
          {extra}
          <button type="submit" className="fksm-btn fksm-btn--primary" disabled={disabled || sending || !ready}>
            <Send size={15} /> {sending ? "Sending…" : sendLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Internal notes — staff only, never shown to the user. */
export function SmNotes({
  notes,
  onAdd,
  disabled,
}: {
  notes: { id: string; body: string; createdAt: string; author: { username: string; name: string } | null }[];
  onAdd: (body: string) => Promise<boolean>;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fksm-notes">
      {notes.length === 0 ? (
        <p className="fksm-muted">No internal notes yet.</p>
      ) : (
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              <p>{n.body}</p>
              <span>
                {n.author?.username || n.author?.name || "Staff"} · {formatDateTime(n.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <form
          className="fksm-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!body.trim()) return;
            setSaving(true);
            const ok = await onAdd(body.trim());
            setSaving(false);
            if (ok) setBody("");
          }}
        >
          <textarea className="fksm-input" rows={2} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add an internal note (staff only)…" aria-label="Internal note" />
          <button type="submit" className="fksm-btn fksm-btn--secondary fksm-btn--sm" disabled={saving || !body.trim()}>
            {saving ? "Saving…" : "Add note"}
          </button>
        </form>
      )}
    </div>
  );
}
