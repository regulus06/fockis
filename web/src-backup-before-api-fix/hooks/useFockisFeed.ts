import { useCallback, useEffect, useRef, useState } from "react";

import { getFeed } from "../api/feedApi";
import { storyApi } from "../api/storyApi";

import type { FockisStory } from "../components/fockis/FockisStoriesRail";
import type {
  FockisPost,
  FockisPostInteraction,
} from "../components/fockis/FockisPostCard";
import type {
  FockisTrendingItem,
  FockisSuggestedUser,
  FockisMarketplaceItem,
} from "../components/fockis/FockisRightRail";
import type { AppNotification } from "../features/notifications/type/Notification";

import {
  API_URL,
  extractStoryArray,
  mapFeedItemsToPosts,
  mapStories,
  normalizeComments,
  normalizeUserIds,
  type BackendPostData,
  type ShareDestination,
  type StoryApiResponse,
} from "../utils/fockisFeedHelpers";

/* ============================================================================
   HOOK
============================================================================ */

export function useFockisFeed() {
  const [posts, setPosts] = useState<FockisPost[]>([]);
  const [stories, setStories] = useState<FockisStory[]>([]);

  const [notifications, setNotifications] =
    useState<AppNotification[]>([]);

  const [notificationCount, setNotificationCount] =
    useState(0);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [interactions, setInteractions] =
    useState<Record<string, FockisPostInteraction>>({});

  /* ==========================================================================
     REFS: background refresh / scroll-safety
     - isRefreshingRef: prevents overlapping "check for new posts" calls
       from bottom-of-feed, visibility-return, and manual refresh all firing
       at once.
     - lastVisibilityRefreshRef: cooldown so multiple lifecycle events
       (visibilitychange + focus + pageshow) firing together only refresh once.
     - lastEndOfFeedCheckRef: cooldown so repeatedly hitting the bottom of an
       exhausted feed doesn't spam the API.
     - scrollAdjustRef: records scrollHeight right before a prepend so the
       post-commit effect can offset scroll and avoid a visual jump.
  ========================================================================== */

  const isRefreshingRef = useRef(false);
  const lastVisibilityRefreshRef = useRef(0);
  const lastEndOfFeedCheckRef = useRef(0);
  const scrollAdjustRef =
    useRef<{ prevScrollHeight: number } | null>(null);

  // Stable DOM sentinel used by the infinite-scroll observer.
  // Using a React ref is more reliable than document.querySelector()
  // because the sentinel belongs to this feed component.
  const feedLoaderRef =
    useRef<HTMLDivElement | null>(null);

  // Prevent duplicate pagination requests while the sentinel remains visible.
  const isLoadingMoreRef = useRef(false);

  const VISIBILITY_REFRESH_COOLDOWN_MS = 15_000;
  const END_OF_FEED_COOLDOWN_MS = 30_000;

  /* ==========================================================================
     AUTH HELPERS
  ========================================================================== */

  const getAccessToken = useCallback(() => {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  }, []);

  const getCurrentUserId = useCallback((): string => {
    const storedUserId = localStorage.getItem("userId");

    if (storedUserId) {
      return String(storedUserId);
    }

    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        return String(
          parsed?._id ||
            parsed?.id ||
            "",
        );
      }
    } catch {
      return "";
    }

    return "";
  }, []);

  const getCurrentUser = useCallback(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        return {
          id: String(
            parsed?._id ||
              parsed?.id ||
              "",
          ),

          username: String(
            parsed?.username ||
              parsed?.name ||
              "User",
          ),

          avatar:
            parsed?.avatar ||
            parsed?.userPhoto ||
            parsed?.photo ||
            parsed?.profilePhoto ||
            undefined,
        };
      }
    } catch {
      // Ignore invalid user data.
    }

    return {
      id: "",
      username: "User",
      avatar: undefined as string | undefined,
    };
  }, []);

  const currentUserId = getCurrentUserId();
  const currentUser = getCurrentUser();

  /* ==========================================================================
     LOAD NOTIFICATIONS
  ========================================================================== */

  const loadNotifications = useCallback(async () => {
    try {
      const token = getAccessToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_URL}/notifications`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();

      const notificationList =
        Array.isArray(result)
          ? result
          : Array.isArray(result?.notifications)
            ? result.notifications
            : Array.isArray(result?.data)
              ? result.data
              : [];

      const normalized =
        notificationList as AppNotification[];

      setNotifications(normalized);

      setNotificationCount(
        normalized.filter(
          (item) => !item.read,
        ).length,
      );
    } catch (error) {
      console.error(
        "Notification load error:",
        error,
      );

      setNotifications([]);
      setNotificationCount(0);
    }
  }, [getAccessToken]);

  /* ==========================================================================
     LOAD STORIES
  ========================================================================== */

  const loadStories = useCallback(async () => {
    try {
      const response =
        (await storyApi.getStories()) as unknown as StoryApiResponse;

      const rawStories =
        extractStoryArray(response);

      const mappedStories =
        mapStories(rawStories);

      setStories(mappedStories);
    } catch (error) {
      console.error(
        "Fockis Stories error:",
        error,
      );

      setStories([]);
    }
  }, []);

  /* ==========================================================================
     CREATE STORY
  ========================================================================== */

  const handleCreateStory = useCallback(
    async (file: File) => {
      if (!file) {
        return;
      }

      const isImage =
        file.type.startsWith("image/");

      const isVideo =
        file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        window.alert(
          "Please select an image or video.",
        );

        return;
      }

      const token = getAccessToken();

      if (!token) {
        window.alert(
          "Please log in before creating a story.",
        );

        return;
      }

      if (!currentUserId) {
        window.alert(
          "Unable to determine your account. Please log in again.",
        );

        return;
      }

      try {
        const uploaded =
          await storyApi.uploadStoryMedia(file);

        await storyApi.createStory({
          userId: currentUserId,

          username:
            currentUser.username,

          avatar:
            currentUser.avatar || null,

          media:
            uploaded.media,

          type:
            uploaded.type,
        });

        await loadStories();

        window.alert(
          "Your story was created successfully!",
        );
      } catch (error) {
        console.error(
          "Create story error:",
          error,
        );

        window.alert(
          "Unable to create your story. Please try again.",
        );
      }
    },
    [
      getAccessToken,
      currentUserId,
      currentUser,
      loadStories,
    ],
  );

  const handleStoryCreated =
    useCallback(async () => {
      await loadStories();
    }, [loadStories]);

  /* ==========================================================================
     AUTHENTICATED FETCH
  ========================================================================== */

  const authenticatedFetch = useCallback(
    async (
      url: string,
      options: RequestInit = {},
    ) => {
      const token = getAccessToken();

      if (!token) {
        throw new Error(
          "No authentication token found. Please log in again.",
        );
      }

      const headers =
        new Headers(options.headers);

      if (
        options.body &&
        !headers.has("Content-Type")
      ) {
        headers.set(
          "Content-Type",
          "application/json",
        );
      }

      headers.set(
        "Authorization",
        `Bearer ${token}`,
      );

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [getAccessToken],
  );

  /* ==========================================================================
     LOAD SAVED POST IDS
  ========================================================================== */

  const loadSavedPostIds =
    useCallback(async () => {
      try {
        const response =
          await authenticatedFetch(
            `${API_URL}/saved`,
            {
              method: "GET",
            },
          );

        if (!response.ok) {
          throw new Error(
            await response.text(),
          );
        }

        const result =
          await response.json();

        const savedItems =
          Array.isArray(result)
            ? result
            : Array.isArray(result?.items)
              ? result.items
              : Array.isArray(result?.saved)
                ? result.saved
                : Array.isArray(result?.data)
                  ? result.data
                  : [];

        const savedIds =
          new Set<string>();

        savedItems.forEach(
          (item: unknown) => {
            if (
              !item ||
              typeof item !== "object"
            ) {
              return;
            }

            const savedItem =
              item as {
                postId?: unknown;
              };

            let postId: string | undefined;

            if (
              typeof savedItem.postId ===
              "string"
            ) {
              postId =
                savedItem.postId;
            } else if (
              savedItem.postId &&
              typeof savedItem.postId ===
                "object"
            ) {
              const populatedPost =
                savedItem.postId as {
                  _id?: string;
                  id?: string;
                };

              postId =
                populatedPost._id ||
                populatedPost.id;
            }

            if (postId) {
              savedIds.add(
                String(postId),
              );
            }
          },
        );

        setInteractions(
          (previous) => {
            const next = {
              ...previous,
            };

            savedIds.forEach(
              (postId) => {
                const current =
                  next[postId] || {
                    reacted: false,
                    reposted: false,
                    saved: false,
                    menuOpen: false,
                  };

                next[postId] = {
                  ...current,
                  saved: true,
                };
              },
            );

            return next;
          },
        );
      } catch (error) {
        console.error(
          "Failed loading saved posts:",
          error,
        );
      }
    }, [authenticatedFetch]);

  /* ==========================================================================
     LOAD FEED
  ========================================================================== */

  const loadFeed =
    useCallback(async () => {
      if (
        loading ||
        !hasMore ||
        isLoadingMoreRef.current
      ) {
        return;
      }

      isLoadingMoreRef.current = true;
      setLoading(true);

      try {
        const res =
          await getFeed(
            page,
            10,
          );

        const feedItems =
          Array.isArray(res?.feed)
            ? (res.feed as BackendPostData[])
            : [];

        const newPosts =
          mapFeedItemsToPosts(
            feedItems,
          );

        setPosts(
          (previousPosts) => {
            const existingIds =
              new Set(
                previousPosts.map(
                  (post) => post.id,
                ),
              );

            const uniquePosts =
              newPosts.filter(
                (post) =>
                  !existingIds.has(
                    post.id,
                  ),
              );

            return [
              ...previousPosts,
              ...uniquePosts,
            ];
          },
        );

        setInteractions(
          (previous) => {
            const next = {
              ...previous,
            };

            newPosts.forEach(
              (post) => {
                next[post.id] = {
                  ...(next[post.id] || {
                    reacted: false,
                    reposted: false,
                    saved: false,
                    menuOpen: false,
                  }),

                  reacted:
                    post.likedBy.includes(
                      currentUserId,
                    ),

                  reposted:
                    post.repostedBy.includes(
                      currentUserId,
                    ),
                };
              },
            );

            return next;
          },
        );

        setHasMore(
          Boolean(res?.hasMore),
        );

        setPage(
          (previousPage) =>
            previousPage + 1,
        );
      } catch (error) {
        console.error(
          "Fockis Feed error:",
          error,
        );
      } finally {
        isLoadingMoreRef.current = false;
        setLoading(false);
      }
    }, [
      page,
      loading,
      hasMore,
      currentUserId,
    ]);

  /* ==========================================================================
     CHECK FOR NEW POSTS (scroll-safe, concurrency-guarded)

     Fetches page 1 and prepends any post IDs not already present, without
     disturbing existing posts or state. Used by:
       - refreshFeed() (manual / post-created trigger)
       - end-of-feed IntersectionObserver check
       - visibility/focus/pageshow return-to-app detection

     Returns the number of newly inserted posts so callers can decide
     whether to scroll to top (only when genuinely nothing new was found).
  ========================================================================== */

  const checkForNewPosts =
    useCallback(async (): Promise<number> => {
      if (isRefreshingRef.current) {
        return 0;
      }

      isRefreshingRef.current = true;

      try {
        const res =
          await getFeed(
            1,
            10,
          );

        const feedItems =
          Array.isArray(res?.feed)
            ? (res.feed as BackendPostData[])
            : [];

        const freshPosts =
          mapFeedItemsToPosts(
            feedItems,
          );

        let insertedCount = 0;

        setPosts(
          (previousPosts) => {
            const existingIds =
              new Set(
                previousPosts.map(
                  (post) => post.id,
                ),
              );

            const newOnly =
              freshPosts.filter(
                (post) =>
                  !existingIds.has(
                    post.id,
                  ),
              );

            insertedCount =
              newOnly.length;

            if (newOnly.length === 0) {
              return previousPosts;
            }

            // Capture scroll height BEFORE this prepend commits so the
            // effect below can offset scroll by exactly what was added.
            scrollAdjustRef.current = {
              prevScrollHeight:
                document.documentElement
                  .scrollHeight,
            };

            return [
              ...newOnly,
              ...previousPosts,
            ];
          },
        );

        if (insertedCount > 0) {
          setInteractions(
            (previous) => {
              const next = {
                ...previous,
              };

              freshPosts.forEach(
                (post) => {
                  if (!next[post.id]) {
                    next[post.id] = {
                      reacted:
                        post.likedBy.includes(
                          currentUserId,
                        ),

                      reposted:
                        post.repostedBy.includes(
                          currentUserId,
                        ),

                      saved: false,
                      menuOpen: false,
                    };
                  }
                },
              );

              return next;
            },
          );
        }

        return insertedCount;
      } catch (error) {
        console.error(
          "Feed refresh error:",
          error,
        );

        return 0;
      } finally {
        isRefreshingRef.current = false;
      }
    }, [currentUserId]);

  /* ==========================================================================
     REFRESH FEED
     Public entry point (e.g. called by FockisCreatePost after posting).
     Name/signature preserved for backward compatibility.
  ========================================================================== */

  const refreshFeed =
    useCallback(async () => {
      await checkForNewPosts();
    }, [checkForNewPosts]);

  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */

  useEffect(() => {
    void loadFeed();
    void loadStories();
    void loadNotifications();
    void loadSavedPostIds();

    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================================================================
     SCROLL PRESERVATION FOR PREPENDS

     Runs after any posts-state commit. Only adjusts scroll when
     checkForNewPosts flagged a prepend via scrollAdjustRef; bottom-appends
     from loadFeed never set that ref, so pagination is unaffected.
  ========================================================================== */

  useEffect(() => {
    if (!scrollAdjustRef.current) {
      return;
    }

    const { prevScrollHeight } =
      scrollAdjustRef.current;

    scrollAdjustRef.current = null;

    requestAnimationFrame(() => {
      const newScrollHeight =
        document.documentElement
          .scrollHeight;

      const delta =
        newScrollHeight - prevScrollHeight;

      if (delta > 0) {
        window.scrollBy(0, delta);
      }
    });
  }, [posts]);

  /* ==========================================================================
     INFINITE SCROLL + END-OF-FEED CHECK

     The feed page provides a real React ref for the bottom sentinel.
     The observer starts loading the next page before the user reaches the
     absolute bottom, which makes the feed feel continuous.

     When the backend reports hasMore === false, we check page 1 for newer
     posts. We do NOT send the user back to the top when there are no new posts.
  ========================================================================== */

  useEffect(() => {
    const element = feedLoaderRef.current;

    if (!element) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (!entry?.isIntersecting) {
            return;
          }

          if (
            !loading &&
            hasMore &&
            !isLoadingMoreRef.current
          ) {
            void loadFeed();
            return;
          }

          if (
            !hasMore &&
            !isRefreshingRef.current
          ) {
            const now = Date.now();

            if (
              now -
                lastEndOfFeedCheckRef.current <
              END_OF_FEED_COOLDOWN_MS
            ) {
              return;
            }

            lastEndOfFeedCheckRef.current =
              now;

            void checkForNewPosts();
          }
        },
        {
          // Start loading well before the user reaches the end.
          root: null,
          rootMargin: "800px 0px",
          threshold: 0,
        },
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    loadFeed,
    loading,
    hasMore,
    checkForNewPosts,
  ]);

  /* ==========================================================================
     RETURN-TO-APP DETECTION

     Covers: screen unlock, tab switch back, app foreground, and bfcache
     restore (pageshow). All three listeners funnel through the same
     cooldown-guarded maybeRefresh so simultaneous firings (e.g. focus +
     visibilitychange together) trigger at most one refresh.
  ========================================================================== */

  useEffect(() => {
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();

      if (
        now -
          lastVisibilityRefreshRef.current <
        VISIBILITY_REFRESH_COOLDOWN_MS
      ) {
        return;
      }

      lastVisibilityRefreshRef.current = now;

      void checkForNewPosts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        maybeRefresh();
      }
    };

    const handlePageShow = () => {
      maybeRefresh();
    };

    const handleFocus = () => {
      maybeRefresh();
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [checkForNewPosts]);

  /* ==========================================================================
     GET INTERACTION
  ========================================================================== */

  const getInteraction =
    (
      id: string,
    ): FockisPostInteraction => {
      return (
        interactions[id] ?? {
          reacted: false,
          reposted: false,
          saved: false,
          menuOpen: false,
        }
      );
    };

  /* ==========================================================================
     LIKE / UNLIKE
  ========================================================================== */

  const toggleReact =
    async (
      id: string,
    ) => {
      if (
        !currentUserId ||
        !getAccessToken()
      ) {
        return;
      }

      const current =
        getInteraction(id);

      const previousReacted =
        current.reacted;

      setInteractions(
        (previous) => ({
          ...previous,

          [id]: {
            ...current,
            reacted:
              !previousReacted,
          },
        }),
      );

      try {
        const response =
          await authenticatedFetch(
            `${API_URL}/posts/${id}/like`,
            {
              method: "POST",

              body: JSON.stringify({
                userId:
                  currentUserId,
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

        const updatedPost =
          result?.post ||
          result;

        const likedBy =
          normalizeUserIds(
            updatedPost?.likedBy,
          );

        const likes =
          Number(
            result?.likes ??
              updatedPost?.likes ??
              likedBy.length ??
              0,
          );

        setPosts(
          (previousPosts) =>
            previousPosts.map(
              (post) =>
                post.id === id
                  ? {
                      ...post,
                      likes,
                      likedBy,
                    }
                  : post,
            ),
        );

        setInteractions(
          (previous) => ({
            ...previous,

            [id]: {
              ...previous[id],

              reacted:
                typeof result?.liked ===
                "boolean"
                  ? result.liked
                  : likedBy.includes(
                      currentUserId,
                    ),
            },
          }),
        );
      } catch (error) {
        console.error(
          "Like error:",
          error,
        );

        setInteractions(
          (previous) => ({
            ...previous,

            [id]: {
              ...previous[id],
              reacted:
                previousReacted,
            },
          }),
        );
      }
    };

  /* ==========================================================================
     REPOST / UNDO REPOST
  ========================================================================== */

  const toggleRepost =
    async (
      id: string,
    ) => {
      if (
        !currentUserId ||
        !getAccessToken()
      ) {
        return;
      }

      const current =
        getInteraction(id);

      const previousReposted =
        current.reposted;

      setInteractions(
        (previous) => ({
          ...previous,

          [id]: {
            ...current,
            reposted:
              !previousReposted,
          },
        }),
      );

      try {
        const response =
          await authenticatedFetch(
            `${API_URL}/posts/${id}/repost`,
            {
              method: "POST",

              body: JSON.stringify({
                userId:
                  currentUserId,
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

        const updatedPost =
          result?.post ||
          result;

        const repostedBy =
          normalizeUserIds(
            updatedPost?.repostedBy,
          );

        const reposts =
          Number(
            result?.reposts ??
              updatedPost?.reposts ??
              repostedBy.length ??
              0,
          );

        setPosts(
          (previousPosts) =>
            previousPosts.map(
              (post) =>
                post.id === id
                  ? {
                      ...post,
                      reposts,
                      repostedBy,
                    }
                  : post,
            ),
        );

        setInteractions(
          (previous) => ({
            ...previous,

            [id]: {
              ...previous[id],

              reposted:
                typeof result?.reposted ===
                "boolean"
                  ? result.reposted
                  : repostedBy.includes(
                      currentUserId,
                    ),
            },
          }),
        );
      } catch (error) {
        console.error(
          "Repost error:",
          error,
        );

        setInteractions(
          (previous) => ({
            ...previous,

            [id]: {
              ...previous[id],
              reposted:
                previousReposted,
            },
          }),
        );
      }
    };

  /* ==========================================================================
     RECORD VIEW
  ========================================================================== */

  const handleView =
    async (
      id: string,
    ) => {
      if (
        !currentUserId ||
        !getAccessToken()
      ) {
        return;
      }

      const post =
        posts.find(
          (item) =>
            item.id === id,
        );

      if (
        post?.viewedBy.includes(
          currentUserId,
        )
      ) {
        return;
      }

      try {
        const response =
          await authenticatedFetch(
            `${API_URL}/posts/${id}/view`,
            {
              method: "POST",

              body: JSON.stringify({
                userId:
                  currentUserId,
              }),
            },
          );

        if (!response.ok) {
          return;
        }

        const updatedPost =
          await response.json();

        const viewedBy =
          normalizeUserIds(
            updatedPost?.viewedBy,
          );

        setPosts(
          (previousPosts) =>
            previousPosts.map(
              (item) =>
                item.id === id
                  ? {
                      ...item,

                      views:
                        Number(
                          updatedPost?.views ??
                            viewedBy.length ??
                            item.views,
                        ),

                      viewedBy,
                    }
                  : item,
            ),
        );
      } catch (error) {
        console.error(
          "View error:",
          error,
        );
      }
    };

  /* ==========================================================================
     SAVE / UNSAVE
  ========================================================================== */

  const toggleSave =
    async (
      id: string,
    ) => {
      if (
        !id ||
        !getAccessToken()
      ) {
        console.error(
          "Cannot save post: missing post ID or authentication.",
        );

        return;
      }

      const current =
        getInteraction(id);

      const previousSaved =
        current.saved;

      setInteractions(
        (previous) => ({
          ...previous,

          [id]: {
            ...current,
            saved:
              !previousSaved,
          },
        }),
      );

      try {
        if (previousSaved) {
          const response =
            await authenticatedFetch(
              `${API_URL}/saved/${id}`,
              {
                method: "DELETE",
              },
            );

          if (!response.ok) {
            throw new Error(
              await response.text(),
            );
          }

          setInteractions(
            (previous) => ({
              ...previous,

              [id]: {
                ...(previous[id] ||
                  current),

                saved: false,
              },
            }),
          );

          console.log(
            "Post unsaved:",
            id,
          );

          return;
        }

        const response =
          await authenticatedFetch(
            `${API_URL}/saved`,
            {
              method: "POST",

              body: JSON.stringify({
                postId: id,
              }),
            },
          );

        if (!response.ok) {
          throw new Error(
            await response.text(),
          );
        }

        setInteractions(
          (previous) => ({
            ...previous,

            [id]: {
              ...(previous[id] ||
                current),

              saved: true,
            },
          }),
        );

        console.log(
          "Post saved:",
          id,
        );
      } catch (error) {
        console.error(
          previousSaved
            ? "Failed to unsave post:"
            : "Failed to save post:",
          error,
        );

        setInteractions(
          (previous) => ({
            ...previous,

            [id]: {
              ...(previous[id] ||
                current),

              saved:
                previousSaved,
            },
          }),
        );
      }
    };

  /* ==========================================================================
     MENU
  ========================================================================== */

  const toggleMenu =
    (id: string) => {
      setInteractions(
        (previous) => {
          const current =
            previous[id] ?? {
              reacted: false,
              reposted: false,
              saved: false,
              menuOpen: false,
            };

          return {
            ...previous,

            [id]: {
              ...current,

              menuOpen:
                !current.menuOpen,
            },
          };
        },
      );
    };

  /* ==========================================================================
     DELETE
  ========================================================================== */

  const handleDelete =
    async (
      id: string,
    ) => {
      if (
        !currentUserId ||
        !getAccessToken()
      ) {
        return;
      }

      try {
        const response =
          await authenticatedFetch(
            `${API_URL}/posts/${id}`,
            {
              method: "DELETE",

              body: JSON.stringify({
                userId:
                  currentUserId,
              }),
            },
          );

        if (!response.ok) {
          throw new Error(
            await response.text(),
          );
        }

        setPosts(
          (previousPosts) =>
            previousPosts.filter(
              (post) =>
                post.id !== id,
            ),
        );

        setInteractions(
          (previous) => {
            const next = {
              ...previous,
            };

            delete next[id];

            return next;
          },
        );
      } catch (error) {
        console.error(
          "Delete error:",
          error,
        );
      }
    };

  /* ==========================================================================
     EDIT POST
  ========================================================================== */

  const handleEditPost = async (
    id: string,
    content: string,
  ) => {
    if (!currentUserId || !getAccessToken()) {
      return;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new Error("Post content cannot be empty");
    }

    const response = await authenticatedFetch(
      `${API_URL}/posts/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          userId: currentUserId,
          content: trimmedContent,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    const updatedPost = result?.post || result;

    setPosts((previousPosts) =>
      previousPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              ...updatedPost,
              id: post.id,
              content:
                typeof updatedPost.content === "string"
                  ? updatedPost.content
                  : trimmedContent,
            }
          : post,
      ),
    );

    setInteractions((previous) => ({
      ...previous,
      [id]: {
        ...(previous[id] || {
          reacted: false,
          reposted: false,
          saved: false,
          menuOpen: false,
        }),
        menuOpen: false,
      },
    }));
  };

  /* ==========================================================================
     COMMENT
  ========================================================================== */

  const handleComment =
    (id: string) => {
      console.log(
        "Open comments for post:",
        id,
      );
    };

  /* ==========================================================================
     SUBMIT COMMENT
  ========================================================================== */

  const handleSubmitComment =
    async (
      id: string,
      content: string,
    ) => {
      const trimmedContent = content.trim();

      if (!trimmedContent) {
        return;
      }

      if (
        !currentUserId ||
        !getAccessToken()
      ) {
        throw new Error(
          "You must be logged in to comment.",
        );
      }

      try {
        const response =
          await authenticatedFetch(
            `${API_URL}/posts/${id}/comment`,
            {
              method: "POST",

              body: JSON.stringify({
                userId:
                  currentUserId,

                username:
                  currentUser.username,

                userPhoto:
                  currentUser.avatar,

                content:
                  trimmedContent,
              }),
            },
          );

        if (!response.ok) {
          throw new Error(
            await response.text(),
          );
        }

        /*
         * Some backend versions return JSON, while others may return
         * an empty response after successfully saving the comment.
         * Read the body safely so a successful 201/200 is not turned
         * into a JSON parsing error.
         */
        const responseText =
          await response.text();

        let result: any = {};

        if (responseText.trim()) {
          try {
            result =
              JSON.parse(
                responseText,
              );
          } catch {
            console.warn(
              "[FockisFeed] Comment response was not JSON:",
              responseText,
            );
          }
        }

        console.log(
          "[FockisFeed] Comment API response:",
          result,
        );

        const updatedPost =
          result?.post ||
          result?.data?.post ||
          null;

        setPosts(
          (previousPosts) =>
            previousPosts.map(
              (post) => {
                if (post.id !== id) {
                  return post;
                }

                const existingComments =
                  Array.isArray(post.comments)
                    ? post.comments
                    : [];

                /*
                 * BEST CASE:
                 *
                 * The backend returns the updated post:
                 * {
                 *   post: {
                 *     comments: [...]
                 *   }
                 * }
                 */
                const rawComments =
                  Array.isArray(
                    updatedPost?.comments,
                  )
                    ? updatedPost.comments
                    : Array.isArray(
                        result?.comments,
                      )
                      ? result.comments
                      : null;

                if (rawComments) {
                  return {
                    ...post,
                    comments:
                      normalizeComments(
                        rawComments,
                      ),
                  };
                }

                /*
                 * SECOND CASE:
                 *
                 * The backend returns only the newly-created comment:
                 * {
                 *   comment: {...}
                 * }
                 */
                if (result?.comment) {
                  const normalizedNewComment =
                    normalizeComments([
                      result.comment,
                    ])[0];

                  if (normalizedNewComment) {
                    return {
                      ...post,
                      comments: [
                        ...existingComments,
                        normalizedNewComment,
                      ],
                    };
                  }
                }

                /*
                 * FINAL FALLBACK:
                 *
                 * The API returned a successful HTTP response but did
                 * not return the saved comment. We already know the
                 * server accepted the request, so immediately add the
                 * comment to React state.
                 *
                 * This makes the UI show:
                 * 0 -> 1 -> 2 -> 3 ...
                 * without requiring a page refresh.
                 */
                const localComment =
                  normalizeComments([
                    {
                      userId:
                        currentUserId,

                      username:
                        currentUser.username,

                      userPhoto:
                        currentUser.avatar,

                      content:
                        trimmedContent,

                      createdAt:
                        new Date().toISOString(),
                    },
                  ])[0];

                if (!localComment) {
                  return post;
                }

                return {
                  ...post,
                  comments: [
                    ...existingComments,
                    localComment,
                  ],
                };
              },
            ),
        );
      } catch (error) {
        console.error(
          "Comment error:",
          error,
        );

        /*
         * Re-throw so FockisPostCard knows the submission failed and
         * does not clear the text the user typed.
         */
        throw error;
      }
    };


  /* ==========================================================================
     RECORD SHARE
  ========================================================================== */

  const recordShare =
    async (
      id: string,
      destination: ShareDestination,
    ): Promise<boolean> => {
      if (
        !currentUserId ||
        !getAccessToken()
      ) {
        return false;
      }

      try {
        const response =
          await authenticatedFetch(
            `${API_URL}/posts/${id}/share`,
            {
              method: "POST",

              body: JSON.stringify({
                userId:
                  currentUserId,

                destination,
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

        const updatedPost =
          result?.post ||
          result;

        const shares =
          Number(
            result?.shares ??
              updatedPost?.shares ??
              0,
          );

        setPosts(
          (previousPosts) =>
            previousPosts.map(
              (post) =>
                post.id === id
                  ? {
                      ...post,
                      shares,
                    }
                  : post,
            ),
        );

        return true;
      } catch (error) {
        console.error(
          "Share count error:",
          error,
        );

        return false;
      }
    };

  /* ==========================================================================
     COPY LINK
  ========================================================================== */

  const copyPostLink =
    async (
      id: string,
    ) => {
      const shareUrl =
        `${window.location.origin}/posts/${id}`;

      try {
        await navigator.clipboard.writeText(
          shareUrl,
        );

        await recordShare(
          id,
          "copy_link",
        );

        window.alert(
          "Post link copied!",
        );
      } catch (error) {
        console.error(
          "Copy link error:",
          error,
        );
      }
    };

  /* ==========================================================================
     NATIVE SHARE
  ========================================================================== */

  const handleShare =
    async (
      id: string,
    ) => {
      const shareUrl =
        `${window.location.origin}/posts/${id}`;

      if (
        typeof navigator.share ===
        "function"
      ) {
        try {
          await navigator.share({
            title:
              "Check this out on Fockis",

            text:
              "I found this post on Fockis.",

            url:
              shareUrl,
          });

          await recordShare(
            id,
            "other",
          );

          return;
        } catch (error) {
          console.log(
            "Share cancelled:",
            error,
          );
        }
      }

      await copyPostLink(id);
    };

  /* ==========================================================================
     SHARE TO FOCKIS
  ========================================================================== */

  const shareToFockis =
    async (
      id: string,
    ) => {
      const success =
        await recordShare(
          id,
          "friend",
        );

      if (success) {
        window.alert(
          "Post shared to Fockis!",
        );
      }
    };

  /* ==========================================================================
     FACEBOOK
  ========================================================================== */

  const shareToFacebook =
    async (
      id: string,
    ) => {
      const shareUrl =
        `${window.location.origin}/posts/${id}`;

      const facebookUrl =
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareUrl,
        )}`;

      window.open(
        facebookUrl,
        "_blank",
        "noopener,noreferrer",
      );

      await recordShare(
        id,
        "facebook",
      );
    };

  /* ==========================================================================
     WHATSAPP
  ========================================================================== */

  const shareToWhatsApp =
    async (
      id: string,
    ) => {
      const shareUrl =
        `${window.location.origin}/posts/${id}`;

      const whatsappUrl =
        `https://wa.me/?text=${encodeURIComponent(
          `Check out this Fockis post: ${shareUrl}`,
        )}`;

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer",
      );

      await recordShare(
        id,
        "whatsapp",
      );
    };

  /* ==========================================================================
     X
  ========================================================================== */

  const shareToX =
    async (
      id: string,
    ) => {
      const shareUrl =
        `${window.location.origin}/posts/${id}`;

      const xUrl =
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          shareUrl,
        )}&text=${encodeURIComponent(
          "Check this out on Fockis!",
        )}`;

      window.open(
        xUrl,
        "_blank",
        "noopener,noreferrer",
      );

      await recordShare(
        id,
        "x",
      );
    };

  /* ==========================================================================
     TOP BAR
  ========================================================================== */

  const handleTopBarSearch =
    (query: string) => {
      console.log(
        "Search:",
        query,
      );
    };

  /* ==========================================================================
     MARK NOTIFICATION READ
  ========================================================================== */

  const markNotificationRead =
    async (
      id: string,
    ) => {
      try {
        const token =
          getAccessToken();

        if (!token) {
          return;
        }

        const response =
          await fetch(
            `${API_URL}/notifications/${id}/read`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        if (!response.ok) {
          throw new Error(
            await response.text(),
          );
        }

        setNotifications(
          (previous) =>
            previous.map(
              (notification) =>
                notification._id === id
                  ? {
                      ...notification,
                      read: true,
                    }
                  : notification,
            ),
        );

        setNotificationCount(
          (previous) =>
            Math.max(
              previous - 1,
              0,
            ),
        );
      } catch (error) {
        console.error(
          "Mark notification read error:",
          error,
        );
      }
    };

  /* ==========================================================================
     OPEN NOTIFICATIONS
  ========================================================================== */

  const handleOpenNotifications =
    () => {
      console.log(
        "Notifications:",
        notifications,
      );

      if (
        notifications.length > 0
      ) {
        const firstUnread =
          notifications.find(
            (item) =>
              !item.read,
          );

        if (firstUnread) {
          void markNotificationRead(
            firstUnread._id,
          );
        }
      }
    };

  const handleOpenMessages =
    () => {
      console.log(
        "Open messages",
      );
    };

  /* ==========================================================================
     STORY CLICK
  ========================================================================== */

  const handleStoryClick =
    (
      story: FockisStory,
      index: number,
    ) => {
      console.log(
        "Story clicked:",
        story,
        "Index:",
        index,
      );
    };

  /* ==========================================================================
     CREATE POST
  ========================================================================== */

  const handleCreatePost =
    () => {
      document
        .querySelector(
          ".fk-create-post",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    };

  /* ==========================================================================
     RIGHT RAIL
  ========================================================================== */

  const handleTrendClick =
    (
      item: FockisTrendingItem,
    ) => {
      console.log(
        "Trending topic clicked:",
        item,
      );
    };

  const handleFollow =
    (
      user: FockisSuggestedUser,
    ) => {
      console.log(
        "Follow user clicked:",
        user,
      );
    };

  const handleProductClick =
    (
      item: FockisMarketplaceItem,
    ) => {
      console.log(
        "Marketplace product clicked:",
        item,
      );
    };

  /* ==========================================================================
     RETURN
  ========================================================================== */

  return {
    posts,
    stories,

    notifications,
    notificationCount,

    loading,
    hasMore,

    // Attach this to the bottom sentinel in FockisFeedPage.
    feedLoaderRef,

    currentUserId,
    currentUser,

    getInteraction,

    toggleReact,
    toggleRepost,
    toggleSave,
    toggleMenu,

    handleDelete,
    handleEditPost,

    handleComment,
    handleSubmitComment,

    handleShare,
    shareToFockis,
    copyPostLink,
    shareToFacebook,
    shareToWhatsApp,
    shareToX,

    handleView,

    handleCreateStory,
    handleStoryCreated,
    handleStoryClick,

    handleTopBarSearch,

    handleOpenNotifications,
    handleOpenMessages,

    handleCreatePost,

    handleTrendClick,
    handleFollow,
    handleProductClick,

    refreshFeed,
  };
}