import React, {



  ChangeEvent,



  useEffect,



  useMemo,



  useRef,



  useState,



} from "react";



import { FOCKIS_API_URL } from "../../config/fockisConfig";



import {



  IconChevronLeft,



  IconChevronRight,



  IconClose,



  IconMarketplace,



  IconPlus,



  IconWaveGlyph,



} from "./FockisIcons";



import "../../styles/FockisStoriesRail.scss";







const API_URL = (



  import.meta.env.VITE_API_URL ||



  import.meta.env.VITE_API_BASE_URL ||



  FOCKIS_API_URL ||



  "http://localhost:3000"



)



  .trim()



  .replace(/\/+$/, "");







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



  onCreateStory?: (file: File) => void;



  onStoryCreated?: () => void;



  onStoryClick?: (story: FockisStory, index: number) => void;



  onClose?: () => void;



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
    new Set(
      rawValues
        .map((value) => mediaUrl(value))
        .filter(Boolean),
    ),
  );
}


function groupStories(stories: FockisStory[]): StoryGroup[] {



  const groups = new Map<string, StoryGroup>();







  for (const story of stories) {



    const key = story.userId || `name:${story.username}`;







    if (!groups.has(key)) {



      groups.set(key, {



        key,



        userId: story.userId,



        username: story.username,



        avatar: story.avatar || story.userPhoto,



        isOwn: Boolean(story.isOwn),



        isSeller: Boolean(story.isSeller || story.product),



        hasUnseen: Boolean(story.hasUnseen),



        stories: [],



      });



    }







    const group = groups.get(key)!;



    group.stories.push(story);







    if (!group.avatar) {



      group.avatar = story.avatar || story.userPhoto;



    }







    group.hasUnseen = group.hasUnseen || Boolean(story.hasUnseen);



    group.isSeller = group.isSeller || Boolean(story.isSeller || story.product);



    group.isOwn = group.isOwn || Boolean(story.isOwn);



  }







  return Array.from(groups.values()).map((group) => ({



    ...group,



    stories: [...group.stories].sort((a, b) => {



      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;



      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;



      return aTime - bTime;



    }),



  }));



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



  const [muted, setMuted] = useState(true);



  const [progress, setProgress] = useState(0);



  const videoRef = useRef<HTMLVideoElement | null>(null);



  const startTimeRef = useRef(0);



  const durationRef = useRef(5000);







  const group = groups[groupIndex];



  const story = group?.stories[storyIndex];







  const src = useMemo(() => {



    if (!story) return "";



    return storyMediaCandidates(story)[0] || "";



  }, [story]);







  const next = () => {



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



  };







  const previous = () => {



    if (storyIndex > 0) {



      setStoryIndex((value) => value - 1);



      return;



    }







    if (groupIndex > 0) {



      const previousGroup = groups[groupIndex - 1];



      setGroupIndex((value) => value - 1);



      setStoryIndex(Math.max(previousGroup.stories.length - 1, 0));



    }



  };







  useEffect(() => {



    if (!story) return;



    onStoryClick?.(story, storyIndex);



  }, [story, storyIndex, onStoryClick]);







  useEffect(() => {



    setProgress(0);



    startTimeRef.current = performance.now();



    durationRef.current = story?.type === "video" ? 15000 : 5000;







    let frame = 0;







    const tick = (now: number) => {



      if (!paused) {



        const elapsed = now - startTimeRef.current;



        const percent = Math.min(100, (elapsed / durationRef.current) * 100);



        setProgress(percent);







        if (percent >= 100) {



          next();



          return;



        }



      } else {



        startTimeRef.current = now - (progress / 100) * durationRef.current;



      }







      frame = requestAnimationFrame(tick);



    };







    frame = requestAnimationFrame(tick);



    return () => cancelAnimationFrame(frame);



  }, [groupIndex, storyIndex, paused]);







  useEffect(() => {



    const video = videoRef.current;



    if (!video) return;







    if (paused) {



      video.pause();



    } else {



      void video.play().catch(() => undefined);



    }



  }, [paused, groupIndex, storyIndex]);







  useEffect(() => {



    const onKeyDown = (event: KeyboardEvent) => {



      if (event.key === "Escape") onClose();



      if (event.key === "ArrowLeft") previous();



      if (event.key === "ArrowRight") next();



    };







    window.addEventListener("keydown", onKeyDown);



    document.body.style.overflow = "hidden";







    return () => {



      window.removeEventListener("keydown", onKeyDown);



      document.body.style.overflow = "";



    };



  });







  if (!group || !story) return null;







  return (



    <div className="fk-story-viewer" role="dialog" aria-modal="true">



      <div className="fk-story-viewer__backdrop" onClick={onClose} />







      <div className="fk-story-viewer__stage">



        <div className="fk-story-viewer__progress-row">



          {group.stories.map((item, index) => (



            <div className="fk-story-viewer__progress-track" key={item.id}>



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



                group.username.charAt(0).toUpperCase()



              )}



            </span>



            <strong>{group.isOwn ? "Your Story" : group.username}</strong>



          </div>







          <button



            type="button"



            className="fk-story-viewer__close"



            onClick={onClose}



            aria-label="Close story"



          >



            <IconClose size={20} />



          </button>



        </header>







        <div



          className="fk-story-viewer__media"



          onPointerDown={() => setPaused(true)}



          onPointerUp={() => setPaused(false)}



          onPointerCancel={() => setPaused(false)}



          onPointerLeave={() => setPaused(false)}



        >



          {story.type === "video" ? (



            <video



              ref={videoRef}



              src={src}



              className="fk-story-viewer__video"



              playsInline



              autoPlay



              muted={muted}



              onLoadedMetadata={(event) => {



                if (event.currentTarget.duration > 0) {



                  durationRef.current = event.currentTarget.duration * 1000;



                  startTimeRef.current =



                    performance.now() - (progress / 100) * durationRef.current;



                }



              }}



            />



          ) : (



            <img



              src={src}



              className="fk-story-viewer__image"



              alt={story.username}



            />



          )}







          <button



            type="button"



            className="fk-story-viewer__tap fk-story-viewer__tap--left"



            onClick={previous}



            aria-label="Previous story"



          />



          <button



            type="button"



            className="fk-story-viewer__tap fk-story-viewer__tap--right"



            onClick={next}



            aria-label="Next story"



          />







          {story.type === "video" && (



            <button



              type="button"



              className="fk-story-viewer__mute"



              onClick={(event) => {



                event.stopPropagation();



                setMuted((value) => !value);



              }}



            >



              {muted ? "Unmute" : "Mute"}



            </button>



          )}



        </div>







        {story.product && (



          <div className="fk-story-viewer__product">



            <IconMarketplace size={15} />



            <span>{story.product.name}</span>



            <strong>{story.product.price}</strong>



          </div>



        )}



      </div>



    </div>



  );



}







export default function FockisStoriesRail({



  stories = [],



  currentUser,



  onCreateStory,



  onStoryCreated,



  onStoryClick,



  onClose,



}: FockisStoriesRailProps) {



  const inputRef = useRef<HTMLInputElement | null>(null);



  const listRef = useRef<HTMLDivElement | null>(null);



  const [viewerGroup, setViewerGroup] = useState<number | null>(null);







  const groups = useMemo(() => groupStories(stories), [stories]);







  const selectStoryFile = (event: ChangeEvent<HTMLInputElement>) => {



    const file = event.target.files?.[0];



    event.target.value = "";







    if (!file) return;







    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {



      window.alert("Please select an image or video.");



      return;



    }







    onCreateStory?.(file);



    onStoryCreated?.();



  };







  const scroll = (amount: number) => {



    listRef.current?.scrollBy({



      left: amount,



      behavior: "smooth",



    });



  };







  return (



    <>



      <section className="fk-stories-rail">



        <input



          ref={inputRef}



          type="file"



          accept="image/*,video/*"



          hidden



          onChange={selectStoryFile}



        />







        <div className="fk-stories-rail__top">



          <div>



            <h2>Stories</h2>



            <span>Share a moment</span>



          </div>







          {onClose && (



            <button



              type="button"



              className="fk-stories-rail__close"



              onClick={onClose}



              aria-label="Close stories"



            >



              <IconClose size={17} />



            </button>



          )}



        </div>







        <div className="fk-stories-rail__viewport">



          <button



            type="button"



            className="fk-stories-rail__arrow"



            onClick={() => scroll(-320)}



            aria-label="Previous stories"



          >



            <IconChevronLeft size={18} />



          </button>







          <div className="fk-stories-rail__list" ref={listRef}>



            <button



              type="button"



              className="fk-story-card fk-story-card--create"



              onClick={() => inputRef.current?.click()}



            >



              <div className="fk-story-card__media">



                {currentUser?.avatar ? (



                  <img



                    src={mediaUrl(currentUser.avatar)}



                    alt={currentUser.username || "Your profile"}



                    onError={(event) => {



                      event.currentTarget.style.display = "none";



                    }}



                  />



                ) : (



                  <div className="fk-story-card__placeholder">



                    <IconPlus size={22} />



                  </div>



                )}



                <span className="fk-story-card__plus">



                  <IconPlus size={14} />



                </span>



              </div>



              <strong>Your Story</strong>



            </button>







            {groups.map((group, index) => {



              const latest = group.stories[group.stories.length - 1];



              const coverCandidates = storyMediaCandidates(latest);
              const cover = coverCandidates[0] || "";

              return (



                <button



                  type="button"



                  key={group.key}



                  className={`fk-story-card ${



                    group.hasUnseen ? "is-unseen" : ""



                  }`}



                  onClick={() => setViewerGroup(index)}



                >



                  <div className="fk-story-card__media">



                    {cover ? (



                      latest?.type === "video" ? (



                        <video



                          src={cover}



                          muted



                          playsInline



                          preload="metadata"



                        />



                      ) : (



                        <img
                          src={cover}
                          alt=""
                          loading="eager"
                          decoding="async"
                          onError={(event) => {
                            const element = event.currentTarget;
                            const nextIndex =
                              Number(element.dataset.fallbackIndex || "0") + 1;
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



                      <div className="fk-story-card__placeholder">



                        {group.username.charAt(0).toUpperCase()}



                      </div>



                    )}







                    <span className="fk-story-card__avatar">



                      {group.avatar ? (



                        <img src={mediaUrl(group.avatar)} alt="" />



                      ) : (



                        group.username.charAt(0).toUpperCase()



                      )}



                    </span>







                    {group.isSeller && (



                      <span className="fk-story-card__seller">



                        <IconMarketplace size={11} />



                      </span>



                    )}



                  </div>







                  <strong>



                    {group.isOwn ? "Your Story" : group.username}



                  </strong>







                  {group.stories.length > 1 && (



                    <span className="fk-story-card__count">



                      {group.stories.length}



                    </span>



                  )}







                  <IconWaveGlyph className="fk-story-card__wave" />



                </button>



              );



            })}



          </div>







          <button



            type="button"



            className="fk-stories-rail__arrow"



            onClick={() => scroll(320)}



            aria-label="Next stories"



          >



            <IconChevronRight size={18} />



          </button>



        </div>



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
