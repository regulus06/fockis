import React from "react";

import {
  IconSpark,
  IconSparkFilled,
  IconComment,
  IconShare,
  IconSave,
  IconSaveFilled,
  IconMore,
} from "./FockisIcons";

/* ============================================================================
   TYPES
============================================================================ */

export interface FockisProductionPostData {
  id: string;
  user: string;
  userId?: string;
  content?: string;
  media?: string;
  type?: "image" | "video" | "none";
  createdAt?: string;
}

export interface FockisProductionPostProps {
  post: FockisProductionPostData;

  reacted?: boolean;
  saved?: boolean;
  menuOpen?: boolean;
  canDelete?: boolean;

  onReact?: () => void;
  onSave?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onMenu?: () => void;
  onDelete?: () => void;
}

/* ============================================================================
   AVATAR
============================================================================ */

function InitialsAvatar({
  name,
}: {
  name: string;
}) {
  const initial =
    name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <div
      className="fk-avatar"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function FockisProductionPost({
  post,

  reacted = false,
  saved = false,
  menuOpen = false,
  canDelete = false,

  onReact,
  onSave,
  onComment,
  onShare,
  onMenu,
  onDelete,
}: FockisProductionPostProps) {
  return (
    <article className="fk-post">
      {/* =====================================================================
          POST HEADER
      ====================================================================== */}

      <header className="fk-post__header">
        <InitialsAvatar
          name={post.user}
        />

        <div className="fk-post__author-block">
          <div className="fk-post__name-row">
            <span className="fk-post__name">
              {post.user || "Unknown"}
            </span>
          </div>

          <div className="fk-post__meta">
            <span>
              {post.createdAt || "Just now"}
            </span>
          </div>
        </div>

        {/* MORE MENU */}

        <div
          className="fk-post__header-actions"
          style={{
            position: "relative",
          }}
        >
          <button
            type="button"
            className="fk-icon-btn"
            onClick={onMenu}
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <IconMore size={18} />
          </button>

          {menuOpen && canDelete && (
            <div className="fk-post-menu">
              <button
                type="button"
                className="fk-post-menu__delete"
                onClick={onDelete}
              >
                Delete post
              </button>
            </div>
          )}
        </div>
      </header>

      {/* =====================================================================
          POST TEXT
      ====================================================================== */}

      {post.content && (
        <div className="fk-post__body">
          <p className="fk-post__caption">
            {post.content}
          </p>
        </div>
      )}

      {/* =====================================================================
          IMAGE
      ====================================================================== */}

      {post.type === "image" &&
        post.media && (
          <div className="fk-post__media">
            <img
              src={post.media}
              alt="Post media"
              loading="lazy"
              onLoad={() => {
                console.log(
                  "FOCKIS IMAGE LOADED:",
                  post.media
                );
              }}
              onError={() => {
                console.error(
                  "FOCKIS IMAGE FAILED:",
                  {
                    postId: post.id,
                    url: post.media,
                  }
                );
              }}
            />
          </div>
        )}

      {/* =====================================================================
          VIDEO
      ====================================================================== */}

      {post.type === "video" &&
        post.media && (
          <div className="fk-post__media">
            <video
              src={post.media}
              controls
              loop
              muted
              playsInline
              preload="metadata"
              onError={() => {
                console.error(
                  "FOCKIS VIDEO FAILED:",
                  {
                    postId: post.id,
                    url: post.media,
                  }
                );
              }}
            />
          </div>
        )}

      {/* =====================================================================
          POST ACTIONS
      ====================================================================== */}

      <div className="fk-action-dock">
        {/* SPARK / REACTION */}

        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--spark${
            reacted
              ? " is-active"
              : ""
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
            <IconSparkFilled
              size={18}
            />
          ) : (
            <IconSpark
              size={18}
            />
          )}
        </button>

        {/* COMMENT */}

        <button
          type="button"
          className="fk-action-dock__btn"
          onClick={onComment}
          aria-label="Comment on post"
        >
          <IconComment size={18} />
        </button>

        {/* SHARE */}

        <button
          type="button"
          className="fk-action-dock__btn"
          onClick={onShare}
          aria-label="Share post"
        >
          <IconShare size={18} />
        </button>

        {/* SPACER */}

        <span
          className="fk-action-dock__spacer"
          aria-hidden="true"
        />

        {/* SAVE */}

        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--save${
            saved
              ? " is-active"
              : ""
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
            <IconSaveFilled
              size={18}
            />
          ) : (
            <IconSave size={18} />
          )}
        </button>
      </div>
    </article>
  );
}