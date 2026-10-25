import {

  type CSSProperties,

  type ChangeEvent,

  type SyntheticEvent,

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";



import { Link } from "react-router-dom";



import {

  ChevronDown,

  ChevronUp,

  LoaderCircle,

  Maximize2,

  Pause,

  Play,

  Volume2,

  VolumeX,

  X,

} from "lucide-react";



import {

  buildMediaList,

  type FockisPost,

  type FockisPostInteraction,

} from "../../components/fockis/FockisPostCard";



import {

  IconComment,

  IconRepost,

  IconSave,

  IconSaveFilled,

  IconShare,

  IconSpark,

  IconSparkFilled,

} from "../../components/fockis/FockisIcons";



import FockisRichText from "../../components/fockis/FockisRichText";



import { fockisFollowApi } from "../../features/gifts/fockisprofile/service/fockisFollowApi";



import { getUserId } from "../../utils/auth";

import VideoEndAd from "../../features/marketing/components/VideoEndAd";

import {

  getNextVideoAd,

  trackVideoAdEvent,

  type VideoOverlayAd,

} from "../../features/marketing/services/videoAdsApi";

import type { DeliveredFeedAd } from "../../features/marketing/types/marketingTypes";



/* ============================================================================

   TYPES

\============================================================================ */



interface VideoReelProps {

  posts: FockisPost[];

  startPostId: string;

  getInteraction: (postId: string) => FockisPostInteraction;

  onReact: (postId: string) => void;

  onRepost: (postId: string) => void;

  onSave: (postId: string) => void;

  onShare: (postId: string) => void;

  onClose: () => void;

  /**

   * Opens comments for a Wave. When provided, the reel closes and the feed

   * opens that post's comment thread. When omitted the reel just closes.

   */

  onComment?: (postId: string) => void;

}



type FollowState = "unknown" | "loading" | "following" | "not-following" | "self";



/* ============================================================================

   HELPERS

\============================================================================ */



function formatTime(value: number) {

  if (!Number.isFinite(value) || value < 0) return "0:00";

  const totalSeconds = Math.floor(value);

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;

}



function formatCount(value: number): string {

  const count = Math.max(0, Number(value || 0));

  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;

  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;

  return String(count);

}



/* ============================================================================

   WAVES PLAYER

\============================================================================ */



export default function FockisVideoReel({

  posts,

  startPostId,

  getInteraction,

  onReact,

  onRepost,

  onSave,

  onShare,

  onClose,

  onComment,

}: VideoReelProps) {

  const videoPosts = useMemo(

    () => posts.filter((post) => buildMediaList(post).some((item) => item.type === "video")),

    [posts],

  );



  const startIndex = Math.max(

    0,

    videoPosts.findIndex((post) => post.id === startPostId),

  );



  const containerRef = useRef<HTMLDivElement | null>(null);

  const closeRef = useRef<HTMLButtonElement | null>(null);



  const [activeIndex, setActiveIndex] = useState(startIndex);

  const [muted, setMuted] = useState(true);

  const [playing, setPlaying] = useState(true);

  const [buffering, setBuffering] = useState(true);

  const [progress, setProgress] = useState(0);

  const [duration, setDuration] = useState(0);

  const [expandedCaption, setExpandedCaption] = useState(false);

  const [follow, setFollow] = useState<Record<string, FollowState>>({});

  const [videoEndAd, setVideoEndAd] = useState<VideoOverlayAd | null>(null);

  const [videoEndAdLoading, setVideoEndAdLoading] = useState(false);

  const videoEndAdRequestedRef = useRef<Set<string>>(new Set());



  const currentUserId = String(getUserId() || "");



  /* ------------------------------------------------------------------ setup */



  useEffect(() => {

    setActiveIndex(startIndex);

  }, [startIndex]);



  useEffect(() => {

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    // Existing behaviour: hides the Fockis bottom navigation while open.

    document.body.classList.add("fk-reel-open");

    closeRef.current?.focus();



    return () => {

      document.body.style.overflow = previousOverflow;

      document.body.classList.remove("fk-reel-open");

    };

  }, []);



  const getVideos = useCallback((): HTMLVideoElement[] => {

    const container = containerRef.current;

    if (!container) return [];

    return Array.from(container.querySelectorAll<HTMLVideoElement>("video.fk-video-reel__video"));

  }, []);



  const scrollToIndex = useCallback((index: number, smooth = true) => {

    const container = containerRef.current;

    const slide = container?.children[index] as HTMLElement | undefined;

    slide?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });

  }, []);



  useEffect(() => {

    scrollToIndex(startIndex, false);

  }, [scrollToIndex, startIndex]);



  /* ----------------------------------------------- active slide detection */



  useEffect(() => {

    const container = containerRef.current;

    if (!container) return;



    const slides = Array.from(container.querySelectorAll<HTMLElement>(".fk-video-reel__slide"));

    if (!slides.length) return;



    const observer = new IntersectionObserver(

      (entries) => {

        let bestIndex = -1;

        let bestRatio = 0;



        entries.forEach((entry) => {

          const index = slides.indexOf(entry.target as HTMLElement);

          if (index !== -1 && entry.isIntersecting && entry.intersectionRatio > bestRatio) {

            bestIndex = index;

            bestRatio = entry.intersectionRatio;

          }

        });



        if (bestIndex !== -1 && bestRatio >= 0.6) {

          setActiveIndex((current) => (current === bestIndex ? current : bestIndex));

        }

      },

      { root: container, threshold: [0.6, 0.85] },

    );



    slides.forEach((slide) => observer.observe(slide));

    return () => observer.disconnect();

  }, [videoPosts.length]);



  /* --------------------------------------------------- play active only */



  useEffect(() => {

    setExpandedCaption(false);

    setBuffering(true);



    getVideos().forEach((video, index) => {

      if (index === activeIndex) {

        video.muted = muted;

        void video.play().then(

          () => setPlaying(true),

          () => setPlaying(false),

        );

      } else {

        video.pause();

      }

    });



    const video = getVideos()[activeIndex];

    if (video) {

      setProgress(video.currentTime || 0);

      setDuration(Number.isFinite(video.duration) ? video.duration : 0);

    }

    // `muted` is intentionally excluded: toggling sound must not restart playback.

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [activeIndex, getVideos]);



  /* ----------------------------------------- follow status for creator */



  const activePost = videoPosts[activeIndex];

  const activeOwnerId = activePost?.userId ? String(activePost.userId) : "";



  useEffect(() => {

    if (!activeOwnerId || follow[activeOwnerId]) return;



    if (currentUserId && activeOwnerId === currentUserId) {

      setFollow((previous) => ({ ...previous, [activeOwnerId]: "self" }));

      return;

    }



    let cancelled = false;

    setFollow((previous) => ({ ...previous, [activeOwnerId]: "loading" }));



    fockisFollowApi

      .getStatus(activeOwnerId)

      .then((status) => {

        if (cancelled) return;

        setFollow((previous) => ({

          ...previous,

          [activeOwnerId]: status?.isFollowing ? "following" : "not-following",

        }));

      })

      .catch(() => {

        if (cancelled) return;

        // Hide the button rather than guessing.

        setFollow((previous) => ({ ...previous, [activeOwnerId]: "unknown" }));

      });



    return () => {

      cancelled = true;

    };

  }, [activeOwnerId, currentUserId, follow]);



  async function handleFollow(ownerId: string) {

    if (!ownerId || follow[ownerId] !== "not-following") return;

    setFollow((previous) => ({ ...previous, [ownerId]: "loading" }));

    try {

      await fockisFollowApi.follow(ownerId);

      setFollow((previous) => ({ ...previous, [ownerId]: "following" }));

    } catch {

      setFollow((previous) => ({ ...previous, [ownerId]: "not-following" }));

    }

  }



  /* -------------------------------------------------------- controls */



  const handleClose = useCallback(() => {

    getVideos().forEach((video) => {

      video.pause();

      video.currentTime = 0;

    });

    onClose();

  }, [getVideos, onClose]);



  function togglePlayback(index: number) {

    const video = getVideos()[index];

    if (!video) return;



    if (video.paused) {

      void video.play().then(

        () => index === activeIndex && setPlaying(true),

        () => index === activeIndex && setPlaying(false),

      );

    } else {

      video.pause();

      if (index === activeIndex) setPlaying(false);

    }

  }



  function toggleAudio() {

    const nextMuted = !muted;

    setMuted(nextMuted);

    const video = getVideos()[activeIndex];

    if (!video) return;

    video.muted = nextMuted;

    if (!nextMuted) {

      void video.play().catch(() => undefined);

    }

  }



  async function toggleFullscreen(index: number) {

    const video = getVideos()[index];

    if (!video) return;

    try {

      if (document.fullscreenElement) {

        await document.exitFullscreen();

        return;

      }

      if (video.requestFullscreen) {

        await video.requestFullscreen();

        return;

      }

      (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();

    } catch {

      // Fullscreen can be blocked by the browser/device.

    }

  }



  function seekVideo(index: number, event: ChangeEvent<HTMLInputElement>) {

    const video = getVideos()[index];

    if (!video) return;

    const nextTime = Number(event.target.value);

    video.currentTime = nextTime;

    setProgress(nextTime);

  }



  const goTo = useCallback(

    (direction: -1 | 1) => {

      const target = Math.min(videoPosts.length - 1, Math.max(0, activeIndex + direction));

      if (target !== activeIndex) scrollToIndex(target);

    },

    [activeIndex, scrollToIndex, videoPosts.length],

  );

  const handleVideoEnded = useCallback(
    async (postId: string) => {
      if (videoEndAdRequestedRef.current.has(postId)) return;

      videoEndAdRequestedRef.current.add(postId);
      setPlaying(false);
      setVideoEndAdLoading(true);

      try {
        const ad = await getNextVideoAd(postId);

        if (ad) {
          setVideoEndAd(ad);
          void trackVideoAdEvent(ad.id, "IMPRESSION", postId);
        } else {
          goTo(1);
        }
      } catch (error) {
        console.error("[FOCKIS REEL ADS] Failed to load video-end ad:", error);
        goTo(1);
      } finally {
        setVideoEndAdLoading(false);
      }
    },
    [goTo],
  );




  useEffect(() => {

    const handler = (event: KeyboardEvent) => {

      const target = event.target as HTMLElement | null;

      if (target?.tagName === "INPUT") return;



      if (event.key === "Escape") handleClose();

      else if (event.key === "ArrowDown" || event.key === "j") {

        event.preventDefault();

        goTo(1);

      } else if (event.key === "ArrowUp" || event.key === "k") {

        event.preventDefault();

        goTo(-1);

      } else if (event.key === " ") {

        event.preventDefault();

        togglePlayback(activeIndex);

      } else if (event.key === "m") {

        toggleAudio();

      }

    };



    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [activeIndex, goTo, handleClose]);



  function handleTimeUpdate(index: number, event: SyntheticEvent<HTMLVideoElement>) {

    if (index !== activeIndex) return;

    const video = event.currentTarget;

    setProgress(video.currentTime);

    setDuration(Number.isFinite(video.duration) ? video.duration : 0);

  }



  function handleComment(postId: string) {

    if (onComment) {

      getVideos().forEach((video) => video.pause());

      onComment(postId);

      return;

    }

    handleClose();

  }



  if (videoPosts.length === 0) {

    return null;

  }



  /* -------------------------------------------------------------- render */



  return (

    <div

      className="fk-video-reel fk-social-scope fk-social-scope--always-dark"

      role="dialog"

      aria-modal="true"

      aria-label="Waves"

    >

      <header className="fk-video-reel__topbar">

        <div className="fk-video-reel__brand">

          <span className="fk-video-reel__brand-mark" aria-hidden="true" />

          <strong>Waves</strong>

          <span className="fk-video-reel__position" aria-live="polite">

            {activeIndex + 1} / {videoPosts.length}

          </span>

        </div>



        <button

          ref={closeRef}

          type="button"

          className="fk-video-reel__close"

          onClick={handleClose}

          aria-label="Close Waves"

        >

          <X size={22} />

        </button>

      </header>



      <div className="fk-video-reel__stepper" aria-hidden="false">

        <button

          type="button"

          className="fk-video-reel__step"

          onClick={() => goTo(-1)}

          disabled={activeIndex === 0}

          aria-label="Previous Wave"

        >

          <ChevronUp size={22} />

        </button>

        <button

          type="button"

          className="fk-video-reel__step"

          onClick={() => goTo(1)}

          disabled={activeIndex >= videoPosts.length - 1}

          aria-label="Next Wave"

        >

          <ChevronDown size={22} />

        </button>

      </div>



      <div ref={containerRef} className="fk-video-reel__scroller">

        {videoPosts.map((post, index) => {

          const media = buildMediaList(post).find((item) => item.type === "video");

          if (!media) return null;



          const interaction = getInteraction(post.id);

          const isActive = index === activeIndex;

          const nearActive = Math.abs(index - activeIndex) <= 1;

          const ownerId = post.userId ? String(post.userId) : "";

          const followState = ownerId ? follow[ownerId] : undefined;

          const progressPercent = isActive && duration > 0 ? (progress / duration) * 100 : 0;



          return (

            <section

              key={post.id}

              className={`fk-video-reel__slide${isActive ? " is-active" : ""}`}

              aria-label={`Wave by ${post.user || "Fockis creator"}`}

            >

              <div className="fk-video-reel__canvas">

                <video

                  src={media.url}
                  playsInline

                  muted={muted}

                  preload={nearActive ? "auto" : "metadata"}

                  className="fk-video-reel__video"

                  onPlay={() => isActive && setPlaying(true)}

                  onPause={() => isActive && setPlaying(false)}

                  onWaiting={() => isActive && setBuffering(true)}

                  onPlaying={() => isActive && setBuffering(false)}

                  onCanPlay={() => isActive && setBuffering(false)}

                  onTimeUpdate={(event) => handleTimeUpdate(index, event)}

                  onLoadedMetadata={(event) => {

                    if (isActive) {

                      const value = event.currentTarget.duration;

                      setDuration(Number.isFinite(value) ? value : 0);

                    }

                  }}
                  onEnded={() => {
                    if (!isActive) return;
                    void handleVideoEnded(post.id);
                  }}
                  onClick={() => togglePlayback(index)}

                />



                {isActive && videoEndAdLoading && (

                  <div className="fk-video-end-ad__loading" role="status">

                    Loading sponsored content…

                  </div>

                )}



                {isActive && videoEndAd && (

                  <div className="fk-video-reel__end-ad-shell">

                    <VideoEndAd

                      ad={{

                        id: videoEndAd.id,

                        campaignId: videoEndAd.id,

                        type: "VIDEO",

                        placement: "FEED_VIDEO_END",

                        destinationType: videoEndAd.destinationType === "URL" ? "WEBSITE" : videoEndAd.destinationType as DeliveredFeedAd["destinationType"],

                        headline: videoEndAd.headline,

                        description: videoEndAd.description || undefined,

                        mediaUrl: videoEndAd.mediaUrl || undefined,

                        thumbnailUrl: videoEndAd.thumbnailUrl || undefined,

                        destinationUrl: videoEndAd.destinationUrl || undefined,

                        callToAction: videoEndAd.callToAction || "Learn More",

                        advertiser: {

                          id: videoEndAd.id,

                          name: videoEndAd.name || "Sponsored",

                        },

                      } satisfies DeliveredFeedAd}

                      onImpression={() => {

                        // Impression is tracked once when the ad is loaded.

                      }}

                      onClick={() => {

                        void trackVideoAdEvent(videoEndAd.id, "CLICK", post.id);

                      }}

                    />

                    <button

                      type="button"

                      className="fk-video-reel__end-ad-continue"

                      onClick={() => {

                        void trackVideoAdEvent(videoEndAd.id, "CLOSE", post.id);

                        setVideoEndAd(null);

                        goTo(1);

                      }}

                    >

                      Continue to next Wave

                    </button>

                    <button

                      type="button"

                      className="fk-video-reel__end-ad-dismiss"

                      onClick={() => {

                        void trackVideoAdEvent(videoEndAd.id, "SKIP", post.id);

                        setVideoEndAd(null);

                      }}

                    >

                      Dismiss ad

                    </button>

                  </div>

                )}



                {isActive && buffering && (

                  <span className="fk-video-reel__buffering" aria-hidden="true">

                    <LoaderCircle size={34} />

                  </span>

                )}



                {isActive && !playing && !buffering && !videoEndAd && !videoEndAdLoading && (

                  <button

                    type="button"

                    className="fk-video-reel__big-play"
                  onClick={() => togglePlayback(index)}

                    aria-label="Play Wave"

                  >

                    <Play size={34} fill="currentColor" />

                  </button>

                )}



                {/* Creator + caption */}

                <div className="fk-video-reel__info">

                  <div className="fk-video-reel__creator">

                    {ownerId ? (

                      <Link

                        to={`/profile/${ownerId}`}

                        className="fk-video-reel__avatar"

                        onClick={handleClose}

                        aria-label={`View ${post.user || "creator"}'s profile`}

                      >

                        {post.userPhoto ? (

                          <img src={post.userPhoto} alt="" />

                        ) : (

                          (post.user || "F").charAt(0).toUpperCase()

                        )}

                      </Link>

                    ) : (

                      <span className="fk-video-reel__avatar">

                        {(post.user || "F").charAt(0).toUpperCase()}

                      </span>

                    )}



                    <strong className="fk-video-reel__name">{post.user || "Fockis creator"}</strong>



                    {followState === "not-following" && (

                      <button

                        type="button"

                        className="fk-video-reel__follow"

                        onClick={() => void handleFollow(ownerId)}

                      >

                        Follow

                      </button>

                    )}

                    {followState === "loading" && isActive && (

                      <span className="fk-video-reel__follow is-muted">…</span>

                    )}

                    {followState === "following" && (

                      <span className="fk-video-reel__follow is-following">Following</span>

                    )}

                  </div>



                  {post.content && (

                    <p

                      className={`fk-video-reel__caption${

                        isActive && expandedCaption ? " is-expanded" : ""

                      }`}

                    >

                      <FockisRichText text={post.content} />

                    </p>

                  )}



                  {post.content && post.content.length > 90 && (

                    <button

                      type="button"

                      className="fk-video-reel__more"

                      onClick={() => setExpandedCaption((value) => !value)}

                    >

                      {isActive && expandedCaption ? "Less" : "More"}

                    </button>

                  )}

                </div>



                {/* Playback controls */}

                <div className="fk-video-reel__controls">

                  <button

                    type="button"

                    className="fk-video-reel__control"
                  onClick={() => togglePlayback(index)}

                    aria-label={isActive && playing ? "Pause" : "Play"}

                  >

                    {isActive && playing ? <Pause size={18} /> : <Play size={18} />}

                  </button>



                  <button

                    type="button"

                    className="fk-video-reel__control"

                    onClick={toggleAudio}

                    aria-label={muted ? "Turn sound on" : "Mute"}

                    aria-pressed={!muted}

                  >

                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}

                  </button>



                  <div className="fk-video-reel__progress">

                    <input

                      type="range"

                      min="0"

                      max={isActive ? duration || 0 : 0}

                      step="0.1"

                      value={isActive ? Math.min(progress, duration || 0) : 0}

                      onChange={(event) => seekVideo(index, event)}

                      aria-label="Seek"

                      aria-valuetext={`${formatTime(isActive ? progress : 0)} of ${formatTime(isActive ? duration : 0)}`}

                      disabled={!isActive || !duration}

                      style={{ "--fill": `${progressPercent}%` } as CSSProperties}

                    />

                    <span className="fk-video-reel__time">

                      {formatTime(isActive ? progress : 0)} / {formatTime(isActive ? duration : 0)}

                    </span>

                  </div>



                  <button

                    type="button"

                    className="fk-video-reel__control"

                    onClick={() => void toggleFullscreen(index)}

                    aria-label="Fullscreen"

                  >

                    <Maximize2 size={17} />

                  </button>

                </div>

              </div>



              {/* Engagement rail */}

              <div className="fk-video-reel__actions" role="group" aria-label="Wave actions">

                <button

                  type="button"

                  className={`fk-video-reel__action fk-video-reel__action--like${interaction.reacted ? " is-active" : ""}`}

                  onClick={() => onReact(post.id)}

                  aria-label={interaction.reacted ? "Unlike" : "Like"}

                  aria-pressed={interaction.reacted}

                >

                  <span className="fk-video-reel__action-icon">

                    {interaction.reacted ? <IconSparkFilled size={22} /> : <IconSpark size={22} />}

                  </span>

                  <span>{formatCount(post.likes)}</span>

                </button>



                <button

                  type="button"

                  className="fk-video-reel__action"

                  onClick={() => handleComment(post.id)}

                  aria-label={`Comments (${post.comments.length})`}

                >

                  <span className="fk-video-reel__action-icon">

                    <IconComment size={22} />

                  </span>

                  <span>{formatCount(post.comments.length)}</span>

                </button>



                <button

                  type="button"

                  className={`fk-video-reel__action fk-video-reel__action--repost${interaction.reposted ? " is-active" : ""}`}

                  onClick={() => onRepost(post.id)}

                  aria-label={interaction.reposted ? "Undo repost" : "Repost"}

                  aria-pressed={interaction.reposted}

                >

                  <span className="fk-video-reel__action-icon">

                    <IconRepost size={22} />

                  </span>

                  <span>{formatCount(post.reposts)}</span>

                </button>



                <button

                  type="button"

                  className="fk-video-reel__action"

                  onClick={() => onShare(post.id)}

                  aria-label="Share"

                >

                  <span className="fk-video-reel__action-icon">

                    <IconShare size={22} />

                  </span>

                  <span>{formatCount(post.shares)}</span>

                </button>



                <button

                  type="button"

                  className={`fk-video-reel__action fk-video-reel__action--save${interaction.saved ? " is-active" : ""}`}

                  onClick={() => onSave(post.id)}

                  aria-label={interaction.saved ? "Remove from saved" : "Save"}

                  aria-pressed={interaction.saved}

                >

                  <span className="fk-video-reel__action-icon">

                    {interaction.saved ? <IconSaveFilled size={22} /> : <IconSave size={22} />}

                  </span>

                  <span>{interaction.saved ? "Saved" : "Save"}</span>

                </button>

              </div>

            </section>

          );

        })}

      </div>

    </div>

  );

}
