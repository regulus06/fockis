import {

  type ChangeEvent,

  type SyntheticEvent,

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

  getInteraction: (postId: string) => FockisPostInteraction;

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

        buildMediaList(post).some((item) => item.type === "video"),

      ),

    [posts],

  );



  const startIndex = Math.max(

    0,

    videoPosts.findIndex((post) => post.id === startPostId),

  );



  const containerRef = useRef<HTMLDivElement | null>(null);



  const [activeIndex, setActiveIndex] = useState(startIndex);

  const [muted, setMuted] = useState(true);

  const [playing, setPlaying] = useState(true);

  const [progress, setProgress] = useState(0);

  const [duration, setDuration] = useState(0);

  const [showMore, setShowMore] = useState(false);



  useEffect(() => {

    setActiveIndex(startIndex);

  }, [startIndex]);



  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    // Lock page scrolling while the Reel is open.
    document.body.style.overflow = "hidden";

    // Hide the Fockis bottom navigation while the Reel is open.
    document.body.classList.add("fk-reel-open");

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      // Restore the previous page scrolling state.
      document.body.style.overflow = previousOverflow;

      // Show the Fockis bottom navigation again.
      document.body.classList.remove("fk-reel-open");

      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);



  useEffect(() => {

    const container = containerRef.current;

    if (!container) return;



    const slide = container.children[startIndex] as HTMLElement | undefined;



    slide?.scrollIntoView({

      behavior: "auto",

      block: "start",

    });

  }, [startIndex]);



  useEffect(() => {

    const container = containerRef.current;

    if (!container) return;



    const slides = Array.from(

      container.querySelectorAll(".fk-video-reel__slide"),

    ) as HTMLElement[];



    if (!slides.length) return;



    const observer = new IntersectionObserver(

      (entries) => {

        let bestIndex = activeIndex;

        let bestRatio = 0;



        entries.forEach((entry) => {

          const index = slides.indexOf(entry.target as HTMLElement);



          if (

            index !== -1 &&

            entry.isIntersecting &&

            entry.intersectionRatio > bestRatio

          ) {

            bestIndex = index;

            bestRatio = entry.intersectionRatio;

          }

        });



        if (bestIndex !== activeIndex) {

          setActiveIndex(bestIndex);

        }

      },

      {

        root: container,

        threshold: [0.25, 0.5, 0.75, 0.9],

      },

    );



    slides.forEach((slide) => observer.observe(slide));



    return () => observer.disconnect();

  }, [activeIndex]);



  useEffect(() => {

    const container = containerRef.current;

    if (!container) return;



    const videos = Array.from(

      container.querySelectorAll("video"),

    ) as HTMLVideoElement[];



    videos.forEach((video, index) => {

      if (index === activeIndex) {

        void video.play().catch(() => {

          setPlaying(false);

        });

      } else {

        video.pause();

      }

    });

  }, [activeIndex]);



  useEffect(() => {

    const container = containerRef.current;

    if (!container) return;



    const videos = Array.from(

      container.querySelectorAll("video"),

    ) as HTMLVideoElement[];



    const video = videos[activeIndex];

    if (!video) return;



    setPlaying(!video.paused);

    setProgress(video.currentTime || 0);

    setDuration(

      Number.isFinite(video.duration) ? video.duration : 0,

    );

  }, [activeIndex]);



  function togglePlayback(index: number) {

    const container = containerRef.current;

    if (!container) return;



    const videos = Array.from(

      container.querySelectorAll("video"),

    ) as HTMLVideoElement[];



    const video = videos[index];

    if (!video) return;



    if (video.paused) {

      void video

        .play()

        .then(() => {

          if (index === activeIndex) setPlaying(true);

        })

        .catch(() => {

          if (index === activeIndex) setPlaying(false);

        });

    } else {

      video.pause();



      if (index === activeIndex) {

        setPlaying(false);

      }

    }

  }



  function toggleAudio(index: number) {

    const container = containerRef.current;

    if (!container) return;



    const videos = Array.from(

      container.querySelectorAll("video"),

    ) as HTMLVideoElement[];



    const video = videos[index];

    if (!video) return;



    const nextMuted = !video.muted;



    video.muted = nextMuted;

    setMuted(nextMuted);



    if (!nextMuted) {

      void video.play().catch(() => {

        // Browser may require the direct tap as a user gesture.

      });

    }

  }



  async function toggleFullscreen(index: number) {

    const container = containerRef.current;

    if (!container) return;



    const videos = Array.from(

      container.querySelectorAll("video"),

    ) as HTMLVideoElement[];



    const video = videos[index];

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



      const webkitVideo = video as HTMLVideoElement & {

        webkitEnterFullscreen?: () => void;

      };



      webkitVideo.webkitEnterFullscreen?.();

    } catch {

      // Fullscreen can be blocked by the browser/device.

    }

  }



  function seekVideo(

    index: number,

    event: ChangeEvent<HTMLInputElement>,

  ) {

    const container = containerRef.current;

    if (!container) return;



    const videos = Array.from(

      container.querySelectorAll("video"),

    ) as HTMLVideoElement[];



    const video = videos[index];

    if (!video) return;



    const nextTime = Number(event.target.value);



    video.currentTime = nextTime;

    setProgress(nextTime);

  }



  function formatTime(value: number) {

    if (!Number.isFinite(value) || value < 0) {

      return "0:00";

    }



    const totalSeconds = Math.floor(value);

    const minutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;



    return `${minutes}:${seconds.toString().padStart(2, "0")}`;

  }



  function handleClose() {

    const container = containerRef.current;



    if (container) {

      const videos = container.querySelectorAll("video");



      videos.forEach((video) => {

        video.pause();

        video.currentTime = 0;

      });

    }



    onClose();

  }



  function handleTimeUpdate(

    index: number,

    event: SyntheticEvent<HTMLVideoElement>,

  ) {

    if (index !== activeIndex) return;



    const video = event.currentTarget;



    setProgress(video.currentTime);

    setDuration(

      Number.isFinite(video.duration) ? video.duration : 0,

    );

  }



  function handleMetadata(

    index: number,

    event: SyntheticEvent<HTMLVideoElement>,

  ) {

    if (index !== activeIndex) return;



    const video = event.currentTarget;



    setDuration(

      Number.isFinite(video.duration) ? video.duration : 0,

    );

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

          const media = buildMediaList(post).find(

            (item) => item.type === "video",

          );



          if (!media) return null;



          const interaction = getInteraction(post.id);

          const isActive = index === activeIndex;



          return (

            <div

              key={post.id}

              className="fk-video-reel__slide"

            >

              <div className="fk-video-reel__media">

                <video

                  src={media.url}

                  autoPlay={isActive}

                  loop

                  playsInline

                  muted={muted}

                  preload={isActive ? "auto" : "metadata"}

                  className="fk-video-reel__video"

                  onPlay={(event) => {

                    if (index === activeIndex) {

                      setPlaying(true);

                    }



                    const current = event.currentTarget;

                    const container = containerRef.current;



                    if (!container) return;



                    const videos =

                      container.querySelectorAll("video");



                    videos.forEach((video) => {

                      if (video !== current) {

                        video.pause();

                      }

                    });

                  }}

                  onPause={() => {

                    if (index === activeIndex) {

                      setPlaying(false);

                    }

                  }}

                  onTimeUpdate={(event) =>

                    handleTimeUpdate(index, event)

                  }

                  onLoadedMetadata={(event) =>

                    handleMetadata(index, event)

                  }

                  onEnded={() => {

                    if (index === activeIndex) {

                      setPlaying(false);

                    }

                  }}

                  onClick={() => togglePlayback(index)}

                />



                {/* ============================================================

                    FOCKIS MEDIA CONTROLS

                    All native browser video controls have been removed.

                    These are now positioned by FockisVideoReel.scss.

                ============================================================ */}

                <div

                  className="fk-video-reel__media-controls"

                  onClick={(event) =>

                    event.stopPropagation()

                  }

                >

                  <button

                    type="button"

                    className="fk-video-reel__media-control"

                    onClick={() => togglePlayback(index)}

                    aria-label={

                      playing

                        ? "Pause video"

                        : "Play video"

                    }

                    title={

                      playing

                        ? "Pause"

                        : "Play"

                    }

                  >

                    {playing ? "⏸" : "▶"}

                  </button>



                  <button

                    type="button"

                    className="fk-video-reel__media-control"

                    onClick={() => toggleAudio(index)}

                    aria-label={

                      muted

                        ? "Turn sound on"

                        : "Mute video"

                    }

                    title={

                      muted

                        ? "Turn sound on"

                        : "Mute"

                    }

                  >

                    {muted ? "🔇" : "🔊"}

                  </button>



                  <button

                    type="button"

                    className="fk-video-reel__media-control"

                    onClick={() =>

                      void toggleFullscreen(index)

                    }

                    aria-label="Fullscreen video"

                    title="Fullscreen"

                  >

                    ⛶

                  </button>



                  <button

                    type="button"

                    className="fk-video-reel__media-control"

                    onClick={() =>

                      setShowMore((value) => !value)

                    }

                    aria-label="More video options"

                    aria-expanded={showMore}

                    title="More"

                  >

                    ⋮

                  </button>



                  {showMore && (

                    <div

                      className="fk-video-reel__more-menu"

                      onClick={(event) =>

                        event.stopPropagation()

                      }

                    >

                      <button

                        type="button"

                        onClick={() => {

                          setShowMore(false);

                          toggleAudio(index);

                        }}

                      >

                        {muted

                          ? "Turn sound on"

                          : "Mute sound"}

                      </button>



                      <button

                        type="button"

                        onClick={() => {

                          setShowMore(false);

                          void toggleFullscreen(index);

                        }}

                      >

                        Fullscreen

                      </button>



                      <button

                        type="button"

                        onClick={() => {

                          setShowMore(false);

                          handleClose();

                        }}

                      >

                        Close reel

                      </button>

                    </div>

                  )}

                </div>



                <div

                  className="fk-video-reel__progress"

                  onClick={(event) =>

                    event.stopPropagation()

                  }

                >

                  <input

                    type="range"

                    min="0"

                    max={duration || 0}

                    step="0.1"

                    value={Math.min(

                      progress,

                      duration || 0,

                    )}

                    onChange={(event) =>

                      seekVideo(index, event)

                    }

                    aria-label="Video progress"

                    disabled={!duration}

                  />



                  <span>

                    {formatTime(progress)} /{" "}

                    {formatTime(duration)}

                  </span>

                </div>

              </div>



              <div className="fk-video-reel__header">

                <strong>{post.user}</strong>

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

                    filled={interaction.reacted}

                  />

                  <span>{post.likes}</span>

                </button>



                <button

                  type="button"

                  onClick={handleClose}

                  aria-label="Comments"

                >

                  <IconComment />

                  <span>

                    {post.comments.length}

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

                  <span>{post.reposts}</span>

                </button>



                <button

                  type="button"

                  onClick={() =>

                    onShare(post.id)

                  }

                  aria-label="Share"

                >

                  <IconShare />

                  <span>{post.shares}</span>

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

                    filled={interaction.saved}

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
