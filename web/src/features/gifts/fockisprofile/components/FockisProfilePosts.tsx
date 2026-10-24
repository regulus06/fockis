/* ============================================================================
   FOCKIS PROFILE POSTS
============================================================================ */

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Clapperboard,
  Images,
  MessageCircle,
  Play,
  Repeat2,
  Sparkles,
} from "lucide-react";

import FockisRichText from "../../../../components/fockis/FockisRichText";

import type {
  FockisProfilePost,
} from "../types/fockisprofiletypes";

import "../../../../styles/FockisProfilePosts.scss";

/* ============================================================================
   PROPS
============================================================================ */

interface Props {
  posts: FockisProfilePost[];

  /** "feed" = post cards, "photos" / "videos" = media grid. */
  layout?: "feed" | "photos" | "videos";

  /** Profile owner shown in each card header. */
  author?: {
    name: string;
    username?: string;
    avatar?: string;
  };

  /** Copy for the empty state. */
  emptyTitle?: string;
  emptyBody?: string;

  /** Media grid only: show at most this many tiles (e.g. a sidebar preview). */
  limit?: number;
}

/* ============================================================================
   SAFE COMMENT COUNT
============================================================================ */

function getCommentCount(
  value: unknown,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return 1;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

/* ============================================================================
   MEDIA TYPE DETECTION

   The backend only stores a single media URL per post (no separate
   "type" field for image vs video), so we detect it from the file
   extension.
============================================================================ */

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".ogg",
  ".ogv",
];

function isVideoUrl(
  url: string,
): boolean {
  const cleanUrl =
    url
      .split("?")[0]
      .split("#")[0]
      .toLowerCase();

  return VIDEO_EXTENSIONS.some(
    (extension) =>
      cleanUrl.endsWith(extension),
  );
}

/* ============================================================================
   ICON: CLOSE
============================================================================ */

