import {
  useEffect,
  useRef,
  useState,
} from "react";

import SponsoredBadge from "./SponsoredBadge";
import AdCtaButton from "./AdCtaButton";

import type {
  DeliveredFeedAd,
} from "../types/marketingTypes";

/* ============================================================================
   PROPS
============================================================================ */

interface SponsoredFeedAdProps {
  ad: DeliveredFeedAd;

  onImpression: (
    ad: DeliveredFeedAd,
  ) => void;

  onVideoStart?: (
    ad: DeliveredFeedAd,
  ) => void;

  onVideoComplete?: (
    ad: DeliveredFeedAd,
  ) => void;

  onClick?: (
    ad: DeliveredFeedAd,
  ) => void;
}

/* ============================================================================
   SPONSORED FEED AD

   Features:

   - Sponsored campaign display
   - Automatic video playback when visible
   - Video pauses when scrolled away
   - Video resumes when visible again
   - Muted autoplay for browser compatibility
   - Impression tracking
   - Video start tracking
   - Video completion tracking
   - Advertisement click tracking
============================================================================ */

export default function SponsoredFeedAd({
  ad,
  onImpression,
  onVideoStart,
  onVideoComplete,
  onClick,
}: SponsoredFeedAdProps) {
  /* ==========================================================================
     REFS
  ========================================================================== */

  const cardRef =
    useRef<HTMLElement | null>(
      null,
    );

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  /*
   * Prevent duplicate video-start events.
   */
  const videoStartedRef =
    useRef(false);

  /*
   * Prevent duplicate video-complete events.
   */
  const videoCompletedRef =
    useRef(false);

  /*
   * Prevent duplicate click events.
   */
  const clickTrackedRef =
    useRef(false);

  /* ==========================================================================
     STATE
  ========================================================================== */

  const [
    impressed,
    setImpressed,
  ] = useState(false);

  /* ==========================================================================
     ADVERTISER SAFETY
  ========================================================================== */

  const advertiserName =
    ad.advertiser?.name?.trim() ||
    "Fockis Advertiser";

  const advertiserAvatar =
    ad.advertiser?.avatar;

  const advertiserInitial =
    advertiserName
      .charAt(0)
      .toUpperCase() ||
    "F";

  /* ==========================================================================
     MEDIA
  ========================================================================== */

  const hasMedia =
    Boolean(ad.mediaUrl);

  const isVideo =
    ad.type === "VIDEO" &&
    hasMedia;

  /* ==========================================================================
     IMPRESSION TRACKING

     Requirement:

     At least 50% of the advertisement must be visible
     for at least 1 second.
  ========================================================================== */

  useEffect(() => {
    const node =
      cardRef.current;

    if (
      !node ||
      impressed
    ) {
      return;
    }

    let timer:
      ReturnType<
        typeof setTimeout
      > | null = null;

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          const visible =
            entry.isIntersecting &&
            entry.intersectionRatio >=
              0.5;

          if (visible) {
            if (timer !== null) {
              return;
            }

            timer =
              setTimeout(() => {
                setImpressed(true);

                onImpression(ad);

                observer.disconnect();

                timer = null;
              }, 1000);

            return;
          }

          if (timer !== null) {
            clearTimeout(timer);

            timer = null;
          }
        },
        {
          threshold: [
            0,
            0.5,
            1,
          ],
        },
      );

    observer.observe(node);

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }

      observer.disconnect();
    };
  }, [
    ad,
    impressed,
    onImpression,
  ]);

  /* ==========================================================================
     VIDEO AUTOPLAY / PAUSE

     The campaign video automatically plays when at least 60% of the
     sponsored post is visible in the Feed.

     It pauses when the user scrolls away.

     The video is muted because browsers generally require muted media
     for autoplay.
  ========================================================================== */

  useEffect(() => {
    const node =
      cardRef.current;

    const video =
      videoRef.current;

    if (
      !node ||
      !video ||
      !isVideo
    ) {
      return;
    }

    /*
     * Always configure the video for autoplay.
     */
    video.muted = true;
    video.playsInline = true;

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          const visible =
            entry.isIntersecting &&
            entry.intersectionRatio >=
              0.6;

          if (visible) {
            /*
             * Reset completion state when the
             * advertisement becomes visible again
             * after finishing.
             */
            if (
              video.ended
            ) {
              video.currentTime = 0;

              videoCompletedRef.current =
                false;
            }

            /*
             * Start playback.
             *
             * Muted playback is allowed by
             * modern browsers.
             */
            void video
              .play()
              .catch((error) => {
                /*
                 * Autoplay can still be rejected
                 * by certain browser/device policies.
                 */
                console.debug(
                  "[SponsoredFeedAd] Autoplay was blocked:",
                  error,
                );
              });

            return;
          }

          /*
           * Pause the campaign video when it
           * leaves the visible Feed area.
           */
          video.pause();
        },
        {
          threshold: [
            0,
            0.6,
            1,
          ],
        },
      );

    observer.observe(node);

    /*
     * Attempt autoplay immediately as well.
     *
     * This helps when the ad is already visible
     * when the component mounts.
     */
    if (
      typeof window !==
      "undefined"
    ) {
      void video
        .play()
        .catch(() => {
          /*
           * IntersectionObserver will attempt
           * playback again once visibility is
           * confirmed.
           */
        });
    }

    return () => {
      observer.disconnect();

      video.pause();
    };
  }, [
    ad.id,
    isVideo,
  ]);

  /* ==========================================================================
     VIDEO START
  ========================================================================== */

  const handleVideoPlay =
    () => {
      if (
        videoStartedRef.current
      ) {
        return;
      }

      videoStartedRef.current =
        true;

      onVideoStart?.(ad);
    };

  /* ==========================================================================
     VIDEO COMPLETE
  ========================================================================== */

  const handleVideoEnded =
    () => {
      if (
        videoCompletedRef.current
      ) {
        return;
      }

      videoCompletedRef.current =
        true;

      onVideoComplete?.(ad);
    };

  /* ==========================================================================
     AD CLICK
  ========================================================================== */

  const handleClick =
    () => {
      if (
        clickTrackedRef.current
      ) {
        return;
      }

      clickTrackedRef.current =
        true;

      onClick?.(ad);
    };

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <article
      ref={cardRef}
      className="fk-post fk-sponsored-post"
      data-ad-id={ad.id}
      data-campaign-id={
        ad.campaignId
      }
      data-placement={
        ad.placement
      }
    >
      {/* ======================================================================
          AD HEADER
      ====================================================================== */}

      <header className="fk-post__header">
        <div
          className="fk-avatar"
          aria-hidden="true"
        >
          {advertiserAvatar ? (
            <img
              src={
                advertiserAvatar
              }
              alt={
                advertiserName
              }
              loading="lazy"
            />
          ) : (
            advertiserInitial
          )}
        </div>

        <div className="fk-post__author-block">
          <div className="fk-post__name-row">
            <span className="fk-post__name">
              {advertiserName}
            </span>
          </div>

          <div className="fk-post__meta">
            <SponsoredBadge />
          </div>
        </div>
      </header>

      {/* ======================================================================
          MEDIA
      ====================================================================== */}

      {isVideo ? (
        <div className="fk-post__media-grid fk-sponsored-post__media">
          <video
            ref={videoRef}
            src={ad.mediaUrl}
            poster={
              ad.thumbnailUrl
            }

            /*
             * REQUIRED FOR AUTOPLAY
             */
            autoPlay
            muted
            playsInline

            /*
             * Replay automatically after
             * the campaign reaches the end.
             */
            loop

            /*
             * Keep controls available so the
             * user can manually control playback.
             */
            controls

            /*
             * Load enough data for smooth
             * autoplay.
             */
            preload="auto"

            onPlay={
              handleVideoPlay
            }

            onEnded={
              handleVideoEnded
            }

            onClick={
              handleClick
            }

            className="fk-post__media-preview"

            aria-label={
              ad.headline
                ? `Sponsored video: ${ad.headline}`
                : "Sponsored video"
            }
          />
        </div>
      ) : hasMedia ? (
        <div className="fk-post__media-grid fk-sponsored-post__media">
          <img
            src={ad.mediaUrl}
            alt={
              ad.headline ||
              "Sponsored advertisement"
            }
            className="fk-post__media-preview"
            loading="lazy"
            onClick={
              handleClick
            }
          />
        </div>
      ) : null}

      {/* ======================================================================
          APP ICON
      ====================================================================== */}

      {ad.destinationType ===
        "APP" &&
        ad.appIconUrl && (
          <div className="fk-sponsored-post__app-icon">
            <img
              src={
                ad.appIconUrl
              }
              alt=""
              loading="lazy"
            />
          </div>
        )}

      {/* ======================================================================
          AD CONTENT
      ====================================================================== */}

      <div className="fk-post__body fk-sponsored-post__body">
        {ad.headline && (
          <p className="fk-post__caption fk-sponsored-post__headline">
            {ad.headline}
          </p>
        )}

        {ad.description && (
          <p className="fk-sponsored-post__description">
            {ad.description}
          </p>
        )}
      </div>

      {/* ======================================================================
          CTA
      ====================================================================== */}

      <div className="fk-sponsored-post__cta-row">
        <AdCtaButton
          ad={ad}
          onClick={
            handleClick
          }
        />
      </div>
    </article>
  );
}