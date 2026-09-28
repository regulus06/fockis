import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getNextVideoAd,
  trackVideoAdEvent,
} from "../services/videoAdsApi";

import type {
  VideoOverlayAd,
} from "../services/videoAdsApi";

interface VideoOverlayAdProps {
  videoId?: string;

  currentTime: number;

  duration: number;

  enabled?: boolean;
}

const SHOW_AFTER_SECONDS = 30;

const DISPLAY_SECONDS = 15;

const MIN_VIDEO_LENGTH = 45;

export default function VideoOverlayAd({
  videoId,
  currentTime,
  duration,
  enabled = true,
}: VideoOverlayAdProps) {
  const [ad, setAd] =
    useState<VideoOverlayAd | null>(
      null,
    );

  const [visible, setVisible] =
    useState(false);

  const [secondsLeft, setSecondsLeft] =
    useState(DISPLAY_SECONDS);

  const [loading, setLoading] =
    useState(false);

  const requestedRef =
    useRef(false);

  const impressionRef =
    useRef(false);

  const hideTimerRef =
    useRef<number | null>(null);

  /*
   * Don't show ads on very short videos.
   */
  const videoIsLongEnough =
    duration >= MIN_VIDEO_LENGTH;

  /*
   * Request an ad after 30 seconds.
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!videoIsLongEnough) {
      return;
    }

    if (
      currentTime <
      SHOW_AFTER_SECONDS
    ) {
      return;
    }

    if (
      requestedRef.current
    ) {
      return;
    }

    requestedRef.current =
      true;

    let cancelled = false;

    async function loadAd() {
      setLoading(true);

      try {
        const nextAd =
          await getNextVideoAd(
            videoId,
          );

        if (
          cancelled
        ) {
          return;
        }

        if (
          !nextAd
        ) {
          return;
        }

        /*
         * We require an actual media URL
         * for the overlay.
         */
        if (
          !nextAd.mediaUrl
        ) {
          return;
        }

        setAd(nextAd);

        setVisible(true);

        setSecondsLeft(
          DISPLAY_SECONDS,
        );

        if (
          !impressionRef.current
        ) {
          impressionRef.current =
            true;

          void trackVideoAdEvent(
            nextAd.id,
            "IMPRESSION",
            videoId,
          );
        }
      } catch (error) {
        console.error(
          "[Fockis Video Ads] Failed to load ad:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    void loadAd();

    return () => {
      cancelled = true;
    };
  }, [
    currentTime,
    duration,
    enabled,
    videoId,
    videoIsLongEnough,
  ]);

  /*
   * Countdown.
   */
  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setSecondsLeft(
          (previous) => {
            if (
              previous <= 1
            ) {
              window.clearInterval(
                timer,
              );

              return 0;
            }

            return previous - 1;
          },
        );
      }, 1000);

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [visible]);

  /*
   * Automatically close after 15 seconds.
   */
  useEffect(() => {
    if (!visible) {
      return;
    }

    hideTimerRef.current =
      window.setTimeout(() => {
        handleClose(
          "CLOSE",
        );
      }, DISPLAY_SECONDS * 1000);

    return () => {
      if (
        hideTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          hideTimerRef.current,
        );
      }
    };
  }, [visible]);

  function handleClose(
    reason:
      | "CLOSE"
      | "SKIP",
  ) {
    if (ad) {
      void trackVideoAdEvent(
        ad.id,
        reason,
        videoId,
      );
    }

    setVisible(false);
  }

  function handleClick() {
    if (!ad) {
      return;
    }

    void trackVideoAdEvent(
      ad.id,
      "CLICK",
      videoId,
    );

    if (
      ad.destinationUrl
    ) {
      window.open(
        ad.destinationUrl,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  if (
    !enabled ||
    loading ||
    !visible ||
    !ad ||
    !ad.mediaUrl
  ) {
    return null;
  }

  return (
    <div
      className="fk-video-overlay-ad"
      role="dialog"
      aria-label="Advertisement"
    >
      <button
        type="button"
        className="fk-video-overlay-close"
        onClick={() =>
          handleClose(
            "CLOSE",
          )
        }
        aria-label="Close advertisement"
      >
        ×
      </button>

      <div className="fk-video-overlay-media">
        <img
          src={
            ad.thumbnailUrl ||
            ad.mediaUrl
          }
          alt=""
          className="fk-video-overlay-thumbnail"
        />

        <div className="fk-video-overlay-play">
          ▶
        </div>
      </div>

      <div className="fk-video-overlay-content">
        <div className="fk-video-overlay-sponsored">
          Sponsored
        </div>

        <div className="fk-video-overlay-headline">
          {ad.headline}
        </div>

        {ad.description && (
          <div className="fk-video-overlay-description">
            {ad.description}
          </div>
        )}

        <button
          type="button"
          className="fk-video-overlay-cta"
          onClick={
            handleClick
          }
        >
          {ad.callToAction ||
            "Learn More"}
        </button>
      </div>

      <button
        type="button"
        className="fk-video-overlay-skip"
        onClick={() =>
          handleClose(
            "SKIP",
          )
        }
      >
        {secondsLeft > 0
          ? `Close (${secondsLeft})`
          : "Close"}
      </button>
    </div>
  );
}