function IconClose({
  size = 26,
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

/* ============================================================================
   FULL-SCREEN POST REEL
============================================================================ */

interface ReelProps {
  posts: FockisProfilePost[];
  startIndex: number;
  onClose: () => void;
}

function FockisProfilePostReel({
  posts,
  startIndex,
  onClose,
}: ReelProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /* --------------------------------------------------------------------------
     LOCK BODY SCROLL + ESCAPE
  -------------------------------------------------------------------------- */

  useEffect(() => {
    document.body.style.overflow =
      "hidden";

    const handler = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handler,
    );

    return () => {
      document.body.style.overflow =
        "";

      window.removeEventListener(
        "keydown",
        handler,
      );
    };
  }, [onClose]);

  /* --------------------------------------------------------------------------
     SCROLL TO SELECTED POST
  -------------------------------------------------------------------------- */

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const slide =
      container.children[
        startIndex
      ] as HTMLElement | undefined;

    slide?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, [startIndex]);

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <div
      className="fk-profile-reel fk-social-scope fk-social-scope--always-dark"
      role="dialog"
      aria-modal="true"
      aria-label="Post viewer"
    >
      <button
        type="button"
        className="fk-profile-reel__close"
        onClick={onClose}
        aria-label="Close"
      >
        <IconClose />
      </button>

      <div
        ref={containerRef}
        className="fk-profile-reel__scroller"
      >
        {posts.map(
          (post, index) => {
            const commentCount =
              getCommentCount(
                post.comments,
              );

            return (
              <div
                key={
                  post.id ?? index
                }
                className="fk-profile-reel__slide"
              >
                <div className="fk-profile-reel__media">
                  {post.images &&
                  post.images.length >
                    0 ? (
                    isVideoUrl(
                      post.images[0],
                    ) ? (
                      <video
                        src={
                          post.images[0]
                        }
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="fk-profile-reel__video"
                      />
                    ) : (
                      <img
                        src={
                          post.images[0]
                        }
                        alt="Post media"
                        className="fk-profile-reel__image"
                      />
                    )
                  ) : (
                    <div className="fk-profile-reel__text-only">
                      <p>
                        {post.content}
                      </p>
                    </div>
                  )}
                </div>

                <div className="fk-profile-reel__overlay">
                  {post.images &&
                    post.images.length >
                      0 &&
                    post.content && (
                      <p className="fk-profile-reel__caption">
                        {post.content}
                      </p>
                    )}

                  <div className="fk-profile-reel__stats">
                    <span>
                      <Sparkles size={15} aria-hidden="true" /> {post.likes ?? 0}
                    </span>

                    <span>
                      <MessageCircle size={15} aria-hidden="true" /> {commentCount}
                    </span>

                    <span>
                      <Repeat2 size={15} aria-hidden="true" /> {post.shares ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   HELPERS
============================================================================ */

function formatRelative(value?: string): string {
  if (!value) return "";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function initialOf(name?: string): string {
  return (name || "F").trim().charAt(0).toUpperCase() || "F";
}

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

export default function FockisProfilePosts({
  posts,
  layout = "feed",
  author,
  emptyTitle = "No posts yet",
  emptyBody = "Posts shared here will show up on this profile.",
  limit,
}: Props) {
  const [reelIndex, setReelIndex] = useState<number | null>(null);

  /* Aspect ratio of each single-media post, keyed by media URL. */
  const [ratios, setRatios] = useState<Record<string, number>>({});

  const recordRatio = (key: string, width: number, height: number) => {
    if (!width || !height) return;
    setRatios((previous) => (previous[key] ? previous : { ...previous, [key]: width / height }));
  };

  /* ------------------------------------------------------------ MEDIA GRID */

  if (layout === "photos" || layout === "videos") {
    const wantVideo = layout === "videos";
    const tiles: { url: string; postIndex: number; key: string }[] = [];

    posts.forEach((post, postIndex) => {
      (post.images || []).forEach((url, imageIndex) => {
        if (isVideoUrl(url) === wantVideo) {
          tiles.push({ url, postIndex, key: `${post.id}-${imageIndex}` });
        }
      });
    });

    const visibleTiles = typeof limit === "number" ? tiles.slice(0, limit) : tiles;

    if (tiles.length === 0) {
      return (
        <div className="fk-profile-posts__empty">
          <span className="fk-profile-posts__empty-icon" aria-hidden="true">
            {wantVideo ? <Clapperboard size={26} /> : <Images size={26} />}
          </span>
          <strong>{wantVideo ? "No Waves yet" : "No photos yet"}</strong>
          <p>
            {wantVideo
              ? "Video posts from this profile will appear here."
              : "Photos from this profile's posts will appear here."}
          </p>
        </div>
      );
    }

    return (
      <section className="fk-profile-media-grid" aria-label={wantVideo ? "Waves" : "Photos"}>
        {visibleTiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className={`fk-profile-media-grid__tile${wantVideo ? " is-video" : ""}`}
            onClick={() => setReelIndex(tile.postIndex)}
            aria-label={wantVideo ? "Play video" : "Open photo"}
          >
            {wantVideo ? (
              <>
                <video src={tile.url} muted playsInline preload="metadata" />
                <span className="fk-profile-media-grid__play" aria-hidden="true">
                  <Play size={18} fill="currentColor" />
                </span>
              </>
            ) : (
              <img src={tile.url} alt="" loading="lazy" decoding="async" />
            )}
          </button>
        ))}

        {reelIndex !== null && (
          <FockisProfilePostReel
            posts={posts}
            startIndex={reelIndex}
            onClose={() => setReelIndex(null)}
          />
        )}
      </section>
    );
  }

  /* ----------------------------------------------------------------- EMPTY */

  if (!posts || posts.length === 0) {
    return (
      <div className="fk-profile-posts__empty">
        <span className="fk-profile-posts__empty-icon" aria-hidden="true">
          <Sparkles size={26} />
        </span>
        <strong>{emptyTitle}</strong>
        <p>{emptyBody}</p>
      </div>
    );
  }

  /* ----------------------------------------------------------------- FEED */

  return (
    <section className="fk-profile-posts">
      {posts.map((post, postIndex) => {
        const commentCount = getCommentCount(post.comments);
        const images = post.images || [];
        const shown = images.slice(0, 5);
        const extra = images.length - shown.length;
        const time = formatRelative(post.createdAt);

        return (
          <article key={post.id} className="fk-profile-post">
            {author && (
              <header className="fk-profile-post__header">
                <span className="fk-profile-post__avatar" aria-hidden="true">
                  {author.avatar ? <img src={author.avatar} alt="" /> : initialOf(author.name)}
                </span>
                <span className="fk-profile-post__author">
                  <strong>{author.name}</strong>
                  {time && (
                    <time dateTime={post.createdAt} title={post.createdAt ? new Date(post.createdAt).toLocaleString() : undefined}>
                      {time}
                    </time>
                  )}
                </span>
              </header>
            )}

            {post.content && (
              <p className="fk-profile-post__content">
                <FockisRichText text={post.content} />
              </p>
            )}

            {shown.length > 0 && (
              <div className="fk-profile-post__images" data-count={shown.length}>
                {shown.map((image, imageIndex) => {
                  const isSingle = shown.length === 1;
                  const measuredRatio = isSingle ? ratios[image] : undefined;
                  const video = isVideoUrl(image);

                  return (
                    <button
                      key={image}
                      type="button"
                      className="fk-profile-post__media-tile"
                      data-orientation={
                        measuredRatio ? (measuredRatio < 0.9 ? "portrait" : "landscape") : undefined
                      }
                      onClick={() => setReelIndex(postIndex)}
                      aria-label={video ? "Play video" : "Open image"}
                    >
                      {video ? (
                        <>
                          <video
                            src={image}
                            muted
                            playsInline
                            preload="metadata"
                            className="fk-profile-post__media"
                            onLoadedMetadata={(event) =>
                              recordRatio(image, event.currentTarget.videoWidth, event.currentTarget.videoHeight)
                            }
                          />
                          <span className="fk-profile-media-grid__play" aria-hidden="true">
                            <Play size={18} fill="currentColor" />
                          </span>
                        </>
                      ) : (
                        <img
                          src={image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="fk-profile-post__media"
                          onLoad={(event) =>
                            recordRatio(image, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
                          }
                        />
                      )}

                      {extra > 0 && imageIndex === shown.length - 1 && (
                        <span className="fk-profile-post__more" aria-hidden="true">
                          +{extra}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <footer className="fk-profile-post__footer" aria-label="Engagement">
              <span title="Reactions">
                <Sparkles size={15} aria-hidden="true" />
                {post.likes ?? post.likesCount ?? 0}
              </span>
              <span title="Comments">
                <MessageCircle size={15} aria-hidden="true" />
                {commentCount}
              </span>
              <span title="Shares">
                <Repeat2 size={15} aria-hidden="true" />
                {post.shares ?? post.sharesCount ?? 0}
              </span>
            </footer>
          </article>
        );
      })}

      {reelIndex !== null && (
        <FockisProfilePostReel
          posts={posts}
          startIndex={reelIndex}
          onClose={() => setReelIndex(null)}
        />
      )}
    </section>
  );
}
