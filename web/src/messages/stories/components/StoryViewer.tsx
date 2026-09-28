import {
  useEffect,
  useState,
} from "react";

import {
  useMessagesStories,
} from "../hooks/useMessagesStories";

import "../styles/story-viewer.scss";

function getInitials(
  name: string,
): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join("");
}

export default function StoryViewer() {
  const {
    viewerStory,
    closeViewer,
    stories,
    openViewer,
  } =
    useMessagesStories();

  const [
    progress,
    setProgress,
  ] = useState(0);

  useEffect(() => {
    if (!viewerStory) {
      return;
    }

    setProgress(0);

    const started =
      Date.now();

    const duration =
      7000;

    const timer =
      window.setInterval(() => {
        const elapsed =
          Date.now() -
          started;

        const next =
          Math.min(
            elapsed / duration,
            1,
          );

        setProgress(next);

        if (next >= 1) {
          window.clearInterval(
            timer,
          );

          const index =
            stories.findIndex(
              (story) =>
                story.id ===
                viewerStory.id,
            );

          const nextStory =
            stories[index + 1];

          if (nextStory) {
            openViewer(
              nextStory.id,
            );
          } else {
            closeViewer();
          }
        }
      }, 50);

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    viewerStory,
    stories,
    openViewer,
    closeViewer,
  ]);

  if (!viewerStory) {
    return null;
  }

  return (
    <div className="messages-story-viewer">
      <div className="messages-story-viewer__backdrop" />

      <div className="messages-story-viewer__container">
        <div className="messages-story-viewer__progress">
          <span
            style={{
              width: `${progress * 100}%`,
            }}
          />
        </div>

        <header className="messages-story-viewer__header">
          <div className="messages-story-viewer__profile">
            {viewerStory.avatar ? (
              <img
                src={
                  viewerStory.avatar
                }
                alt=""
              />
            ) : (
              <span>
                {getInitials(
                  viewerStory.name,
                )}
              </span>
            )}

            <div>
              <strong>
                {viewerStory.name}
              </strong>

              <small>
                Fockis Messages
              </small>
            </div>
          </div>

          <button
            type="button"
            onClick={closeViewer}
            aria-label="Close story"
          >
            ×
          </button>
        </header>

        <main className="messages-story-viewer__content">
          {viewerStory.type ===
            "image" &&
            viewerStory.mediaUrl && (
              <img
                src={
                  viewerStory.mediaUrl
                }
                alt=""
              />
            )}

          {viewerStory.type ===
            "video" &&
            viewerStory.mediaUrl && (
              <video
                src={
                  viewerStory.mediaUrl
                }
                autoPlay
                controls
                playsInline
              />
            )}

          {viewerStory.type ===
            "text" && (
            <div className="messages-story-viewer__text">
              {viewerStory.text}
            </div>
          )}
        </main>

        <button
          type="button"
          className="messages-story-viewer__previous"
          onClick={() => {
            const index =
              stories.findIndex(
                (story) =>
                  story.id ===
                  viewerStory.id,
              );

            const previous =
              stories[index - 1];

            if (previous) {
              openViewer(
                previous.id,
              );
            }
          }}
        />

        <button
          type="button"
          className="messages-story-viewer__next"
          onClick={() => {
            const index =
              stories.findIndex(
                (story) =>
                  story.id ===
                  viewerStory.id,
              );

            const next =
              stories[index + 1];

            if (next) {
              openViewer(
                next.id,
              );
            } else {
              closeViewer();
            }
          }}
        />
      </div>
    </div>
  );
}