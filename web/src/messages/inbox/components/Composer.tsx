import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Camera, FileText, Image as ImageIcon, Mic, Paperclip, Pause, Pencil, Play, Plus, Reply, Send, Smile, Square, Trash2, X } from "lucide-react";

import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { messageSocket } from "../../services/messageSocket";
import type { ReplyReference } from "../../types";
import type { InboxMessage } from "../inboxApi";
import { editMessage, sendFiles, sendText, sendVoice } from "../inboxActions";
import { useClickOutside } from "../ui";

/* ============================================================================
   COMPOSER
   Text, emoji, photos/videos, documents, camera, voice notes, replies and
   edits. Drafts are kept per conversation while the page is open.
============================================================================ */

const drafts = new Map<string, string>();

/** Must match the server's allowed upload types (apps/api/src/messages/uploads). */
const LIMITS = [
  { test: /^image\/(jpeg|png|webp|gif)$/, mb: 15, label: "Photos" },
  { test: /^video\/(mp4|webm|quicktime)$/, mb: 250, label: "Videos" },
  { test: /^audio\/(webm|mpeg|mp4|ogg|wav)$/, mb: 50, label: "Audio" },
  { test: /^(application\/pdf|text\/plain|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/, mb: 25, label: "Documents" },
];
const DOC_ACCEPT = ".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

const EMOJI: Record<string, string[]> = {
  Smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "😎", "🤩", "🥳", "😏", "😌", "😴", "🤔", "🤗", "🤭", "😬", "😮", "😢", "😭", "😤", "😡", "🥺", "😳", "🙃"],
  Gestures: ["👍", "👎", "👌", "✌️", "🤞", "🤝", "👏", "🙌", "🙏", "💪", "👋", "🤙", "👉", "👈", "☝️", "✋"],
  Hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "🖤", "💔", "💕", "💞", "💖", "💯", "✨", "🔥", "⭐"],
  Things: ["🎉", "🎂", "🎁", "📸", "🎵", "⚽", "☕", "🍕", "🍔", "🍰", "🌹", "🌞", "🌙", "✅", "❌", "📌"],
};

export interface ComposerHandle {
  focus(): void;
  addFiles(files: File[]): void;
}

interface Props {
  conversationId: string;
  replyTo: ReplyReference | null;
  editing: InboxMessage | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  disabled?: string;
}

