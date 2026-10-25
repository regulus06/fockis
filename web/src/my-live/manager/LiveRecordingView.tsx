import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Share2,
  ThumbsUp,
  Trash2,
  Users,
  VideoOff,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { api } from "../../my-live/api";

import { formatDuration } from "../utils";

import type { LiveManagerCardLive } from "./LiveManagerCard";

import PublishRecordingModal from "./PublishRecordingModal";

type LiveRecordingDTO = {
  status: string;
  playbackUrl?: string | null;
  durationSeconds?: number;
  message?: string;
  publishedPostId?: string | null;
  publishedAt?: string | null;
};

interface LiveRecordingViewProps {
  streamId: string;

  /** Stream row from /live/mine (stats, title, dates). */
  live?: LiveManagerCardLive | null;

  /** Open the publish dialog as soon as the recording is ready. */
  autoOpenPublish?: boolean;

  onBack: () => void;

  /** Ask the page to reload the list after a change. */
  onChanged: () => void;
}

const POLL_MS = 8000;

function formatNumber(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number.toLocaleString()
    : "0";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LiveRecordingView({
  streamId,
  live,
  autoOpenPublish = false,
  onBack,
  onChanged,
}: LiveRecordingViewProps) {
  const navigate = useNavigate();

  const [recording, setRecording] =
    useState<LiveRecordingDTO | null>(
      (live?.recording as LiveRecordingDTO | null | undefined) ?? null,
    );

  const [totalViews, setTotalViews] =
    useState<number>(
      Number(live?.totalViews ?? 0),
    );

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [videoLoading, setVideoLoading] =
    useState(true);

  const [videoError, setVideoError] =
    useState(false);

  const [downloading, setDownloading] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [publishOpen, setPublishOpen] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [publishError, setPublishError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<{
      tone: "success" | "error";
      text: string;
      postId?: string;
    } | null>(null);

  const publishInFlight = useRef(false);

  // ==========================================================================
  // LOAD DETAILS
  // ==========================================================================

  const load = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) {
          setLoading(true);
        }

        setLoadError(null);

        const details =
          await api.getRecording(streamId);

        setRecording(details.recording);

        setTotalViews(
          Number(details.totalViews ?? 0),
        );

        setVideoError(false);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load this recording.",
        );
      } finally {
        setLoading(false);
      }
    },
    [streamId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const status =
    recording?.status ?? "none";

  const isProcessing =
    status === "processing" ||
    status === "recording" ||
    status === "starting";

  const isReady =
    status === "ready" &&
    Boolean(recording?.playbackUrl);

  // Poll until the recording leaves the processing state.
  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const timer = window.setInterval(() => {
      void load(true);
    }, POLL_MS);

    return () =>
      window.clearInterval(timer);
  }, [isProcessing, load]);

  const autoPublishHandled = useRef(false);

  useEffect(() => {
    if (
      autoOpenPublish &&
      !autoPublishHandled.current &&
      isReady &&
      !recording?.publishedPostId
    ) {
      autoPublishHandled.current = true;
      setPublishOpen(true);
    }
  }, [
    autoOpenPublish,
    isReady,
    recording?.publishedPostId,
  ]);

  // Tell the list once the state settles so its card updates too.
  const previousStatus = useRef(status);

  useEffect(() => {
    if (
      previousStatus.current !== status &&
      previousStatus.current !== "none"
    ) {
      onChanged();
    }

    previousStatus.current = status;
  }, [status, onChanged]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const handleDownload = async () => {
    if (!isReady || downloading) {
      return;
    }

    setDownloading(true);
    setNotice(null);

    try {
      await api.downloadRecording(streamId);
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "The download could not be started.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePublish = async (
    caption: string,
  ) => {
    if (publishInFlight.current) {
      return;
    }

    publishInFlight.current = true;

    setPublishing(true);
    setPublishError(null);

    try {
      const result =
        await api.publishRecording(
          streamId,
          caption,
        );

      setPublishOpen(false);

      setRecording((current) =>
        current
          ? {
              ...current,
              publishedPostId:
                result.postId,
              publishedAt:
                current.publishedAt ??
                new Date().toISOString(),
            }
          : current,
      );

      setNotice({
        tone: "success",
        text: result.alreadyPublished
          ? "This recording was already published to your feed."
          : "Your recording was published to your Fockis feed.",
        postId: result.postId,
      });

      onChanged();
    } catch (error) {
      setPublishError(
        error instanceof Error
          ? error.message
          : "The recording could not be published.",
      );
    } finally {
      publishInFlight.current = false;
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) {
      return;
    }

    const published = Boolean(
      recording?.publishedPostId,
    );

    const confirmed = window.confirm(
      [
        "Delete this recording permanently?",
        "",
        "• The video file will be removed and can no longer be watched or downloaded here.",
        "• The livestream and its statistics will be kept.",
        published
          ? "• The post you published to your feed is a separate copy and will NOT be deleted. Delete it from your feed if you want it gone too."
          : "• This cannot be undone.",
      ].join("\n"),
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setNotice(null);

    try {
      await api.deleteRecording(streamId);

      await load(true);

      onChanged();

      setNotice({
        tone: "success",
        text: "The recording was deleted.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "The recording could not be deleted.",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================================================
  // VALUES
  // ==========================================================================

  const title = String(
    live?.title ?? "Untitled Live Stream",
  );

  const description = String(
    live?.description ?? "",
  ).trim();

  const date = formatDate(
    (live?.endedAt as string | null) ??
      (live?.startedAt as string | null) ??
      (live?.createdAt as string | undefined) ??
      null,
  );

  const durationSeconds = Number(
    recording?.durationSeconds ||
      live?.duration ||
      0,
  );

  const alreadyPublished = Boolean(
    recording?.publishedPostId,
  );

  const stats = [
    {
      icon: <Users size={20} />,
      value:
        live?.peakViewerCount ??
        live?.peakViewers ??
        0,
      label: "Peak Viewers",
    },
    {
      icon: <Eye size={20} />,
      value: totalViews,
      label: "Total Views",
    },
    {
      icon: <ThumbsUp size={20} />,
      value:
        live?.likeCount ??
        live?.likes ??
        0,
      label: "Likes",
    },
    {
      icon: <MessageSquare size={20} />,
      value:
        live?.commentCount ??
        live?.comments ??
        0,
      label: "Comments",
    },
    {
      icon: <Share2 size={20} />,
      value:
        live?.shareCount ??
        live?.shares ??
        0,
      label: "Shares",
    },
  ];

  const disabledReason = isProcessing
    ? "The recording is still processing."
    : !isReady
      ? "No recording is available."
      : "";

  // ==========================================================================
  // PLAYER AREA
  // ==========================================================================

  const renderPlayer = () => {
    if (loading && !recording) {
      return (
        <div className="live-recording__state">
          <Loader2
            size={34}
            className="live-manager__spin"
          />

          <strong>Loading recording...</strong>
        </div>
      );
    }

    if (loadError && !recording) {
      return (
        <div className="live-recording__state live-recording__state--error">
          <AlertTriangle size={34} />

          <strong>Unable to load this recording</strong>

          <span>{loadError}</span>

          <button
            type="button"
            onClick={() => void load()}
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      );
    }

    if (isProcessing) {
      return (
        <div className="live-recording__state">
          <Loader2
            size={40}
            className="live-manager__spin"
          />

          <strong>Processing recording</strong>

          <span>
            {recording?.message ||
              "Your recording is being prepared. This may take a few minutes."}
          </span>
        </div>
      );
    }

    if (!isReady) {
      return (
        <div className="live-recording__state live-recording__state--muted">
          <VideoOff size={40} />

          <strong>Recording unavailable</strong>

          <span>
            {recording?.message ||
              "The recording could not be saved."}
          </span>
        </div>
      );
    }

    if (videoError) {
      return (
        <div className="live-recording__state live-recording__state--error">
          <AlertTriangle size={34} />

          <strong>Playback failed</strong>

          <span>
            The video could not be loaded. The secure link may have
            expired — reload it to try again.
          </span>

          <button
            type="button"
            onClick={() => {
              setVideoLoading(true);
              void load(true);
            }}
          >
            <RefreshCw size={15} />
            Reload video
          </button>
        </div>
      );
    }

    return (
      <>
        <video
          key={recording?.playbackUrl}
          className="live-recording__video"
          src={recording?.playbackUrl || undefined}
          controls
          playsInline
          preload="auto"
          poster={
            (live?.thumbnailUrl as string) ||
            undefined
          }
          onLoadStart={() => {
            setVideoLoading(true);
            setVideoError(false);
          }}
          onLoadedMetadata={(event) => {
            // If the LIVE did not provide a real thumbnail image, seek to
            // the first decodable frame so the paused player shows a preview.
            const video = event.currentTarget;
            if (
              !live?.thumbnailUrl &&
              Number.isFinite(video.duration) &&
              video.duration > 0
            ) {
              try {
                video.currentTime = Math.min(0.25, video.duration / 2);
              } catch {
                setVideoLoading(false);
              }
            } else {
              setVideoLoading(false);
            }
          }}
          onLoadedData={() => setVideoLoading(false)}
          onSeeked={() => setVideoLoading(false)}
          onCanPlay={() => setVideoLoading(false)}
          onError={() => {
            setVideoLoading(false);
            setVideoError(true);
          }}
        />

        {videoLoading && (
          <div className="live-recording__buffering">
            <Loader2
              size={34}
              className="live-manager__spin"
            />
          </div>
        )}
      </>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <section className="live-recording">
      <button
        type="button"
        className="live-recording__back"
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        Back to Live Manager
      </button>

      <div className="live-recording__player">
        {renderPlayer()}
      </div>

      <div className="live-recording__head">
        <div className="live-recording__heading">
          <h2>{title}</h2>

          <p>
            {[date, durationSeconds > 0
              ? formatDuration(durationSeconds)
              : ""]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>

        <div className="live-recording__actions">
          <button
            type="button"
            className="live-recording__btn live-recording__btn--primary"
            onClick={() => void handleDownload()}
            disabled={!isReady || downloading}
            title={disabledReason || undefined}
          >
            {downloading ? (
              <Loader2
                size={17}
                className="live-manager__spin"
              />
            ) : (
              <Download size={17} />
            )}
            Download
          </button>

          <button
            type="button"
            className="live-recording__btn live-recording__btn--primary"
            onClick={() => {
              setPublishError(null);
              setPublishOpen(true);
            }}
            disabled={
              !isReady || alreadyPublished
            }
            title={
              alreadyPublished
                ? "This recording is already on your feed."
                : disabledReason || undefined
            }
          >
            {alreadyPublished ? (
              <CheckCircle2 size={17} />
            ) : (
              <Send size={17} />
            )}

            {alreadyPublished
              ? "Published"
              : "Publish to Feed"}
          </button>

          <button
            type="button"
            className="live-recording__btn live-recording__btn--danger"
            onClick={() => void handleDelete()}
            disabled={
              deleting ||
              isProcessing ||
              status === "none" ||
              status === "deleted"
            }
            title={
              isProcessing
                ? "Wait until the recording has finished processing."
                : status === "none" ||
                    status === "deleted"
                  ? "There is no recording to delete."
                  : "Delete recording"
            }
          >
            {deleting ? (
              <Loader2
                size={17}
                className="live-manager__spin"
              />
            ) : (
              <Trash2 size={17} />
            )}
            Delete
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`live-recording__notice live-recording__notice--${notice.tone}`}
          role={
            notice.tone === "error"
              ? "alert"
              : "status"
          }
        >
          <span>{notice.text}</span>

          {notice.tone === "success" &&
            notice.postId && (
              <button
                type="button"
                onClick={() =>
                  navigate("/profile")
                }
              >
                View on your profile
              </button>
            )}
        </div>
      )}

      <div className="live-recording__stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <span className="live-recording__stat-icon">
              {stat.icon}
            </span>

            <strong>
              {formatNumber(stat.value)}
            </strong>

            <small>{stat.label}</small>
          </div>
        ))}
      </div>

      <div className="live-recording__description">
        <h3>Description</h3>

        <p>
          {description ||
            "No description was added to this livestream."}
        </p>
      </div>

      <PublishRecordingModal
        open={publishOpen}
        title={title}
        playbackUrl={
          recording?.playbackUrl ?? ""
        }
        durationSeconds={durationSeconds}
        publishing={publishing}
        error={publishError}
        onCancel={() => {
          if (!publishing) {
            setPublishOpen(false);
          }
        }}
        onPublish={(caption) =>
          void handlePublish(caption)
        }
      />
    </section>
  );
}
