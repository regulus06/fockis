import { Hand, Mic, MicOff, Pin, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LocalVideoTrack, RemoteVideoTrack } from "livekit-client";

import { Avatar } from "../common/Avatar";
import type { RoomParticipant } from "../../types";

import "../../styles/components/room.scss";

export type ParticipantTileVariant = "featured" | "thumb" | "grid";

interface ParticipantTileProps {
  participant: RoomParticipant;
  videoTrack?: LocalVideoTrack | RemoteVideoTrack | null;
  /** featured = main stage, thumb = rail card, grid = gallery cell */
  variant?: ParticipantTileVariant;
  /** True for the person using this browser. Shown as "You". */
  isLocal?: boolean;
  /** Highlights the rail card that is currently on the main stage. */
  selected?: boolean;
  /** True when the user explicitly pinned this tile to the stage. */
  pinned?: boolean;
  onSelect?: () => void;
}

function SignalBars({ quality }: { quality: RoomParticipant["connectionQuality"] }) {
  const level =
    quality === "good" ? 4 : quality === "weak" ? 2 : quality === "poor" ? 1 : 0;

  return (
    <span
      className={`fm-signal fm-signal--${quality}`}
      role="img"
      aria-label={`Connection ${quality}`}
    >
      {[1, 2, 3, 4].map((bar) => (
        <i key={bar} className={bar <= level ? "is-on" : ""} />
      ))}
    </span>
  );
}

export function ParticipantTile({
  participant,
  videoTrack,
  variant = "grid",
  isLocal = false,
  selected = false,
  pinned = false,
  onSelect,
}: ParticipantTileProps) {
  const {
    user,
    micOn,
    cameraOn,
    handRaised,
    isSpeaking,
    connectionQuality,
    role,
  } = participant;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const connectionIsBad =
    connectionQuality === "poor" || connectionQuality === "reconnecting";

  useEffect(() => {
    const video = videoRef.current;
    let cancelled = false;
    let frameRequest = 0;
    let frameReady = false;
    let mediaFailed = false;

    setVideoReady(false);
    setVideoError(false);

    if (!video || !videoTrack) return;

    // Some browsers can fire loaded/playing events very quickly. Register all
    // listeners before attaching the LiveKit track so we don't miss the first
    // frame and leave the avatar overlay in place forever.
    const markReadyIfFrameExists = () => {
      if (cancelled) return;
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        frameReady = true;
        setVideoReady(true);
        setVideoError(false);
      }
    };

    const handleMediaError = () => {
      if (cancelled) return;
      // Keep the video element mounted so a transient media error can recover.
      mediaFailed = true;
      setVideoError(true);
    };

    const handlePlaying = () => markReadyIfFrameExists();

    const mediaEvents = ["loadedmetadata", "loadeddata", "canplay", "playing", "resize", "timeupdate"];

    mediaEvents.forEach((eventName) => {
      video.addEventListener(eventName, markReadyIfFrameExists);
    });
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleMediaError);

    const checkFrames = () => {
      if (cancelled) return;
      markReadyIfFrameExists();
      if (!frameReady && !mediaFailed) {
        frameRequest = window.requestAnimationFrame(checkFrames);
      }
    };

    try {
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      videoTrack.attach(video);

      // Attach can populate readyState before the first event is observed.
      markReadyIfFrameExists();
      frameRequest = window.requestAnimationFrame(checkFrames);

      void video.play().then(
        () => markReadyIfFrameExists(),
        (error: unknown) => {
          console.warn("[Fockis Meeting] Video element play() did not start:", error);
          markReadyIfFrameExists();
        },
      );
    } catch (error) {
      console.error("[Fockis Meeting] Unable to attach video track:", error);
      mediaFailed = true;
      setVideoError(true);
    }

    return () => {
      cancelled = true;
      if (frameRequest) window.cancelAnimationFrame(frameRequest);

      mediaEvents.forEach((eventName) => {
        video.removeEventListener(eventName, markReadyIfFrameExists);
      });
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleMediaError);

      try {
        videoTrack.detach(video);
      } catch {
        // LiveKit may already have detached the track during room cleanup.
      }

      video.pause();
      video.srcObject = null;
    };
  }, [videoTrack]);

  const hasTrack = Boolean(videoTrack);
  const showPlaceholder = !hasTrack || !videoReady || videoError;

  const roleLabel =
    role === "host" ? "Host" : role === "co-host" ? "Co-host" : "";
  const displayName = isLocal ? "You" : user.displayName;
  const label = roleLabel ? `${displayName} (${roleLabel})` : displayName;

  const avatarSize = variant === "thumb" ? "md" : variant === "featured" ? "xl" : "lg";

  const placeholderNote = !hasTrack
    ? cameraOn
      ? "Waiting for video…"
      : ""
    : videoError
      ? "Video not rendering"
      : "Connecting video…";

  const interactive = Boolean(onSelect);

  return (
    <div
      className={[
        "fm-tile",
        `fm-tile--${variant}`,
        isSpeaking ? "fm-tile--speaking" : "",
        selected ? "fm-tile--selected" : "",
        interactive ? "fm-tile--interactive" : "",
        hasTrack && !showPlaceholder ? "fm-tile--live-video" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? pinned : undefined}
      aria-label={
        interactive
          ? `${label}${pinned ? ", pinned to stage" : ""}. Show on main stage`
          : undefined
      }
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="fm-tile__surface">
        {hasTrack && (
          <video
            ref={videoRef}
            className="fm-tile__video"
            autoPlay
            playsInline
            muted
            aria-label={`${user.displayName} video`}
          />
        )}

        {showPlaceholder && (
          <div className="fm-tile__placeholder">
            <Avatar
              name={user.displayName || "?"}
              size={avatarSize}
              imageUrl={user.avatarUrl}
            />
            {placeholderNote && variant !== "thumb" && (
              <span
                className={`fm-tile__chip${videoError ? " fm-tile__chip--error" : ""}`}
                role={videoError ? "status" : undefined}
              >
                {placeholderNote}
              </span>
            )}
          </div>
        )}
      </div>

      {(handRaised || connectionIsBad || pinned) && (
        <div className="fm-tile__top">
          {pinned && (
            <span className="fm-tile__status" title="Pinned" aria-label="Pinned">
              <Pin size={12} />
            </span>
          )}
          {handRaised && (
            <span className="fm-tile__status fm-tile__status--hand" title="Hand raised" aria-label="Hand raised">
              <Hand size={13} />
            </span>
          )}
          {connectionIsBad && (
            <span className="fm-tile__status fm-tile__status--bad" title="Poor connection" aria-label="Poor connection">
              <WifiOff size={12} />
            </span>
          )}
        </div>
      )}

      <div className="fm-tile__bottom">
        <span className="fm-tile__label">
          <span
            className={`fm-tile__mic${micOn ? "" : " fm-tile__mic--off"}`}
            aria-label={micOn ? "Microphone on" : "Microphone muted"}
          >
            {micOn ? <Mic size={14} /> : <MicOff size={14} />}
          </span>
          <span className="fm-tile__name">{label}</span>
          {micOn && isSpeaking && (
            <span className="fm-tile__audio-bars" aria-label="Speaking">
              <i />
              <i />
              <i />
            </span>
          )}
        </span>

        {variant === "featured" && (
          <span className="fm-tile__label fm-tile__label--icon">
            <SignalBars quality={connectionQuality} />
          </span>
        )}
      </div>
    </div>
  );
}

export default ParticipantTile;
