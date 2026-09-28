import { Link } from "react-router-dom";
import type { PlaylistSummary } from "../types/playlist.types";
import { PlaylistAccessBadge } from "./PlaylistAccessBadge";

export interface PlaylistCardProps {
  playlist: PlaylistSummary;
  layout?: "grid" | "list";
  onPlay?: (playlistId: string) => void;
  onFavorite?: (playlistId: string) => void;
  onShare?: (playlistId: string) => void;
}

/* -------------------------------------------------------
   Formatting helpers
------------------------------------------------------- */

function formatCount(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return "0";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return value.toString();
}

function formatDuration(
  seconds: number | undefined | null,
): string {
  if (!seconds || seconds < 0) {
    return "0:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

/* -------------------------------------------------------
   Icons
------------------------------------------------------- */

interface IconProps {
  width?: number;
  height?: number;
  filled?: boolean;
}

function PlayIcon({
  width = 18,
  height = 18,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5.14v13.72c0 .78.85 1.26 1.52.86l10.18-6.86a1 1 0 0 0 0-1.72L9.52 4.28A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function HeartIcon({
  width = 16,
  height = 16,
  filled = false,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function ShareIcon({
  width = 16,
  height = 16,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98" />
      <path d="m15.41 6.51-6.82 3.98" />
    </svg>
  );
}

function MusicNoteIcon({
  width = 12,
  height = 12,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 4v11.18A3.99 3.99 0 0 0 12 14.5a4 4 0 1 0 4 4V8h5V4h-7Z" />
    </svg>
  );
}

function VideoIcon({
  width = 12,
  height = 12,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="13" height="14" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  );
}

function VerifiedIcon({
  width = 16,
  height = 16,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.5 14.4 4l2.82-.12.9 2.68 2.28 1.67-.9 2.68.9 2.68-2.28 1.67-.9 2.68-2.82-.12L12 21.5l-2.4-1.68-2.82.12-.9-2.68-2.28-1.67.9-2.68-.9-2.68L5.88 7.9l.9-2.68L9.6 4 12 2.5Zm-1.1 13.1 5.4-5.4-1.4-1.4-4 4-2-2-1.4 1.4 3.4 3.4Z" />
    </svg>
  );
}

/* -------------------------------------------------------
   Playlist Card
------------------------------------------------------- */

export function PlaylistCard({
  playlist,
  layout = "grid",
  onPlay,
  onFavorite,
  onShare,
}: PlaylistCardProps) {
  const {
    id,
    slug,
    title,
    coverImageUrl,
    mediaKind,
    creator,
    access,
    price,
    currency,
    trackCount,
    totalDurationSeconds,
    isFavoritedByCurrentUser,
  } = playlist;

  const detailHref = `/media/playlists/${slug}`;

  return (
    <article
      className={`fk-card${
        layout === "list" ? " fk-card--list" : ""
      }`}
    >
      {/* -------------------------------------------------
          Media
      -------------------------------------------------- */}

      <div
        className={`fk-card__media${
          mediaKind === "video"
            ? " fk-card__media--video"
            : ""
        }`}
      >
        <Link
          to={detailHref}
          tabIndex={-1}
          aria-hidden="true"
        >
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <div
              className="fk-card__media-placeholder"
              aria-hidden="true"
            >
              {mediaKind === "video" ? (
                <VideoIcon width={32} height={32} />
              ) : (
                <MusicNoteIcon width={32} height={32} />
              )}
            </div>
          )}
        </Link>

        {/* Content type */}

        <span className="fk-card__kind">
          {mediaKind === "video" ? (
            <VideoIcon width={12} height={12} />
          ) : (
            <MusicNoteIcon width={12} height={12} />
          )}

          {mediaKind === "video" ? "Video" : "Music"}
        </span>

        {/* Access badge */}

        <div className="fk-card__seal">
          <PlaylistAccessBadge
            access={access}
            price={price}
            currency={currency}
          />
        </div>

        {/* Duration */}

        <span className="fk-card__duration fk-data">
          {formatDuration(totalDurationSeconds)}
        </span>

        {/* Play */}

        <button
          type="button"
          className="fk-card__play"
          aria-label={`Play ${title}`}
          onClick={() => onPlay?.(id)}
        >
          <PlayIcon width={18} height={18} />
        </button>
      </div>

      {/* -------------------------------------------------
          Body
      -------------------------------------------------- */}

      <div className="fk-card__body">
        <h3 className="fk-card__title">
          <Link to={detailHref}>{title}</Link>
        </h3>

        {/* Creator */}

        <Link
          to={`/media/producers/${creator.username}`}
          className="fk-card__creator"
        >
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <span
              className="fk-card__creator-placeholder"
              aria-hidden="true"
            >
              {creator.displayName
                ?.charAt(0)
                .toUpperCase() || "F"}
            </span>
          )}

          <span>{creator.displayName}</span>

          {creator.verified && (
            <span
              className="fk-verified"
              title="Verified producer"
              aria-label="Verified producer"
            >
              <VerifiedIcon />
            </span>
          )}
        </Link>

        {/* Metadata */}

        <div className="fk-card__meta">
          <span>
            {trackCount}{" "}
            {trackCount === 1 ? "track" : "tracks"}
          </span>

          <span aria-hidden="true">
            &middot;
          </span>

          <span>
            {formatCount(playlist.playCount)} plays
          </span>
        </div>

        {/* Footer */}

        <div className="fk-card__footer">
          <span className="fk-card__price">
            {access === "free"
              ? "Listen free"
              : `View ${access}`}
          </span>

          <div className="fk-card__icon-actions">
            {/* Favorite */}

            <button
              type="button"
              className="fk-icon-btn"
              aria-pressed={
                !!isFavoritedByCurrentUser
              }
              aria-label={
                isFavoritedByCurrentUser
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
              onClick={() =>
                onFavorite?.(id)
              }
            >
              <HeartIcon
                width={16}
                height={16}
                filled={
                  !!isFavoritedByCurrentUser
                }
              />
            </button>

            {/* Share */}

            <button
              type="button"
              className="fk-icon-btn"
              aria-label={`Share ${title}`}
              onClick={() => onShare?.(id)}
            >
              <ShareIcon
                width={16}
                height={16}
              />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}