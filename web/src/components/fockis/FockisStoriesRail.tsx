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
  Send,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { createPortal } from "react-dom";
import { FOCKIS_API_URL } from "../../config/fockisConfig";

import { conversationsService, messagesService } from "../../messages/inbox/inboxApi";
import { useHideBottomNav } from "./FockisBottomNav";
import "../../styles/FockisStoriesRail.scss";
import "../../styles/FockisStoriesBubbles.scss";

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
  /** Shows placeholder circles until the stories have loaded. */
  loading?: boolean;
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
  seen?: Set<string>,
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
    // Ring state: unseen = some story in the group not opened on this device.
    hasUnseen: seen
      ? !group.isOwn && group.stories.some((story) => !seen.has(story.id))
      : group.hasUnseen,
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

/* ============================================================================
   SEEN STORIES (this device)
   The rail shows bright rings for stories you haven't opened and muted rings
   for ones you have. Opened story ids are remembered per account here.
============================================================================ */

const SEEN_KEY = "fockis-seen-stories";
const SEEN_MAX = 500;

function seenKey(): string {
  try {
    return `${SEEN_KEY}:${localStorage.getItem("userId") || "guest"}`;
  } catch {
    return SEEN_KEY;
  }
}

function readSeen(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(seenKey()) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  if (!id) return;
  try {
    const list = Array.from(readSeen()).filter((x) => x !== id);
    list.push(id);
    localStorage.setItem(seenKey(), JSON.stringify(list.slice(-SEEN_MAX)));
  } catch {
    /* seen state is a nicety */
  }
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏"];

/**
 * Reply / react to a story. Uses the existing Messages system: the reply
 * arrives in a direct chat with the story's author.
 */
function StoryReplyBar({
  toUserId,
  toName,
  onFocusChange,
}: {
  toUserId: string;
  toName: string;
  onFocusChange: (focused: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [burst, setBurst] = useState<string | null>(null);

  const send = async (body: string, reaction?: string) => {
    if (!body.trim() || state === "sending") return;
    setState("sending");
    if (reaction) setBurst(reaction);
    try {
      const conversation = await conversationsService.openDirect(toUserId);
      await messagesService.send({ conversationId: conversation.id, type: "text", text: body.trim() });
      setText("");
      setState("sent");
      window.setTimeout(() => setState((v) => (v === "sent" ? "idle" : v)), 2200);
    } catch {
      setState("error");
    } finally {
      window.setTimeout(() => setBurst(null), 900);
    }
  };

  return (
    <div className="fk-story-reply" onPointerDown={(e) => e.stopPropagation()}>
      {burst && (
        <span className="fk-story-reply__burst" aria-hidden="true">
          {burst}
        </span>
      )}
      <div className="fk-story-reply__reactions" role="group" aria-label={`React to ${toName}'s story`}>
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => void send(`${emoji} Reacted to your story`, emoji)}
            disabled={state === "sending"}
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <form
        className="fk-story-reply__form"
        onSubmit={(event) => {
          event.preventDefault();
          void send(`Replied to your story: ${text}`);
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          maxLength={1000}
          placeholder={`Reply to ${toName}…`}
          aria-label={`Reply to ${toName}`}
        />
        <button type="submit" disabled={!text.trim() || state === "sending"} aria-label="Send reply">
          {state === "sending" ? <LoaderCircle size={18} className="fk-stories__spin" /> : <Send size={18} />}
        </button>
      </form>
      <p className="fk-story-reply__status" role="status" aria-live="polite">
        {state === "sent" ? "Sent — it's in your messages." : state === "error" ? "Couldn't send. Try again." : ""}
      </p>
    </div>
  );
}

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
  // Typing a reply pauses the story.
  const [replying, setReplying] = useState(false);
  // Full screen: no bottom navigation over the story.
  useHideBottomNav(true);
  const isPaused = paused || holding || replying;

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
    markSeen(story.id);
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
      // Let the reply box have its keys (space, arrows, k…).
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        if (event.key === "Escape") target.blur();
        return;
      }
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

        {!group.isOwn && group.userId && (
          <StoryReplyBar
            key={story.id}
            toUserId={group.userId}
            toName={group.username}
            onFocusChange={setReplying}
          />
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
  loading = false,
}: FockisStoriesRailProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [viewerGroup, setViewerGroup] = useState<number | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // Bumped when the viewer closes so rings pick up what was just seen.
  const [seenVersion, setSeenVersion] = useState(0);
  const seen = useMemo(() => readSeen(), [seenVersion, stories]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => groupStories(stories, currentUser?.id, seen), [stories, currentUser?.id, seen]);
  const lives = onOpenLive ? liveStreams : [];
  // Unseen first (own story stays first), then seen.
  const ordered = useMemo(() => groups, [groups]);

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
  }, [updateScrollState, ordered.length, lives.length]);

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
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>(".fk-sb") || []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    const target = items[index + (event.key === "ArrowRight" ? 1 : -1)];
    target?.focus();
    target?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }

  function openGroup(group: StoryGroup) {
    const index = groups.indexOf(group);
    if (index !== -1) {
      setBrowsing(false);
      setViewerGroup(index);
    }
  }

  const hasAnything = groups.length > 0 || lives.length > 0;

  return (
    <>
      <section className="fk-stories fk-stories--bubbles" aria-labelledby="fk-stories-title">
        <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={(event) => void selectStoryFile(event)} />

        <div className="fk-stories__head">
          <div className="fk-stories__brand">
            <span className="fk-stories__mark" aria-hidden="true">
              <Play size={16} fill="currentColor" />
            </span>
            <div>
              <h2 id="fk-stories-title">Fockis Stories</h2>
              <p>Real moments. Real people. Your world.</p>
            </div>
          </div>
          <div className="fk-stories__tools">
            {hasAnything && (
              <button type="button" className="fk-stories__see-all" onClick={() => setBrowsing(true)}>
                See all
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
            {onClose && (
              <button type="button" className="fk-stories__close" onClick={onClose} aria-label="Close stories">
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        <div className="fk-stories__viewport">
          {canScrollLeft && (
            <button type="button" className="fk-stories__arrow fk-stories__arrow--left" onClick={() => scroll(-1)} aria-label="Scroll stories left">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="fk-stories__list fk-sb-list" ref={listRef} onScroll={updateScrollState} onKeyDown={handleListKeyDown} aria-label="Stories">
            <button
              type="button"
              className="fk-sb fk-sb--create"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || !onCreateStory}
              aria-label={uploading ? "Uploading your story" : "Create a story"}
            >
              <span className="fk-sb__create" aria-hidden="true">
                <span className="fk-sb__plus">
                  {uploading ? <LoaderCircle size={22} className="fk-stories__spin" /> : <Plus size={24} strokeWidth={2.6} />}
                </span>
                <span className="fk-sb__create-label">{uploading ? "Uploading…" : "Create story"}</span>
              </span>
            </button>

            {lives.map((stream) => {
              const name = stream.displayName || stream.username || "Fockis live";
              const avatar = stream.avatarUrl || stream.avatar || stream.thumbnailUrl || stream.thumbnail || "";
              return (
                <button
                  key={`live-${stream.id}`}
                  type="button"
                  className="fk-sb fk-sb--live"
                  onClick={() => onOpenLive?.(stream.id)}
                  aria-label={`Watch ${name} live${stream.title ? `: ${stream.title}` : ""}, ${formatViewers(stream.viewers)} watching`}
                >
                  <span className="fk-sb__ring">
                    <span className="fk-sb__photo">{avatar ? <img src={avatar} alt="" loading="lazy" /> : initialOf(name)}</span>
                    <span className="fk-sb__live">Live</span>
                  </span>
                  <strong className="fk-sb__name">{name}</strong>
                  <small className="fk-sb__meta">
                    <Eye size={11} aria-hidden="true" /> {formatViewers(stream.viewers)}
                  </small>
                </button>
              );
            })}

            {ordered.map((group) => (
              <StoryBubble key={group.key} group={group} onOpen={() => openGroup(group)} />
            ))}

            {loading && (
              <>
                <span className="fk-sb fk-sb--skeleton" aria-hidden="true" />
                <span className="fk-sb fk-sb--skeleton" aria-hidden="true" />
                <span className="fk-sb fk-sb--skeleton" aria-hidden="true" />
              </>
            )}

            {!loading && !hasAnything && (
              <div className="fk-stories__empty">
                <strong>No stories yet</strong>
                <span>Share a photo or video — it stays up for 24 hours.</span>
              </div>
            )}
          </div>
          {canScrollRight && (
            <button type="button" className="fk-stories__arrow fk-stories__arrow--right" onClick={() => scroll(1)} aria-label="Scroll stories right">
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

      {/* Portals: the feed column creates its own stacking context, which
          let the app's top bar cover the full-screen viewer on phones. */}
      {browsing && createPortal(
        <StoriesBrowser
          groups={groups}
          lives={lives}
          onOpen={openGroup}
          onOpenLive={(id) => {
            setBrowsing(false);
            onOpenLive?.(id);
          }}
          onCreate={onCreateStory ? () => inputRef.current?.click() : undefined}
          onClose={() => setBrowsing(false)}
        />,
        document.body,
      )}

      {viewerGroup !== null && createPortal(
        <StoryViewer
          groups={groups}
          startGroup={viewerGroup}
          onClose={() => {
            setViewerGroup(null);
            setSeenVersion((v) => v + 1);
          }}
          onStoryClick={onStoryClick}
        />,
        document.body,
      )}
    </>
  );
}

/* ============================================================================
   STORY BUBBLE (circle with gradient ring)
============================================================================ */

function StoryBubble({ group, onOpen }: { group: StoryGroup; onOpen: () => void }) {
  const latest = group.stories[group.stories.length - 1];
  const cover = latest ? storyMediaCandidates(latest)[0] || "" : "";
  const photo = group.avatar ? mediaUrl(group.avatar) : latest?.type === "video" ? "" : cover;
  const [failed, setFailed] = useState(false);
  const age = formatAge(latest?.createdAt);
  const state = group.isOwn ? "own" : group.hasUnseen ? "unseen" : "seen";
  return (
    <button
      type="button"
      className={`fk-sb is-${state}`}
      onClick={onOpen}
      aria-label={`${group.isOwn ? "Your story" : `Story from ${group.username}`}${group.stories.length > 1 ? `, ${group.stories.length} updates` : ""}${
        state === "unseen" ? ", new" : ""
      }${age ? `, ${age} ago` : ""}`}
    >
      <span className="fk-sb__ring">
        <span className="fk-sb__photo">
          {photo && !failed ? <img src={photo} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} /> : initialOf(group.username)}
        </span>
        {latest?.type === "video" && (
          <span className="fk-sb__chip" title="Video story">
            <Play size={10} fill="currentColor" aria-hidden="true" />
          </span>
        )}
        {group.isSeller && !latest?.type?.startsWith("video") && (
          <span className="fk-sb__chip" title="Shop story">
            <ShoppingBag size={10} aria-hidden="true" />
          </span>
        )}
      </span>
      <strong className="fk-sb__name">{group.isOwn ? "Your story" : group.username}</strong>
      {age && <small className="fk-sb__meta">{age}</small>}
    </button>
  );
}

/* ============================================================================
   SEE ALL — every active story in a grid, unseen first
============================================================================ */

function StoriesBrowser({
  groups,
  lives,
  onOpen,
  onOpenLive,
  onCreate,
  onClose,
}: {
  groups: StoryGroup[];
  lives: FockisStoryLiveStream[];
  onOpen: (group: StoryGroup) => void;
  onOpenLive: (id: string) => void;
  onCreate?: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useHideBottomNav(true);
  const unseen = groups.filter((g) => !g.isOwn && g.hasUnseen);
  const rest = groups.filter((g) => g.isOwn || !g.hasUnseen);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const tile = (group: StoryGroup) => {
    const latest = group.stories[group.stories.length - 1];
    const cover = latest ? storyMediaCandidates(latest)[0] || "" : "";
    return (
      <li key={group.key}>
        <button type="button" className={`fk-sbx__tile${group.hasUnseen && !group.isOwn ? " is-unseen" : ""}`} onClick={() => onOpen(group)}>
          <span className="fk-sbx__media">
            {cover ? latest?.type === "video" ? <video src={cover} muted playsInline preload="metadata" /> : <img src={cover} alt="" loading="lazy" /> : null}
          </span>
          <span className="fk-sbx__who">
            <span className="fk-sbx__avatar">{group.avatar ? <img src={mediaUrl(group.avatar)} alt="" /> : initialOf(group.username)}</span>
            <span>
              <strong>{group.isOwn ? "Your story" : group.username}</strong>
              <small>
                {formatAge(latest?.createdAt)}
                {group.stories.length > 1 ? ` · ${group.stories.length} updates` : ""}
              </small>
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="fk-sbx" role="dialog" aria-modal="true" aria-labelledby="fk-sbx-title">
      <div className="fk-sbx__panel">
        <header className="fk-sbx__head">
          <h2 id="fk-sbx-title">Stories</h2>
          {onCreate && (
            <button type="button" className="fk-sbx__create" onClick={onCreate}>
              <Plus size={16} /> Create
            </button>
          )}
          <button ref={closeRef} type="button" className="fk-sbx__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="fk-sbx__body">
          {lives.length > 0 && (
            <>
              <h3>Live now</h3>
              <ul className="fk-sbx__grid">
                {lives.map((stream) => (
                  <li key={stream.id}>
                    <button type="button" className="fk-sbx__tile is-live" onClick={() => onOpenLive(stream.id)}>
                      <span className="fk-sbx__media">
                        {stream.thumbnailUrl || stream.thumbnail ? <img src={stream.thumbnailUrl || stream.thumbnail} alt="" loading="lazy" /> : null}
                        <span className="fk-sbx__live">Live · {formatViewers(stream.viewers)}</span>
                      </span>
                      <span className="fk-sbx__who">
                        <span className="fk-sbx__avatar">{initialOf(stream.displayName || stream.username)}</span>
                        <span>
                          <strong>{stream.displayName || stream.username || "Fockis live"}</strong>
                          {stream.title && <small>{stream.title}</small>}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {unseen.length > 0 && (
            <>
              <h3>New</h3>
              <ul className="fk-sbx__grid">{unseen.map(tile)}</ul>
            </>
          )}
          {rest.length > 0 && (
            <>
              <h3>{unseen.length ? "Seen" : "All stories"}</h3>
              <ul className="fk-sbx__grid">{rest.map(tile)}</ul>
            </>
          )}
          {groups.length === 0 && lives.length === 0 && <p className="fk-sbx__empty">No stories right now.</p>}
        </div>
      </div>
    </div>
  );
}
