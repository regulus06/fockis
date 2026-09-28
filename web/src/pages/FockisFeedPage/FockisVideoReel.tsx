import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  buildMediaList,
  IconHeart,
  IconComment,
  IconShare,
  IconBookmark,
  IconX,
  type FockisPost,
  type FockisPostInteraction,
} from "../../components/fockis/FockisPostCard";

import { IconRepost } from "../../components/fockis/FockisIcons";

interface VideoReelProps {
  posts: FockisPost[];
  startPostId: string;
  getInteraction: (
    postId: string,
  ) => FockisPostInteraction;
  onReact: (postId: string) => void;
  onRepost: (postId: string) => void;
  onSave: (postId: string) => void;
  onShare: (postId: string) => void;
  onClose: () => void;
}

export default function FockisVideoReel({
  posts,
  startPostId,
  getInteraction,
  onReact,
  onRepost,
  onSave,
  onShare,
  onClose,
}: VideoReelProps) {
  const videoPosts = useMemo(
    () =>
      posts.filter((post) =>
        buildMediaList(post).some(
          (item) =>
            item.type === "video",
        ),
      ),
    [posts],
  );

  const startIndex = Math.max(
    0,
    videoPosts.findIndex(
      (post) =>
        post.id === startPostId,
    ),
  );

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(startIndex);

  useEffect(() => {
    setActiveIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

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
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handler,
      );
    };
  }, [onClose]);

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

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const slides = Array.from(
      container.querySelectorAll(
        ".fk-video-reel__slide",
      ),
    ) as HTMLElement[];

    if (slides.length === 0) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          let bestIndex =
            activeIndex;

          let bestRatio = 0;

          entries.forEach((entry) => {
            const index =
              slides.indexOf(
                entry.target as HTMLElement,
              );

            if (
              index !== -1 &&
              entry.isIntersecting &&
              entry.intersectionRatio >
                bestRatio
            ) {
              bestIndex = index;
              bestRatio =
                entry.intersectionRatio;
            }
          });

          if (
            bestIndex !== activeIndex
          ) {
            setActiveIndex(
              bestIndex,
            );
          }
        },
        {
          root: container,
          threshold: [
            0.25,
            0.5,
            0.75,
            0.9,
          ],
        },
      );

    slides.forEach((slide) =>
      observer.observe(slide),
    );

    return () => {
      observer.disconnect();
    };
  }, [activeIndex]);

  /*
   * Only the active reel video is allowed
   * to play.
   *
   * Every other video is explicitly paused.
   */
  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const videos = Array.from(
      container.querySelectorAll("video"),
    ) as HTMLVideoElement[];

    videos.forEach((video, index) => {
      if (index === activeIndex) {
        void video.play().catch(() => {
          /*
           * Browser autoplay policy may require
           * the user to press play.
           */
        });
      } else {
        video.pause();
      }
    });
  }, [activeIndex]);

  function handleClose() {
    const container =
      containerRef.current;

    if (container) {
      const videos =
        container.querySelectorAll(
          "video",
        );

      videos.forEach((video) => {
        video.pause();
        video.currentTime = 0;
      });
    }

    onClose();
  }

  if (videoPosts.length === 0) {
    return null;
  }

  return (
    <div className="fk-video-reel">
      <button
        type="button"
        className="fk-video-reel__close"
        onClick={handleClose}
        aria-label="Close"
      >
        <IconX />
      </button>

      <div
        ref={containerRef}
        className="fk-video-reel__scroller"
      >
        {videoPosts.map((post, index) => {
          const media =
            buildMediaList(post).find(
              (item) =>
                item.type === "video",
            );

          if (!media) {
            return null;
          }

          const interaction =
            getInteraction(post.id);

          const isActive =
            index === activeIndex;

          return (
            <div
              key={post.id}
              className="fk-video-reel__slide"
            >
              <div className="fk-video-reel__media">
                <video
                  src={media.url}
                  controls
                  autoPlay={isActive}
                  loop
                  playsInline
                  muted
                  preload={
                    isActive
                      ? "auto"
                      : "metadata"
                  }
                  className="fk-video-reel__video"
                  onPlay={(event) => {
                    const current =
                      event.currentTarget;

                    const container =
                      containerRef.current;

                    if (!container) {
                      return;
                    }

                    const videos =
                      container.querySelectorAll(
                        "video",
                      );

                    videos.forEach(
                      (video) => {
                        if (
                          video !== current
                        ) {
                          video.pause();
                        }
                      },
                    );
                  }}
                />
              </div>

              <div className="fk-video-reel__header">
                <strong>
                  {post.user}
                </strong>
              </div>

              <div className="fk-video-reel__overlay">
                {post.content && (
                  <p className="fk-video-reel__caption">
                    {post.content}
                  </p>
                )}
              </div>

              <div className="fk-video-reel__actions">
                <button
                  type="button"
                  className={
                    interaction.reacted
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    onReact(post.id)
                  }
                  aria-label="Like"
                >
                  <IconHeart
                    filled={
                      interaction.reacted
                    }
                  />

                  <span>
                    {post.likes}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Comments"
                >
                  <IconComment />

                  <span>
                    {
                      post.comments
                        .length
                    }
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onRepost(post.id)
                  }
                  aria-label="Repost"
                >
                  <IconRepost />

                  <span>
                    {post.reposts}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onShare(post.id)
                  }
                  aria-label="Share"
                >
                  <IconShare />

                  <span>
                    {post.shares}
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    interaction.saved
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    onSave(post.id)
                  }
                  aria-label={
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}