import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import { useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import type { MusicContent } from "../types/music.types";

import { MusicAccessBadge } from "./MusicAccessBadge";

import { formatDuration } from "../utils/formatDuration";

import { formatMusicPrice } from "../utils/formatMusicPrice";

import { musicApi } from "../services/musicApi";

interface MusicCardProps {
  content: MusicContent;

  onPlayPreview?: (
    content: MusicContent,
  ) => void;

  onFavorite?: (
    content: MusicContent,
  ) => void;

  onShare?: (
    content: MusicContent,
  ) => void;

  onAddToPlaylist?: (
    content: MusicContent,
  ) => void;

  isFavorited?: boolean;

  /**
   * Show producer management controls.
   *
   * Keep this false for public Music Home / Explore cards.
   * Set it to true from My Content / Producer Studio.
   */
  showManagementActions?: boolean;

  /**
   * Optional callback after a successful delete.
   * The parent can use this to remove the card from its list.
   */
  onDeleted?: (
    content: MusicContent,
  ) => void;
}

// ============================================================================
// API BASE URL
// ============================================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

// ============================================================================
// TYPES / HELPERS
// ============================================================================

type UnknownRecord = Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function firstNonEmptyString(
  ...values: unknown[]
): string | null {
  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function normalizeStoragePath(
  value: string,
): string {
  let normalized = value
    .trim()
    .replace(/\\/g, "/");

  normalized = normalized.replace(
    /^https?:\/\/[^/]+/i,
    "",
  );

  normalized = normalized.split("?")[0];

  normalized = normalized.split("#")[0];

  normalized = normalized.replace(
    /^\/+/,
    "",
  );

  normalized = normalized.replace(
    /^uploads\/?/i,
    "",
  );

  return normalized;
}

function resolveApiUrl(
  value: string | null | undefined,
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `${window.location.protocol}${trimmed}`;
  }

  const normalized =
    normalizeStoragePath(trimmed);

  if (!normalized) {
    return null;
  }

  if (
    normalized
      .toLowerCase()
      .startsWith("uploads/")
  ) {
    return `${API_BASE_URL}/${normalized}`;
  }

  if (
    normalized.startsWith("music/") ||
    normalized.startsWith("music-covers/")
  ) {
    return `${API_BASE_URL}/uploads/${normalized}`;
  }

  if (normalized.startsWith("/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  return `${API_BASE_URL}/${normalized}`;
}

// ============================================================================
// COVER URL
// ============================================================================

function getCoverUrl(
  content: MusicContent,
): string {
  const value =
    content as unknown as UnknownRecord;

  // --------------------------------------------------------------------------
  // Direct frontend fields
  // --------------------------------------------------------------------------

  const directCover =
    firstNonEmptyString(
      value["coverImageUrl"],
      value["thumbnailUrl"],
      value["artworkUrl"],
      value["posterUrl"],
    );

  if (directCover) {
    return (
      resolveApiUrl(directCover) ||
      ""
    );
  }

  // --------------------------------------------------------------------------
  // Backend coverImage object
  // --------------------------------------------------------------------------

  const coverImage =
    value["coverImage"];

  if (typeof coverImage === "string") {
    return (
      resolveApiUrl(coverImage) ||
      ""
    );
  }

  if (isRecord(coverImage)) {
    const coverUrl =
      firstNonEmptyString(
        coverImage["url"],
        coverImage["imageUrl"],
        coverImage["storageUrl"],
      );

    if (coverUrl) {
      return (
        resolveApiUrl(coverUrl) ||
        ""
      );
    }

    const storageKey =
      firstNonEmptyString(
        coverImage["storageKey"],
        coverImage["key"],
        coverImage["path"],
      );

    if (storageKey) {
      return (
        resolveApiUrl(
          `/uploads/${normalizeStoragePath(
            storageKey,
          )}`,
        ) || ""
      );
    }
  }

  // --------------------------------------------------------------------------
  // Media-level cover
  // --------------------------------------------------------------------------

  const media =
    value["media"];

  if (isRecord(media)) {
    const mediaCover =
      firstNonEmptyString(
        media["thumbnailUrl"],
        media["coverImageUrl"],
        media["posterUrl"],
      );

    if (mediaCover) {
      return (
        resolveApiUrl(mediaCover) ||
        ""
      );
    }

    const nestedCover =
      media["coverImage"];

    if (typeof nestedCover === "string") {
      return (
        resolveApiUrl(nestedCover) ||
        ""
      );
    }

    if (isRecord(nestedCover)) {
      const nestedUrl =
        firstNonEmptyString(
          nestedCover["url"],
          nestedCover["imageUrl"],
          nestedCover["storageUrl"],
        );

      if (nestedUrl) {
        return (
          resolveApiUrl(nestedUrl) ||
          ""
        );
      }

      const nestedStorageKey =
        firstNonEmptyString(
          nestedCover["storageKey"],
          nestedCover["key"],
          nestedCover["path"],
        );

      if (nestedStorageKey) {
        return (
          resolveApiUrl(
            `/uploads/${normalizeStoragePath(
              nestedStorageKey,
            )}`,
          ) || ""
        );
      }
    }
  }

  return "";
}

// ============================================================================
// CONTENT ID
// ============================================================================

function getContentId(
  content: MusicContent,
): string {
  const value =
    content as unknown as UnknownRecord;

  const id =
    firstNonEmptyString(
      value["id"],
      value["_id"],
    );

  if (id) {
    return id;
  }

  const mongoId =
    value["_id"];

  if (isRecord(mongoId)) {
    const objectId =
      firstNonEmptyString(
        mongoId["$oid"],
      );

    if (objectId) {
      return objectId;
    }
  }

  return "";
}

// ============================================================================
// MEDIA KIND
// ============================================================================

function isVideoContent(
  content: MusicContent,
): boolean {
  const value =
    content as unknown as UnknownRecord;

  const type =
    firstNonEmptyString(
      value["type"],
      value["contentType"],
    )?.toLowerCase();

  const mediaKind =
    firstNonEmptyString(
      value["mediaKind"],
    )?.toLowerCase();

  return (
    type === "video" ||
    type === "music_video" ||
    type === "live_performance" ||
    type === "interview" ||
    type === "behind_the_scenes" ||
    type === "tutorial" ||
    type === "exclusive_video" ||
    type === "movie" ||
    type === "film" ||
    mediaKind === "video" ||
    mediaKind === "video_file" ||
    mediaKind === "music_video"
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MusicCard({
  content,
  onPlayPreview,
  onFavorite,
  onShare,
  onAddToPlaylist,
  isFavorited,
  showManagementActions = false,
  onDeleted,
}: MusicCardProps) {
  const navigate = useNavigate();

  const [
    imageError,
    setImageError,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const contentId =
    useMemo(
      () => getContentId(content),
      [content],
    );

  const coverUrl =
    useMemo(
      () => getCoverUrl(content),
      [content],
    );

  const videoContent =
    useMemo(
      () => isVideoContent(content),
      [content],
    );

  const isPaid =
    content.accessType !== "free";

  const hasCover =
    Boolean(coverUrl) &&
    !imageError;

  // ==========================================================================
  // DURATION
  // ==========================================================================

  const durationSeconds =
    typeof content.durationSeconds ===
      "number" &&
    Number.isFinite(
      content.durationSeconds,
    ) &&
    content.durationSeconds > 0
      ? content.durationSeconds
      : null;

  // ==========================================================================
  // EDIT
  // ==========================================================================

  function handleEdit(): void {
    if (!contentId) {
      console.error(
        "[MusicCard] Cannot edit content without an ID.",
        content,
      );

      return;
    }

    navigate(
      `/music/studio/edit/${encodeURIComponent(
        contentId,
      )}`,
    );
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  async function handleDelete(): Promise<void> {
    if (!contentId || deleting) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${content.title}"?\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      await musicApi.remove(
        contentId,
      );

      onDeleted?.(content);

      console.info(
        "[MusicCard] Content deleted:",
        contentId,
      );
    } catch (error) {
      console.error(
        "[MusicCard] Failed to delete content:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete this content.";

      window.alert(
        message ||
          "Failed to delete this content.",
      );
    } finally {
      setDeleting(false);
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <article
      className="music-card"
      data-testid="music-card"
    >
      {/* ================================================================== */}
      {/* COVER                                                              */}
      {/* ================================================================== */}

      <Link
        to={`/music/content/${contentId}`}
        className="music-card__cover-link"
      >
        <div
          className="music-card__cover"
          data-has-cover={
            hasCover
              ? "true"
              : "false"
          }
        >
          {hasCover ? (
            <img
              src={coverUrl}
              alt={content.title}
              className="music-card__cover-image"
              loading="lazy"
              onError={() => {
                console.error(
                  "[MusicCard] Cover failed to load:",
                  {
                    contentId,
                    title:
                      content.title,
                    coverUrl,
                  },
                );

                setImageError(true);
              }}
            />
          ) : (
            <div
              className="music-card__cover-placeholder"
              aria-label={
                videoContent
                  ? "Video cover unavailable"
                  : "Music cover unavailable"
              }
            >
              <div className="music-card__cover-placeholder-icon">
                {videoContent
                  ? "▶"
                  : "♫"}
              </div>

              <span>
                {videoContent
                  ? "Video"
                  : "Music"}
              </span>
            </div>
          )}

          {/* ============================================================ */}
          {/* DURATION                                                     */}
          {/* ============================================================ */}

          {durationSeconds !== null ? (
            <span className="music-card__duration">
              {formatDuration(
                durationSeconds,
              )}
            </span>
          ) : null}

          {/* ============================================================ */}
          {/* PAID LABEL                                                   */}
          {/* ============================================================ */}

          {isPaid ? (
            <span className="music-card__paid-overlay">
              Premium
            </span>
          ) : null}
        </div>
      </Link>

      {/* ================================================================== */}
      {/* BODY                                                               */}
      {/* ================================================================== */}

      <div className="music-card__body">
        {/* ================================================================= */}
        {/* TITLE                                                             */}
        {/* ================================================================= */}

        <div className="music-card__title-row">
          <Link
            to={`/music/content/${contentId}`}
            className="music-card__title"
          >
            {content.title}
          </Link>

          <MusicAccessBadge
            accessType={
              content.accessType
            }
          />
        </div>

        {/* ================================================================= */}
        {/* PRODUCER                                                          */}
        {/* ================================================================= */}

        <Link
          to={`/music/producer/${content.producerId}`}
          className="music-card__producer"
        >
          {content.producerName ??
            "Unknown Producer"}

          {content.producerVerified ? (
            <VerifiedIcon />
          ) : null}
        </Link>

        {/* ================================================================= */}
        {/* META                                                              */}
        {/* ================================================================= */}

        <div className="music-card__meta">
          {content.genre ? (
            <span className="music-card__genre">
              {content.genre.replace(
                "_",
                "-",
              )}
            </span>
          ) : null}

          <span className="music-card__plays">
            {content.playCount.toLocaleString()}{" "}
            plays
          </span>
        </div>

        {/* ================================================================= */}
        {/* PUBLIC ACTIONS                                                    */}
        {/* ================================================================= */}

        <div className="music-card__actions">
          {!isPaid ? (
            <button
              type="button"
              className="music-card__action music-card__action--primary"
              onClick={() =>
                onPlayPreview?.(
                  content,
                )
              }
            >
              Play
            </button>
          ) : (
            <>
              <button
                type="button"
                className="music-card__action"
                onClick={() =>
                  onPlayPreview?.(
                    content,
                  )
                }
              >
                Preview
              </button>

              <Link
                to={`/music/content/${contentId}`}
                className="music-card__action music-card__action--primary"
              >
                Unlock{" "}
                {formatMusicPrice(
                  content.priceCents,
                  content.currency,
                )}
              </Link>
            </>
          )}

          {/* =============================================================== */}
          {/* FAVORITE                                                        */}
          {/* =============================================================== */}

          <button
            type="button"
            className={`music-card__icon-btn ${
              isFavorited
                ? "music-card__icon-btn--active"
                : ""
            }`}
            onClick={() =>
              onFavorite?.(
                content,
              )
            }
            aria-label="Favorite"
            aria-pressed={
              isFavorited
            }
          >
            ♥
          </button>

          {/* =============================================================== */}
          {/* PLAYLIST                                                        */}
          {/* =============================================================== */}

          <button
            type="button"
            className="music-card__icon-btn"
            onClick={() =>
              onAddToPlaylist?.(
                content,
              )
            }
            aria-label="Add to playlist"
          >
            +
          </button>

          {/* =============================================================== */}
          {/* SHARE                                                           */}
          {/* =============================================================== */}

          <button
            type="button"
            className="music-card__icon-btn"
            onClick={() =>
              onShare?.(
                content,
              )
            }
            aria-label="Share"
          >
            ↗
          </button>
        </div>

        {/* ================================================================= */}
        {/* PRODUCER MANAGEMENT ACTIONS                                      */}
        {/* ================================================================= */}

        {showManagementActions ? (
          <div
            className="music-card__management"
            aria-label="Content management"
          >
            <button
              type="button"
              className="music-card__management-action music-card__management-action--edit"
              onClick={handleEdit}
              disabled={
                deleting ||
                !contentId
              }
            >
              <span
                aria-hidden="true"
              >
                ✎
              </span>

              <span>
                Edit
              </span>
            </button>

            <button
              type="button"
              className="music-card__management-action music-card__management-action--delete"
              onClick={handleDelete}
              disabled={
                deleting ||
                !contentId
              }
            >
              <span
                aria-hidden="true"
              >
                {deleting
                  ? "…"
                  : "🗑"}
              </span>

              <span>
                {deleting
                  ? "Deleting..."
                  : "Delete"}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

// ============================================================================
// VERIFIED ICON
// ============================================================================

function VerifiedIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-label="Verified producer"
      role="img"
    >
      <circle
        cx="7"
        cy="7"
        r="7"
        fill="#3B82F6"
      />

      <path
        d="M4 7L6 9L10 5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}