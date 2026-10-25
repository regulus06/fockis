import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  Send,
  X,
} from "lucide-react";

import { formatDuration } from "../utils";

interface PublishRecordingModalProps {
  open: boolean;

  title: string;

  playbackUrl: string;

  durationSeconds: number;

  publishing: boolean;

  error: string | null;

  onCancel: () => void;

  onPublish: (caption: string) => void;
}

const DEFAULT_CAPTION =
  "Check out my recent live stream! #Fockis #Live";

export default function PublishRecordingModal({
  open,
  title,
  playbackUrl,
  durationSeconds,
  publishing,
  error,
  onCancel,
  onPublish,
}: PublishRecordingModalProps) {
  const [caption, setCaption] =
    useState(DEFAULT_CAPTION);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCaption(DEFAULT_CAPTION);

    const timer = window.setTimeout(
      () => textareaRef.current?.focus(),
      50,
    );

    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !publishing
      ) {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "keydown",
        onKey,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="live-publish"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !publishing
        ) {
          onCancel();
        }
      }}
    >
      <div
        className="live-publish__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-publish-title"
      >
        <header className="live-publish__header">
          <h2 id="live-publish-title">
            Publish to Feed
          </h2>

          <button
            type="button"
            className="live-publish__close"
            onClick={onCancel}
            disabled={publishing}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <div className="live-publish__body">
          <div className="live-publish__preview">
            {playbackUrl ? (
              <video
                src={`${playbackUrl}#t=1`}
                preload="metadata"
                muted
                playsInline
                aria-label={`Preview of ${title}`}
              />
            ) : null}

            {durationSeconds > 0 && (
              <span className="live-publish__duration">
                {formatDuration(durationSeconds)}
              </span>
            )}
          </div>

          <label className="live-publish__caption">
            <span className="live-publish__sr">
              Caption
            </span>

            <textarea
              ref={textareaRef}
              value={caption}
              maxLength={5000}
              onChange={(event) =>
                setCaption(event.target.value)
              }
              placeholder="Write a caption..."
              disabled={publishing}
            />
          </label>
        </div>

        {error && (
          <p
            className="live-publish__error"
            role="alert"
          >
            {error}
          </p>
        )}

        <footer className="live-publish__footer">
          <button
            type="button"
            className="live-publish__cancel"
            onClick={onCancel}
            disabled={publishing}
          >
            Cancel
          </button>

          <button
            type="button"
            className="live-publish__submit"
            onClick={() => onPublish(caption)}
            disabled={publishing}
          >
            {publishing ? (
              <Loader2
                size={17}
                className="live-manager__spin"
              />
            ) : (
              <Send size={17} />
            )}

            {publishing
              ? "Publishing..."
              : "Publish"}
          </button>
        </footer>
      </div>
    </div>
  );
}
