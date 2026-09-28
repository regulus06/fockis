import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "../../styles/FockisStoriesRail.scss";

import {
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconWaveGlyph,
  IconClose,
  IconMarketplace,
} from "./FockisIcons";

/* ============================================================================
   API
============================================================================ */

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

/* ============================================================================
   TYPES
============================================================================ */

export interface FockisStoryProduct {
  name: string;
  price: string;
}

export interface FockisStory {
  id: string;
  userId?: string;
  username: string;
  avatar?: string;
  userPhoto?: string;
  storyImage?: string;
  storyVideo?: string;
  hasUnseen?: boolean;
  isOwn?: boolean;
  isSeller?: boolean;
  product?: FockisStoryProduct;
  type?: "image" | "video";
  media?: string;
  createdAt?: string;
  expiresAt?: string;
}

export interface FockisStoriesRailProps {
  stories?: FockisStory[];

  currentUser?: {
    id?: string;
    username?: string;
    avatar?: string;
  };

  onCreateStory?: (
    file: File,
  ) => void;

  onStoryCreated?: () => void;

  /*
   * Fired whenever the viewer moves to
   * a (new) story - e.g. for marking
   * it as "seen" in your backend.
   */
  onStoryClick?: (
    story: FockisStory,
    index: number,
  ) => void;

  onClose?: () => void;
}

/* ============================================================================
   GROUPED STORY (one card per user - Facebook style)
============================================================================ */

interface FockisStoryGroup {
  key: string;
  userId?: string;
  username: string;
  avatar?: string;
  isOwn: boolean;
  isSeller: boolean;
  hasUnseen: boolean;
  stories: FockisStory[];
}

/* ============================================================================
   DEFAULT STORIES
============================================================================ */

const defaultStories: FockisStory[] = [];

/* ============================================================================
   BUILD MEDIA URL
============================================================================ */

function buildMediaUrl(
  media: string,
): string {
  if (!media) {
    return "";
  }

  let cleanMedia = media.trim();

  if (
    !cleanMedia ||
    cleanMedia === "undefined" ||
    cleanMedia === "null"
  ) {
    return "";
  }

  if (
    cleanMedia.startsWith("http://") ||
    cleanMedia.startsWith("https://") ||
    cleanMedia.startsWith("blob:") ||
    cleanMedia.startsWith("data:")
  ) {
    return cleanMedia;
  }

  cleanMedia = cleanMedia.replace(
    /\\/g,
    "/",
  );

  const path =
    cleanMedia.replace(
      /^\/+/,
      "",
    );

  if (!path) {
    return "";
  }

  if (
    path.startsWith("uploads/") ||
    path.startsWith("api/uploads/") ||
    path.startsWith("media/") ||
    path.startsWith("public/uploads/") ||
    path.startsWith("upload/")
  ) {
    return `${API_URL}/${path}`;
  }

  return `${API_URL}/uploads/${path}`;
}

/* ============================================================================
   GROUP STORIES BY USER
   (Facebook/Instagram behaviour: every story a user posted
   lives in ONE card. Clicking it plays them back to back.)
============================================================================ */

function groupStoriesByUser(
  stories: FockisStory[],
): FockisStoryGroup[] {
  const order: string[] = [];
  const map = new Map<string, FockisStoryGroup>();

  stories.forEach((story) => {
    const key =
      story.userId ||
      `name:${story.username}`;

    let group = map.get(key);

    if (!group) {
      group = {
        key,
        userId: story.userId,
        username: story.username,
        avatar:
          story.avatar ||
          story.userPhoto,
        isOwn: Boolean(story.isOwn),
        isSeller: false,
        hasUnseen: false,
        stories: [],
      };

      map.set(key, group);
      order.push(key);
    }

    group.stories.push(story);

    if (story.hasUnseen) {
      group.hasUnseen = true;
    }

    if (story.isSeller || story.product) {
      group.isSeller = true;
    }

    // Keep the most recent avatar/photo available.
    if (!group.avatar && (story.avatar || story.userPhoto)) {
      group.avatar = story.avatar || story.userPhoto;
    }
  });

  // Sort each user's stories chronologically (oldest -> newest)
  // so playback goes in posting order, like Facebook.
  order.forEach((key) => {
    const group = map.get(key)!;

    group.stories.sort((a, b) => {
      const timeA = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const timeB = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return timeA - timeB;
    });
  });

  return order.map((key) => map.get(key)!);
}

