/* ============================================================================
   FOCKIS PROFILE POSTS
============================================================================ */

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  FockisProfilePost,
} from "../types/fockisprofiletypes";

import "../../../styles/FockisProfilePosts.scss";

/* ============================================================================
   PROPS
============================================================================ */

interface Props {
  posts: FockisProfilePost[];
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
    <div className="fk-profile-reel">
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
                      ❤️ {post.likes}
                    </span>

                    <span>
                      💬 {commentCount}
                    </span>

                    <span>
                      ↗ {post.shares}
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
   MAIN COMPONENT
============================================================================ */

export default function FockisProfilePosts({
  posts,
}: Props) {
  const [
    reelIndex,
    setReelIndex,
  ] = useState<number | null>(
    null,
  );

  /*
   * Aspect ratio of each single-media post,
   * keyed by media URL.
   */
  const [
    ratios,
    setRatios,
  ] = useState<
    Record<string, number>
  >({});

  /* --------------------------------------------------------------------------
     RECORD MEDIA RATIO
  -------------------------------------------------------------------------- */

  const recordRatio = (
    key: string,
    width: number,
    height: number,
  ) => {
    if (!width || !height) {
      return;
    }

    setRatios((previous) => {
      if (previous[key]) {
        return previous;
      }

      return {
        ...previous,
        [key]: width / height,
      };
    });
  };

  /* --------------------------------------------------------------------------
     EMPTY STATE
  -------------------------------------------------------------------------- */

  if (
    !posts ||
    posts.length === 0
  ) {
    return (
      <div className="fk-profile-posts__empty">
        No posts yet.
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     POSTS
  -------------------------------------------------------------------------- */

  return (
    <section className="fk-profile-posts">
      {posts.map(
        (post, postIndex) => {
          const commentCount =
            getCommentCount(
              post.comments,
            );

          return (
            <article
              key={post.id}
              className="fk-profile-post"
            >
              {/* ------------------------------------------------------------
                  POST CONTENT
              ------------------------------------------------------------ */}

              <p className="fk-profile-post__content">
                {post.content}
              </p>

              {/* ------------------------------------------------------------
                  POST MEDIA
              ------------------------------------------------------------ */}

              {post.images &&
                post.images.length >
                  0 && (
                  <div
                    className={
                      post.images
                        .length === 1
                        ? "fk-profile-post__images fk-profile-post__images--single"
                        : "fk-profile-post__images"
                    }
                  >
                    {post.images.map(
                      (image) => {
                        const isSingle =
                          post.images!
                            .length === 1;

                        const measuredRatio =
                          isSingle
                            ? ratios[
                                image
                              ]
                            : undefined;

                        return (
                          <button
                            key={image}
                            type="button"
                            className="fk-profile-post__media-tile"
                            style={
                              measuredRatio
                                ? {
                                    aspectRatio:
                                      String(
                                        measuredRatio,
                                      ),
                                  }
                                : undefined
                            }
                            onClick={() =>
                              setReelIndex(
                                postIndex,
                              )
                            }
                          >
                            {isVideoUrl(
                              image,
                            ) ? (
                              <video
                                src={
                                  image
                                }
                                muted
                                playsInline
                                preload="metadata"
                                className="fk-profile-post__media"
                                onLoadedMetadata={(
                                  event,
                                ) => {
                                  const video =
                                    event.currentTarget;

                                  recordRatio(
                                    image,
                                    video.videoWidth,
                                    video.videoHeight,
                                  );
                                }}
                              />
                            ) : (
                              <img
                                src={
                                  image
                                }
                                alt="Post media"
                                className="fk-profile-post__media"
                                onLoad={(
                                  event,
                                ) => {
                                  const img =
                                    event.currentTarget;

                                  recordRatio(
                                    image,
                                    img.naturalWidth,
                                    img.naturalHeight,
                                  );
                                }}
                              />
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>
                )}

              {/* ------------------------------------------------------------
                  POST FOOTER
              ------------------------------------------------------------ */}

              <div className="fk-profile-post__footer">
                <span>
                  ❤️ {post.likes}
                </span>

                <span>
                  💬 {commentCount}
                </span>

                <span>
                  ↗ {post.shares}
                </span>
              </div>
            </article>
          );
        },
      )}

      {/* --------------------------------------------------------------------
          FULL-SCREEN REEL
      -------------------------------------------------------------------- */}

      {reelIndex !== null && (
        <FockisProfilePostReel
          posts={posts}
          startIndex={reelIndex}
          onClose={() =>
            setReelIndex(null)
          }
        />
      )}
    </section>
  );
}