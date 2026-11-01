import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Download,
  Edit3,
  Heart,
  LayoutDashboard,
  Loader2,
  Share2,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { useState } from "react";

import { api } from "../api";
import { endedAnalyticsSeed } from "../data";
import { formatCount } from "../utils";
import { Button } from "./ui/Primitives";

// ============================================================================
// TYPES
// ============================================================================

interface EndedScreenProps {
  /**
   * ID of the LIVE session that has ended.
   *
   * This is nullable because the UI can still render even if
   * the session ID was not persisted correctly.
   */
  sessionId: string | null;

  /**
   * Returns the creator to the dashboard and resets the studio.
   */
  backToDashboardReset: () => void;
}

// ============================================================================
// ENDED SCREEN
// ============================================================================

export function EndedScreen({
  sessionId,
  backToDashboardReset,
}: EndedScreenProps) {
  const stats = endedAnalyticsSeed;

  const [deleting, setDeleting] =
    useState(false);

  const [downloading, setDownloading] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // ==========================================================================
  // ANALYTICS CARDS
  // ==========================================================================

  const cards = [
    {
      icon: TrendingUp,
      label: "Peak viewers",
      value: formatCount(stats.peakViewers),
    },
    {
      icon: Users,
      label: "Total views",
      value: formatCount(stats.totalViews),
    },
    {
      icon: BarChart3,
      label: "Watch time",
      value: stats.watchTime,
    },
    {
      icon: UserPlus,
      label: "New followers",
      value: `+${stats.newFollowers}`,
    },
    {
      icon: Heart,
      label: "Likes",
      value: formatCount(stats.likes),
    },
    {
      icon: Share2,
      label: "Shares",
      value: formatCount(stats.shares),
    },
  ];

  // ==========================================================================
  // DOWNLOAD RECORDING
  // ==========================================================================

  const handleDownloadRecording = async () => {
    if (!sessionId) {
      setError(
        "The LIVE session ID is missing. The recording cannot be downloaded.",
      );

      return;
    }

    setDownloading(true);
    setError(null);

    try {
      await api.downloadRecording(sessionId);
    } catch (downloadError) {
      console.error(
        "[FOCKIS LIVE] Failed to download recording:",
        downloadError,
      );

      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the recording.",
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
      setError(
        "The LIVE session ID is missing. This LIVE cannot be deleted.",
      );

      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await api.deleteSession(sessionId);

      setShowDeleteConfirm(false);

      console.log(
        "[FOCKIS LIVE] LIVE deleted successfully:",
        sessionId,
      );

      backToDashboardReset();
    } catch (deleteError) {
      console.error(
        "[FOCKIS LIVE] Failed to delete LIVE:",
        deleteError,
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this LIVE stream.",
      );
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
        {/* ================================================================== */}
        {/* HEADER */}
        {/* ================================================================== */}

        <div className="ended-badge">
          <CheckCircle2 size={14} />
          LIVE ENDED
        </div>

        <h1 className="ended-heading">
          Your livestream has ended
        </h1>

        <p className="ended-sub">
          Here's how it went. A replay has been
          saved to your profile.
        </p>

        {/* ================================================================== */}
        {/* SESSION ID STATUS */}
        {/* ================================================================== */}

        {!sessionId && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              marginBottom: 18,
              borderRadius: 10,
              background:
                "rgba(245, 158, 11, 0.10)",
              color: "#b45309",
              fontSize: 13,
            }}
          >
            <AlertTriangle size={16} />

            <span>
              This LIVE session is no longer
              available for management.
            </span>
          </div>
        )}

        {/* ================================================================== */}
        {/* ANALYTICS */}
        {/* ================================================================== */}

        <div className="ended-stat-grid">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                className="ended-stat-card"
                key={card.label}
              >
                <Icon
                  size={15}
                  className="ended-stat-card__icon"
                />

                <span className="ended-stat-card__value">
                  {card.value}
                </span>

                <span className="ended-stat-card__label">
                  {card.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ================================================================== */}
        {/* REVENUE */}
        {/* ================================================================== */}

        <div className="ended-revenue-row">
          <span className="ended-revenue-row__label">
            <DollarSign size={15} />
            Revenue from this stream
          </span>

          <span className="ended-revenue-row__value">
            ${stats.revenue.toFixed(2)}
          </span>
        </div>

        {/* ================================================================== */}
        {/* ERROR */}
        {/* ================================================================== */}

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 16,
              padding: "11px 13px",
              borderRadius: 10,
              background:
                "rgba(239, 68, 68, 0.10)",
              color: "#dc2626",
              fontSize: 13,
            }}
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError(null)}
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                color: "inherit",
                display: "flex",
              }}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ================================================================== */}
        {/* ACTIONS */}
        {/* ================================================================== */}

        <div className="ended-actions">
          <Button
            variant="secondary"
            icon={<BarChart3 size={15} />}
          >
            View analytics
          </Button>

          <Button
            variant="secondary"
            icon={<Edit3 size={15} />}
          >
            Edit replay
          </Button>

          <Button
            variant="secondary"
            icon={
              downloading ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Download size={15} />
              )
            }
            onClick={handleDownloadRecording}
            disabled={
              downloading || !sessionId
            }
          >
            {downloading
              ? "Downloading..."
              : "Download recording"}
          </Button>

          <Button
            variant="primary"
            icon={
              <LayoutDashboard size={15} />
            }
            onClick={backToDashboardReset}
          >
            Back to dashboard
          </Button>
        </div>

        {/* ================================================================== */}
        {/* DELETE */}
        {/* ================================================================== */}

        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop:
              "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setShowDeleteConfirm(true)
            }
            disabled={
              deleting || !sessionId
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: 0,
              background: "transparent",
              color: "#dc2626",
              cursor:
                !sessionId || deleting
                  ? "not-allowed"
                  : "pointer",
              fontSize: 13,
              fontWeight: 600,
              opacity:
                !sessionId || deleting
                  ? 0.45
                  : 1,
            }}
          >
            <Trash2 size={15} />

            Delete livestream
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* DELETE CONFIRMATION */}
      {/* ==================================================================== */}

      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-live-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background:
              "rgba(0, 0, 0, 0.55)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 16,
              background: "#fff",
              padding: 24,
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "rgba(220, 38, 38, 0.10)",
                color: "#dc2626",
                marginBottom: 14,
              }}
            >
              <Trash2 size={20} />
            </div>

            <h2
              id="delete-live-title"
              style={{
                margin: "0 0 8px",
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Delete this livestream?
            </h2>

            <p
              style={{
                margin: "0 0 20px",
                color: "#6b7280",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              This will permanently remove the
              livestream from your account. This
              action cannot be undone.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowDeleteConfirm(false)
                }
                disabled={deleting}
                style={{
                  border: 0,
                  borderRadius: 9,
                  padding: "10px 16px",
                  background: "#f3f4f6",
                  color: "#374151",
                  cursor: deleting
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteLive}
                disabled={deleting}
                style={{
                  border: 0,
                  borderRadius: 9,
                  padding: "10px 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#dc2626",
                  color: "#fff",
                  cursor: deleting
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 600,
                }}
              >
                {deleting ? (
                  <>
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}