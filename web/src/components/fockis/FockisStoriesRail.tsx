import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  Radio,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { FOCKIS_API_URL } from "../../config/fockisConfig";

import "../../styles/FockisStoriesRail.scss";

/* ============================================================================
   CONFIG
============================================================================ */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL ||
  "http://localhost:3000"
)
  .trim()
  .replace(/\/+$/, "");

const IMAGE_STORY_MS = 5000;
const VIDEO_STORY_FALLBACK_MS = 15000;
const SWIPE_THRESHOLD_PX = 60;

/* ============================================================================
   TYPES (public API unchanged, two optional props added)
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

/**
 * Minimal shape of a public live stream. The feed's PublicLiveStream
 * objects satisfy it, so the rail does not depend on the feed page module.
 */
export interface FockisStoryLiveStream {
  id: string;
  title?: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  avatar?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  viewers?: number;
}

export interface FockisStoriesRailProps {
  stories?: FockisStory[];
  currentUser?: {
    id?: string;
    username?: string;
    avatar?: string;
  };
  onCreateStory?: (file: File) => void | Promise<void>;
  onStoryCreated?: () => void;
  onStoryClick?: (story: FockisStory, index: number) => void;
  onClose?: () => void;
  /** Live streams to show as Live story cards (optional). */
  liveStreams?: FockisStoryLiveStream[];
  /** Opens a live stream (optional; Live cards only render when provided). */
  onOpenLive?: (streamId: string) => void;
}

interface StoryGroup {
  key: string;
  userId?: string;
  username: string;
  avatar?: string;
  isOwn: boolean;
  isSeller: boolean;
  hasUnseen: boolean;
  stories: FockisStory[];
}

type StoryFilter = "all" | "live" | "yours";

/* ============================================================================
   MEDIA HELPERS
============================================================================ */

function mediaUrl(value?: string): string {
  if (!value) return "";

  let path = String(value).trim();

  if (!path || path === "undefined" || path === "null") return "";

  if (/^(https?:\/\/|blob:|data:)/i.test(path)) {
    return path;
  }

  path = path.replace(/\\/g, "/");
  path = path.replace(/^(\.\/)+/, "");
  path = path.replace(/^\/+/, "");

  if (!path) return "";

  // Story/post media is served by the public /post-media/:filename route.
  if (/^post-media\//i.test(path)) {
    return `${API_URL}/${path}`;
  }

  if (/^(uploads\/|upload\/|media\/|public\/uploads\/|api\/uploads\/)/i.test(path)) {
    return `${API_URL}/${path}`;
  }

  return `${API_URL}/uploads/${path}`;
}

function storyMediaCandidates(story: FockisStory): string[] {
  const rawValues =
    story.type === "video"
      ? [story.media, story.storyVideo, story.storyImage]
      : [story.media, story.storyImage, story.storyVideo];

  return Array.from(
    new Set(rawValues.map((value) => mediaUrl(value)).filter(Boolean)),
  );
}

function isExpired(story: FockisStory, now: number): boolean {
  if (!story.expiresAt) return false;
  const expires = Date.parse(story.expiresAt);
  return Number.isFinite(expires) && expires <= now;
}

function groupStories(
  stories: FockisStory[],
  currentUserId?: string,
): StoryGroup[] {
  const groups = new Map<string, StoryGroup>();
  const now = Date.now();
  const me = currentUserId ? String(currentUserId) : "";

  for (const story of stories) {
    if (isExpired(story, now)) continue;

    const key = story.userId || `name:${story.username}`;
    const own = Boolean(story.isOwn || (me && story.userId && String(story.userId) === me));

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        userId: story.userId,
        username: story.username,
        avatar: story.avatar || story.userPhoto,
        isOwn: own,
        isSeller: Boolean(story.isSeller || story.product),
        hasUnseen: Boolean(story.hasUnseen),
        stories: [],
      });
    }

    const group = groups.get(key)!;
    group.stories.push(story);
    if (!group.avatar) group.avatar = story.avatar || story.userPhoto;
    group.hasUnseen = group.hasUnseen || Boolean(story.hasUnseen);
    group.isSeller = group.isSeller || Boolean(story.isSeller || story.product);
    group.isOwn = group.isOwn || own;
  }

  const result = Array.from(groups.values()).map((group) => ({
    ...group,
    stories: [...group.stories].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return aTime - bTime;
    }),
  }));

  // Your own story first, then unseen, then the rest (stable otherwise).
  return result.sort((a, b) => {
    if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return 0;
  });
}

