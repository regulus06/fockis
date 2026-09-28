/*
 * ============================================================================
 * FOCKIS REEL VIEWER
 * ============================================================================
 *
 * Full-screen vertical media viewer for Fockis posts.
 *
 * Handles:
 * - Images
 * - Videos
 * - Vertical scrolling
 * - Video autoplay/pause
 * - Mute/unmute
 * - Like
 * - Comment
 * - Repost
 * - Share
 * - Save
 * - Previous/next navigation
 * - Escape to close
 * ============================================================================
 */

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  FockisPostInteraction,
  FockisPostMediaItem,
} from "./FockisPostCard";

import { IconRepost } from "./FockisIcons";

/* ============================================================================
   TYPES
============================================================================ */

export interface FockisReelSlide {
  postId: string;
  mediaIndex: number;
  item: FockisPostMediaItem;
}

export interface FockisReelViewerProps {
  slides: FockisReelSlide[];

  startIndex: number;

  onClose: () => void;

  getInteraction: (
    postId: string,
  ) => FockisPostInteraction;

  getCounts: (
    postId: string,
  ) => {
    likes: number;
    reposts: number;
    comments: number;
    shares: number;
  };

  onReact: (postId: string) => void;

  onRepost: (postId: string) => void;

  onSave: (postId: string) => void;

  onComment: (postId: string) => void;

  onShare?: (postId: string) => void;
}

/* ============================================================================
   INLINE ICONS
============================================================================ */

