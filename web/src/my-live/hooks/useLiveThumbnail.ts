import { useEffect, useRef } from "react";

import { api } from "../api";

/* ============================================================================
   LIVE THUMBNAIL

   While the host is LIVE, the Studio takes a small snapshot of the camera
   (or screen share) a few seconds after going live and then every 30s, and
   sends it to the backend. Every LIVE card (feed Live Now, Stories, Live
   Manager) shows it instead of an empty dark box.
============================================================================ */

const FIRST_DELAY_MS = 4_000;
const INTERVAL_MS = 30_000;

const WIDTH = 480;
const HEIGHT = 270;

/** Keeps the request well under the API's JSON size limit. */
const MAX_DATA_URL_LENGTH = 120_000;

async function captureFrame(
  stream: MediaStream,
): Promise<string | null> {
  const track = stream
    .getVideoTracks()
    .find(
      (item) =>
        item.readyState === "live" &&
        item.enabled,
    );

  if (!track) {
    return null;
  }

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([track]);

  try {
    await video.play();

    if (!video.videoWidth) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    if (!sourceWidth || !sourceHeight) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    // Cover the 16:9 frame (crop, never stretch).
    const scale = Math.max(
      WIDTH / sourceWidth,
      HEIGHT / sourceHeight,
    );

    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;

    context.drawImage(
      video,
      (WIDTH - drawWidth) / 2,
      (HEIGHT - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );

    let image = canvas.toDataURL("image/jpeg", 0.7);

    if (image.length > MAX_DATA_URL_LENGTH) {
      image = canvas.toDataURL("image/jpeg", 0.45);
    }

    return image.startsWith("data:image/jpeg") &&
      image.length <= MAX_DATA_URL_LENGTH
      ? image
      : null;
  } catch {
    return null;
  } finally {
    video.pause();
    video.srcObject = null;
  }
}

/**
 * @param streamId The running LIVE's id, or null when not live.
 * @param source   Camera (or screen) stream to snapshot.
 */
export function useLiveThumbnail(
  streamId: string | null,
  source: MediaStream | null,
): void {
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    if (!streamId) {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      const stream = sourceRef.current;

      if (stream) {
        const image = await captureFrame(stream);

        if (image && !cancelled) {
          try {
            await api.uploadLiveThumbnail(streamId, image);
          } catch (error) {
            console.warn(
              "[FOCKIS LIVE] Could not update the LIVE thumbnail:",
              error,
            );
          }
        }
      }

      if (!cancelled) {
        timer = window.setTimeout(() => void tick(), INTERVAL_MS);
      }
    };

    timer = window.setTimeout(() => void tick(), FIRST_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [streamId]);
}
