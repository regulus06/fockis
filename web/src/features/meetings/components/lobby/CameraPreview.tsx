import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

import { Avatar } from "../common/Avatar";

import "../../styles/components/lobby.scss";

export interface CameraPreviewProps {
  name: string;
  micOn: boolean;
  cameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  /**
   * Preferred camera device id. When omitted, the browser's default
   * camera is used. If the requested device is no longer available,
   * the preview falls back to the default camera automatically.
   */
  cameraDeviceId?: string;
  /**
   * Called whenever the preview's own error state changes, so a parent
   * page can surface a bigger contextual message alongside its other
   * error handling. Called with null when the error clears.
   */
  onError?: (message: string | null) => void;
}

export function CameraPreview({
  name,
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  cameraDeviceId,
  onError,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (!cameraOn || !navigator.mediaDevices?.getUserMedia) {
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: cameraDeviceId
          ? { deviceId: { exact: cameraDeviceId } }
          : true,
        audio: false,
      };

      try {
        const acquired =
          await navigator.mediaDevices.getUserMedia(constraints);

        if (cancelled) {
          acquired.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = acquired;

        if (videoRef.current) {
          videoRef.current.srcObject = acquired;
        }

        setStreamError(null);
        onError?.(null);
        return;
      } catch (error) {
        if (cancelled) return;

        const domError = error as DOMException;

        // The previously-selected camera may have been unplugged or is
        // otherwise unavailable. Fall back to the default camera rather
        // than leaving the user with a blank preview.
        if (cameraDeviceId && domError?.name === "OverconstrainedError") {
          try {
            const fallback = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });

            if (cancelled) {
              fallback.getTracks().forEach((track) => track.stop());
              return;
            }

            stream = fallback;

            if (videoRef.current) {
              videoRef.current.srcObject = fallback;
            }

            setStreamError(null);
            onError?.(null);
            return;
          } catch {
            // Fall through to the generic error handling below.
          }
        }

        const message =
          domError?.name === "NotAllowedError"
            ? "Camera access was denied"
            : domError?.name === "NotFoundError"
              ? "No camera was found"
              : "Camera access unavailable";

        setStreamError(message);
        onError?.(message);
      }
    }

    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraOn, cameraDeviceId, onError]);

  return (
    <div className="fm-camera-preview">
      {cameraOn && !streamError ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="fm-camera-preview__video"
        />
      ) : (
        <div className="fm-camera-preview__off">
          <Avatar name={name} size="xl" />
          {streamError && (
            <span className="fm-camera-preview__error" role="alert">
              {streamError}
            </span>
          )}
        </div>
      )}

      <div className="fm-camera-preview__controls">
        <button
          type="button"
          className={`fm-lobby-toggle ${!micOn ? "fm-lobby-toggle--off" : ""}`}
          onClick={onToggleMic}
          aria-label={micOn ? "Turn microphone off" : "Turn microphone on"}
          aria-pressed={micOn}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        <button
          type="button"
          className={`fm-lobby-toggle ${!cameraOn ? "fm-lobby-toggle--off" : ""}`}
          onClick={onToggleCamera}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          aria-pressed={cameraOn}
        >
          {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
      </div>
    </div>
  );
}

export default CameraPreview;