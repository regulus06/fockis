import {
  BarChart3,
  Clock3,
  Download,
  Eye,
  Info,
  Loader2,
  MoreVertical,
  Play,
  Radio,
  Send,
  Trash2,
  Users,
  VideoOff,
} from "lucide-react";

import { useState } from "react";

import type { LiveRecordingDTO } from "../types";

import { formatDuration as formatClock } from "../utils";

// ============================================================================
// TYPES
// ============================================================================

export interface LiveManagerCardLive {
  _id?: string;
  id?: string;

  title?: string;
  description?: string;

  thumbnailUrl?: string | null;

  status?: string;
  phase?: string;

  viewerCount?: number;
  currentViewers?: number;

  peakViewers?: number;
  peakViewerCount?: number;

  totalViews?: number;

  likes?: number;
  likeCount?: number;

  comments?: number;
  commentCount?: number;

  shares?: number;
  shareCount?: number;

  duration?: number;
  elapsedSeconds?: number;

  createdAt?: string;
  startedAt?: string | null;
  endedAt?: string | null;

  recordingUrl?: string;
  replayUrl?: string;

  recording?: LiveRecordingDTO;

  [key: string]: unknown;
}

interface LiveManagerCardProps {
  live?: LiveManagerCardLive | null;

  isActive?: boolean;

  isDeleting?: boolean;

  /** Opens the studio (live) or the recording player (ended). */
  onView?: () => void;

  onDownload?: () => void;

  onPublish?: () => void;

  onDelete?: () => void;
}

type MediaState =
  | "live"
  | "ready"
  | "processing"
  | "unavailable";

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(value?: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number.toLocaleString()
    : "0";
}

export function getMediaState(
  live: LiveManagerCardLive,
  isActive: boolean,
): MediaState {
  if (isActive) {
    return "live";
  }

  const status =
    live.recording?.status ?? "none";

  if (
    status === "ready" &&
    live.recording?.playbackUrl
  ) {
    return "ready";
  }

  if (
    status === "processing" ||
    status === "recording" ||
    status === "starting"
  ) {
    return "processing";
  }

  return "unavailable";
}

// ============================================================================
// CARD
// ============================================================================

