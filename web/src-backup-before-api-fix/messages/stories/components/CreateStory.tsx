import {
  useRef,
  useState,
} from "react";

import {
  useMessagesStories,
} from "../hooks/useMessagesStories";

import "../styles/create-story.scss";

export default function CreateStory() {
  const {
    createOpen,
    closeCreate,
    createTextStory,
    createMediaStory,
    error,
  } =
    useMessagesStories();

  const [
    text,
    setText,
  ] = useState("");

  const [
    mode,
    setMode,
  ] = useState<
    "text" | "media"
  >("text");

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  if (!createOpen) {
    return null;
  }

  const handleTextStory =
    () => {
      const story =
        createTextStory(
          text,
        );

      if (story) {
        setText("");
      }
    };

  const handleFileChange =
    (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      const story =
        createMediaStory(
          file,
        );

      if (story) {
        event.target.value =
          "";
      }
    };

  return (
    <div className="messages-story-create">
      <div
        className="messages-story-create__backdrop"
        onClick={closeCreate}
      />

      <div className="messages-story-create__panel">
        <header className="messages-story-create__header">
          <div>
            <small>
              Fockis Messages
            </small>

            <h2>
              Create Story
            </h2>
          </div>

          <button
            type="button"
            onClick={closeCreate}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="messages-story-create__tabs">
          <button
            type="button"
            className={
              mode === "text"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("text")
            }
          >
            Text
          </button>

          <button
            type="button"
            className={
              mode === "media"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("media")
            }
          >
            Photo / Video
          </button>
        </div>

        {mode === "text" ? (
          <div className="messages-story-create__text">
            <textarea
              value={text}
              onChange={(event) =>
                setText(
                  event.target.value,
                )
              }
              placeholder="What's happening?"
              maxLength={500}
              autoFocus
            />

            <div className="messages-story-create__counter">
              {text.length}/500
            </div>

            <button
              type="button"
              className="messages-story-create__share"
              onClick={
                handleTextStory
              }
            >
              Share Story
            </button>
          </div>
        ) : (
          <div className="messages-story-create__media">
            <div className="messages-story-create__upload-icon">
              +
            </div>

            <h3>
              Add a photo or video
            </h3>

            <p>
              Your story will be
              available for 24 hours.
            </p>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              Choose Media
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={
                handleFileChange
              }
            />
          </div>
        )}

        {error && (
          <div className="messages-story-create__error">
            {error}
          </div>
        )}

        <footer>
          Stories automatically
          expire after 24 hours.
        </footer>
      </div>
    </div>
  );
}