import {
  useEffect,
  useRef,
} from "react";

import {
  Volume2,
  VolumeX,
} from "lucide-react";

import type {
  LiveViewerStream,
} from "../hooks/useLiveViewer";

// ============================================================================
// PROPS
// ============================================================================

export interface ViewerStageProps {
  stream: LiveViewerStream;

  videoRef: (
    element: HTMLVideoElement | null,
  ) => void;

  muted: boolean;

  onToggleMute: () => void;
}

// ============================================================================
// VIEWER STAGE
// ============================================================================

export function ViewerStage({
  stream,
  videoRef,
  muted,
  onToggleMute,
}: ViewerStageProps) {
  const internalVideoRef =
    useRef<HTMLVideoElement | null>(null);

  // ==========================================================================
  // VIDEO REF
  // ==========================================================================

  const setVideoRef = (
    element: HTMLVideoElement | null,
  ) => {
    internalVideoRef.current = element;

    videoRef(element);
  };

  // ==========================================================================
  // STREAM URL
  // ==========================================================================

  const streamUrl =
    stream.playbackUrl ||
    stream.streamUrl ||
    "";

  // ==========================================================================
  // MUTE
  // ==========================================================================

  useEffect(() => {
    const video =
      internalVideoRef.current;

    if (!video) {
      return;
    }

    video.muted = muted;
  }, [muted]);

  // ==========================================================================
  // STREAM PLAYBACK
  // ==========================================================================

  useEffect(() => {
    const video =
      internalVideoRef.current;

    if (!video || !streamUrl) {
      return;
    }

    video.src = streamUrl;
    video.load();

    void video.play().catch((error) => {
      console.warn(
        "[ViewerStage] Autoplay was blocked:",
        error,
      );
    });

    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [streamUrl]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <section className="viewer-stage">
      <div className="viewer-stage__video-container">

        {/* ================================================================ */}
        {/* VIDEO */}
        {/* ================================================================ */}

        <video
          ref={setVideoRef}
          className="viewer-stage__video"
          src={
            streamUrl ||
            undefined
          }
          autoPlay
          playsInline
          muted={muted}
          controls={false}
          preload="auto"
          aria-label={`${stream.displayName || "Live"} live video`}
        />

        {/* ================================================================ */}
        {/* EMPTY STATE */}
        {/* ================================================================ */}

        {!streamUrl && (
          <div className="viewer-stage__empty">

            <div className="viewer-stage__empty-icon">
              📡
            </div>

            <h3>
              Live video unavailable
            </h3>

            <p>
              The broadcaster has not provided
              a playable stream yet.
            </p>

          </div>
        )}

        {/* ================================================================ */}
        {/* LIVE BADGE */}
        {/* ================================================================ */}

        <div className="viewer-stage__live-badge">
          <span className="live-dot" />

          <span>
            LIVE
          </span>
        </div>

        {/* ================================================================ */}
        {/* MUTE BUTTON */}
        {/* ================================================================ */}

        <button
          type="button"
          className="viewer-stage__mute-button"
          onClick={onToggleMute}
          aria-label={
            muted
              ? "Unmute live stream"
              : "Mute live stream"
          }
          title={
            muted
              ? "Unmute"
              : "Mute"
          }
        >
          {muted ? (
            <VolumeX size={20} />
          ) : (
            <Volume2 size={20} />
          )}
        </button>

      </div>
    </section>
  );
}

export default ViewerStage;