export default function LiveManagerCard({
  live,
  isActive = false,
  isDeleting = false,
  onView = () => {},
  onDownload = () => {},
  onPublish = () => {},
  onDelete = () => {},
}: LiveManagerCardProps) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [previewFailed, setPreviewFailed] =
    useState(false);

  // ==========================================================================
  // SAFETY GUARD
  // ==========================================================================

  if (!live) {
    return (
      <article className="live-card live-card--invalid">
        <div className="live-card__media">
          <div className="live-card__placeholder">
            <Radio size={30} />
          </div>
        </div>

        <div className="live-card__content">
          <div className="live-card__title-row">
            <div>
              <h3>
                Live stream unavailable
              </h3>

              <p>
                No stream data was returned.
              </p>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // ==========================================================================
  // NORMALIZED VALUES
  // ==========================================================================

  const title = String(
    live.title ??
      "Untitled Live Stream",
  );

  const thumbnail = String(
    live.thumbnailUrl ?? "",
  );

  const peak = Number(
    live.peakViewers ??
      live.peakViewerCount ??
      0,
  );

  const views = Number(
    live.totalViews ??
      live.currentViewers ??
      live.viewerCount ??
      0,
  );

  const likes = Number(
    live.likes ??
      live.likeCount ??
      0,
  );

  const comments = Number(
    live.comments ??
      live.commentCount ??
      0,
  );

  const shares = Number(
    live.shares ??
      live.shareCount ??
      0,
  );

  const duration = Number(
    live.recording?.durationSeconds ||
      live.duration ||
      live.elapsedSeconds ||
      0,
  );

  const date =
    live.endedAt ??
    live.startedAt ??
    live.createdAt ??
    null;

  const mediaState = getMediaState(
    live,
    isActive,
  );

  const recordingReady =
    mediaState === "ready";

  const playbackUrl =
    live.recording?.playbackUrl ?? "";

  const alreadyPublished = Boolean(
    live.recording?.publishedPostId,
  );

  const unavailableReason =
    live.recording?.status === "failed" ||
    live.recording?.status === "deleted"
      ? live.recording?.message ||
        "The recording could not be saved."
      : live.recording?.message ||
        "No recording was saved for this LIVE.";

  const clickable =
    isActive || recordingReady;

  // ==========================================================================
  // MEDIA
  // ==========================================================================

  const renderMedia = () => {
    if (mediaState === "ready") {
      return (
        <>
          {!previewFailed ? (
            <video
              className="live-card__thumbnail"
              src={`${playbackUrl}#t=1`}
              preload="metadata"
              muted
              playsInline
              poster={thumbnail || undefined}
              onError={() =>
                setPreviewFailed(true)
              }
              aria-hidden="true"
              tabIndex={-1}
            />
          ) : thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="live-card__thumbnail"
            />
          ) : (
            <div className="live-card__placeholder" />
          )}

          <div className="live-card__media-overlay" />

          <span className="live-card__play">
            <Play
              size={26}
              fill="currentColor"
            />
          </span>
        </>
      );
    }

    if (mediaState === "processing") {
      return (
        <>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="live-card__thumbnail live-card__thumbnail--dim"
            />
          ) : (
            <div className="live-card__placeholder live-card__placeholder--dim" />
          )}

          <span className="live-card__spinner">
            <Loader2 size={34} />
          </span>
        </>
      );
    }

    if (mediaState === "unavailable") {
      return (
        <div className="live-card__placeholder live-card__placeholder--unavailable">
          <VideoOff size={34} />
        </div>
      );
    }

    // Currently LIVE
    return (
      <>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="live-card__thumbnail"
          />
        ) : (
          <div className="live-card__placeholder">
            <Radio size={30} />
          </div>
        )}

        <div className="live-card__media-overlay" />
      </>
    );
  };

  const badge =
    mediaState === "live"
      ? {
          className:
            "live-card__status--live",
          label: "LIVE",
        }
      : mediaState === "processing"
        ? {
            className:
              "live-card__status--processing",
            label: "PROCESSING",
          }
        : mediaState === "unavailable"
          ? {
              className:
                "live-card__status--unavailable",
              label: "RECORDING UNAVAILABLE",
            }
          : {
              className:
                "live-card__status--ended",
              label: "ENDED",
            };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <article
      className={`live-card ${
        isActive
          ? "live-card--active"
          : ""
      } live-card--${mediaState}`}
    >
      {/* ====================================================================
          MEDIA
      ==================================================================== */}

      <div
        className={`live-card__media ${
          clickable
            ? "live-card__media--clickable"
            : ""
        }`}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={
          clickable
            ? isActive
              ? `Open ${title} in Live Studio`
              : `Watch recording of ${title}`
            : undefined
        }
        onClick={
          clickable ? onView : undefined
        }
        onKeyDown={(event) => {
          if (
            clickable &&
            (event.key === "Enter" ||
              event.key === " ")
          ) {
            event.preventDefault();
            onView();
          }
        }}
      >
        {renderMedia()}

        <div
          className={`live-card__status ${badge.className}`}
        >
          {isActive && (
            <span className="live-card__pulse" />
          )}

          {badge.label}
        </div>

        {mediaState !== "unavailable" &&
          duration > 0 && (
            <div className="live-card__duration">
              {mediaState === "processing" && (
                <Clock3 size={12} />
              )}

              {formatClock(duration)}
            </div>
          )}
      </div>

      {/* ====================================================================
          CONTENT
      ==================================================================== */}

      <div className="live-card__content">
        <div className="live-card__title-row">
          <div>
            <h3>{title}</h3>

            <p>
              {formatDate(date)}
            </p>
          </div>

          {/* ================================================================
              MENU
          ================================================================ */}

          <div className="live-card__menu-wrap">
            <button
              type="button"
              className="live-card__menu-button"
              onClick={() =>
                setMenuOpen(
                  (value) => !value,
                )
              }
              aria-label="Live stream options"
              aria-expanded={menuOpen}
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div className="live-card__menu">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onView();
                  }}
                  disabled={!clickable}
                  title={
                    clickable
                      ? undefined
                      : "The recording is not available yet."
                  }
                >
                  {isActive ? (
                    <Eye size={15} />
                  ) : (
                    <Play size={15} />
                  )}

                  {isActive
                    ? "Open studio"
                    : "Watch recording"}
                </button>

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDownload();
                    }}
                    disabled={!recordingReady}
                    title={
                      recordingReady
                        ? undefined
                        : "The recording is not ready to download."
                    }
                  >
                    <Download size={15} />
                    Download
                  </button>
                )}

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onPublish();
                    }}
                    disabled={
                      !recordingReady ||
                      alreadyPublished
                    }
                    title={
                      alreadyPublished
                        ? "Already published to your feed."
                        : recordingReady
                          ? undefined
                          : "The recording is not ready to publish."
                    }
                  >
                    <Send size={15} />

                    {alreadyPublished
                      ? "Published"
                      : "Publish to Feed"}
                  </button>
                )}

                <button
                  type="button"
                  className="live-card__menu-delete"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 size={15} />

                  {isDeleting
                    ? "Deleting..."
                    : "Delete livestream"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================================
            STATE MESSAGES
        ================================================================== */}

        {mediaState === "processing" && (
          <p className="live-card__notice">
            <Info size={14} />

            <span>
              Recording is processing...
              <br />
              This may take a few minutes.
            </span>
          </p>
        )}

        {mediaState === "unavailable" && (
          <p className="live-card__notice">
            <Info size={14} />

            <span>
              Recording unavailable
              <br />
              {unavailableReason}
            </span>
          </p>
        )}

        {(mediaState === "ready" ||
          mediaState === "live") && (
          <>
            {/* ==============================================================
                STATS
            ============================================================== */}

            <div className="live-card__stats">
              <div>
                <Users size={14} />

                <span>
                  {formatNumber(peak)}
                </span>

                <small>
                  peak
                </small>
              </div>

              <div>
                <Eye size={14} />

                <span>
                  {formatNumber(views)}
                </span>

                <small>
                  views
                </small>
              </div>

              <div>
                <BarChart3 size={14} />

                <span>
                  {formatNumber(likes)}
                </span>

                <small>
                  likes
                </small>
              </div>
            </div>

            {/* ==============================================================
                FOOTER
            ============================================================== */}

            <div className="live-card__footer">
              <div className="live-card__mini-stats">
                <span>
                  <strong>
                    {formatNumber(
                      comments,
                    )}
                  </strong>
                  comments
                </span>

                <span>
                  <strong>
                    {formatNumber(
                      shares,
                    )}
                  </strong>
                  shares
                </span>
              </div>

              <div className="live-card__actions">
                <button
                  type="button"
                  onClick={onView}
                >
                  <Eye size={15} />
                  View
                </button>

                {!isActive && (
                  <button
                    type="button"
                    onClick={onDownload}
                    disabled={!recordingReady}
                  >
                    <Download size={15} />
                    Download
                  </button>
                )}

                <button
                  type="button"
                  className="live-card__delete"
                  onClick={onDelete}
                  disabled={isDeleting}
                  title="Delete livestream"
                  aria-label="Delete livestream"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
