import React from "react";

import {
IconSpark,
IconSparkFilled,
IconComment,
IconShare,
IconSave,
IconSaveFilled,
IconMore,
IconPlay,
} from "./FockisIcons";

/* ============================================================================
TYPES
============================================================================ */

export interface FockisWaveCardProps {
id?: string;
username: string;
avatarUrl?: string;
content?: string;
mediaUrl?: string;
mediaType?: "image" | "video" | "none";
createdAt?: string;

reacted?: boolean;
saved?: boolean;

onReact?: () => void;
onComment?: () => void;
onShare?: () => void;
onSave?: () => void;
onMore?: () => void;
}

/* ============================================================================
AVATAR
============================================================================ */

function Avatar({
username,
avatarUrl,
}: {
username: string;
avatarUrl?: string;
}) {
const initial =
username?.trim()?.charAt(0)?.toUpperCase() || "?";

if (avatarUrl) {
return ( <img
     className="fk-wave-card__avatar-image"
     src={avatarUrl}
     alt={username}
     loading="lazy"
   />
);
}

return ( <div
   className="fk-wave-card__avatar"
   aria-hidden="true"
 >
{initial} </div>
);
}

/* ============================================================================
WAVE CARD
============================================================================ */

export default function FockisWaveCard({
id,
username,
avatarUrl,
content,
mediaUrl,
mediaType = "none",
createdAt = "Just now",
reacted = false,
saved = false,
onReact,
onComment,
onShare,
onSave,
onMore,
}: FockisWaveCardProps) {
return ( <article
   className="fk-wave-card"
   data-post-id={id}
 >
{/* HEADER */} <header className="fk-wave-card__header"> <div className="fk-wave-card__identity"> <Avatar
         username={username}
         avatarUrl={avatarUrl}
       />

```
      <div className="fk-wave-card__author">
        <strong className="fk-wave-card__username">
          {username}
        </strong>

        <span className="fk-wave-card__time">
          {createdAt}
        </span>
      </div>
    </div>

    <button
      type="button"
      className="fk-wave-card__more"
      onClick={onMore}
      aria-label="More options"
    >
      <IconMore size={20} />
    </button>
  </header>

  {/* WAVE INDICATOR */}
  <div
    className="fk-wave-card__wave"
    aria-hidden="true"
  >
    <span />
    <span />
    <span />
    <span />
    <span />
    <span />
    <span />
  </div>

  {/* CONTENT */}
  {content && (
    <div className="fk-wave-card__content">
      <p>{content}</p>
    </div>
  )}

  {/* IMAGE */}
  {mediaType === "image" && mediaUrl && (
    <div className="fk-wave-card__media">
      <img
        src={mediaUrl}
        alt="Post media"
        loading="lazy"
      />
    </div>
  )}

  {/* VIDEO */}
  {mediaType === "video" && mediaUrl && (
    <div className="fk-wave-card__media fk-wave-card__media--video">
      <video
        src={mediaUrl}
        controls
        playsInline
        preload="metadata"
      />

      <div
        className="fk-wave-card__play"
        aria-hidden="true"
      >
        <IconPlay size={22} />
      </div>
    </div>
  )}

  {/* ACTIONS */}
  <footer className="fk-wave-card__actions">
    <button
      type="button"
      className={`fk-wave-card__action ${
        reacted ? "is-active" : ""
      }`}
      onClick={onReact}
      aria-label={
        reacted
          ? "Remove reaction"
          : "React to post"
      }
      aria-pressed={reacted}
    >
      {reacted ? (
        <IconSparkFilled size={19} />
      ) : (
        <IconSpark size={19} />
      )}
    </button>

    <button
      type="button"
      className="fk-wave-card__action"
      onClick={onComment}
      aria-label="Comment on post"
    >
      <IconComment size={19} />
    </button>

    <button
      type="button"
      className="fk-wave-card__action"
      onClick={onShare}
      aria-label="Share post"
    >
      <IconShare size={19} />
    </button>

    <span className="fk-wave-card__spacer" />

    <button
      type="button"
      className={`fk-wave-card__action ${
        saved ? "is-active" : ""
      }`}
      onClick={onSave}
      aria-label={
        saved
          ? "Remove saved post"
          : "Save post"
      }
      aria-pressed={saved}
    >
      {saved ? (
        <IconSaveFilled size={19} />
      ) : (
        <IconSave size={19} />
      )}
    </button>
  </footer>
</article>


);
}