const Composer = forwardRef<ComposerHandle, Props>(function Composer({ conversationId, replyTo, editing, onCancelReply, onCancelEdit, disabled }, ref) {
  const [text, setText] = useState(() => drafts.get(conversationId) ?? "");
  const [staged, setStaged] = useState<Array<{ file: File; url: string }>>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const typingSent = useRef(false);
  const recorder = useVoiceRecorder();
  const sendAfterStop = useRef(false);

  useClickOutside(emojiRef, () => setEmojiOpen(false), emojiOpen);
  useClickOutside(attachRef, () => setAttachOpen(false), attachOpen);

  // Switch drafts with the conversation.
  useEffect(() => {
    setText(drafts.get(conversationId) ?? "");
    setStaged([]);
    setError("");
    return () => stopTyping(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (editing) {
      setText(editing.text ?? "");
      window.setTimeout(() => {
        area.current?.focus();
        area.current?.setSelectionRange(area.current.value.length, area.current.value.length);
      }, 0);
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) area.current?.focus();
  }, [replyTo]);

  // Auto-size the text box.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useImperativeHandle(ref, () => ({
    focus: () => area.current?.focus(),
    addFiles: (files) => stage(files),
  }));

  function stopTyping(id = conversationId) {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    if (typingSent.current) messageSocket.stopTyping(id);
    typingSent.current = false;
  }

  function onType(value: string) {
    setText(value);
    if (!editing) drafts.set(conversationId, value);
    if (!value.trim()) return stopTyping();
    if (!typingSent.current) {
      messageSocket.startTyping(conversationId);
      typingSent.current = true;
    }
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => stopTyping(), 2500);
  }

  function stage(files: File[]) {
    const ok: Array<{ file: File; url: string }> = [];
    for (const file of files) {
      const rule = LIMITS.find((l) => l.test.test(file.type));
      if (!rule) {
        setError(`${file.name} can't be sent. Use photos, videos (MP4, WebM, MOV), PDF, Word or text files.`);
        continue;
      }
      if (file.size > rule.mb * 1024 * 1024) {
        setError(`${file.name} is too large. ${rule.label} can be up to ${rule.mb} MB.`);
        continue;
      }
      ok.push({ file, url: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : "" });
    }
    if (ok.length) setStaged((current) => [...current, ...ok].slice(0, 10));
  }

  function unstage(index: number) {
    setStaged((current) => {
      const item = current[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return current.filter((_, i) => i !== index);
    });
  }

  function submit() {
    if (disabled) return;
    setError("");
    if (editing) {
      if (text.trim()) void editMessage(editing, text);
      onCancelEdit();
      setText(drafts.get(conversationId) ?? "");
      return;
    }
    if (staged.length) {
      void sendFiles(
        conversationId,
        staged.map((s) => s.file),
        text,
        replyTo ?? undefined,
      );
      staged.forEach((s) => s.url && window.setTimeout(() => URL.revokeObjectURL(s.url), 30_000));
      setStaged([]);
    } else if (text.trim()) {
      sendText(conversationId, text, replyTo ?? undefined);
    } else {
      return;
    }
    stopTyping();
    setText("");
    drafts.delete(conversationId);
    onCancelReply();
    area.current?.focus();
  }

  async function finishVoice() {
    await recorder.stop();
  }

  useEffect(() => {
    if (recorder.status === "preview" && recorder.previewBlob && sendAfterStop.current) {
      sendAfterStop.current = false;
      void sendVoice(conversationId, recorder.previewBlob, recorder.duration, recorder.liveWaveform);
      recorder.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status, recorder.previewBlob]);

  const recording = recorder.status === "recording" || recorder.status === "paused" || recorder.status === "requesting";
  const preview = recorder.status === "preview";
  const canSend = Boolean(text.trim() || staged.length);

  if (disabled) {
    return <div className="fki-composer fki-composer--disabled">{disabled}</div>;
  }

  return (
    <div
      className="fki-composer-wrap"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        stage([...e.dataTransfer.files]);
      }}
    >
      {(replyTo || editing) && (
        <div className="fki-replybar">
          {editing ? <Pencil size={18} /> : <Reply size={18} />}
          <span>
            <strong>{editing ? "Edit message" : `Replying to ${replyTo!.senderName}`}</strong>
            <small>{editing ? editing.text : replyTo!.preview || "Attachment"}</small>
          </span>
          <button
            type="button"
            className="fki-icon-btn"
            onClick={() => {
              if (editing) {
                onCancelEdit();
                setText(drafts.get(conversationId) ?? "");
              } else onCancelReply();
            }}
            aria-label="Cancel"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {staged.length > 0 && (
        <div className="fki-staged">
          {staged.map((s, i) => (
            <div key={s.url || s.file.name + i} className="fki-staged__item">
              {s.file.type.startsWith("image/") ? (
                <img src={s.url} alt="" />
              ) : s.file.type.startsWith("video/") ? (
                <video src={s.url} muted />
              ) : (
                <span className="fki-staged__doc">
                  <FileText size={22} />
                  <small>{s.file.name}</small>
                </span>
              )}
              <button type="button" onClick={() => unstage(i)} aria-label={`Remove ${s.file.name}`}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {(error || recorder.errorMessage) && (
        <div className="fki-composer__error" role="alert">
          {error || recorder.errorMessage}
          <button type="button" onClick={() => (setError(""), recorder.reset())} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="fki-composer">
        {recording || preview ? (
          <div className="fki-recorder" aria-live="polite">
            <button type="button" className="fki-icon-btn is-danger" onClick={recorder.cancel} aria-label="Discard recording">
              <Trash2 size={20} />
            </button>
            <span className={`fki-recorder__dot ${recorder.status === "recording" ? "is-live" : ""}`} />
            <span className="fki-recorder__time">
              {Math.floor(recorder.duration / 60)}:{String(recorder.duration % 60).padStart(2, "0")}
            </span>
            <span className="fki-recorder__wave">
              {recorder.liveWaveform.map((v, i) => (
                <i key={i} style={{ height: `${Math.max(10, v * 100)}%` }} />
              ))}
            </span>
            {recorder.status === "recording" && (
              <button type="button" className="fki-icon-btn" onClick={recorder.pause} aria-label="Pause recording">
                <Pause size={20} />
              </button>
            )}
            {recorder.status === "paused" && (
              <button type="button" className="fki-icon-btn" onClick={recorder.resume} aria-label="Resume recording">
                <Play size={20} />
              </button>
            )}
            {recording && (
              <button type="button" className="fki-icon-btn" onClick={() => void finishVoice()} aria-label="Stop and review">
                <Square size={18} />
              </button>
            )}
            {preview && recorder.previewUrl && <audio src={recorder.previewUrl} controls className="fki-recorder__preview" />}
            <button
              type="button"
              className="fki-send"
              aria-label="Send voice message"
              onClick={async () => {
                if (preview && recorder.previewBlob) {
                  void sendVoice(conversationId, recorder.previewBlob, recorder.duration, recorder.liveWaveform);
                  recorder.reset();
                } else {
                  sendAfterStop.current = true;
                  await recorder.stop();
                }
              }}
            >
              <Send size={20} />
            </button>
          </div>
        ) : (
          <>
            <div className="fki-menu-anchor" ref={attachRef}>
              <button type="button" className="fki-plus" onClick={() => setAttachOpen((v) => !v)} aria-label="Attach" aria-expanded={attachOpen}>
                <Plus size={26} />
              </button>
              {attachOpen && (
                <div className="fki-menu fki-menu--up" role="menu">
                  <button type="button" role="menuitem" onClick={() => (setAttachOpen(false), mediaInput.current?.click())}>
                    <ImageIcon size={18} /> Photos & videos
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setAttachOpen(false), cameraInput.current?.click())}>
                    <Camera size={18} /> Camera
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setAttachOpen(false), docInput.current?.click())}>
                    <FileText size={18} /> Document
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setAttachOpen(false), void recorder.start())}>
                    <Mic size={18} /> Voice message
                  </button>
                </div>
              )}
            </div>

            <div className="fki-input">
              <textarea
                ref={area}
                rows={1}
                value={text}
                placeholder={editing ? "Edit your message…" : staged.length ? "Add a caption…" : "Write a message…"}
                aria-label="Message"
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                  if (e.key === "Escape") {
                    if (editing) {
                      onCancelEdit();
                      setText(drafts.get(conversationId) ?? "");
                    } else if (replyTo) onCancelReply();
                  }
                }}
                onPaste={(e) => {
                  const files = [...e.clipboardData.files];
                  if (files.length) {
                    e.preventDefault();
                    stage(files);
                  }
                }}
                onBlur={() => stopTyping()}
              />
              <div className="fki-menu-anchor" ref={emojiRef}>
                <button type="button" className="fki-icon-btn" onClick={() => setEmojiOpen((v) => !v)} aria-label="Emoji" aria-expanded={emojiOpen}>
                  <Smile size={22} />
                </button>
                {emojiOpen && (
                  <div className="fki-emoji" role="dialog" aria-label="Emoji">
                    {Object.entries(EMOJI).map(([group, list]) => (
                      <section key={group}>
                        <h4>{group}</h4>
                        <div>
                          {list.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                const el = area.current;
                                const start = el?.selectionStart ?? text.length;
                                const end = el?.selectionEnd ?? text.length;
                                const next = text.slice(0, start) + emoji + text.slice(end);
                                onType(next);
                                window.setTimeout(() => {
                                  el?.focus();
                                  el?.setSelectionRange(start + emoji.length, start + emoji.length);
                                }, 0);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
              {!editing && (
                <>
                  <button type="button" className="fki-icon-btn fki-hide-sm" onClick={() => docInput.current?.click()} aria-label="Attach a document">
                    <Paperclip size={21} />
                  </button>
                  <button type="button" className="fki-icon-btn fki-hide-sm" onClick={() => mediaInput.current?.click()} aria-label="Send photos or videos">
                    <ImageIcon size={21} />
                  </button>
                  {!canSend && (
                    <button type="button" className="fki-icon-btn" onClick={() => void recorder.start()} aria-label="Record a voice message">
                      <Mic size={21} />
                    </button>
                  )}
                </>
              )}
            </div>

            <button type="button" className="fki-send" onClick={submit} disabled={!canSend} aria-label={editing ? "Save edit" : "Send"}>
              <Send size={21} />
            </button>
          </>
        )}
      </div>

      <input ref={mediaInput} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={(e) => (stage([...(e.target.files ?? [])]), (e.target.value = ""))} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (stage([...(e.target.files ?? [])]), (e.target.value = ""))} />
      <input
        ref={docInput}
        type="file"
        accept={DOC_ACCEPT}
        multiple
        hidden
        onChange={(e) => (stage([...(e.target.files ?? [])]), (e.target.value = ""))}
      />
    </div>
  );
});

export default Composer;
