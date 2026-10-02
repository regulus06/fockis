import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { Link } from "react-router-dom";

import FockisPostHeader from "./FockisPostHeader";
import FockisPostActions from "./FockisPostActions";
import { IconRepost } from "./FockisIcons";

import GiftModal from "../../features/gifts/components/GiftModal";
import GiftSendersModal from "../../features/gifts/components/GiftSendersModal";
import { useGifts } from "../../features/gifts/hooks/useGifts";

import {
  giftsApi,
  type Gift,
  type PostGiftSender,
} from "../../features/gifts/services/giftsApi";

import { getUserId } from "../../utils/auth";
import { API_URL, buildMediaUrl, normalizeComments } from "../../utils/fockisFeedHelpers";

/* ============================================================================
   CONSTANTS
============================================================================ */

const CAPTION_TRUNCATE_LENGTH = 220;

/**
 * Number of seconds a video must actually play
 * before the sponsored advertisement appears.
 */
const VIDEO_AD_TRIGGER_SECONDS = 5;

/**
 * How far into the clip (in seconds) to seek before
 * capturing a preview frame. Frame 0 is very often
 * solid black/blank, so we nudge forward slightly.
 */
const THUMBNAIL_CAPTURE_SEEK_SECONDS = 0.15;

const commentProfilePhotoCache = new Map<string, string>();

function getStoredProfilePhoto(): string {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const user = JSON.parse(raw);
    const photo =
      user?.avatar ||
      user?.userPhoto ||
      user?.photo ||
      user?.profilePhoto ||
      user?.profilePicture ||
      user?.profileImage ||
      "";
    return typeof photo === "string" ? buildMediaUrl(photo) : "";
  } catch {
    return "";
  }
}

function getCommentPhoto(comment: FockisPostComment): string {
  if (comment.userPhoto) return buildMediaUrl(comment.userPhoto);
  const cached = commentProfilePhotoCache.get(String(comment.userId || ""));
  if (cached) return cached;
  const currentId = String(getUserId() || "");
  if (comment.userId && currentId && String(comment.userId) === currentId) {
    return getStoredProfilePhoto();
  }
  return "";
}

/* ============================================================================
   TYPES
============================================================================ */

export type FockisPostType =
  | "image"
  | "video"
  | "none";

export interface FockisPostMediaItem {
  url: string;
  type: FockisPostType;
}

export interface FockisPostComment {
  userId: string;
  username: string;
  userPhoto?: string;
  content: string;
  createdAt?: string;
}

export interface FockisPost {
  id: string;

  user: string;

  userId?: string;

  userPhoto?: string;

  content: string;

  media?: string;

  mediaItems?: FockisPostMediaItem[];

  type: FockisPostType;

  createdAt?: string;

  likes: number;

  reposts: number;

  shares: number;

  views: number;

  giftsCount?: number;

  likedBy: string[];

  repostedBy: string[];

  viewedBy: string[];

  comments: FockisPostComment[];

  score?: number;
}

export interface FockisPostInteraction {
  reacted: boolean;
  reposted: boolean;
  saved: boolean;
  menuOpen: boolean;
}

export interface FockisPostCardProps {
  post: FockisPost;

  interaction: FockisPostInteraction;

  canDelete: boolean;

  onReact: () => void;

  onRepost: () => void;

  onSave: () => void;

  onMenu: () => void;

  onDelete: () => void;

  onEditPost?: (content: string) => Promise<void>;

  onComment?: () => void;

  onSubmitComment?: (
    content: string,
  ) => Promise<void>;

  onShare?: () => void;

  onView?: () => void | Promise<void>;

  onCopyLink?: () => void;

  onShareMenu?: () => void;

  onShareToFockis?: () => void;

  onShareFacebook?: () => void;

  onShareWhatsApp?: () => void;

  onShareX?: () => void;

  onOpenMedia?: (
    index: number,
  ) => void;

  openCommentsToken?: number;
}

/* ============================================================================
   COMMENT TIME FORMATTER
   ============================================================================ */