/* ============================================================================
   STORY DURATION
   Images play for a fixed duration.
   Videos use their real length once metadata loads.
============================================================================ */

const IMAGE_DURATION_MS = 5000;
const DEFAULT_VIDEO_DURATION_MS = 15000;

/* ============================================================================
   STORY VIEWER
   Full-screen, auto-advancing, Facebook/Instagram style playback.
============================================================================ */

interface FockisStoryViewerProps {
  groups: FockisStoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex: number;
  onClose: () => void;
  onStoryChange?: (
    story: FockisStory,
    index: number,
  ) => void;
}

function FockisStoryViewer({
  groups,
  initialGroupIndex,
  initialStoryIndex,
  onClose,
  onStoryChange,
}: FockisStoryViewerProps) {
  const [groupIndex, setGroupIndex] =
    useState(initialGroupIndex);

  const [storyIndex, setStoryIndex] =
    useState(initialStoryIndex);

  const [progress, setProgress] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  const [muted, setMuted] =
    useState(true);

  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const durationRef = useRef<number>(
    IMAGE_DURATION_MS,
  );

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const mediaUrl = useMemo(() => {
    if (!story) return "";

    const media =
      story.media ||
      story.storyImage ||
      story.storyVideo ||
      "";

    return buildMediaUrl(media);
  }, [story]);

  /* ==========================================================================
     NAVIGATION
  ========================================================================== */

  const goNext = useCallback(() => {
    setGroupIndex((currentGroupIndex) => {
      setStoryIndex((currentStoryIndex) => {
        const currentGroup =
          groups[currentGroupIndex];

        if (
          currentGroup &&
          currentStoryIndex <
            currentGroup.stories.length - 1
        ) {
          return currentStoryIndex + 1;
        }

        return 0;
      });

      const currentGroup =
        groups[currentGroupIndex];

      const isLastStoryInGroup =
        !currentGroup ||
        storyIndex >=
          currentGroup.stories.length - 1;

      if (!isLastStoryInGroup) {
        return currentGroupIndex;
      }

      if (
        currentGroupIndex <
        groups.length - 1
      ) {
        return currentGroupIndex + 1;
      }

      // Ran out of stories entirely.
      queueMicrotask(onClose);

      return currentGroupIndex;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, storyIndex, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      return;
    }

    if (groupIndex > 0) {
      const previousGroup =
        groups[groupIndex - 1];

      setGroupIndex((g) => g - 1);
      setStoryIndex(
        previousGroup.stories.length - 1,
      );
    }
  }, [storyIndex, groupIndex, groups]);

  const goToGroup = useCallback(
    (direction: "prev" | "next") => {
      if (
        direction === "next" &&
        groupIndex < groups.length - 1
      ) {
        setGroupIndex((g) => g + 1);
        setStoryIndex(0);
      } else if (
        direction === "prev" &&
        groupIndex > 0
      ) {
        setGroupIndex((g) => g - 1);
        setStoryIndex(0);
      } else if (direction === "next") {
        onClose();
      }
    },
    [groupIndex, groups.length, onClose],
  );

  /* ==========================================================================
     NOTIFY PARENT (mark as seen, etc.)
  ========================================================================== */

  useEffect(() => {
    if (story) {
      onStoryChange?.(story, storyIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  /* ==========================================================================
     PROGRESS / AUTOPLAY LOOP
  ========================================================================== */

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);

    durationRef.current =
      story?.type === "video"
        ? DEFAULT_VIDEO_DURATION_MS
        : IMAGE_DURATION_MS;

    lastTsRef.current = performance.now();

    const loop = (timestamp: number) => {
      const delta =
        timestamp - lastTsRef.current;

      lastTsRef.current = timestamp;

      if (!pausedRef.current) {
        elapsedRef.current += delta;

        const percent = Math.min(
          100,
          (elapsedRef.current /
            durationRef.current) *
            100,
        );

        setProgress(percent);

        if (percent >= 100) {
          goNext();
          return;
        }
      }

      rafRef.current =
        requestAnimationFrame(loop);
    };

    rafRef.current =
      requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  /* ==========================================================================
     VIDEO SYNC (real duration + play/pause)
  ========================================================================== */

  const handleVideoLoadedMetadata = () => {
    const video = videoRef.current;

    if (video && video.duration) {
      durationRef.current =
        video.duration * 1000;
    }
  };

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (paused) {
      video.pause();
    } else {
      void video.play().catch(() => {});
    }
  }, [paused, groupIndex, storyIndex]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    video.muted = muted;
  }, [muted, groupIndex, storyIndex]);

  /* ==========================================================================
     TOGGLE SOUND
  ========================================================================== */

  const handleToggleMute = (
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    setMuted((current) => !current);
  };

  /* ==========================================================================
     PAUSE ON HOLD
  ========================================================================== */

  const handlePointerDown = () => {
    pausedRef.current = true;
    setPaused(true);
  };

  const handlePointerUp = () => {
    pausedRef.current = false;
    setPaused(false);
  };

  /* ==========================================================================
     TAP LEFT / RIGHT TO NAVIGATE
  ========================================================================== */

  const handleTapZoneClick = (
    event: React.MouseEvent,
    zone: "left" | "right",
  ) => {
    event.stopPropagation();

    if (zone === "left") {
      goPrev();
    } else {
      goNext();
    }
  };

  /* ==========================================================================
     KEYBOARD CONTROLS
  ========================================================================== */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        goPrev();
        return;
      }

      if (event.key === "ArrowRight") {
        goNext();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow = "";
    };
  }, [goPrev, goNext, onClose]);

  if (!group || !story) {
    return null;
  }

  return (
    <div
      className="fk-story-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
    >
      <div className="fk-story-viewer__stage">
        {/* ==================================================================
            PROGRESS BARS - one segment per story in this user's group
        =================================================================== */}

        <div className="fk-story-viewer__progress-row">
          {group.stories.map((s, index) => (
            <div
              key={s.id}
              className="fk-story-viewer__progress-track"
            >
              <div
                className="fk-story-viewer__progress-fill"
                style={{
                  width:
                    index < storyIndex
                      ? "100%"
                      : index === storyIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* ==================================================================
            HEADER
        =================================================================== */}

        <div className="fk-story-viewer__header">
          <div className="fk-story-viewer__user">
            <span className="fk-story-viewer__avatar">
              {group.avatar ? (
                <img
                  src={buildMediaUrl(
                    group.avatar,
                  )}
                  alt={group.username}
                />
              ) : (
                <span className="fk-story-viewer__avatar-placeholder">
                  {group.username
                    ?.charAt(0)
                    ?.toUpperCase() || "?"}
                </span>
              )}
            </span>

            <span className="fk-story-viewer__username">
              {group.isOwn
                ? "Your Story"
                : group.username}
            </span>
          </div>

          <button
            type="button"
            className="fk-story-viewer__close"
            onClick={onClose}
            aria-label="Close story"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* ==================================================================
            MEDIA
        =================================================================== */}

        <div
          className="fk-story-viewer__media"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {story.type === "video" ? (
            <video
              ref={videoRef}
              className="fk-story-viewer__video"
              src={mediaUrl}
              playsInline
              autoPlay
              muted={muted}
              onLoadedMetadata={
                handleVideoLoadedMetadata
              }
            />
          ) : (
            <img
              className="fk-story-viewer__image"
              src={mediaUrl}
              alt={story.username}
            />
          )}

          {/* Tap zones for prev / next */}
          <button
            type="button"
            className="fk-story-viewer__tap-zone fk-story-viewer__tap-zone--left"
            aria-label="Previous story"
            onClick={(event) =>
              handleTapZoneClick(
                event,
                "left",
              )
            }
          />

          <button
            type="button"
            className="fk-story-viewer__tap-zone fk-story-viewer__tap-zone--right"
            aria-label="Next story"
            onClick={(event) =>
              handleTapZoneClick(
                event,
                "right",
              )
            }
          />

          {story.type === "video" && (
            <button
              type="button"
              className="fk-story-viewer__mute"
              aria-label={
                muted
                  ? "Unmute video"
                  : "Mute video"
              }
              onClick={handleToggleMute}
            >
              {muted ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* ==================================================================
            GROUP NAV (jump to previous / next user)
        =================================================================== */}

        {groupIndex > 0 && (
          <button
            type="button"
            className="fk-story-viewer__nav fk-story-viewer__nav--left"
            aria-label="Previous person's story"
            onClick={() =>
              goToGroup("prev")
            }
          >
            <IconChevronLeft size={20} />
          </button>
        )}

        <button
          type="button"
          className="fk-story-viewer__nav fk-story-viewer__nav--right"
          aria-label="Next person's story"
          onClick={() =>
            goToGroup("next")
          }
        >
          <IconChevronRight size={20} />
        </button>

        {/* ==================================================================
            PRODUCT / SELLER TAG
        =================================================================== */}

        {story.product && (
          <div className="fk-story-viewer__product">
            <IconMarketplace size={14} />
            <span>{story.product.name}</span>
            <strong>
              {story.product.price}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function FockisStoriesRail({
  stories = defaultStories,
  currentUser,
  onCreateStory,
  onStoryClick,
  onClose,
}: FockisStoriesRailProps) {
  const scrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [viewer, setViewer] = useState<{
    groupIndex: number;
    storyIndex: number;
  } | null>(null);

  const groups = useMemo(
    () => groupStoriesByUser(stories),
    [stories],
  );

  /* ==========================================================================
     FILE SELECTED
  ========================================================================== */

  const handleStoryFileSelected = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    /*
     * Clear the input so selecting
     * the same file again works.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    const isImage =
      file.type.startsWith(
        "image/",
      );

    const isVideo =
      file.type.startsWith(
        "video/",
      );

    if (
      !isImage &&
      !isVideo
    ) {
      window.alert(
        "Please select an image or video.",
      );

      return;
    }

    console.log(
      "Story file selected:",
      file.name,
      file.type,
    );

    if (onCreateStory) {
      onCreateStory(file);
    } else {
      console.error(
        "FockisStoriesRail: onCreateStory is missing.",
      );
    }
  };

  /* ==========================================================================
     SCROLL STORIES
  ========================================================================== */

  const scrollStories = (
    direction: "left" | "right",
  ) => {
    const element =
      scrollRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left:
        direction === "left"
          ? -320
          : 320,
      behavior: "smooth",
    });
  };

  /* ==========================================================================
     GROUP CARD CLICK -> OPEN VIEWER
  ========================================================================== */

  const handleGroupClick = (
    groupIndex: number,
  ) => {
    setViewer({
      groupIndex,
      storyIndex: 0,
    });
  };

  const handleCloseViewer = () => {
    setViewer(null);
  };

  const handleViewerStoryChange = (
    story: FockisStory,
    index: number,
  ) => {
    onStoryClick?.(story, index);
  };

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <section className="fk-stories-rail">
      {/* ======================================================================
          HIDDEN FILE INPUT
      ======================================================================= */}

      <input
        ref={fileInputRef}
        id="fockis-create-story-file"
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={
          handleStoryFileSelected
        }
      />

      {/* ======================================================================
          CLOSE BUTTON
      ======================================================================= */}

      {onClose && (
        <button
          type="button"
          className="fk-icon-btn fk-stories-rail__close"
          onClick={onClose}
          aria-label="Close stories"
          title="Close stories"
        >
          <IconClose size={16} />
        </button>
      )}

      {/* ======================================================================
          STORIES VIEWPORT
      ======================================================================= */}

      <div className="fk-stories-rail__viewport">
        {/* LEFT */}
        <button
          type="button"
          className="fk-stories-rail__arrow fk-stories-rail__arrow--left"
          onClick={() =>
            scrollStories("left")
          }
          aria-label="Previous stories"
        >
          <IconChevronLeft size={16} />
        </button>

        {/* STORY LIST */}
        <div
          ref={scrollRef}
          className="fk-stories-rail__list"
        >
          {/* ==================================================================
              CREATE STORY

              IMPORTANT:
              This is a LABEL connected directly
              to the file input.

              Clicking it opens the PC picker.
          =================================================================== */}

          <label
            htmlFor="fockis-create-story-file"
            className="fk-story-card fk-story-card--create"
            style={{
              cursor: "pointer",
            }}
          >
            <span className="fk-story-card__visual-wrap">
              <span className="fk-story-card__create-avatar">
                {currentUser?.avatar ? (
                  <img
                    src={buildMediaUrl(
                      currentUser.avatar,
                    )}
                    alt={
                      currentUser.username ||
                      "Your profile"
                    }
                    loading="lazy"
                  />
                ) : (
                  <IconPlus size={20} />
                )}
              </span>
            </span>

            <span className="fk-story-card__label">
              Create Story
            </span>
          </label>

          {/* ==================================================================
              GROUPED STORIES - one card per user
              (all of that user's photos/videos live inside it)
          =================================================================== */}

          {groups.map(
            (
              group,
              groupIndex,
            ) => {
              const coverStory =
                group.stories[
                  group.stories.length - 1
                ];

              const coverMedia =
                coverStory?.media ||
                coverStory?.storyImage ||
                coverStory?.storyVideo ||
                "";

              const coverUrl =
                buildMediaUrl(
                  coverMedia,
                );

              const avatarUrl =
                group.avatar || "";

              return (
                <button
                  type="button"
                  key={group.key}
                  className={[
                    "fk-story-card",
                    group.hasUnseen
                      ? "is-unseen"
                      : "",
                    group.isSeller
                      ? "is-seller"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    handleGroupClick(
                      groupIndex,
                    )
                  }
                >
                  <span className="fk-story-card__visual-wrap">
                    <span className="fk-story-card__avatar">
                      {coverUrl ? (
                        coverStory?.type ===
                        "video" ? (
                          <video
                            src={coverUrl}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={coverUrl}
                            alt={
                              group.username
                            }
                            loading="lazy"
                          />
                        )
                      ) : avatarUrl ? (
                        <img
                          src={buildMediaUrl(
                            avatarUrl,
                          )}
                          alt={
                            group.username
                          }
                          loading="lazy"
                        />
                      ) : (
                        <span className="fk-story-card__avatar-placeholder">
                          {group.username
                            ?.charAt(
                              0,
                            )
                            ?.toUpperCase() ||
                            "?"}
                        </span>
                      )}
                    </span>

                    {group.hasUnseen && (
                      <span
                        className="fk-story-card__ping"
                        aria-hidden="true"
                      />
                    )}

                    {group.isSeller && (
                      <span
                        className="fk-story-card__store-badge"
                        aria-hidden="true"
                      >
                        <IconMarketplace
                          size={10}
                        />
                      </span>
                    )}

                    {/* Story count, when a user has more than one */}
                    {group.stories.length >
                      1 && (
                      <span className="fk-story-card__count">
                        {
                          group.stories
                            .length
                        }
                      </span>
                    )}
                  </span>

                  <IconWaveGlyph
                    className="fk-story-card__wave"
                  />

                  <span className="fk-story-card__label">
                    {group.isOwn
                      ? "Your Story"
                      : group.username}
                  </span>
                </button>
              );
            },
          )}
        </div>

        {/* RIGHT */}
        <button
          type="button"
          className="fk-stories-rail__arrow fk-stories-rail__arrow--right"
          onClick={() =>
            scrollStories("right")
          }
          aria-label="Next stories"
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      {/* ======================================================================
          FULL-SCREEN VIEWER
      ======================================================================= */}

      {viewer && (
        <FockisStoryViewer
          groups={groups}
          initialGroupIndex={
            viewer.groupIndex
          }
          initialStoryIndex={
            viewer.storyIndex
          }
          onClose={handleCloseViewer}
          onStoryChange={
            handleViewerStoryChange
          }
        />
      )}
    </section>
  );
}