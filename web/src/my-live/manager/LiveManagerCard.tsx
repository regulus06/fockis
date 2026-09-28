import {
  BarChart3,
  Clock3,
  Download,
  Eye,
  MoreVertical,
  Radio,
  Trash2,
  Users,
} from "lucide-react";

import { useState } from "react";

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

  [key: string]: unknown;
}

interface LiveManagerCardProps {
  live?: LiveManagerCardLive | null;

  isActive?: boolean;

  isDeleting?: boolean;

  onView?: () => void;

  onDownload?: () => void;

  onDelete?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(seconds: unknown) {
  const value = Number(seconds ?? 0);

  if (!Number.isFinite(value) || value < 1) {
    return "—";
  }

  const total = Math.floor(value);

  const hours = Math.floor(total / 3600);

  const minutes = Math.floor(
    (total % 3600) / 60,
  );

  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(
      2,
      "0",
    )}m`;
  }

  return `${minutes}m ${String(secs).padStart(
    2,
    "0",
  )}s`;
}

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

// ============================================================================
// CARD
// ============================================================================

export default function LiveManagerCard({
  live,
  isActive = false,
  isDeleting = false,
  onView = () => {},
  onDownload = () => {},
  onDelete = () => {},
}: LiveManagerCardProps) {
  const [menuOpen, setMenuOpen] =
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

  const viewers = Number(
    live.currentViewers ??
      live.viewerCount ??
      0,
  );

  const peak = Number(
    live.peakViewers ??
      live.peakViewerCount ??
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
    live.duration ??
      live.elapsedSeconds ??
      0,
  );

  const date =
    live.endedAt ??
    live.startedAt ??
    live.createdAt ??
    null;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <article
      className={`live-card ${
        isActive
          ? "live-card--active"
          : ""
      }`}
    >
      {/* ====================================================================
          THUMBNAIL
      ==================================================================== */}

      <div className="live-card__media">
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

        <div
          className={`live-card__status ${
            isActive
              ? "live-card__status--live"
              : "live-card__status--ended"
          }`}
        >
          {isActive && (
            <span className="live-card__pulse" />
          )}

          {isActive
            ? "LIVE"
            : "ENDED"}
        </div>

        <div className="live-card__duration">
          <Clock3 size={13} />

          {formatDuration(duration)}
        </div>
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
                {/* VIEW */}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onView();
                  }}
                >
                  <Eye size={15} />
                  View
                </button>

                {/* DOWNLOAD */}

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDownload();
                    }}
                  >
                    <Download size={15} />
                    Download
                  </button>
                )}

                {/* DELETE */}

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
                    : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================================
            STATS
        ================================================================== */}

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
              {formatNumber(viewers)}
            </span>

            <small>
              viewers
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

        {/* ==================================================================
            FOOTER
        ================================================================== */}

        <div className="live-card__footer">
          <div className="live-card__mini-stats">
            <span>
              {formatNumber(
                comments,
              )}{" "}
              comments
            </span>

            <span>
              {formatNumber(
                shares,
              )}{" "}
              shares
            </span>
          </div>

          <div className="live-card__actions">
            {/* VIEW */}

            <button
              type="button"
              onClick={onView}
            >
              <Eye size={15} />
              View
            </button>

            {/* DOWNLOAD */}

            {!isActive && (
              <button
                type="button"
                onClick={onDownload}
              >
                <Download size={15} />
                Download
              </button>
            )}

            {/* DELETE */}

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
      </div>
    </article>
  );
}