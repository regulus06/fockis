import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  Edit3,
  Heart,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Share2,
  Trash2,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react";

import { useState } from "react";

import { api } from "../api";
import { endedAnalyticsSeed } from "../data";
import type { Analytics } from "../types";
import { formatCount, formatCurrency, formatDuration } from "../utils";
import { Button, ConfirmDialog } from "./ui/Primitives";

// ============================================================================
// TYPES
// ============================================================================

interface EndedScreenProps {
  /**
   * ID of the LIVE session that has ended.
   *
   * Nullable because the UI can still render even if the session ID was
   * not persisted correctly.
   */
  sessionId: string | null;

  /** Returns the creator to the dashboard and resets the studio. */
  backToDashboardReset: () => void;

  /** Real statistics collected by the studio during the session. */
  analytics?: Analytics;

  /** Length of the session in seconds. */
  elapsedSeconds?: number;

  /** Opens the analytics panel. */
  onViewAnalytics?: () => void;

  /** Whether the creator asked for a replay to be saved. */
  saveReplay?: boolean;
}

// ============================================================================
// ENDED SCREEN
// ============================================================================

export function EndedScreen({
  sessionId,
  backToDashboardReset,
  analytics,
  elapsedSeconds,
  onViewAnalytics,
  saveReplay,
}: EndedScreenProps) {
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // STATS — real session data when available, empty seed otherwise.
  // ==========================================================================

  const cards = [
    {
      icon: TrendingUp,
      label: "Peak viewers",
      value: formatCount(analytics?.peakViewers ?? endedAnalyticsSeed.peakViewers),
    },
    {
      icon: Clock3,
      label: "Duration",
      value:
        elapsedSeconds !== undefined
          ? formatDuration(elapsedSeconds)
          : endedAnalyticsSeed.watchTime,
    },
    {
      icon: UserPlus,
      label: "New followers",
      value: `+${formatCount(analytics?.newFollowers ?? endedAnalyticsSeed.newFollowers)}`,
    },
    {
      icon: Heart,
      label: "Likes",
      value: formatCount(analytics?.likes ?? endedAnalyticsSeed.likes),
    },
    {
      icon: MessageCircle,
      label: "Comments",
      value: formatCount(analytics?.comments ?? 0),
    },
    {
      icon: Share2,
      label: "Shares",
      value: formatCount(analytics?.shares ?? endedAnalyticsSeed.shares),
    },
  ];

  const revenue = analytics?.totalRevenue ?? endedAnalyticsSeed.revenue;

  // ==========================================================================
  // DOWNLOAD RECORDING
  // ==========================================================================

  const handleDownloadRecording = async () => {
    if (!sessionId) {
      setError("The LIVE session ID is missing. The recording cannot be downloaded.");
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      await api.downloadRecording(sessionId);
    } catch (downloadError) {
      console.error("[FOCKIS LIVE] Failed to download recording:", downloadError);
      setError(
        downloadError instanceof Error ? downloadError.message : "Unable to download the recording.",
      );
    } finally {
      setDownloading(false);
    }
  };

  // ==========================================================================
  // DELETE LIVE
  // ==========================================================================

  const handleDeleteLive = async () => {
    if (!sessionId) {
      setError("The LIVE session ID is missing. This LIVE cannot be deleted.");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await api.deleteSession(sessionId);
      setShowDeleteConfirm(false);
      backToDashboardReset();
    } catch (deleteError) {
      console.error("[FOCKIS LIVE] Failed to delete LIVE:", deleteError);
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete this LIVE stream.",
      );
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="ended-wrap">
      <div className="ended-card">
        <div className="ended-badge">
          <CheckCircle2 size={14} />
          LIVE ENDED
        </div>

        <h1 className="ended-heading">Your livestream has ended</h1>

        <p className="ended-sub">
          Here's how it went.
          {saveReplay ? " A replay will be available from your Live Manager once it's processed." : ""}
        </p>

        {!sessionId && (
          <div className="ended-notice ended-notice--warn" role="status">
            <AlertTriangle size={16} />
            <span>This LIVE session is no longer available for management.</span>
          </div>
        )}

        <div className="ended-stat-grid">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div className="ended-stat-card" key={card.label}>
                <Icon size={16} className="ended-stat-card__icon" aria-hidden="true" />
                <span className="ended-stat-card__value">{card.value}</span>
                <span className="ended-stat-card__label">{card.label}</span>
              </div>
            );
          })}
        </div>

        <div className="ended-revenue-row">
          <span className="ended-revenue-row__label">
            <DollarSign size={15} />
            Revenue from this stream
          </span>
          <span className="ended-revenue-row__value">{formatCurrency(revenue)}</span>
        </div>

        {error && (
          <div className="ended-notice ended-notice--error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="ended-actions">
          <Button
            variant="secondary"
            icon={<BarChart3 size={15} />}
            onClick={onViewAnalytics}
            disabled={!onViewAnalytics}
          >
            View analytics
          </Button>

          <Button
            variant="secondary"
            icon={<Edit3 size={15} />}
            disabled
            title="Replay editing isn't available yet"
          >
            Edit replay
          </Button>

          <Button
            variant="secondary"
            icon={downloading ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            onClick={handleDownloadRecording}
            disabled={downloading || !sessionId}
          >
            {downloading ? "Downloading…" : "Download recording"}
          </Button>

          <Button variant="primary" icon={<LayoutDashboard size={15} />} onClick={backToDashboardReset}>
            Back to studio
          </Button>
        </div>

        <div className="ended-delete">
          <button
            type="button"
            className="ended-delete__btn"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting || !sessionId}
          >
            <Trash2 size={15} />
            Delete livestream
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete this livestream?"
          description="This will permanently remove the livestream from your account. This action cannot be undone."
          confirmLabel="Delete"
          icon={<Trash2 size={18} />}
          busy={deleting}
          onConfirm={() => void handleDeleteLive()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
