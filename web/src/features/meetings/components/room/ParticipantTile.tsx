import { Hand, MicOff, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LocalVideoTrack, RemoteVideoTrack } from "livekit-client";

import { Avatar } from "../common/Avatar";
import type { RoomParticipant } from "../../types";
import "../../styles/components/room.scss";

interface ParticipantTileProps {
  participant: RoomParticipant;
  videoTrack?: LocalVideoTrack | RemoteVideoTrack | null;
}

export function ParticipantTile({ participant, videoTrack }: ParticipantTileProps) {
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
  const connectionIsWeak = connectionQuality === "weak";

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

  return (
    <div
      className={[
        "fm-tile",
        isSpeaking ? "fm-tile--speaking" : "",
        !cameraOn && !hasTrack ? "fm-tile--camera-off" : "",
        hasTrack ? "fm-tile--live-video" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="fm-tile__surface">
        {hasTrack ? (
          <div
            className="fm-tile__video-stub"
            aria-label={`${user.displayName} live camera`}
            style={{ position: "absolute", inset: 0, overflow: "hidden" }}
          >
            <video
              ref={videoRef}
              className="fm-tile__video"
              autoPlay
              playsInline
              muted
              aria-label={`${user.displayName} video`}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
                background: "#050b14",
              }}
            />

            {showPlaceholder && (
              <div
                className="fm-tile__camera-placeholder"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 2,
                  pointerEvents: "none",
                }}
              >
                <Avatar name={user.displayName} size="lg" />
                {!videoError && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: 24,
                      transform: "translateX(-50%)",
                      zIndex: 5,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(0, 0, 0, 0.65)",
                      color: "#fff",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Connecting video…
                  </div>
                )}
                {videoError && (
                  <div
                    role="status"
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: 24,
                      transform: "translateX(-50%)",
                      zIndex: 5,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(120, 30, 30, 0.9)",
                      color: "#fff",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Video not rendering
                  </div>
                )}
              </div>
            )}
            <div className="fm-tile__video-glow" />
          </div>
        ) : cameraOn ? (
          <div
            className="fm-tile__video-stub"
            aria-label={`${user.displayName} camera connecting`}
          >
            <div className="fm-tile__video-glow" />
            <div className="fm-tile__camera-placeholder">
              <Avatar name={user.displayName} size="lg" />
            </div>
            <div className="fm-tile__camera-shimmer" />
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 24,
                transform: "translateX(-50%)",
                zIndex: 5,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(0, 0, 0, 0.65)",
                color: "#fff",
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              Waiting for video track…
            </div>
          </div>
        ) : (
          <div className="fm-tile__avatar-wrap">
            <div className="fm-tile__avatar-ring">
              <Avatar name={user.displayName} size="lg" />
            </div>
          </div>
        )}
      </div>

      <div className="fm-tile__top">
        <div className="fm-tile__status-group">
          {handRaised && (
            <span className="fm-tile__status fm-tile__hand" title="Hand raised" aria-label="Hand raised">
              <Hand size={13} />
            </span>
          )}
          {connectionIsBad && (
            <span className="fm-tile__status fm-tile__conn fm-tile__conn--bad" title="Poor connection" aria-label="Poor connection">
              <WifiOff size={12} />
            </span>
          )}
          {connectionIsWeak && (
            <span className="fm-tile__status fm-tile__conn fm-tile__conn--weak" title="Weak connection" aria-label="Weak connection">
              <Wifi size={12} />
            </span>
          )}
        </div>
      </div>

      <div className="fm-tile__bottom">
        <div className="fm-tile__identity">
          <span className="fm-tile__name">{user.displayName}</span>
          {role === "host" && <span className="fm-tile__role">Host</span>}
          {role === "co-host" && <span className="fm-tile__role">Co-host</span>}
        </div>
        <div className="fm-tile__audio">
          {!micOn && <MicOff size={14} className="fm-tile__muted-icon" />}
          {micOn && isSpeaking && (
            <span className="fm-tile__audio-bars" aria-label="Speaking">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
      </div>

      {isSpeaking && <div className="fm-tile__speaking-indicator" aria-hidden="true" />}
    </div>
  );
}

export default ParticipantTile;
