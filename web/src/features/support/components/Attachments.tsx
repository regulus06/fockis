import { useRef, useState } from "react";
import { FileText, Film, Image as ImageIcon, LoaderCircle, Paperclip, X } from "lucide-react";

import { useHelpToast } from "../hooks/useHelpToast";
import { ATTACHMENT_ACCEPT, checkAttachment, supportApi, supportErrorMessage } from "../services/supportApi";
import type { SupportAttachment } from "../types";

const MAX_FILES = 5;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileGlyph({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <ImageIcon size={15} aria-hidden="true" />;
  if (mime.startsWith("video/")) return <Film size={15} aria-hidden="true" />;
  return <FileText size={15} aria-hidden="true" />;
}

/**
 * Upload button and list for screenshots, videos, PDFs and text files.
 * Files upload as soon as they're picked; the parent receives the stored
 * references to send with the message.
 */
export function AttachmentPicker({
  value,
  onChange,
  disabled,
  upload = supportApi.upload,
}: {
  value: SupportAttachment[];
  onChange: (next: SupportAttachment[]) => void;
  disabled?: boolean;
  upload?: (file: File, onProgress?: (p: number) => void) => Promise<SupportAttachment>;
}) {
  const notify = useHelpToast();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; progress: number }[]>([]);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, MAX_FILES - value.length - pending.length);
    if (files.length > list.length) notify(`You can attach up to ${MAX_FILES} files.`, "info");
    let current = value;
    for (const file of list) {
      const problem = checkAttachment(file);
      if (problem) {
        notify(`${file.name}: ${problem}`, "error");
        continue;
      }
      setPending((p) => [...p, { name: file.name, progress: 0 }]);
      try {
        const stored = await upload(file, (progress) => setPending((p) => p.map((x) => (x.name === file.name ? { ...x, progress } : x))));
        current = [...current, stored];
        onChange(current);
      } catch (error) {
        notify(`${file.name}: ${supportErrorMessage(error, "Upload failed.")}`, "error");
      } finally {
        setPending((p) => p.filter((x) => x.name !== file.name));
      }
    }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="fk-help-attach">
      {(value.length > 0 || pending.length > 0) && (
        <ul className="fk-help-attach__list">
          {value.map((a) => (
            <li key={a.key}>
              <FileGlyph mime={a.mimeType} />
              <span>{a.name}</span>
              <small>{formatBytes(a.size)}</small>
              <button type="button" onClick={() => onChange(value.filter((x) => x.key !== a.key))} aria-label={`Remove ${a.name}`} disabled={disabled}>
                <X size={14} />
              </button>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.name} className="is-pending">
              <LoaderCircle size={15} className="fk-help-spin" aria-hidden="true" />
              <span>{p.name}</span>
              <small>{p.progress}%</small>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="fk-help-btn fk-help-btn--ghost fk-help-btn--sm"
        onClick={() => input.current?.click()}
        disabled={disabled || value.length + pending.length >= MAX_FILES}
      >
        <Paperclip size={15} /> Attach file
      </button>
      <input ref={input} type="file" hidden multiple accept={ATTACHMENT_ACCEPT} onChange={(e) => void pick(e.target.files)} />
    </div>
  );
}

/** Files on a message; each opens through a short-lived signed link. */
export function AttachmentList({
  files,
  resolve,
}: {
  files: SupportAttachment[];
  resolve: (key: string) => Promise<{ url: string }>;
}) {
  const notify = useHelpToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (!files.length) return null;

  const open = async (key: string) => {
    // Open the tab synchronously so pop-up blockers allow it.
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
      notify(supportErrorMessage(error, "Couldn't open that file."), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul className="fk-help-attach__files">
      {files.map((f) => (
        <li key={f.key}>
          <button type="button" onClick={() => void open(f.key)} disabled={busy === f.key}>
            {busy === f.key ? <LoaderCircle size={14} className="fk-help-spin" /> : <FileGlyph mime={f.mimeType} />}
            <span>{f.name}</span>
            <small>{formatBytes(f.size)}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}