function IconHeart({
  filled = false,
  size = 24,
}: {
  filled?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function IconComment({
  size = 24,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconShare({
  size = 24,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconBookmark({
  filled = false,
  size = 24,
}: {
  filled?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconX({
  size = 24,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevronUp({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function IconChevronDown({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconVolumeOff({
  size = 16,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function IconVolumeOn({
  size = 16,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

/* ============================================================================
   REEL VIEWER
============================================================================ */

export default function FockisReelViewer({
  slides,
  startIndex,
  onClose,
  getInteraction,
  getCounts,
  onReact,
  onRepost,
  onSave,
  onComment,
  onShare,
}: FockisReelViewerProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const videoRefs =
    useRef<Map<number, HTMLVideoElement>>(
      new Map(),
    );

  const [activeIndex, setActiveIndex] =
    useState<number>(
      Math.max(
        0,
        Math.min(
          startIndex,
          Math.max(slides.length - 1, 0),
        ),
      ),
    );

  const [mutedMap, setMutedMap] =
    useState<Record<number, boolean>>({});

  const isMuted = (index: number): boolean =>
    mutedMap[index] !== false;

  /* ==========================================================================
     INITIAL POSITION
  ========================================================================== */

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const index = Math.max(
      0,
      Math.min(
        startIndex,
        Math.max(slides.length - 1, 0),
      ),
    );

    const child =
      container.children[index] as
        | HTMLElement
        | undefined;

    if (child) {
      child.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    }
  }, [startIndex, slides.length]);

  /* ==========================================================================
     INTERSECTION OBSERVER
  ========================================================================== */

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const index = Number(
              entry.target.getAttribute(
                "data-index",
              ),
            );

            if (
              !Number.isFinite(index) ||
              index < 0
            ) {
              return;
            }

            const video =
              videoRefs.current.get(index);

            if (
              entry.isIntersecting &&
              entry.intersectionRatio >= 0.6
            ) {
              setActiveIndex(index);

              if (video) {
                video.muted =
                  isMuted(index);

                void video
                  .play()
                  .catch(() => {});
              }
            } else if (video) {
              video.pause();
            }
          });
        },
        {
          root: container,
          threshold: [0, 0.6, 1],
        },
      );

    const slideNodes =
      container.querySelectorAll<HTMLElement>(
        "[data-index]",
      );

    slideNodes.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
    };
  }, [slides.length, mutedMap]);

  /* ==========================================================================
     KEYBOARD + BODY SCROLL LOCK
  ========================================================================== */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowRight"
      ) {
        container.scrollBy({
          top: container.clientHeight,
          behavior: "smooth",
        });

        return;
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft"
      ) {
        container.scrollBy({
          top: -container.clientHeight,
          behavior: "smooth",
        });
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [onClose]);

  /* ==========================================================================
     NAVIGATION
  ========================================================================== */

  const goToIndex = (
    index: number,
  ): void => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    if (
      index < 0 ||
      index >= slides.length
    ) {
      return;
    }

    const child =
      container.children[index] as
        | HTMLElement
        | undefined;

    child?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /* ==========================================================================
     MUTE
  ========================================================================== */

  const handleToggleMute = (
    event: React.MouseEvent<HTMLButtonElement | HTMLVideoElement>,
    index: number,
  ): void => {
    event.stopPropagation();

    const nextMuted = !isMuted(index);

    setMutedMap((previous) => ({
      ...previous,
      [index]: nextMuted,
    }));

    const video =
      videoRefs.current.get(index);

    if (video) {
      video.muted = nextMuted;
    }
  };

  /* ==========================================================================
     EMPTY STATE
  ========================================================================== */

  if (slides.length === 0) {
    return null;
  }

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div
      className="fk-media-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <button
        type="button"
        className="fk-media-viewer__close"
        onClick={onClose}
        aria-label="Close media viewer"
      >
        <IconX size={20} />
      </button>

      <div
        ref={containerRef}
        className="fk-media-viewer__reel"
      >
        {slides.map(
          (
            slide: FockisReelSlide,
            index: number,
          ) => {
            const muted =
              isMuted(index);

            const interaction =
              getInteraction(
                slide.postId,
              );

            const counts =
              getCounts(
                slide.postId,
              );

            return (
              <div
                key={`${slide.postId}-${slide.mediaIndex}-${index}`}
                data-index={index}
                className="fk-media-viewer__slide"
              >
                <div className="fk-media-viewer__media">
                  {slide.item.type ===
                  "video" ? (
                    <video
                      ref={(
                        element,
                      ) => {
                        if (element) {
                          videoRefs.current.set(
                            index,
                            element,
                          );

                          element.muted =
                            muted;
                        } else {
                          videoRefs.current.delete(
                            index,
                          );
                        }
                      }}
                      className="fk-media-viewer__video"
                      src={slide.item.url}
                      muted={muted}
                      playsInline
                      loop
                      preload="metadata"
                      onClick={(
                        event,
                      ) =>
                        handleToggleMute(
                          event,
                          index,
                        )
                      }
                    />
                  ) : (
                    <img
                      className="fk-media-viewer__image"
                      src={slide.item.url}
                      alt={`Post media ${
                        index + 1
                      }`}
                    />
                  )}

                  {slide.item.type ===
                    "video" && (
                    <button
                      type="button"
                      className="fk-media-viewer__mute"
                      aria-label={
                        muted
                          ? "Unmute video"
                          : "Mute video"
                      }
                      onClick={(
                        event,
                      ) =>
                        handleToggleMute(
                          event,
                          index,
                        )
                      }
                    >
                      {muted ? (
                        <IconVolumeOff />
                      ) : (
                        <IconVolumeOn />
                      )}
                    </button>
                  )}
                </div>

                {/* ==========================================================
                    ACTION RAIL
                ========================================================== */}

                <div className="fk-media-viewer__actions">
                  <button
                    type="button"
                    className={[
                      "fk-media-viewer__action",
                      interaction.reacted
                        ? "is-active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      onReact(
                        slide.postId,
                      )
                    }
                    aria-label="Like"
                  >
                    <IconHeart
                      filled={
                        interaction.reacted
                      }
                    />

                    <span>
                      {counts.likes}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="fk-media-viewer__action"
                    onClick={() =>
                      onComment(
                        slide.postId,
                      )
                    }
                    aria-label="Comment"
                  >
                    <IconComment />

                    <span>
                      {counts.comments}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={[
                      "fk-media-viewer__action",
                      interaction.reposted
                        ? "is-active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      onRepost(
                        slide.postId,
                      )
                    }
                    aria-label="Repost"
                  >
                    <IconRepost />

                    <span>
                      {counts.reposts}
                    </span>
                  </button>

                  {onShare && (
                    <button
                      type="button"
                      className="fk-media-viewer__action"
                      onClick={() =>
                        onShare(
                          slide.postId,
                        )
                      }
                      aria-label="Share"
                    >
                      <IconShare />

                      <span>
                        {counts.shares}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={[
                      "fk-media-viewer__action",
                      interaction.saved
                        ? "is-active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      onSave(
                        slide.postId,
                      )
                    }
                    aria-label="Save"
                  >
                    <IconBookmark
                      filled={
                        interaction.saved
                      }
                    />
                  </button>
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* ======================================================================
          DESKTOP PREVIOUS
      ====================================================================== */}

      {activeIndex > 0 && (
        <button
          type="button"
          className="fk-media-viewer__nav fk-media-viewer__nav--up"
          onClick={() =>
            goToIndex(
              activeIndex - 1,
            )
          }
          aria-label="Previous media"
        >
          <IconChevronUp />
        </button>
      )}

      {/* ======================================================================
          DESKTOP NEXT
      ====================================================================== */}

      {activeIndex <
        slides.length - 1 && (
        <button
          type="button"
          className="fk-media-viewer__nav fk-media-viewer__nav--down"
          onClick={() =>
            goToIndex(
              activeIndex + 1,
            )
          }
          aria-label="Next media"
        >
          <IconChevronDown />
        </button>
      )}
    </div>
  );
}