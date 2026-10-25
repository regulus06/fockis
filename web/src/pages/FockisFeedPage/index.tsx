import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "../../styles/FockisFeedPage.scss";

import { useFockisTheme } from "../../context/ThemeContext";
import FockisFeedTopBar from "../../components/fockis/FockisTopBar";
import FockisFeedTab from "../../components/fockis/FockisFeedTab";
import FockisCreatePost from "../../components/fockis/FockisCreatePost";
import FockisStoriesRail from "../../components/fockis/FockisStoriesRail";

import type { FockisEvent } from "../../features/events/types/event.types";
import { eventsApi, isAbortError } from "../../features/events/services/eventsApi";
import EventFeedCard from "../../features/events/components/EventFeedCard";
import { useEventClock } from "../../features/events/hooks/useEventClock";
import { readStoredLocation } from "../../features/events/hooks/useViewerLocation";
import { isEventActive } from "../../features/events/utils/eventTime";
import type { PlacedFeedEvent } from "../../features/events/utils/feedEventPlacement";

import FockisPostCard, {
  buildMediaList,
} from "../../components/fockis/FockisPostCard";

import FockisSidebar from "../../components/fockis/FockisSidebar/FockisSidebar";
import FockisRightRail from "../../components/fockis/FockisRightRail";
import FockisBottomNav from "../../components/fockis/FockisBottomNav";

import { useFockisFeed } from "../../hooks/useFockisFeed";

import SponsoredFeedAd from "../../features/marketing/components/SponsoredFeedAd";
import { useFeedAds } from "../../features/marketing/hooks/useFeedAds";

import {
  shouldShowAdAtIndex,
  countAdSlotsBeforeIndex,
} from "../../features/marketing/utils/adFrequency";

import LiveNowRail from "./LiveNowRail";
import FockisVideoReel from "./FockisVideoReel";
import FeedRailInsertions from "./FeedRailInsertions";

import { usePublicLiveStreams } from "./usePublicLiveStreams";

function FeedInner() {
  const { theme, toggleTheme } =
    useFockisTheme();

  const feed =
    useFockisFeed();

  const feedAds =
    useFeedAds();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const isPlaylistsActive =
    location.pathname ===
    "/playlists";

  // Active public live streams, updated in real time (no polling).
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

  /*
   * EVENTS RAIL
   * A small, ranked set from GET /events/sections (never the whole events
   * collection). The server only returns active events; the client clock
   * removes any that end while the page stays open, and the rail is
   * revalidated every few minutes and when the tab becomes visible.
   */
  const [
    events,
    setEvents,
  ] = useState<FockisEvent[]>([]);

  const [
    eventsRailTitle,
    setEventsRailTitle,
  ] = useState("Events You Might Like");

  const [
    eventsLoading,
    setEventsLoading,
  ] = useState(true);

  const [
    eventsRevalidate,
    setEventsRevalidate,
  ] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    eventsApi
      .sections(
        { location: readStoredLocation(), radiusKm: 50, limit: 10 },
        controller.signal,
      )
      .then((sections) => {
        let title = "Upcoming Events";
        let list = sections.upcoming;

        if (sections.nearby.length >= 2) {
          title = "Upcoming Near You";
          list = sections.nearby;
        } else if (sections.recommended.length > 0) {
          title = "Events You Might Like";
          list = sections.recommended;
        } else if (sections.happeningNow.length + sections.today.length > 0) {
          title = "Happening Today";
          list = [...sections.happeningNow, ...sections.today];
        }

        setEventsRailTitle(title);
        setEvents(list);
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          console.error(
            "[FockisFeedPage] Failed to load events:",
            error,
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      });

    return () => controller.abort();
  }, [eventsRevalidate]);

  useEffect(() => {
    const bump = () => setEventsRevalidate((value) => value + 1);
    const interval = window.setInterval(bump, 5 * 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        bump();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Rail events are already on screen: keep them out of the feed cards.
  const { markEventsShown } = feed;

  useEffect(() => {
    markEventsShown(events.map((event) => event.id));
  }, [events, markEventsShown]);

  /*
   * EVENT CARDS BETWEEN POSTS
   * Grouped by the post they follow. Expired or cancelled events drop out
   * at their end instant (useEventClock), without waiting for a reload.
   */
  const feedEventItems = feed.feedEvents;
  const feedEventsNow = useEventClock(
    useMemo(
      () => feedEventItems.map((item) => item.event),
      [feedEventItems],
    ),
  );

  const eventsByAnchor = useMemo(() => {
    const railIds = new Set(events.map((event) => event.id));
    const map = new Map<string, PlacedFeedEvent[]>();

    for (const item of feedEventItems) {
      if (
        railIds.has(item.event.id) ||
        !isEventActive(item.event, feedEventsNow)
      ) {
        continue;
      }

      map.set(item.anchorPostId, [
        ...(map.get(item.anchorPostId) ?? []),
        item,
      ]);
    }

    return map;
  }, [feedEventItems, feedEventsNow, events]);

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
          className="fk-sidebar-backdrop"
          onClick={
            closeMobileSidebar
          }
          aria-label="Close Fockis navigation"
        />
      )}

      <div className="fk-shell">
        <aside
          id="fockis-mobile-sidebar"
          className="fk-shell__left"
        >
          <FockisSidebar
            mobileOpen={
              mobileSidebarOpen
            }
            onClose={
              closeMobileSidebar
            }
            onCreatePost={() => {
              closeMobileSidebar();
              feed.handleCreatePost();
            }}
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
              theme={theme}
              onToggleTheme={toggleTheme}
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
                    <FockisPostCard
                      post={post}
                      interaction={
                        interaction
                      }
                      canDelete={
                        canDelete
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

                    {(eventsByAnchor.get(post.id) ?? []).map(
                      (item) => (
                        <EventFeedCard
                          key={item.key}
                          event={item.event}
                          now={feedEventsNow}
                          onDismiss={feed.dismissFeedEvent}
                        />
                      ),
                    )}

                    <FeedRailInsertions
                      index={index}
                      events={events}
                      eventsTitle={eventsRailTitle}
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
                  </React.Fragment>
                );
              },
            )}

            {feed.loading && (
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

            {!feed.loading &&
              feed.posts.length === 0 &&
              !feed.hasMore && (
                <div className="fk-empty-state">
                  <p className="fk-empty-title">
                    No posts yet
                  </p>

                  <p className="fk-empty-body">
                    Your Fockis feed is waiting
                    for its first post.
                  </p>
                </div>
              )}

            {!feed.hasMore &&
              feed.posts.length > 0 && (
                <div className="fk-empty-state">
                  <p className="fk-empty-body">
                    You're all caught up.
                  </p>
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
          posts={feed.posts}
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