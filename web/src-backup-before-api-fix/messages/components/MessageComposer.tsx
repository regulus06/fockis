import { useRef, useState } from "react";
import {
  Plus,
  Smile,
  Send,
  Mic,
  X,
} from "lucide-react";

import { useMessageComposer } from "../hooks/useMessageComposer";
import { useAttachments } from "../hooks/useAttachments";
import { useTypingIndicator } from "../hooks/useTypingIndicator";

import ReplyPreview from "./ReplyPreview";
import AttachmentMenu from "./AttachmentMenu";
import AttachmentPreview from "./AttachmentPreview";
import EmojiPicker from "./EmojiPicker";
import VoiceRecorder from "./VoiceRecorder";

import { messageUploadApi } from "../services/messageUploadApi";

// MessageComposer.tsx
import "../styles/message-composer.scss";
interface MessageComposerProps {
  conversationId: string;
}

export default function MessageComposer({
  conversationId,
}: MessageComposerProps) {
  const {
    text,
    setText,
    replyTo,
    clearReply,
    editingMessageId,
    canSend,
    submit,
    sendAttachments,
    sendVoice,
  } = useMessageComposer(conversationId);

  const {
    pending,
    error,
    addFiles,
    removeFile,
    clear,
    uploadAll,
    setError,
  } = useAttachments();

  const { startTyping } =
    useTypingIndicator(conversationId);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [emojiOpen, setEmojiOpen] =
    useState(false);

  const [recording, setRecording] =
    useState(false);

  const [sendingAttachments, setSendingAttachments] =
    useState(false);

  const [sendingVoice, setSendingVoice] =
    useState(false);

  const imageInputRef =
    useRef<HTMLInputElement>(null);

  const videoInputRef =
    useRef<HTMLInputElement>(null);

  const documentInputRef =
    useRef<HTMLInputElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const hasPending =
    pending.length > 0;

  const hasText =
    text.trim().length > 0;

  /*
   * =========================================================
   * SEND MESSAGE
   * =========================================================
   */

  const handleSend = async () => {
    if (
      sendingAttachments ||
      sendingVoice
    ) {
      return;
    }

    try {
      /*
       * Send attachments
       */
      if (hasPending) {
        setSendingAttachments(true);

        const kind =
          pending[0].kind;

        const attachments =
          await uploadAll();

        await sendAttachments(
          kind === "image"
            ? "image"
            : kind === "video"
              ? "video"
              : "document",
          attachments,
          hasText
            ? text.trim()
            : undefined,
        );

        clear();
        setText("");

        return;
      }

      /*
       * Send normal text
       */
      if (canSend) {
        await submit();
      }
    } catch (error) {
      console.error(
        "[FOCKIS MESSAGES] Failed to send message:",
        error,
      );
    } finally {
      setSendingAttachments(false);
    }
  };

  /*
   * =========================================================
   * CLEAR TEXT
   * =========================================================
   */

  const handleClearText = () => {
    setText("");

    textareaRef.current?.focus();
  };

  /*
   * =========================================================
   * KEYBOARD
   * =========================================================
   */

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      void handleSend();
    }
  };

  /*
   * =========================================================
   * FILES
   * =========================================================
   */

  const handleFiles = (
    files: FileList | null,
  ) => {
    if (
      !files ||
      files.length === 0
    ) {
      return;
    }

    addFiles(files);

    setMenuOpen(false);
  };

  /*
   * =========================================================
   * PASTE
   * =========================================================
   */

  const handlePaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const items =
      Array.from(
        e.clipboardData.items,
      ).filter((item) =>
        item.type.startsWith(
          "image/",
        ),
      );

    if (items.length === 0) {
      return;
    }

    const files = items
      .map((item) =>
        item.getAsFile(),
      )
      .filter(
        (file): file is File =>
          !!file,
      );

    if (files.length > 0) {
      addFiles(files);
    }
  };

  /*
   * =========================================================
   * DRAG / DROP
   * =========================================================
   */

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();

    if (
      e.dataTransfer.files.length >
      0
    ) {
      addFiles(
        e.dataTransfer.files,
      );
    }
  };

  /*
   * =========================================================
   * VOICE MESSAGE
   * =========================================================
   */

  const handleVoiceSend = async (
    blob: Blob,
    duration: number,
  ) => {
    if (sendingVoice) {
      return;
    }

    try {
      setSendingVoice(true);

      console.log(
        "[FOCKIS VOICE] Recording received:",
        {
          size: blob.size,
          type: blob.type,
          duration,
        },
      );

      /*
       * Convert Blob to File.
       */
      const file = new File(
        [blob],
        `voice-${Date.now()}.webm`,
        {
          type: "audio/webm",
        },
      );

      console.log(
        "[FOCKIS VOICE] Uploading:",
        {
          name: file.name,
          size: file.size,
          type: file.type,
        },
      );

      /*
       * Upload voice file.
       */
      const attachment =
        await messageUploadApi.upload(
          file,
          "audio",
        );

      /*
       * Store recording duration.
       */
      attachment.duration =
        duration;

      console.log(
        "[FOCKIS VOICE] Upload successful:",
        attachment,
      );

      /*
       * Send audio message.
       */
      await sendVoice(
        attachment,
      );

      console.log(
        "[FOCKIS VOICE] Voice message sent successfully.",
      );

      setRecording(false);
    } catch (error) {
      console.error(
        "[FOCKIS VOICE] Failed to send voice message:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to send voice message.",
      );
    } finally {
      setSendingVoice(false);
    }
  };

  /*
   * =========================================================
   * START RECORDING
   * =========================================================
   */

  const handleStartRecording = () => {
    if (
      sendingAttachments ||
      sendingVoice
    ) {
      return;
    }

    console.log(
      "[FOCKIS VOICE] Opening voice recorder...",
    );

    setMenuOpen(false);
    setEmojiOpen(false);

    setRecording(true);
  };

  /*
   * =========================================================
   * CANCEL RECORDING
   * =========================================================
   */

  const handleCancelRecording = () => {
    console.log(
      "[FOCKIS VOICE] Recording cancelled.",
    );

    setRecording(false);
  };

  /*
   * =========================================================
   * VOICE RECORDER UI
   * =========================================================
   */

  if (recording) {
    return (
      <div className="message-composer message-composer--recording">
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={
            handleCancelRecording
          }
        />
      </div>
    );
  }

  /*
   * =========================================================
   * NORMAL COMPOSER
   * =========================================================
   */

  return (
    <div
      className="message-composer"
      onDragOver={(e) =>
        e.preventDefault()
      }
      onDrop={handleDrop}
    >
      {/* EDITING BANNER */}
      {editingMessageId && (
        <div className="message-composer__editing-banner">
          <span>
            Editing message
          </span>

          <button
            type="button"
            onClick={handleClearText}
            aria-label="Cancel edit"
            title="Cancel edit"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* REPLY PREVIEW */}
      {replyTo && (
        <ReplyPreview
          reply={replyTo}
          onClose={clearReply}
        />
      )}

      {/* ERROR */}
      {error && (
        <div className="message-composer__error">
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ATTACHMENT PREVIEW */}
      <AttachmentPreview
        uploads={pending}
        onRemove={removeFile}
      />

      {/* =====================================================
          COMPOSER ROW
          ===================================================== */}

      <div className="message-composer__row">

        {/* ===================================================
            ATTACHMENTS
            =================================================== */}

        <div className="message-composer__attach-wrapper">
          <button
            type="button"
            className="message-composer__icon-btn"
            onClick={() =>
              setMenuOpen(
                (value) => !value,
              )
            }
            aria-label="Add attachment"
            title="Add attachment"
          >
            <Plus size={22} />
          </button>

          {menuOpen && (
            <AttachmentMenu
              onClose={() =>
                setMenuOpen(false)
              }
              onPickImages={() =>
                imageInputRef.current?.click()
              }
              onPickVideo={() =>
                videoInputRef.current?.click()
              }
              onPickDocument={() =>
                documentInputRef.current?.click()
              }
            />
          )}
        </div>

        {/* HIDDEN IMAGE INPUT */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          hidden
          onChange={(e) =>
            handleFiles(
              e.target.files,
            )
          }
        />

        {/* HIDDEN VIDEO INPUT */}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          hidden
          onChange={(e) =>
            handleFiles(
              e.target.files,
            )
          }
        />

        {/* HIDDEN DOCUMENT INPUT */}
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          hidden
          onChange={(e) =>
            handleFiles(
              e.target.files,
            )
          }
        />

        {/* ===================================================
            TEXTAREA
            =================================================== */}

        <div
          className="message-composer__input-wrapper"
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
          }}
        >
          <textarea
            ref={textareaRef}
            className="message-composer__textarea"
            placeholder="Message..."
            rows={1}
            value={text}
            onChange={(e) => {
              setText(
                e.target.value,
              );

              startTyping();
            }}
            onKeyDown={
              handleKeyDown
            }
            onPaste={
              handlePaste
            }
          />

          {/* CLEAR TEXT BUTTON */}
          {hasText && (
            <button
              type="button"
              onClick={
                handleClearText
              }
              aria-label="Clear message"
              title="Clear message"
              className="message-composer__clear-btn"
            >
              <X size={17} />
            </button>
          )}
        </div>

        {/* ===================================================
            EMOJI
            =================================================== */}

        <div className="message-composer__emoji-wrapper">
          <button
            type="button"
            className="message-composer__icon-btn"
            onClick={() =>
              setEmojiOpen(
                (value) => !value,
              )
            }
            aria-label="Emoji"
            title="Emoji"
          >
            <Smile size={22} />
          </button>

          {emojiOpen && (
            <EmojiPicker
              onSelect={(emoji) =>
                setText(
                  text + emoji,
                )
              }
              onClose={() =>
                setEmojiOpen(false)
              }
            />
          )}
        </div>

        {/* ===================================================
            MICROPHONE
            =================================================== */}

        <button
          type="button"
          className="message-composer__icon-btn message-composer__voice-btn"
          onClick={
            handleStartRecording
          }
          disabled={
            sendingVoice ||
            sendingAttachments ||
            hasPending ||
            hasText
          }
          aria-label="Record voice message"
          title={
            hasText
              ? "Clear message to record voice"
              : hasPending
                ? "Remove attachment to record voice"
                : "Record voice message"
          }
        >
          <Mic size={22} />
        </button>

        {/* ===================================================
            SEND
            =================================================== */}

        {(canSend ||
          hasPending) && (
          <button
            type="button"
            className="message-composer__send-btn"
            onClick={() =>
              void handleSend()
            }
            disabled={
              sendingAttachments ||
              sendingVoice
            }
            aria-label="Send message"
            title="Send message"
          >
            <Send size={20} />
          </button>
        )}
      </div>
    </div>
  );
}