function formatCommentTime(createdAt?: string): string {
  if (!createdAt) {
    return "";
  }

  const timestamp = new Date(createdAt).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const elapsedSeconds = Math.floor(
    (Date.now() - timestamp) / 1000,
  );

  if (elapsedSeconds < 10) {
    return "Just now";
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  const elapsedMinutes = Math.floor(
    elapsedSeconds / 60,
  );

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.floor(
    elapsedMinutes / 60,
  );

  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  const elapsedDays = Math.floor(
    elapsedHours / 24,
  );

  if (elapsedDays < 7) {
    return `${elapsedDays}d`;
  }

  return new Date(createdAt).toLocaleDateString();
}

/* ============================================================================
   SAFE MEDIA
   ============================================================================ */

/* ============================================================================
   SAFE MEDIA
============================================================================ */

function isValidMediaUrl(
  value?: string,
): boolean {
  if (!value) {
    return false;
  }

  const media = value.trim();

  if (
    media === "" ||
    media === "undefined" ||
    media === "null"
  ) {
    return false;
  }

  if (
    media.includes(
      "/uploads/undefined",
    )
  ) {
    return false;
  }

  if (
    media.includes(
      "/uploads/null",
    )
  ) {
    return false;
  }

  return true;
}

/* ============================================================================
   BUILD MEDIA LIST
============================================================================ */

export function buildMediaList(
  post: FockisPost,
): FockisPostMediaItem[] {
  if (
    Array.isArray(post.mediaItems) &&
    post.mediaItems.length > 0
  ) {
    return post.mediaItems.filter(
      (item) =>
        Boolean(item) &&
        isValidMediaUrl(item.url),
    );
  }

  if (
    isValidMediaUrl(post.media)
  ) {
    return [
      {
        url: post.media as string,
        type: post.type,
      },
    ];
  }

  return [];
}

/* ============================================================================
   FILE EXTENSION HELPERS
============================================================================ */

function getImageExtension(
  url: string,
  mimeType?: string,
): string {
  const cleanUrl =
    url
      .split("?")[0]
      .split("#")[0]
      .toLowerCase();

  if (
    cleanUrl.endsWith(".png")
  ) {
    return "png";
  }

  if (
    cleanUrl.endsWith(".webp")
  ) {
    return "webp";
  }

  if (
    cleanUrl.endsWith(".gif")
  ) {
    return "gif";
  }

  if (
    cleanUrl.endsWith(".avif")
  ) {
    return "avif";
  }

  if (
    mimeType === "image/png"
  ) {
    return "png";
  }

  if (
    mimeType === "image/webp"
  ) {
    return "webp";
  }

  if (
    mimeType === "image/gif"
  ) {
    return "gif";
  }

  return "jpg";
}

function getVideoExtension(
  url: string,
  mimeType?: string,
): string {
  const cleanUrl =
    url
      .split("?")[0]
      .split("#")[0]
      .toLowerCase();

  if (
    cleanUrl.endsWith(".webm")
  ) {
    return "webm";
  }

  if (
    cleanUrl.endsWith(".mov")
  ) {
    return "mov";
  }

  if (
    cleanUrl.endsWith(".m4v")
  ) {
    return "m4v";
  }

  if (
    cleanUrl.endsWith(".ogg")
  ) {
    return "ogg";
  }

  if (
    cleanUrl.endsWith(".ogv")
  ) {
    return "ogv";
  }

  if (
    mimeType === "video/webm"
  ) {
    return "webm";
  }

  if (
    mimeType === "video/quicktime"
  ) {
    return "mov";
  }

  return "mp4";
}

/* ============================================================================
   DOWNLOAD MEDIA
============================================================================ */

async function downloadMedia(
  url: string,
  type: FockisPostType,
  postId: string,
  index: number,
): Promise<void> {
  if (!url) {
    return;
  }

  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status}`,
      );
    }

    const blob =
      await response.blob();

    const blobUrl =
      URL.createObjectURL(blob);

    const extension =
      type === "video"
        ? getVideoExtension(
            url,
            blob.type,
          )
        : getImageExtension(
            url,
            blob.type,
          );

    const link =
      document.createElement("a");

    link.href = blobUrl;

    link.download =
      `fockis-${postId}-${index + 1}.${extension}`;

    document.body.appendChild(
      link,
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      blobUrl,
    );
  } catch (error) {
    console.error(
      "[FockisPostCard] Media download failed:",
      error,
    );

    window.open(
      url,
      "_blank",
      "noopener,noreferrer",
    );
  }
}

/* ============================================================================
   INLINE ICONS
============================================================================ */

export function IconHeart({
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
      fill={
        filled
          ? "currentColor"
          : "none"
      }
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

export function IconComment({
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
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}

export function IconShare({
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
      <circle
        cx="18"
        cy="5"
        r="3"
      />

      <circle
        cx="6"
        cy="12"
        r="3"
      />

      <circle
        cx="18"
        cy="19"
        r="3"
      />

      <line
        x1="8.59"
        y1="13.51"
        x2="15.42"
        y2="17.49"
      />

      <line
        x1="15.41"
        y1="6.51"
        x2="8.59"
        y2="10.49"
      />
    </svg>
  );
}

export function IconBookmark({
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
      fill={
        filled
          ? "currentColor"
          : "none"
      }
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

function IconDownload({
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line
        x1="12"
        y1="15"
        x2="12"
        y2="3"
      />
    </svg>
  );
}

export function IconX({
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
      <line
        x1="18"
        y1="6"
        x2="6"
        y2="18"
      />

      <line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
      />
    </svg>
  );
}

function IconUser({
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
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function IconSend({
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
      <line
        x1="22"
        y1="2"
        x2="11"
        y2="13"
      />

      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconExternalLink({
  size = 18,
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
      <path d="M14 3h7v7" />
      <path d="M10 14L21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

/* ============================================================================
   VIDEO THUMBNAIL (mobile preview fix)

   Mobile browsers frequently do NOT paint a video's first frame just
   because `preload="metadata"` is set — some data-saver modes refuse to
   fetch any bytes at all until the element is interacted with. That's
   why the feed grid showed a blank tile until tapped.

   This component loads the video off-screen, seeks a fraction of a
   second in (frame 0 is often solid black), grabs that frame onto a
   canvas, and uses the resulting image as a real `poster` — so the
   preview renders immediately, with no tap required.

   NOTE: capturing a frame via canvas requires the video response to
   include CORS headers (Access-Control-Allow-Origin) from wherever
   it's hosted, since we set `crossOrigin="anonymous"`. If your media
   host doesn't send that header, this silently falls back to showing
   the plain (posterless) video, which is exactly today's behavior.
============================================================================ */

interface FockisVideoThumbnailProps {
  src: string;
}

function FockisVideoThumbnail({
  src,
}: FockisVideoThumbnailProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const [
    posterUrl,
    setPosterUrl,
  ] = useState<string | undefined>(
    undefined,
  );

  const capturedRef =
    useRef(false);

  useEffect(() => {
    capturedRef.current = false;
    setPosterUrl(undefined);
  }, [src]);

  useEffect(() => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    function captureFrame() {
      if (
        !video ||
        capturedRef.current
      ) {
        return;
      }

      const width =
        video.videoWidth;

      const height =
        video.videoHeight;

      if (!width || !height) {
        return;
      }

      try {
        const canvas =
          document.createElement(
            "canvas",
          );

        canvas.width = width;
        canvas.height = height;

        const ctx =
          canvas.getContext(
            "2d",
          );

        if (!ctx) {
          return;
        }

        ctx.drawImage(
          video,
          0,
          0,
          width,
          height,
        );

        const dataUrl =
          canvas.toDataURL(
            "image/jpeg",
            0.7,
          );

        capturedRef.current = true;

        setPosterUrl(dataUrl);
      } catch (error) {
        /*
         * Most likely a cross-origin "tainted canvas"
         * error because the media host doesn't send
         * CORS headers. Nothing we can do client-side
         * in that case — the video will render without
         * a poster, same as before this fix.
         */
        console.warn(
          "[FockisVideoThumbnail] Could not capture preview frame:",
          error,
        );
      }
    }

    function handleLoadedMetadata() {
      if (!video) {
        return;
      }

      const seekTo =
        Math.min(
          THUMBNAIL_CAPTURE_SEEK_SECONDS,
          Math.max(
            video.duration -
              0.05,
            0,
          ) || 0,
        );

      try {
        video.currentTime =
          seekTo;
      } catch {
        // Some browsers throw if the video isn't
        // seekable yet; the "seeked"/"loadeddata"
        // listeners below still cover us.
      }
    }

    function handleSeekedOrLoadedData() {
      captureFrame();
    }

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata,
    );

    video.addEventListener(
      "seeked",
      handleSeekedOrLoadedData,
    );

    video.addEventListener(
      "loadeddata",
      handleSeekedOrLoadedData,
    );

    return () => {
      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata,
      );

      video.removeEventListener(
        "seeked",
        handleSeekedOrLoadedData,
      );

      video.removeEventListener(
        "loadeddata",
        handleSeekedOrLoadedData,
      );
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={posterUrl}
      muted
      playsInline
      preload="auto"
      crossOrigin="anonymous"
      className="fk-post__media-preview"
    />
  );
}

/* ============================================================================
   VIDEO AD
============================================================================ */

interface FockisVideoAdProps {
  onClose: () => void;
}

function FockisVideoAd({
  onClose,
}: FockisVideoAdProps) {
  return (
    <aside
      className="fk-video-ad"
      aria-label="Sponsored advertisement"
    >
      <div className="fk-video-ad__top">
        <div className="fk-video-ad__label">
          Sponsored
        </div>

        <button
          type="button"
          className="fk-video-ad__close"
          onClick={onClose}
          aria-label="Close advertisement"
          title="Close advertisement"
        >
          <IconX size={16} />
        </button>
      </div>

      <div className="fk-video-ad__content">
        <div className="fk-video-ad__logo">
          F
        </div>

        <div className="fk-video-ad__text">
          <strong>
            Fockis
          </strong>

          <span>
            Discover products, creators, and
            opportunities on Fockis.
          </span>
        </div>

        <button
          type="button"
          className="fk-video-ad__button"
          onClick={() => {
            console.log(
              "[Fockis Ad] Advertisement clicked.",
            );
          }}
        >
          Learn More

          <IconExternalLink
            size={15}
          />
        </button>
      </div>
    </aside>
  );
}

/* ============================================================================
   MEDIA VIEWER
============================================================================ */

interface FockisMediaViewerProps {
  mediaItems: FockisPostMediaItem[];

  initialIndex: number;

  onClose: () => void;

  postId: string;

  interaction: FockisPostInteraction;

  likesCount: number;

  repostsCount: number;

  commentsCount: number;

  sharesCount: number;

  onReact: () => void;

  onRepost: () => void;

  onSave: () => void;

  onComment: () => void;

  onShare?: () => void;

  onGift?: () => void;
}

function FockisMediaViewer({
  mediaItems,
  initialIndex,
  onClose,
  postId,
  interaction,
  likesCount,
  repostsCount,
  commentsCount,
  sharesCount,
  onReact,
  onRepost,
  onSave,
  onComment,
  onShare,
  onGift,
}: FockisMediaViewerProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const videoRefs =
    useRef<
      Map<number, HTMLVideoElement>
    >(
      new Map(),
    );

  const [
    muted,
    setMuted,
  ] = useState(true);

  const [
    adVisibleForIndex,
    setAdVisibleForIndex,
  ] = useState<number | null>(
    null,
  );

  const adTriggeredRef =
    useRef<Set<number>>(
      new Set(),
    );

  /* --------------------------------------------------------------------------
     LOCK PAGE SCROLL + ESCAPE
  -------------------------------------------------------------------------- */

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handler = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handler,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handler,
      );
    };
  }, [onClose]);

  /* --------------------------------------------------------------------------
     SCROLL TO INITIAL MEDIA
  -------------------------------------------------------------------------- */

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const slide =
      container.children[
        initialIndex
      ] as HTMLElement | undefined;

    slide?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, [initialIndex]);

  /* --------------------------------------------------------------------------
     VIDEO AD TRIGGER
  -------------------------------------------------------------------------- */

  const handleVideoTimeUpdate = (
    index: number,
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    const video =
      event.currentTarget;

    if (
      video.currentTime >=
        VIDEO_AD_TRIGGER_SECONDS &&
      !adTriggeredRef.current.has(
        index,
      )
    ) {
      adTriggeredRef.current.add(
        index,
      );

      setAdVisibleForIndex(
        index,
      );
    }
  };

  /* --------------------------------------------------------------------------
     VIDEO MUTE
  -------------------------------------------------------------------------- */

  const toggleVideo = (
    index: number,
  ) => {
    const video =
      videoRefs.current.get(
        index,
      );

    if (!video) {
      return;
    }

    const nextMuted =
      !video.muted;

    video.muted =
      nextMuted;

    setMuted(
      nextMuted,
    );
  };

  const closeVideoAd =
    () => {
      setAdVisibleForIndex(
        null,
      );
    };

  if (
    mediaItems.length === 0
  ) {
    return null;
  }

  return (
    <div className="fk-media-viewer">
      <button
        type="button"
        className="fk-media-viewer__close"
        onClick={onClose}
        aria-label="Close media viewer"
        title="Close media viewer"
      >
        <IconX />
      </button>

      <div
        ref={containerRef}
        className="fk-media-viewer__reel"
      >
        {mediaItems.map(
          (
            item,
            index,
          ) => (
            <div
              key={`${item.url}-${index}`}
              className="fk-media-viewer__slide"
            >
              {item.type ===
              "video" ? (
                <video
                  ref={(element) => {
                    if (element) {
                      videoRefs.current.set(
                        index,
                        element,
                      );
                    } else {
                      videoRefs.current.delete(
                        index,
                      );
                    }
                  }}
                  src={item.url}
                  muted={muted}
                  loop
                  playsInline
                  autoPlay
                  controls
                  className="fk-media-viewer__video"
                  onTimeUpdate={(event) =>
                    handleVideoTimeUpdate(
                      index,
                      event,
                    )
                  }
                  onClick={() =>
                    toggleVideo(
                      index,
                    )
                  }
                />
              ) : (
                <img
                  src={item.url}
                  alt="Post media"
                  className="fk-media-viewer__image"
                />
              )}

              {item.type ===
                "video" &&
                adVisibleForIndex ===
                  index && (
                  <FockisVideoAd
                    onClose={
                      closeVideoAd
                    }
                  />
                )}

              <div className="fk-media-viewer__actions">
                <button
                  type="button"
                  onClick={onReact}
                  className={
                    interaction.reacted
                      ? "is-active"
                      : ""
                  }
                  aria-label={
                    interaction.reacted
                      ? "Unlike"
                      : "Like"
                  }
                  title={
                    interaction.reacted
                      ? "Unlike"
                      : "Like"
                  }
                >
                  <IconHeart
                    filled={
                      interaction.reacted
                    }
                  />

                  <span>
                    {likesCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onComment}
                  aria-label="Comments"
                  title="Comments"
                >
                  <IconComment />

                  <span>
                    {commentsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onRepost}
                  aria-label="Repost"
                  title="Repost"
                >
                  <IconRepost />

                  <span>
                    {repostsCount}
                  </span>
                </button>

                {onGift && (
                  <button
                    type="button"
                    onClick={onGift}
                    aria-label="Send gift"
                    title="Send gift"
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: 24,
                        lineHeight: 1,
                      }}
                    >
                      🎁
                    </span>
                  </button>
                )}

                {onShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    aria-label="Share"
                    title="Share"
                  >
                    <IconShare />

                    <span>
                      {sharesCount}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onSave}
                  aria-label={
                    interaction.saved
                      ? "Remove from saved"
                      : "Save"
                  }
                  title={
                    interaction.saved
                      ? "Remove from saved"
                      : "Save"
                  }
                >
                  <IconBookmark
                    filled={
                      interaction.saved
                    }
                  />
                </button>

                <button
                  type="button"
                  className="fk-media-viewer__download"
                  onClick={() =>
                    void downloadMedia(
                      item.url,
                      item.type,
                      postId,
                      index,
                    )
                  }
                  aria-label={
                    item.type ===
                    "video"
                      ? "Download video"
                      : "Download image"
                  }
                  title={
                    item.type ===
                    "video"
                      ? "Download video"
                      : "Download image"
                  }
                >
                  <IconDownload />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   POST CARD
============================================================================ */

export default function FockisPostCard({
  post,
  interaction,
  canDelete,
  onReact,
  onRepost,
  onSave,
  onMenu,
  onDelete,
  onEditPost,
  onComment,
  onSubmitComment,
  onShare,
  onCopyLink,
  onShareMenu,
  onShareToFockis,
  onShareFacebook,
  onShareWhatsApp,
  onShareX,
  onOpenMedia,
  openCommentsToken,
}: FockisPostCardProps) {

  const [resolvedCommentPhotos, setResolvedCommentPhotos] = useState<Record<string, string>>({});

  const [localComments, setLocalComments] =
    useState<FockisPostComment[]>(
      post.comments || [],
    );

  const [editingCommentIndex, setEditingCommentIndex] =
    useState<number | null>(null);

  const [editingCommentText, setEditingCommentText] =
    useState("");

  const [commentActionLoading, setCommentActionLoading] =
    useState(false);

  const [editingPost, setEditingPost] =
    useState(false);

  const [editingPostText, setEditingPostText] =
    useState(post.content || "");

  const [postEditLoading, setPostEditLoading] =
    useState(false);

  useEffect(() => {
    if (!editingPost) {
      setEditingPostText(post.content || "");
    }
  }, [post.content, editingPost]);


  useEffect(() => {
    setLocalComments(
      post.comments || [],
    );
  }, [post.comments]);

  useEffect(() => {
    let cancelled = false;

    const currentId = String(getUserId() || "");
    const storedPhoto = getStoredProfilePhoto();
    if (currentId && storedPhoto) {
      commentProfilePhotoCache.set(currentId, storedPhoto);
    }

    const idsToFetch = Array.from(
      new Set(
        (post.comments || [])
          .filter((comment) => !comment.userPhoto && comment.userId)
          .map((comment) => String(comment.userId)),
      ),
    ).filter((id) => id && id !== currentId && !commentProfilePhotoCache.has(id));

    if (!idsToFetch.length) return;

    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "";

    void Promise.all(
      idsToFetch.map(async (id) => {
        try {
          const response = await fetch(`${API_URL}/users/${encodeURIComponent(id)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!response.ok) return;
          const data = await response.json();
          const user = data?.user || data?.data?.user || data?.data || data;
          const rawPhoto =
            user?.avatar ||
            user?.userPhoto ||
            user?.photo ||
            user?.profilePhoto ||
            user?.profilePicture ||
            user?.profileImage ||
            "";
          if (typeof rawPhoto === "string" && rawPhoto.trim()) {
            const photo = buildMediaUrl(rawPhoto);
            commentProfilePhotoCache.set(id, photo);
            if (!cancelled) {
              setResolvedCommentPhotos((previous) => ({ ...previous, [id]: photo }));
            }
          }
        } catch {
          // Keep the fallback icon if the profile cannot be loaded.
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [post.comments]);
  /* ==========================================================================
     COMMENTS
  ========================================================================== */

  const [
    commentsOpen,
    setCommentsOpen,
  ] = useState(false);

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    submittingComment,
    setSubmittingComment,
  ] = useState(false);

  const commentsRef =
    useRef<HTMLElement | null>(
      null,
    );

  const commentInputRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );

  /* ==========================================================================
     MEDIA VIEWER
  ========================================================================== */

  const [
    viewerOpen,
    setViewerOpen,
  ] = useState(false);

  const [
    viewerIndex,
    setViewerIndex,
  ] = useState(0);

  /* ==========================================================================
     CAPTION
  ========================================================================== */

  const [
    captionExpanded,
    setCaptionExpanded,
  ] = useState(false);

  /* ==========================================================================
     GIFTS
  ========================================================================== */

  const [
    giftModalOpen,
    setGiftModalOpen,
  ] = useState(false);

  const [
    selectedGift,
    setSelectedGift,
  ] = useState<Gift | null>(
    null,
  );

  const [
    sendingGift,
    setSendingGift,
  ] = useState(false);

  const [
    postGiftsCount,
    setPostGiftsCount,
  ] = useState(
    post.giftsCount ?? 0,
  );

  const [
    giftSendersOpen,
    setGiftSendersOpen,
  ] = useState(false);

  const [
    giftSenders,
    setGiftSenders,
  ] = useState<PostGiftSender[]>(
    [],
  );

  const [
    giftSendersLoading,
    setGiftSendersLoading,
  ] = useState(false);

  const {
    gifts,
  } = useGifts();


  /* ==========================================================================
     EDIT POST
  ========================================================================== */

  const startEditPost = () => {
    setEditingPostText(post.content || "");
    setEditingPost(true);
  };

  const cancelEditPost = () => {
    setEditingPostText(post.content || "");
    setEditingPost(false);
  };

  const saveEditedPost = async () => {
    const text = editingPostText.trim();

    if (!text || !onEditPost || postEditLoading) {
      return;
    }

    try {
      setPostEditLoading(true);
      await onEditPost(text);
      setEditingPost(false);
    } catch (error) {
      console.error(
        "[FockisPostCard] Failed to edit post:",
        error,
      );
    } finally {
      setPostEditLoading(false);
    }
  };

  /* ==========================================================================
     DERIVED MEDIA / CAPTION
  ========================================================================== */

  const mediaItems =
    buildMediaList(post);

  const captionIsLong =
    post.content.length >
    CAPTION_TRUNCATE_LENGTH;

  const displayedCaption =
    captionIsLong &&
    !captionExpanded
      ? `${post.content
          .slice(
            0,
            CAPTION_TRUNCATE_LENGTH,
          )
          .trimEnd()}…`
      : post.content;

  /* ==========================================================================
     SYNC GIFT COUNT
  ========================================================================== */

  useEffect(() => {
    setPostGiftsCount(
      post.giftsCount ?? 0,
    );
  }, [
    post.giftsCount,
  ]);

  /* ==========================================================================
     OPEN COMMENTS TOKEN
  ========================================================================== */

  useEffect(() => {
    if (
      openCommentsToken !==
      undefined
    ) {
      setCommentsOpen(true);
    }
  }, [
    openCommentsToken,
  ]);

  /* ==========================================================================
     SCROLL TO COMMENTS
  ========================================================================== */

  useEffect(() => {
    if (!commentsOpen) {
      return;
    }

    commentsRef.current?.scrollIntoView(
      {
        behavior: "smooth",
        block: "start",
      },
    );
  }, [
    commentsOpen,
  ]);

  /* ==========================================================================
     OPEN GIFT MODAL
  ========================================================================== */

  const openGiftModal =
    () => {
      if (!post.userId) {
        console.warn(
          "[FockisPostCard] Cannot send gift: post has no owner ID.",
        );

        return;
      }

      const senderId =
        getUserId();

      if (!senderId) {
        console.warn(
          "[FockisPostCard] Cannot send gift: user is not logged in.",
        );

        return;
      }

      if (
        String(senderId) ===
        String(post.userId)
      ) {
        console.warn(
          "[FockisPostCard] Cannot gift yourself.",
        );

        return;
      }

      setSelectedGift(null);
      setGiftModalOpen(true);
    };

  /* ==========================================================================
     CLOSE GIFT MODAL
  ========================================================================== */

  const closeGiftModal =
    () => {
      if (sendingGift) {
        return;
      }

      setGiftModalOpen(false);
      setSelectedGift(null);
    };

  /* ==========================================================================
     OPEN GIFT SENDERS
  ========================================================================== */

  const openGiftSendersModal =
    async (): Promise<void> => {
      setGiftSendersOpen(true);
      setGiftSendersLoading(true);

      try {
        const senders =
          await giftsApi.getPostGiftSenders(
            post.id,
          );

        setGiftSenders(
          senders,
        );
      } catch (error) {
        console.error(
          "[FockisPostCard] Failed to load gift senders:",
          error,
        );

        setGiftSenders([]);
      } finally {
        setGiftSendersLoading(
          false,
        );
      }
    };

  /* ==========================================================================
     CLOSE GIFT SENDERS
  ========================================================================== */

  const closeGiftSendersModal =
    () => {
      setGiftSendersOpen(false);
    };

  /* ==========================================================================
     SEND GIFT
  ========================================================================== */

  const handleSendGift =
    async (): Promise<void> => {
      const senderId =
        getUserId();

      const receiverId =
        post.userId;

      if (!senderId) {
        console.error(
          "[FockisPostCard] Cannot send gift: no logged-in user ID.",
        );

        return;
      }

      if (!receiverId) {
        console.error(
          "[FockisPostCard] Cannot send gift: post owner ID is missing.",
        );

        return;
      }

      if (!selectedGift) {
        console.warn(
          "[FockisPostCard] Cannot send gift: no gift selected.",
        );

        return;
      }

      if (
        String(senderId) ===
        String(receiverId)
      ) {
        console.warn(
          "[FockisPostCard] Cannot gift yourself.",
        );

        return;
      }

      try {
        setSendingGift(true);

        const result =
          await giftsApi.sendGift({
            senderId:
              String(senderId),

            receiverId:
              String(receiverId),

            giftId:
              String(
                selectedGift._id,
              ),

            postId:
              String(post.id),
          });

        console.log(
          "[FockisPostCard] Post gift sent successfully:",
          result,
        );

        if (
          typeof result?.postGiftsCount ===
          "number"
        ) {
          setPostGiftsCount(
            result.postGiftsCount,
          );
        } else {
          setPostGiftsCount(
            (current) =>
              current + 1,
          );
        }

        setGiftModalOpen(false);
        setSelectedGift(null);
      } catch (error) {
        console.error(
          "[FockisPostCard] Post gift failed:",
          error,
        );
      } finally {
        setSendingGift(false);
      }
    };

  /* ==========================================================================
     MEDIA CLICK
  ========================================================================== */

  const handleMediaClick =
    (
      index: number,
    ) => {
      if (onOpenMedia) {
        onOpenMedia(index);
        return;
      }

      setViewerIndex(index);
      setViewerOpen(true);
    };

  /* ==========================================================================
     COMMENTS TOGGLE
  ========================================================================== */

  const handleComments =
    () => {
      setCommentsOpen(
        (value) => !value,
      );

      onComment?.();
    };

  /* ==========================================================================
     SUBMIT COMMENT
  ========================================================================== */

  const submitComment =
    async (): Promise<void> => {
      const text =
        commentText.trim();

      if (!text) {
        return;
      }

      if (!onSubmitComment) {
        return;
      }

      try {
        setSubmittingComment(true);

        await onSubmitComment(
          text,
        );

        setCommentText("");

        if (
          commentInputRef.current
        ) {
          commentInputRef.current.style.height =
            "auto";
        }
      } catch (error) {
        console.error(
          "[FockisPostCard] Failed to submit comment:",
          error,
        );
      } finally {
        setSubmittingComment(false);
      }
    };

  /* ==========================================================================
     EDIT COMMENT
  ========================================================================== */

  const startEditComment = (
    index: number,
  ) => {
    const comment =
      localComments[index];

    if (!comment) {
      return;
    }

    setEditingCommentIndex(
      index,
    );

    setEditingCommentText(
      comment.content,
    );
  };

  const cancelEditComment = () => {
    setEditingCommentIndex(
      null,
    );

    setEditingCommentText(
      "",
    );
  };

  const saveEditedComment =
    async () => {
      if (
        editingCommentIndex ===
        null
      ) {
        return;
      }

      const content =
        editingCommentText.trim();

      if (!content) {
        return;
      }

      const userId =
        String(
          getUserId() || "",
        );

      if (!userId) {
        return;
      }

      try {
        setCommentActionLoading(
          true,
        );

        const token =
          localStorage.getItem(
            "access_token",
          ) ||
          localStorage.getItem(
            "accessToken",
          ) ||
          localStorage.getItem(
            "token",
          ) ||
          localStorage.getItem(
            "authToken",
          ) ||
          "";

        const response =
          await fetch(
            `${API_URL}/posts/${encodeURIComponent(
              post.id,
            )}/comment/${editingCommentIndex}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },
              body: JSON.stringify({
                userId,
                content,
              }),
            },
          );

        if (!response.ok) {
          throw new Error(
            await response.text(),
          );
        }

        const result =
          await response.json();

        const rawComments =
          result?.post?.comments ||
          result?.comments ||
          [];

        const updatedComments =
          normalizeComments(
            rawComments,
          );

        setLocalComments(
          updatedComments,
        );

        cancelEditComment();
      } catch (error) {
        console.error(
          "[FockisPostCard] Failed to edit comment:",
          error,
        );

        window.alert(
          "Unable to edit comment. Please try again.",
        );
      } finally {
        setCommentActionLoading(
          false,
        );
      }
    };

  /* ==========================================================================
     DELETE COMMENT
  ========================================================================== */

  const deleteComment =
    async (
      index: number,
    ) => {
      const comment =
        localComments[index];

      if (!comment) {
        return;
      }

      const userId =
        String(
          getUserId() || "",
        );

      if (!userId) {
        return;
      }

      const confirmed =
        window.confirm(
          "Delete this comment?",
        );

      if (!confirmed) {
        return;
      }

      try {
        setCommentActionLoading(
          true,
        );

        const token =
          localStorage.getItem(
            "access_token",
          ) ||
          localStorage.getItem(
            "accessToken",
          ) ||
          localStorage.getItem(
            "token",
          ) ||
          localStorage.getItem(
            "authToken",
          ) ||
          "";

        const response =
          await fetch(
            `${API_URL}/posts/${encodeURIComponent(
              post.id,
            )}/comment/${index}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type":
                  "application/json",
                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },
              body: JSON.stringify({
                userId,
              }),
            },
          );

        if (!response.ok) {
          throw new Error(
            await response.text(),
          );
        }

        const result =
          await response.json();

        const rawComments =
          result?.post?.comments ||
          result?.comments ||
          [];

        setLocalComments(
          normalizeComments(
            rawComments,
          ),
        );

        if (
          editingCommentIndex !==
          null
        ) {
          cancelEditComment();
        }
      } catch (error) {
        console.error(
          "[FockisPostCard] Failed to delete comment:",
          error,
        );

        window.alert(
          "Unable to delete comment. Please try again.",
        );
      } finally {
        setCommentActionLoading(
          false,
        );
      }
    };

  /* ==========================================================================
     REPLY TO COMMENT
  ========================================================================== */

  const replyToComment = (
    username: string,
  ) => {
    setCommentsOpen(
      true,
    );

    setCommentText(
      `@${username} `,
    );

    window.setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  };

  /* ==========================================================================
     COMMENT INPUT
  ========================================================================== */

  const handleCommentInput =
    (
      event: ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setCommentText(
        event.target.value,
      );

      const element =
        event.target;

      element.style.height =
        "auto";

      element.style.height =
        `${Math.min(
          element.scrollHeight,
          120,
        )}px`;
    };

  /* ==========================================================================
     COMMENT KEYBOARD
  ========================================================================== */

  const handleCommentKeyDown =
    (
      event: ReactKeyboardEvent<HTMLTextAreaElement>,
    ) => {
      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        void submitComment();
      }
    };

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <article className="fk-post">
      {/* ====================================================================
          POST HEADER
      ===================================================================== */}

      <FockisPostHeader
        user={post.user}
        userId={post.userId}
        userPhoto={post.userPhoto}
        createdAt={
          post.createdAt
        }
        menuOpen={
          interaction.menuOpen
        }
        canDelete={
          canDelete
        }
        onMenu={
          onMenu
        }
        onEdit={
          () => {
            startEditPost();
          }
        }
        onDelete={
          onDelete
        }
      />

      {/* ====================================================================
          CAPTION
      ===================================================================== */}

      {editingPost ? (
        <div className="fk-post__body fk-post__edit-panel">
          <textarea
            className="fk-post__edit-input"
            value={editingPostText}
            onChange={(event) =>
              setEditingPostText(event.target.value)
            }
            autoFocus
            rows={4}
            maxLength={5000}
            disabled={postEditLoading}
            aria-label="Edit post"
          />

          <div className="fk-post__edit-actions">
            <button
              type="button"
              className="fk-post__edit-cancel"
              onClick={cancelEditPost}
              disabled={postEditLoading}
            >
              Cancel
            </button>

            <button
              type="button"
              className="fk-post__edit-save"
              onClick={() => void saveEditedPost()}
              disabled={
                postEditLoading ||
                !editingPostText.trim()
              }
            >
              {postEditLoading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <div className="fk-post__body">
            <p className="fk-post__caption">
              {displayedCaption}

              {captionIsLong && (
                <button
                  type="button"
                  className="fk-post__caption-toggle"
                  onClick={() =>
                    setCaptionExpanded(
                      (value) =>
                        !value,
                    )
                  }
                >
                  {captionExpanded
                    ? "Read less"
                    : "Read more"}
                </button>
              )}
            </p>
          </div>
        )
      )}

      {/* ====================================================================
          MEDIA GRID
      ===================================================================== */}

      {mediaItems.length >
        0 && (
        <div className="fk-post__media-grid">
          {mediaItems.map(
            (
              item,
              index,
            ) => (
              <button
                type="button"
                key={`${item.url}-${index}`}
                className="fk-post__media-tile"
                onClick={() =>
                  handleMediaClick(
                    index,
                  )
                }
                aria-label={
                  item.type ===
                  "video"
                    ? `Open video ${index + 1}`
                    : `Open image ${index + 1}`
                }
              >
                {item.type ===
                "video" ? (
                  <FockisVideoThumbnail
                    src={
                      item.url
                    }
                  />
                ) : (
                  <img
                    src={
                      item.url
                    }
                    alt=""
                    className="fk-post__media-preview"
                  />
                )}
              </button>
            ),
          )}
        </div>
      )}

      {/* ====================================================================
          POST ACTIONS
      ===================================================================== */}

      <FockisPostActions
        reacted={
          interaction.reacted
        }
        reposted={
          interaction.reposted
        }
        saved={
          interaction.saved
        }
        likesCount={
          post.likes
        }
        repostsCount={
          post.reposts
        }
        commentsCount={
          localComments.length
        }
        sharesCount={
          post.shares
        }
        giftsCount={
          postGiftsCount
        }
        onReact={
          onReact
        }
        onRepost={
          onRepost
        }
        onSave={
          onSave
        }
        onComment={
          handleComments
        }
        onShare={
          onShare
        }
        onCopyLink={
          onCopyLink
        }
        onShareMenu={
          onShareMenu
        }
        onShareToFockis={
          onShareToFockis
        }
        onShareFacebook={
          onShareFacebook
        }
        onShareWhatsApp={
          onShareWhatsApp
        }
        onShareX={
          onShareX
        }
        onGift={
          openGiftModal
        }
        onViewGiftSenders={
          openGiftSendersModal
        }
      />

      {/* ====================================================================
          COMMENTS
      ===================================================================== */}

      {commentsOpen && (
        <section
          ref={
            commentsRef
          }
          className="fk-post__comments"
        >
          <div className="fk-comment-composer">
            <div
              className="fk-comment-composer__avatar"
              aria-hidden="true"
            >
              <IconUser
                size={16}
              />
            </div>

            <div className="fk-comment-composer__field">
              <textarea
                ref={
                  commentInputRef
                }
                value={
                  commentText
                }
                onChange={
                  handleCommentInput
                }
                onKeyDown={
                  handleCommentKeyDown
                }
                placeholder="Write a comment..."
                rows={1}
                className="fk-post__comment-input"
                disabled={
                  submittingComment
                }
              />

              {commentText
                .trim()
                .length >
                0 && (
                <button
                  type="button"
                  onClick={() =>
                    void submitComment()
                  }
                  disabled={
                    submittingComment
                  }
                  aria-label="Post comment"
                  title="Post comment"
                  className="fk-post__comment-submit"
                >
                  <IconSend
                    size={15}
                  />
                </button>
              )}
            </div>
          </div>

          {localComments
            .length >
            0 && (
            <div
              className="fk-post__comment-list"
              aria-label="Comments"
            >
              {localComments.map(
                (
                  comment,
                  index,
                ) => {
                  const username =
                    comment.username?.trim() ||
                    "User";

                  const profilePhoto =
                    resolvedCommentPhotos[
                      String(
                        comment.userId || "",
                      )
                    ] ||
                    getCommentPhoto(
                      comment,
                    );

                  const currentUserId =
                    String(
                      getUserId() || "",
                    );

                  const canManageComment =
                    String(
                      comment.userId || "",
                    ) ===
                      currentUserId ||
                    String(
                      post.userId || "",
                    ) === currentUserId;

                  const isEditing =
                    editingCommentIndex ===
                    index;

                  return (
                    <div
                      key={`${comment.userId}-${comment.createdAt ?? index}`}
                      className="fk-post__comment"
                    >
                      {comment.userId ? (
                        <Link
                          to={`/profile/${comment.userId}`}
                          className="fk-post__comment-avatar"
                          aria-label={`View ${username}'s profile`}
                        >
                          {profilePhoto ? (
                            <img
                              src={profilePhoto}
                              alt={username}
                              className="fk-post__comment-avatar-image"
                              onError={(event) => {
                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <IconUser size={18} />
                          )}
                        </Link>
                      ) : (
                        <div className="fk-post__comment-avatar">
                          {profilePhoto ? (
                            <img
                              src={profilePhoto}
                              alt={username}
                              className="fk-post__comment-avatar-image"
                              onError={(event) => {
                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <IconUser size={18} />
                          )}
                        </div>
                      )}

                      <div className="fk-post__comment-body">
                        <div className="fk-post__comment-bubble">
                          {comment.userId ? (
                            <Link
                              to={`/profile/${comment.userId}`}
                              className="fk-post__comment-username-link"
                            >
                              <strong>
                                {username}
                              </strong>
                            </Link>
                          ) : (
                            <strong>
                              {username}
                            </strong>
                          )}

                          {isEditing ? (
                            <div className="fk-post__comment-edit">
                              <textarea
                                value={
                                  editingCommentText
                                }
                                onChange={(event) =>
                                  setEditingCommentText(
                                    event.target.value,
                                  )
                                }
                                rows={2}
                                autoFocus
                                disabled={
                                  commentActionLoading
                                }
                                className="fk-post__comment-edit-input"
                              />

                              <div className="fk-post__comment-edit-actions">
                                <button
                                  type="button"
                                  onClick={
                                    cancelEditComment
                                  }
                                  disabled={
                                    commentActionLoading
                                  }
                                  className="fk-post__comment-action"
                                >
                                  Cancel
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void saveEditedComment()
                                  }
                                  disabled={
                                    commentActionLoading ||
                                    !editingCommentText.trim()
                                  }
                                  className="fk-post__comment-action fk-post__comment-action--primary"
                                >
                                  {commentActionLoading
                                    ? "Saving..."
                                    : "Save"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p>
                              {
                                comment.content
                              }
                            </p>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="fk-post__comment-meta">
                            <button
                              type="button"
                              className="fk-post__comment-action"
                            >
                              Like
                            </button>

                            <button
                              type="button"
                              className="fk-post__comment-action"
                              onClick={() =>
                                replyToComment(
                                  username,
                                )
                              }
                            >
                              Reply
                            </button>

                            {comment.createdAt && (
                              <span
                                className="fk-post__comment-time"
                                title={new Date(
                                  comment.createdAt,
                                ).toLocaleString()}
                              >
                                {formatCommentTime(
                                  comment.createdAt,
                                )}
                              </span>
                            )}

                            {canManageComment && (
                              <span className="fk-post__comment-management">
                                <button
                                  type="button"
                                  className="fk-post__comment-action"
                                  onClick={() =>
                                    startEditComment(
                                      index,
                                    )
                                  }
                                  disabled={
                                    commentActionLoading
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="fk-post__comment-action fk-post__comment-action--danger"
                                  onClick={() =>
                                    void deleteComment(
                                      index,
                                    )
                                  }
                                  disabled={
                                    commentActionLoading
                                  }
                                >
                                  Delete
                                </button>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>
      )}

      {/* ====================================================================
          MEDIA VIEWER
      ===================================================================== */}

      {viewerOpen && (
        <FockisMediaViewer
          mediaItems={
            mediaItems
          }
          initialIndex={
            viewerIndex
          }
          onClose={() =>
            setViewerOpen(
              false,
            )
          }
          postId={
            post.id
          }
          interaction={
            interaction
          }
          likesCount={
            post.likes
          }
          repostsCount={
            post.reposts
          }
          commentsCount={
            localComments.length
          }
          sharesCount={
            post.shares
          }
          onReact={
            onReact
          }
          onRepost={
            onRepost
          }
          onSave={
            onSave
          }
          onComment={() => {
            setViewerOpen(
              false,
            );

            setCommentsOpen(
              true,
            );

            onComment?.();
          }}
          onShare={
            onShare
          }
          onGift={
            openGiftModal
          }
        />
      )}

      {/* ====================================================================
          POST GIFT MODAL
      ===================================================================== */}

      <GiftModal
        open={
          giftModalOpen
        }
        gifts={
          gifts ?? []
        }
        selectedGift={
          selectedGift
        }
        onClose={
          closeGiftModal
        }
        onSelect={
          setSelectedGift
        }
        onSend={
          handleSendGift
        }
        sending={
          sendingGift
        }
      />

      {/* ====================================================================
          POST GIFT SENDERS MODAL
      ===================================================================== */}

      <GiftSendersModal
        open={
          giftSendersOpen
        }
        senders={
          giftSenders
        }
        loading={
          giftSendersLoading
        }
        onClose={
          closeGiftSendersModal
        }
      />
    </article>
  );
}