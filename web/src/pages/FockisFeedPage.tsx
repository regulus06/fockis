import React, {

  useEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import { ArrowUp, RefreshCw } from "lucide-react";

import {

  useLocation,

  useNavigate,

  useSearchParams,

} from "react-router-dom";

import "../styles/FockisFeedPage.scss";

/* Fockis social design layer — must load after FockisFeedPage.scss. */
import "../styles/FockisSocial.scss";
import "../styles/FockisFeedProducts.scss";

import FockisFeedProductPost from "../components/feed/FockisFeedProductPost";

import {
  getPostRenderKey,
  useFeedProductPlacements,
} from "./FockisFeedPage/feedProductPlacement";

import { useFockisTheme } from "../context/ThemeContext";

import FockisFeedTopBar from "../components/fockis/FockisTopBar";

import FockisFeedTab from "../components/fockis/FockisFeedTab";

import FockisCreatePost from "../components/fockis/FockisCreatePost";

import FockisStoriesRail from "../components/fockis/FockisStoriesRail";

import type { FockisEvent } from "../features/events/types/event.types";

import { eventsApi } from "../features/events/services/eventsApi";

import FockisPostCard, {

  buildMediaList,

} from "../components/fockis/FockisPostCard";

import FockisSidebar from "../components/fockis/FockisSidebar/FockisSidebar";

import FockisRightRail from "../components/fockis/FockisRightRail";

import FockisBottomNav from "../components/fockis/FockisBottomNav";

import { useFockisFeed } from "../hooks/useFockisFeed";

import {

  parseFeedMode,

  type FeedMode,

} from "../api/feedApi";

import SponsoredFeedAd from "../features/marketing/components/SponsoredFeedAd";

import { useFeedAds } from "../features/marketing/hooks/useFeedAds";

import {

  shouldShowAdAtIndex,

  countAdSlotsBeforeIndex,

} from "../features/marketing/utils/adFrequency";

import LiveNowRail from "./FockisFeedPage/LiveNowRail";

import CreateEventPrompt from "./FockisFeedPage/CreateEventPrompt";

import FockisVideoReel from "./FockisFeedPage/FockisVideoReel";

import FeedRailInsertions from "./FockisFeedPage/FeedRailInsertions";

import { usePublicLiveStreams } from "./FockisFeedPage/usePublicLiveStreams";

const EMPTY_FEED_COPY: Record<

  FeedMode,

  { title: string; body: string }

> = {

  "for-you": {

    title: "No posts yet",

    body: "Your Fockis feed is waiting for its first post.",

  },

  following: {

    title: "Nothing from people you follow yet",

    body: "Follow creators to see their latest posts here.",

  },

  friends: {

    title: "No posts from friends yet",

    body: "Posts your friends share will show up here.",

  },

  latest: {

    title: "No posts yet",

    body: "Your Fockis feed is waiting for its first post.",

  },

};

function FeedInner() {

  const { theme } =

    useFockisTheme();

  /*

   * Feed mode comes from the existing tabs (?feed=following, ?feed=latest,

   * ?feed=friends). No parameter means For You, the default.

   */

  const [searchParams] =

    useSearchParams();

  const feedMode =

    parseFeedMode(

      searchParams.get("feed"),

    );

  const emptyCopy =

    EMPTY_FEED_COPY[feedMode];

  const feed =

    useFockisFeed(feedMode);

  // Fockis Shop products placed between posts (For You and Latest only).
  // Placements are sticky per feed session, see feedProductPlacement.ts.
  const productPlacements =
    useFeedProductPlacements(
      feed.posts,
      feed.products,
      feedMode,
    );

  // Holder of the "new posts" pill, just above the post list.
  const postListTopRef =
    useRef<HTMLDivElement | null>(null);

  // A For You post can be shown again after the feed was exhausted. The
  // Waves player and other consumers need each post once.
  const uniqueFeedPosts = useMemo(() => {
    const seen = new Set<string>();

    return feed.posts.filter((post) => {
      if (seen.has(post.id)) {
        return false;
      }

      seen.add(post.id);
      return true;
    });
  }, [feed.posts]);

  // The feed column's ancestors clip overflow, which disables sticky
  // positioning, so the pill is fixed and centred on the measured column.
  const [newPostsPillLeft, setNewPostsPillLeft] =
    useState<number | null>(null);

  useEffect(() => {
    if (feed.pendingNewPostsCount === 0) {
      return;
    }

    const measure = () => {
      const rect =
        postListTopRef.current?.getBoundingClientRect();

      setNewPostsPillLeft(
        rect && rect.width > 0
          ? Math.round(rect.left + rect.width / 2)
          : null,
      );
    };

    measure();
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [feed.pendingNewPostsCount]);

  const showNewPosts = () => {
    feed.showPendingNewPosts();

    requestAnimationFrame(() => {
      const reduceMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const firstPost =
        postListTopRef.current?.parentElement?.querySelector(".fk-post");

      firstPost?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  const feedAds =

    useFeedAds();

  const navigate =

    useNavigate();

  const location =

    useLocation();

  const isPlaylistsActive =

    location.pathname ===

    "/playlists";

  /*
   * Active public live streams, kept up to date in real time through the
   * /live socket (no polling). Empty when nobody is live, in which case the
   * Live Now section is not rendered at all.
   */
  const liveStreams =
    usePublicLiveStreams();

  function handleOpenLive(

    streamId: string,

  ) {

    navigate(

      `/live/${encodeURIComponent(

        streamId,

      )}`,

    );

  }

  const [

    events,

    setEvents,

  ] = useState<FockisEvent[]>([]);

  const [

    eventsLoading,

    setEventsLoading,

  ] = useState(true);

  useEffect(() => {

    let mounted = true;

    async function loadEvents() {

      try {

        setEventsLoading(true);

        const result =

          await eventsApi.getAll();

        if (

          mounted &&

          Array.isArray(result)

        ) {

          setEvents(result);

        }

      } catch (error) {

        console.error(

          "[FockisFeedPage] Failed to load events:",

          error,

        );

        if (mounted) {

          setEvents([]);

        }

      } finally {

        if (mounted) {

          setEventsLoading(

            false,

          );

        }

      }

    }

    void loadEvents();

    return () => {

      mounted = false;

    };

  }, []);

  function handleCreateEvent() {

    navigate(

      "/events/create",

    );

  }

  const [

    mobileSidebarOpen,

    setMobileSidebarOpen,

  ] = useState(false);

  function openMobileSidebar() {

    setMobileSidebarOpen(true);

  }

  function closeMobileSidebar() {

    setMobileSidebarOpen(false);

  }

  useEffect(() => {

    if (!mobileSidebarOpen) {

      return;

    }

    const handleKeyDown = (

      event: KeyboardEvent,

    ) => {

      if (event.key === "Escape") {

        closeMobileSidebar();

      }

    };

    window.addEventListener(

      "keydown",

      handleKeyDown,

    );

    return () => {

      window.removeEventListener(

        "keydown",

        handleKeyDown,

      );

    };

  }, [mobileSidebarOpen]);

  useEffect(() => {

    document.body.style.overflow =

      mobileSidebarOpen

        ? "hidden"

        : "";

    return () => {

      document.body.style.overflow =

        "";

    };

  }, [mobileSidebarOpen]);

  const [

    videoReelPostId,

    setVideoReelPostId,

  ] = useState<

    string | null

  >(null);

  /*
   * "Comment" inside Waves closes the player and opens that post's
   * existing comment thread in the feed (FockisPostCard.openCommentsToken).
   */
  const [

    commentsRequest,

    setCommentsRequest,

  ] = useState<{ postId: string; token: number } | null>(null);

  function handleWaveComment(postId: string) {

    setVideoReelPostId(null);

    setCommentsRequest({ postId, token: Date.now() });

  }

  /*

   * When opening the reel, explicitly pause

   * every normal feed video.

   */

  useEffect(() => {

    if (!videoReelPostId) {

      return;

    }

    const feedVideos =

      document.querySelectorAll<HTMLVideoElement>(

        ".fk-shell__center video:not(.fk-video-reel__video)",

      );

    feedVideos.forEach((video) => {

      video.pause();

    });

  }, [videoReelPostId]);



  return (

    <div

      className="fk-app"

      data-theme={theme}

    >

      <header className="fk-mobile-header">

        <button

          type="button"

          className="fk-mobile-menu-button"

          onClick={

            openMobileSidebar

          }

          aria-label="Open Fockis navigation"

          aria-expanded={

            mobileSidebarOpen

          }

          aria-controls="fockis-mobile-sidebar"

        >

          <span />

          <span />

          <span />

        </button>

        <div className="fk-mobile-header__brand">

          <span className="fk-mobile-header__logo" style={{ overflow: "hidden", padding: 0 }}>

            <img

              src="/brand/fockis-icon-96.png"

              alt=""

              width={34}

              height={34}

              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }}

            />

          </span>

          <span className="fk-mobile-header__logo-text">Fockis</span>

        </div>

      </header>

      {mobileSidebarOpen && (

        <button

          type="button"

          className="fk-sidebar-backdrop is-visible"

          onClick={

            closeMobileSidebar

          }

          aria-label="Close Fockis navigation"

        />

      )}

      <div className="fk-shell">

        <aside

          id="fockis-mobile-sidebar"

          className={`fk-shell__left${mobileSidebarOpen ? " is-mobile-open" : ""}`}

        >

          <FockisSidebar
            mobileOpen={mobileSidebarOpen}
            onClose={closeMobileSidebar}
          />

        </aside>

        <main className="fk-shell__center">

          <div className="fk-shell__center-inner">

            <FockisFeedTopBar

              onSearch={

                feed.handleTopBarSearch

              }

              onMessagesClick={

                feed.handleOpenMessages

              }

              onNotificationsClick={

                feed.handleOpenNotifications

              }

              onPlaylistsClick={() =>

                navigate("/playlists")

              }

              isPlaylistsActive={

                isPlaylistsActive

              }

              messageCount={0}

              notificationCount={

                feed.notificationCount

              }

            />

            <FockisStoriesRail

              stories={

                feed.stories

              }

              currentUser={{

                id:

                  feed.currentUser.id ||

                  feed.currentUserId,

                username:

                  feed.currentUser

                    .username,

                avatar:

                  feed.currentUser

                    .avatar,

              }}

              onCreateStory={

                feed.handleCreateStory

              }

              onStoryCreated={

                feed.handleStoryCreated

              }

              onStoryClick={

                feed.handleStoryClick

              }

              liveStreams={liveStreams}

              onOpenLive={handleOpenLive}

            />

            <LiveNowRail

              streams={

                liveStreams

              }

              onOpen={

                handleOpenLive

              }

            />

            <FockisFeedTab />

            <FockisCreatePost

              onPostCreated={

                feed.refreshFeed

              }

            />

            {/* Always rendered and zero-height, so the pill appearing
                never changes layout or the reading position. */}
            <div
              ref={postListTopRef}
              className="fk-feed-new-posts"
              role="status"
            >
              {feed.pendingNewPostsCount > 0 && (
                <button
                  type="button"
                  className="fk-feed-new-posts__btn"
                  onClick={showNewPosts}
                  style={
                    newPostsPillLeft !== null
                      ? { left: newPostsPillLeft }
                      : undefined
                  }
                >
                  <ArrowUp size={16} aria-hidden="true" />
                  {feed.pendingNewPostsCount === 1
                    ? "1 new post"
                    : `${feed.pendingNewPostsCount} new posts`}
                </button>
              )}
            </div>

            {feed.posts.map(

              (post, index) => {

                const canDelete =

                  String(

                    post.userId ||

                      "",

                  ) ===

                  String(

                    feed.currentUserId,

                  );

                const interaction =

                  feed.getInteraction(

                    post.id,

                  );

                const hasVideo =

                  buildMediaList(

                    post,

                  ).some(

                    (item) =>

                      item.type ===

                      "video",

                  );

                const adSlotsBefore =

                  countAdSlotsBeforeIndex(

                    index,

                  );

                const showAd =

                  shouldShowAdAtIndex(

                    index,

                    adSlotsBefore,

                  );

                const productPlacement =
                  productPlacements.get(
                    getPostRenderKey(post),
                  );

                const adForSlot =

                  showAd

                    ? feedAds.getAdForSlot(

                        adSlotsBefore,

                      )

                    : null;

                return (

                  <React.Fragment

                    key={post.feedKey ?? post.id}

                  >
                    {post.feedRecycled &&
                      !feed.posts[index - 1]?.feedRecycled && (
                        <div
                          className="fk-feed-status fk-feed-status--done fk-feed-status--recycled"
                          role="note"
                        >
                          <strong>You're all caught up</strong>
                          <span>Here are posts from earlier you might want to revisit.</span>
                        </div>
                      )}


                    <FockisPostCard

                      post={post}

                      interaction={

                        interaction

                      }

                      canDelete={

                        canDelete

                      }

                      openCommentsToken={
                        commentsRequest?.postId === post.id
                          ? commentsRequest.token
                          : undefined
                      }

                      onReact={() =>

                        void feed.toggleReact(

                          post.id,

                        )

                      }

                      onRepost={() =>

                        void feed.toggleRepost(

                          post.id,

                        )

                      }

                      onSave={() =>

                        feed.toggleSave(

                          post.id,

                        )

                      }

                      onMenu={() =>

                        feed.toggleMenu(

                          post.id,

                        )

                      }

                      onDelete={() =>

                        void feed.handleDelete(

                          post.id,

                        )

                      }

                      onEditPost={(content) =>

                        feed.handleEditPost(

                          post.id,

                          content,

                        )

                      }

                      onComment={() =>

                        feed.handleComment(

                          post.id,

                        )

                      }

                      onSubmitComment={(

                        content,

                      ) =>

                        feed.handleSubmitComment(

                          post.id,

                          content,

                        )

                      }

                      onShare={() =>

                        void feed.handleShare(

                          post.id,

                        )

                      }

                      onShareToFockis={() =>

                        void feed.shareToFockis(

                          post.id,

                        )

                      }

                      onCopyLink={() =>

                        void feed.copyPostLink(

                          post.id,

                        )

                      }

                      onShareFacebook={() =>

                        void feed.shareToFacebook(

                          post.id,

                        )

                      }

                      onShareWhatsApp={() =>

                        void feed.shareToWhatsApp(

                          post.id,

                        )

                      }

                      onShareX={() =>

                        void feed.shareToX(

                          post.id,

                        )

                      }

                      onView={() =>

                        void feed.handleView(

                          post.id,

                        )

                      }

                      onOpenMedia={

                        hasVideo

                          ? () => {

                              /*

                               * Pause every normal feed

                               * video before opening reel.

                               */

                              const feedVideos =

                                document.querySelectorAll<HTMLVideoElement>(

                                  ".fk-shell__center video:not(.fk-video-reel__video)",

                                );

                              feedVideos.forEach(

                                (

                                  video,

                                ) => {

                                  video.pause();

                                },

                              );

                              setVideoReelPostId(

                                post.id,

                              );

                            }

                          : undefined

                      }

                    />

                    <FeedRailInsertions

                      index={index}

                      events={events}

                      eventsLoading={

                        eventsLoading

                      }

                      onCreateEvent={

                        handleCreateEvent

                      }

                    />

                    {adForSlot && (

                      <SponsoredFeedAd

                        ad={

                          adForSlot

                        }

                        onImpression={(

                          ad,

                        ) =>

                          feedAds.track(

                            ad,

                            "IMPRESSION",

                          )

                        }

                        onVideoStart={(

                          ad,

                        ) =>

                          feedAds.track(

                            ad,

                            "VIDEO_VIEW",

                          )

                        }

                        onVideoComplete={(

                          ad,

                        ) =>

                          feedAds.track(

                            ad,

                            "VIDEO_COMPLETE",

                          )

                        }

                        onClick={(

                          ad,

                        ) =>

                          feedAds.track(

                            ad,

                            "CLICK",

                          )

                        }

                      />

                    )}

                    {productPlacement && (
                      <FockisFeedProductPost
                        key={`product-${getPostRenderKey(post)}`}
                        product={productPlacement}
                      />
                    )}

                  </React.Fragment>

                );

              },

            )}

            {feed.loading && feed.posts.length === 0 && (
              <div
                className="fk-skeleton-post"
                aria-hidden="true"
              >
                <div className="fk-skeleton-post__header">
                  <div className="fk-skeleton fk-skeleton--avatar" />
                  <div className="fk-skeleton-post__lines">
                    <div className="fk-skeleton fk-skeleton--name" />
                    <div className="fk-skeleton fk-skeleton--sub" />
                  </div>
                </div>
                <div className="fk-skeleton fk-skeleton--content" />
                <div className="fk-skeleton fk-skeleton--media" />
              </div>
            )}

            {feed.loading && feed.posts.length > 0 && (
              <div className="fk-feed-status fk-feed-status--loading" role="status">
                <span className="fk-feed-status__dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="fk-visually-hidden">Loading more posts</span>
              </div>
            )}

            {!feed.loading &&
              feed.posts.length === 0 &&
              feed.feedStatus === "empty" && (
                <div className="fk-empty-state">
                  <p className="fk-empty-title">
                    {emptyCopy.title}
                  </p>
                  <p className="fk-empty-body">
                    {emptyCopy.body}
                  </p>
                </div>
              )}

            {!feed.loading &&
              feed.posts.length > 0 &&
              feed.feedStatus === "caught-up" && (
                <div className="fk-feed-status fk-feed-status--done" role="status">
                  <strong>You're all caught up</strong>
                  <span>
                    {feedMode === "for-you"
                      ? "We'll keep looking for posts you haven't seen."
                      : "New posts will appear here as they're shared."}
                  </span>
                </div>
              )}

            {(feed.feedStatus === "retrying" ||
              feed.feedStatus === "error" ||
              feed.feedStatus === "blocked") &&
              feed.feedError && (
                <div
                  className={`fk-feed-status fk-feed-status--${feed.feedStatus}`}
                  role="alert"
                >
                  <span>{feed.feedError}</span>
                  {feed.feedStatus !== "blocked" && (
                    <button
                      type="button"
                      className="fk-feed-status__retry"
                      onClick={feed.retryFeed}
                      disabled={feed.loading}
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      Try again
                    </button>
                  )}
                </div>
              )}

            <div
              ref={feed.feedLoaderRef}
              className="fk-feed-loader"
              style={{
                height: 1,
              }}
              aria-hidden="true"
            />

          </div>

        </main>

        <aside className="fk-shell__right">

          <FockisRightRail

            onTrendClick={

              feed.handleTrendClick

            }

            onFollow={

              feed.handleFollow

            }

            onProductClick={

              feed.handleProductClick

            }

          />

        </aside>

      </div>

      <FockisBottomNav />

      {videoReelPostId && (

        <FockisVideoReel

          posts={uniqueFeedPosts}

          startPostId={

            videoReelPostId

          }

          getInteraction={

            feed.getInteraction

          }

          onReact={(postId) =>

            void feed.toggleReact(

              postId,

            )

          }

          onRepost={(postId) =>

            void feed.toggleRepost(

              postId,

            )

          }

          onSave={(postId) =>

            feed.toggleSave(

              postId,

            )

          }

          onShare={(postId) =>

            void feed.handleShare(

              postId,

            )

          }

          onComment={handleWaveComment}

          onClose={() =>

            setVideoReelPostId(

              null,

            )

          }

        />

      )}

    </div>

  );

}

export default function FockisFeedPage() {

  return <FeedInner />;

}