function formatAge(value?: string): string {
  if (!value) return "";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatViewers(value?: number): string {
  const count = Math.max(0, Number(value || 0));
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function initialOf(name?: string): string {
  return (name || "F").trim().charAt(0).toUpperCase() || "F";
}

/* ============================================================================
   STORY VIEWER
============================================================================ */

function StoryViewer({
  groups,
  startGroup,
  onClose,
  onStoryClick,
}: {
  groups: StoryGroup[];
  startGroup: number;
  onClose: () => void;
  onStoryClick?: (story: FockisStory, index: number) => void;
}) {
  const [groupIndex, setGroupIndex] = useState(startGroup);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startTimeRef = useRef(0);
  const durationRef = useRef(IMAGE_STORY_MS);
  const progressRef = useRef(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isPaused = paused || holding;

  const src = useMemo(() => (story ? storyMediaCandidates(story)[0] || "" : ""), [story]);

  const next = useCallback(() => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((value) => value + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((value) => value + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
  }, [group, groupIndex, groups.length, onClose, storyIndex]);

  const previous = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((value) => value - 1);
      return;
    }
    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      setGroupIndex((value) => value - 1);
      setStoryIndex(Math.max(previousGroup.stories.length - 1, 0));
    }
  }, [groupIndex, groups, storyIndex]);

  // Keep the latest navigation callbacks for the animation loop.
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    if (!story) return;
    onStoryClick?.(story, storyIndex);
  }, [story, storyIndex, onStoryClick]);

  useEffect(() => {
    setMediaFailed(false);
    setLoadingMedia(true);
  }, [groupIndex, storyIndex]);

  // Progress timer (paused while holding, paused, or still loading).
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
    startTimeRef.current = performance.now();
    durationRef.current = story?.type === "video" ? VIDEO_STORY_FALLBACK_MS : IMAGE_STORY_MS;
  }, [groupIndex, storyIndex, story?.type]);

  useEffect(() => {
    let frame = 0;
    const halted = isPaused || loadingMedia;

    const tick = (now: number) => {
      if (halted) {
        startTimeRef.current = now - (progressRef.current / 100) * durationRef.current;
      } else {
        const elapsed = now - startTimeRef.current;
        const percent = Math.min(100, (elapsed / durationRef.current) * 100);
        progressRef.current = percent;
        setProgress(percent);
        if (percent >= 100) {
          nextRef.current();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPaused, loadingMedia, groupIndex, storyIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPaused) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
  }, [isPaused, groupIndex, storyIndex]);

  // Keyboard + scroll lock + initial focus.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
      if (event.key === " " || event.key === "k") {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };

    const previousOverflow = document.body.style.overflow;
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [next, onClose, previous]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!group || !story) return null;

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    swipedRef.current = false;
    setHolding(true);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    setHolding(false);
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      swipedRef.current = true;
      if (dx < 0) next();
      else previous();
    } else if (dy > SWIPE_THRESHOLD_PX * 1.5 && Math.abs(dy) > Math.abs(dx)) {
      swipedRef.current = true;
      onClose();
    }
  }

  function tap(direction: "prev" | "next") {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    if (direction === "next") next();
    else previous();
  }

  const age = formatAge(story.createdAt);

  return (
    <div
      className="fk-story-viewer fk-social-scope fk-social-scope--always-dark"
      role="dialog"
      aria-modal="true"
      aria-label={`${group.isOwn ? "Your story" : `${group.username}'s story`}, ${storyIndex + 1} of ${group.stories.length}`}
    >
      <div className="fk-story-viewer__backdrop" onClick={onClose} aria-hidden="true">
        {src && story.type !== "video" && (
          <img className="fk-story-viewer__backdrop-image" src={src} alt="" />
        )}
      </div>

      <button
        type="button"
        className="fk-story-viewer__nav fk-story-viewer__nav--prev"
        onClick={previous}
        disabled={groupIndex === 0 && storyIndex === 0}
        aria-label="Previous story"
      >
        <ChevronLeft size={22} />
      </button>

      <div className="fk-story-viewer__stage">
        <div className="fk-story-viewer__progress-row" aria-hidden="true">
          {group.stories.map((item, index) => (
            <div className="fk-story-viewer__progress-track" key={item.id}>
              <div
                className="fk-story-viewer__progress-fill"
                style={{
                  transform: `scaleX(${
                    index < storyIndex ? 1 : index === storyIndex ? progress / 100 : 0
                  })`,
                }}
              />
            </div>
          ))}
        </div>

        <header className="fk-story-viewer__header">
          <div className="fk-story-viewer__user">
            <span className="fk-story-viewer__avatar">
              {group.avatar ? (
                <img
                  src={mediaUrl(group.avatar)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                initialOf(group.username)
              )}
            </span>
            <span className="fk-story-viewer__identity">
              <strong>{group.isOwn ? "Your story" : group.username}</strong>
              {age && <span>{age}</span>}
            </span>
          </div>

          <div className="fk-story-viewer__controls">
            <button
              type="button"
              className="fk-story-viewer__icon-btn"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Play story" : "Pause story"}
              aria-pressed={paused}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>

            {story.type === "video" && (
              <button
                type="button"
                className="fk-story-viewer__icon-btn"
                onClick={() => setMuted((value) => !value)}
                aria-label={muted ? "Turn sound on" : "Mute"}
                aria-pressed={!muted}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}

            <button
              ref={closeRef}
              type="button"
              className="fk-story-viewer__icon-btn"
              onClick={onClose}
              aria-label="Close story"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div
          className="fk-story-viewer__media"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
        >
          {mediaFailed || !src ? (
            <div className="fk-story-viewer__fallback">
              <span>{initialOf(group.username)}</span>
              <p>This story can't be played right now.</p>
            </div>
          ) : story.type === "video" ? (
            <video
              ref={videoRef}
              key={src}
              src={src}
              className="fk-story-viewer__video"
              playsInline
              autoPlay
              muted={muted}
              onCanPlay={() => setLoadingMedia(false)}
              onWaiting={() => setLoadingMedia(true)}
              onPlaying={() => setLoadingMedia(false)}
              onError={() => {
                setMediaFailed(true);
                setLoadingMedia(false);
              }}
              onLoadedMetadata={(event) => {
                if (event.currentTarget.duration > 0 && Number.isFinite(event.currentTarget.duration)) {
                  durationRef.current = event.currentTarget.duration * 1000;
                  startTimeRef.current =
                    performance.now() - (progressRef.current / 100) * durationRef.current;
                }
              }}
            />
          ) : (
            <img
              key={src}
              src={src}
              className="fk-story-viewer__image"
              alt={`Story from ${group.username}`}
              onLoad={() => setLoadingMedia(false)}
              onError={() => {
                setMediaFailed(true);
                setLoadingMedia(false);
              }}
              draggable={false}
            />
          )}

          {loadingMedia && !mediaFailed && src && (
            <span className="fk-story-viewer__loading" aria-hidden="true">
              <LoaderCircle size={30} />
            </span>
          )}

          <button
            type="button"
            className="fk-story-viewer__tap fk-story-viewer__tap--left"
            onClick={() => tap("prev")}
            aria-label="Previous story"
            tabIndex={-1}
          />
          <button
            type="button"
            className="fk-story-viewer__tap fk-story-viewer__tap--right"
            onClick={() => tap("next")}
            aria-label="Next story"
            tabIndex={-1}
          />
        </div>

        {story.product && (
          <div className="fk-story-viewer__product">
            <ShoppingBag size={15} aria-hidden="true" />
            <span>{story.product.name}</span>
            <strong>{story.product.price}</strong>
          </div>
        )}
      </div>

      <button
        type="button"
        className="fk-story-viewer__nav fk-story-viewer__nav--next"
        onClick={next}
        aria-label="Next story"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

/* ============================================================================
   STORIES RAIL
============================================================================ */

export default function FockisStoriesRail({
  stories = [],
  currentUser,
  onCreateStory,
  onStoryCreated,
  onStoryClick,
  onClose,
  liveStreams = [],
  onOpenLive,
}: FockisStoriesRailProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [viewerGroup, setViewerGroup] = useState<number | null>(null);
  const [filter, setFilter] = useState<StoryFilter>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const groups = useMemo(() => groupStories(stories, currentUser?.id), [stories, currentUser?.id]);
  const lives = onOpenLive ? liveStreams : [];
  const ownGroups = groups.filter((group) => group.isOwn);

  const visibleGroups =
    filter === "live" ? [] : filter === "yours" ? ownGroups : groups;
  const visibleLives = filter === "all" || filter === "live" ? lives : [];

  const filters: { id: StoryFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: groups.length + lives.length },
  ];
  if (lives.length > 0) filters.push({ id: "live", label: "Live", count: lives.length });
  if (ownGroups.length > 0) filters.push({ id: "yours", label: "Yours", count: ownGroups.length });

  // Reset to All if the selected filter no longer has anything to show.
  useEffect(() => {
    if (filter === "live" && lives.length === 0) setFilter("all");
    if (filter === "yours" && ownGroups.length === 0) setFilter("all");
  }, [filter, lives.length, ownGroups.length]);

  const updateScrollState = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setCanScrollLeft(list.scrollLeft > 4);
    setCanScrollRight(list.scrollLeft + list.clientWidth < list.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(list);
    return () => observer.disconnect();
  }, [updateScrollState, visibleGroups.length, visibleLives.length]);

  const selectStoryFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError("");

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setUploadError("Choose a photo or video for your story.");
      return;
    }

    try {
      setUploading(true);
      await onCreateStory?.(file);
      onStoryCreated?.();
    } finally {
      setUploading(false);
    }
  };

  const scroll = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({ left: direction * Math.max(280, list.clientWidth * 0.8), behavior: "smooth" });
  };

  function handleListKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const cards = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(".fk-story-card") || [],
    );
    const index = cards.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    const target = cards[index + (event.key === "ArrowRight" ? 1 : -1)];
    target?.focus();
    target?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }

  function openGroup(group: StoryGroup) {
    const index = groups.indexOf(group);
    if (index !== -1) setViewerGroup(index);
  }

  const firstPlayable = groups.findIndex((group) => !group.isOwn) >= 0
    ? groups.findIndex((group) => !group.isOwn)
    : groups.length > 0
      ? 0
      : -1;

  return (
    <>
      <section className="fk-stories" aria-labelledby="fk-stories-title">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(event) => void selectStoryFile(event)}
        />

        <div className="fk-stories__head">
          <div className="fk-stories__brand">
            <span className="fk-stories__mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="30" height="30">
                <path
                  d="M4 19c3.5 0 3.5-5 7-5s3.5 5 7 5 3.5-5 7-5 3 3 3 3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="9" cy="9" r="3" fill="currentColor" />
              </svg>
            </span>
            <div>
              <h2 id="fk-stories-title">Fockis Stories</h2>
              <p>Real moments. Real people. Your world.</p>
            </div>
          </div>

          <div className="fk-stories__tools">
            {filters.length > 1 && (
              <div className="fk-stories__filters" role="tablist" aria-label="Filter stories">
                {filters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === item.id}
                    className={`fk-stories__filter${filter === item.id ? " is-active" : ""}${
                      item.id === "live" ? " fk-stories__filter--live" : ""
                    }`}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.id === "live" && <span className="fk-stories__live-dot" aria-hidden="true" />}
                    {item.label}
                    <span className="fk-stories__filter-count">{item.count}</span>
                  </button>
                ))}
              </div>
            )}

            {firstPlayable >= 0 && (
              <button
                type="button"
                className="fk-stories__see-all"
                onClick={() => setViewerGroup(firstPlayable)}
              >
                Watch all
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}

            {onClose && (
              <button
                type="button"
                className="fk-stories__close"
                onClick={onClose}
                aria-label="Close stories"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        <div className="fk-stories__viewport">
          {canScrollLeft && (
            <button
              type="button"
              className="fk-stories__arrow fk-stories__arrow--left"
              onClick={() => scroll(-1)}
              aria-label="Scroll stories left"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div
            className="fk-stories__list"
            ref={listRef}
            onScroll={updateScrollState}
            onKeyDown={handleListKeyDown}
            aria-label="Stories"
          >
            {filter !== "live" && (
              <button
                type="button"
                className="fk-story-card fk-story-card--create"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || !onCreateStory}
                aria-label={uploading ? "Uploading your story" : "Create a story"}
              >
                <span className="fk-story-card__create-art" aria-hidden="true">
                  {currentUser?.avatar && (
                    <img
                      src={mediaUrl(currentUser.avatar)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </span>
                <span className="fk-story-card__create-button" aria-hidden="true">
                  {uploading ? <LoaderCircle size={22} className="fk-stories__spin" /> : <Plus size={24} strokeWidth={2.6} />}
                </span>
                <span className="fk-story-card__caption">
                  <strong>{uploading ? "Uploading…" : "Create Story"}</strong>
                  <span>Photo or video</span>
                </span>
              </button>
            )}

            {visibleLives.map((stream) => {
              const name = stream.displayName || stream.username || "Fockis live";
              const cover = stream.thumbnailUrl || stream.thumbnail || stream.avatarUrl || stream.avatar || "";
              const avatar = stream.avatarUrl || stream.avatar || "";
              return (
                <button
                  key={`live-${stream.id}`}
                  type="button"
                  className="fk-story-card fk-story-card--live"
                  onClick={() => onOpenLive?.(stream.id)}
                  aria-label={`Watch ${name} live${stream.title ? `: ${stream.title}` : ""}`}
                >
                  <span className="fk-story-card__media">
                    {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="fk-story-card__placeholder"><Radio size={28} /></span>}
                  </span>
                  <span className="fk-story-card__badge fk-story-card__badge--live">
                    <span className="fk-stories__live-dot" aria-hidden="true" />
                    Live
                  </span>
                  <span className="fk-story-card__viewers">
                    <Eye size={12} aria-hidden="true" />
                    {formatViewers(stream.viewers)}
                  </span>
                  <span className="fk-story-card__avatar">
                    {avatar ? <img src={avatar} alt="" /> : initialOf(name)}
                  </span>
                  <span className="fk-story-card__caption">
                    <strong>{name}</strong>
                    {stream.title && <span>{stream.title}</span>}
                  </span>
                </button>
              );
            })}

            {visibleGroups.map((group, index) => {
              const latest = group.stories[group.stories.length - 1];
              const coverCandidates = storyMediaCandidates(latest);
              const cover = coverCandidates[0] || "";
              const age = formatAge(latest?.createdAt);
              const variant = group.isOwn ? "own" : `v${index % 4}`;

              return (
                <button
                  type="button"
                  key={group.key}
                  className={[
                    "fk-story-card",
                    `fk-story-card--${variant}`,
                    group.hasUnseen && !group.isOwn ? "is-unseen" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => openGroup(group)}
                  aria-label={`${group.isOwn ? "Your story" : `Story from ${group.username}`}${
                    group.stories.length > 1 ? `, ${group.stories.length} updates` : ""
                  }${group.hasUnseen && !group.isOwn ? ", new" : ""}`}
                >
                  <span className="fk-story-card__media">
                    {cover ? (
                      latest?.type === "video" ? (
                        <video src={cover} muted playsInline preload="metadata" />
                      ) : (
                        <img
                          src={cover}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            const element = event.currentTarget;
                            const nextIndex = Number(element.dataset.fallbackIndex || "0") + 1;
                            const nextSrc = coverCandidates[nextIndex];
                            if (nextSrc) {
                              element.dataset.fallbackIndex = String(nextIndex);
                              element.src = nextSrc;
                            } else {
                              element.style.display = "none";
                            }
                          }}
                        />
                      )
                    ) : group.avatar ? (
                      <img src={mediaUrl(group.avatar)} alt="" />
                    ) : (
                      <span className="fk-story-card__placeholder">{initialOf(group.username)}</span>
                    )}
                  </span>

                  {group.isOwn && <span className="fk-story-card__badge">Yours</span>}

                  {!group.isOwn && group.hasUnseen && (
                    <span className="fk-story-card__new" aria-hidden="true" />
                  )}

                  <span className="fk-story-card__chips">
                    {latest?.type === "video" && (
                      <span className="fk-story-card__chip" title="Video story">
                        <Play size={11} fill="currentColor" aria-hidden="true" />
                      </span>
                    )}
                    {group.isSeller && (
                      <span className="fk-story-card__chip" title="Shop story">
                        <ShoppingBag size={11} aria-hidden="true" />
                      </span>
                    )}
                    {group.stories.length > 1 && (
                      <span className="fk-story-card__chip">{group.stories.length}</span>
                    )}
                  </span>

                  <span className="fk-story-card__avatar">
                    {group.avatar ? <img src={mediaUrl(group.avatar)} alt="" /> : initialOf(group.username)}
                  </span>

                  <span className="fk-story-card__caption">
                    <strong>{group.isOwn ? "Your Story" : group.username}</strong>
                    {age && <span>{age}</span>}
                  </span>
                </button>
              );
            })}

            {visibleGroups.length === 0 && visibleLives.length === 0 && filter === "all" && (
              <div className="fk-stories__empty">
                <strong>No stories yet</strong>
                <span>Be the first to share a moment today.</span>
              </div>
            )}
          </div>

          {canScrollRight && (
            <button
              type="button"
              className="fk-stories__arrow fk-stories__arrow--right"
              onClick={() => scroll(1)}
              aria-label="Scroll stories right"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {uploadError && (
          <p className="fk-stories__error" role="alert">
            {uploadError}
          </p>
        )}
      </section>

      {viewerGroup !== null && (
        <StoryViewer
          groups={groups}
          startGroup={viewerGroup}
          onClose={() => setViewerGroup(null)}
          onStoryClick={onStoryClick}
        />
      )}
    </>
  );
}
