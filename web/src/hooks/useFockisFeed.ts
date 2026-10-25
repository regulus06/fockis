import { useCallback, useEffect, useRef, useState } from "react";

import { getFeed, type FeedMode } from "../api/feedApi";
import {
  FEED_SCROLL_CONFIG,
  backoffDelay,
  caughtUpCooldown,
  classifyFeedError,
  createdAtMs,
  pickNewPosts,
  selectRecyclable,
  shouldRetry,
  uniqueById,
} from "./feedScrollPolicy";
import { storyApi } from "../api/storyApi";
import {
  excludeList,
  placeFeedEvents,
  type PlacedFeedEvent,
} from "../features/events/utils/feedEventPlacement";
import { readStoredLocation } from "../features/events/hooks/useViewerLocation";

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
   FEED SESSION ID
   One id per scrolling session. The backend stores the For You ranking
   under it, so page 2, 3, ... continue the same order instead of
   re-ranking (which would duplicate or skip posts).
============================================================================ */

function createFeedSessionId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the non-crypto id.
  }

  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/* ============================================================================
   FEED STATUS
   idle       ready; more posts load as the user scrolls
   loading    a manual retry is in progress
   retrying   a recoverable failure; retrying automatically with backoff
   error      automatic retries stopped; the user can retry
   blocked    401/403; no further requests until retry or mode switch
   caught-up  nothing unseen right now; checks continue in the background
   empty      the feed has no posts at all yet
============================================================================ */

export type FeedStatus =
  | "idle"
  | "loading"
  | "retrying"
  | "error"
  | "blocked"
  | "caught-up"
  | "empty";

type LoadReason = "initial" | "scroll" | "continue" | "manual";

/* ============================================================================
   HOOK
============================================================================ */

export function useFockisFeed(mode: FeedMode = "for-you") {
  const [posts, setPosts] = useState<FockisPost[]>([]);
  const [stories, setStories] = useState<FockisStory[]>([]);
  const [products, setProducts] = useState<Record<string, any>[]>([]);

  const [notifications, setNotifications] =
    useState<AppNotification[]>([]);

  const [notificationCount, setNotificationCount] =
    useState(0);

  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [interactions, setInteractions] =
    useState<Record<string, FockisPostInteraction>>({});

  /*
   * Events placed between posts (see features/events). They are kept
   * separate from `posts`, anchored to the post they follow, so posts,
   * interactions and the video reel never see them.
   */
  const [feedEvents, setFeedEvents] = useState<PlacedFeedEvent[]>([]);
  const placedEventIdsRef = useRef<Set<string>>(new Set());
  const dismissedEventIdsRef = useRef<Set<string>>(new Set());
  const takenEventAnchorsRef = useRef<Set<string>>(new Set());

  /* ==========================================================================
     FEED LOADING STATE
     Pagination lives in refs so a mode switch can reset it synchronously
     and no callback ever reads a stale page, cursor or session. React
     state mirrors only what the UI renders.

     - feedGenerationRef increments on every mode switch and on unmount;
       responses from an older generation are ignored.
     - isLoadingMoreRef makes next-page loading single-flight.
     - nextAllowedAtRef is the one gate for backoff and cooldowns: nothing
       requests the next page before it.
     - For You runs in "cycles". Each cycle is one ranked session on the
       server. When a cycle ends, the next one starts with a new session
       (fresh ranking, already-viewed posts demoted). Only when a whole
       cycle had nothing unseen may real, already-shown posts come back,
       and only after enough other posts were shown in between.
  ========================================================================== */

  const [feedStatus, setFeedStatus] =
    useState<FeedStatus>("idle");
  const [feedError, setFeedError] =
    useState<string | null>(null);
  const [pendingNewPosts, setPendingNewPosts] =
    useState<FockisPost[]>([]);

  // Bottom sentinel, attached by FockisFeedPage.
  const feedLoaderRef =
    useRef<HTMLDivElement | null>(null);

  const pageRef = useRef(1);
  const cursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const sessionIdRef = useRef<string>(createFeedSessionId());
  const feedGenerationRef = useRef(0);
  const lastModeRef = useRef<FeedMode>(mode);

  const isLoadingMoreRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const continueTimerRef = useRef<number | null>(null);
  const nextAllowedAtRef = useRef(0);
  // Why the gate is closed: an error backoff can be lifted early (back
  // online, manual retry); a caught-up cooldown cannot.
  const gateKindRef = useRef<"none" | "backoff" | "cooldown">("none");
  const retryAttemptRef = useRef(0);
  const emptyPagesRef = useRef(0);
  const blockedRef = useRef(false);
  const sentinelVisibleRef = useRef(false);

  const cycleRef = useRef(0);
  const cycleAddedRef = useRef(0);
  const exhaustedStreakRef = useRef(0);

  const displayedIdsRef = useRef<Set<string>>(new Set());
  const lastShownAtRef = useRef<Map<string, number>>(new Map());
  const renderedCountRef = useRef(0);

  const isCheckingNewRef = useRef(false);
  const newestKnownMsRef = useRef(Date.now() - 2 * 60_000);
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const lastVisibilityRefreshRef = useRef(0);
  const pollFailuresRef = useRef(0);
  const pollBlockedUntilRef = useRef(0);

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
     FEED LIST HELPERS
  ========================================================================== */

  const registerInteractions =
    useCallback((items: FockisPost[]) => {
      if (items.length === 0) {
        return;
      }

      setInteractions((previous) => {
        const next = { ...previous };

        items.forEach((post) => {
          next[post.id] = {
            ...(next[post.id] || {
              reacted: false,
              reposted: false,
              saved: false,
              menuOpen: false,
            }),
            reacted: post.likedBy.includes(currentUserId),
            reposted: post.repostedBy.includes(currentUserId),
          };
        });

        return next;
      });
    }, [currentUserId]);

  const trackNewest = (items: FockisPost[]) => {
    for (const item of items) {
      const created = createdAtMs(item);

      if (created > newestKnownMsRef.current) {
        newestKnownMsRef.current = created;
      }
    }
  };

  /**
   * Appends to the bottom. Recycled posts get their own render key so
   * React keeps the earlier card (and its media) untouched.
   */
  const appendPosts =
    useCallback((items: FockisPost[], recycled = false) => {
      if (items.length === 0) {
        return;
      }

      const stamped = items.map((post, index) => {
        const position = renderedCountRef.current + index;

        lastShownAtRef.current.set(post.id, position);
        displayedIdsRef.current.add(post.id);

        return recycled
          ? {
              ...post,
              feedKey: `${post.id}~r${position}`,
              feedRecycled: true,
            }
          : post;
      });

      renderedCountRef.current += stamped.length;
      trackNewest(items);

      setPosts((previous) => {
        if (recycled) {
          return [...previous, ...stamped];
        }

        const present = new Set(previous.map((post) => post.id));

        return [
          ...previous,
          ...stamped.filter((post) => !present.has(post.id)),
        ];
      });

      registerInteractions(items);
    }, [registerInteractions]);

  /** Inserts genuinely new posts above the current list. */
  const prependPosts =
    useCallback((items: FockisPost[]) => {
      if (items.length === 0) {
        return;
      }

      items.forEach((post) => {
        displayedIdsRef.current.add(post.id);
        pendingIdsRef.current.delete(post.id);
        lastShownAtRef.current.set(post.id, renderedCountRef.current);
      });

      renderedCountRef.current += items.length;
      trackNewest(items);

      setPosts((previous) => {
        const present = new Set(previous.map((post) => post.id));

        return [
          ...items.filter((post) => !present.has(post.id)),
          ...previous,
        ];
      });

      registerInteractions(items);
    }, [registerInteractions]);

  /* ==========================================================================
     LOAD NEXT PAGE
     Called by the bottom sentinel, by scheduled continuations and by the
     manual retry. Never runs twice at once and never before
     nextAllowedAtRef.
  ========================================================================== */

  const loadNextPageRef =
    useRef<(reason?: LoadReason) => Promise<void>>(async () => undefined);

  const scheduleContinue = useCallback(() => {
    if (continueTimerRef.current !== null) {
      window.clearTimeout(continueTimerRef.current);
      continueTimerRef.current = null;
    }

    if (blockedRef.current || !sentinelVisibleRef.current) {
      return;
    }

    const delay = Math.max(0, nextAllowedAtRef.current - Date.now());

    // Never wait "forever": a hard stop is expressed by blockedRef.
    if (!Number.isFinite(delay)) {
      return;
    }

    continueTimerRef.current = window.setTimeout(() => {
      continueTimerRef.current = null;

      if (sentinelVisibleRef.current) {
        void loadNextPageRef.current("continue");
      }
    }, delay);
  }, []);

  const loadNextPage =
    useCallback(async (reason: LoadReason = "scroll") => {
      if (isLoadingMoreRef.current || blockedRef.current) {
        return;
      }

      if (
        reason !== "manual" &&
        Date.now() < nextAllowedAtRef.current
      ) {
        return;
      }

      const isForYou = mode === "for-you";

      // The current list is exhausted.
      if (!hasMoreRef.current) {
        if (!isForYou) {
          // Chronological modes really end here. New posts still arrive
          // through the background check.
          setFeedStatus(
            renderedCountRef.current > 0 ? "caught-up" : "empty",
          );
          return;
        }

        // For You: start a fresh ranked cycle with a new session.
        cycleRef.current += 1;
        cycleAddedRef.current = 0;
        emptyPagesRef.current = 0;
        sessionIdRef.current = createFeedSessionId();
        pageRef.current = 1;
        hasMoreRef.current = true;
      }

      const generation = feedGenerationRef.current;
      const controller = new AbortController();

      abortRef.current = controller;
      isLoadingMoreRef.current = true;
      setLoading(true);

      if (reason === "manual") {
        setFeedStatus("loading");
      }

      try {
        const res = await getFeed(
          pageRef.current,
          FEED_SCROLL_CONFIG.pageSize,
          {
            mode,
            session: isForYou ? sessionIdRef.current : undefined,
            cursor: isForYou ? undefined : cursorRef.current,
            excludeEvents: excludeList([
              ...placedEventIdsRef.current,
              ...dismissedEventIdsRef.current,
            ]),
            location: readStoredLocation(),
            signal: controller.signal,
            timeoutMs: FEED_SCROLL_CONFIG.requestTimeoutMs,
          },
        );

        if (generation !== feedGenerationRef.current) {
          return;
        }

        if (Array.isArray(res?.products)) {
          setProducts((previous) => {
            const merged = new Map<string, Record<string, any>>();
            for (const product of previous) {
              const id = String(product?._id ?? product?.id ?? "");
              if (id) merged.set(id, product);
            }
            for (const product of res.products) {
              if (!product || typeof product !== "object") continue;
              const id = String(product._id ?? product.id ?? "");
              if (id) merged.set(id, product);
            }
            return Array.from(merged.values());
          });
        }

        const pagePosts = mapFeedItemsToPosts(
          Array.isArray(res?.feed)
            ? (res.feed as BackendPostData[])
            : [],
        );

        const known = new Set([
          ...displayedIdsRef.current,
          ...pendingIdsRef.current,
        ]);

        const unseen = uniqueById(pagePosts, known);

        pageRef.current += 1;
        cursorRef.current = res?.nextCursor;
        hasMoreRef.current = Boolean(res?.hasMore);
        retryAttemptRef.current = 0;
        setFeedError(null);

        let added = 0;

        if (unseen.length > 0) {
          appendPosts(unseen);
          added = unseen.length;

          const placed = placeFeedEvents(
            Array.isArray(res?.events) ? res.events : [],
            pagePosts.map((post) => post.id),
            unseen.map((post) => post.id),
            new Set([
              ...placedEventIdsRef.current,
              ...dismissedEventIdsRef.current,
            ]),
            takenEventAnchorsRef.current,
          );

          if (placed.length > 0) {
            placed.forEach((item) =>
              placedEventIdsRef.current.add(item.event.id),
            );
            setFeedEvents((previous) => [...previous, ...placed]);
          }
          cycleAddedRef.current += unseen.length;
          exhaustedStreakRef.current = 0;
        } else if (
          isForYou &&
          cycleRef.current > 0 &&
          exhaustedStreakRef.current > 0
        ) {
          // A whole earlier cycle had nothing unseen: allow real posts to
          // come back, spaced out, instead of a dead end.
          const recycled = selectRecyclable(
            pagePosts.filter((post) => !pendingIdsRef.current.has(post.id)),
            lastShownAtRef.current,
            renderedCountRef.current,
            FEED_SCROLL_CONFIG.recycleMinGap,
          );

          if (recycled.length > 0) {
            appendPosts(recycled, true);
            added = recycled.length;
          }
        }

        emptyPagesRef.current = added > 0 ? 0 : emptyPagesRef.current + 1;

        // A refresh cycle that keeps returning only posts already shown
        // is cut short instead of being paged through to the end.
        if (
          isForYou &&
          cycleRef.current > 0 &&
          cycleAddedRef.current === 0 &&
          added === 0 &&
          emptyPagesRef.current >= FEED_SCROLL_CONFIG.maxEmptyPagesInARow
        ) {
          hasMoreRef.current = false;
        }

        if (!hasMoreRef.current) {
          if (isForYou && cycleAddedRef.current === 0 && added === 0) {
            exhaustedStreakRef.current += 1;
            gateKindRef.current = "cooldown";
            nextAllowedAtRef.current =
              Date.now() + caughtUpCooldown(exhaustedStreakRef.current);
            setFeedStatus(
              renderedCountRef.current > 0 ? "caught-up" : "empty",
            );
            // Nothing unseen in the ranking: look for brand-new posts.
            void checkForNewPostsRef.current();
          } else if (isForYou) {
            gateKindRef.current = "none";
            nextAllowedAtRef.current = 0;
            setFeedStatus("idle");
          } else {
            setFeedStatus(
              renderedCountRef.current > 0 ? "caught-up" : "empty",
            );
          }
        } else if (emptyPagesRef.current >= FEED_SCROLL_CONFIG.maxEmptyPagesInARow) {
          // Several pages in a row added nothing: slow down.
          gateKindRef.current = "cooldown";
          nextAllowedAtRef.current =
            Date.now() +
            backoffDelay(
              emptyPagesRef.current - FEED_SCROLL_CONFIG.maxEmptyPagesInARow,
            );
          setFeedStatus("idle");
        } else {
          gateKindRef.current = "none";
          nextAllowedAtRef.current = 0;
          setFeedStatus("idle");
        }
      } catch (error) {
        if (generation !== feedGenerationRef.current) {
          return;
        }

        const info = classifyFeedError(error);

        if (info.kind === "aborted") {
          return;
        }

        if (info.kind === "auth" || info.kind === "forbidden") {
          // The shared client already signs the user out on 401.
          blockedRef.current = true;
          setFeedStatus("blocked");
          setFeedError(
            info.kind === "auth"
              ? "Your session has ended. Please sign in again."
              : "You don't have access to this feed.",
          );
          return;
        }

        const attempt = retryAttemptRef.current;

        if (shouldRetry(info, attempt)) {
          retryAttemptRef.current = attempt + 1;
          gateKindRef.current = "backoff";
          nextAllowedAtRef.current =
            Date.now() + backoffDelay(attempt, FEED_SCROLL_CONFIG, info.retryAfterMs);
          setFeedStatus("retrying");
          setFeedError(
            info.kind === "rate-limited"
              ? "Fockis is busy. Trying again shortly…"
              : "Connection problem. Trying again…",
          );
        } else {
          // Stop automatic retries. The user can retry, and coming back
          // online or to the tab resets this.
          gateKindRef.current = "backoff";
          nextAllowedAtRef.current =
            Date.now() + FEED_SCROLL_CONFIG.maxBackoffMs;
          setFeedStatus("error");
          setFeedError(
            info.kind === "server"
              ? "Fockis couldn't load more posts right now."
              : "More posts couldn't be loaded.",
          );
        }

        console.error("Fockis Feed error:", error);
      } finally {
        if (generation === feedGenerationRef.current) {
          isLoadingMoreRef.current = false;
          abortRef.current = null;
          setLoading(false);
          // Keep filling while the sentinel is still on screen.
          scheduleContinue();
        }
      }
    }, [mode, appendPosts, scheduleContinue]);

  /** Kept for callers of the previous API name. */
  const loadFeed = loadNextPage;

  /* ==========================================================================
     NEW POSTS
     Checks the newest posts (Latest for For You, the same mode otherwise)
     and keeps only posts created after the newest one this feed already
     knew about. Near the top they are inserted directly; further down
     they wait behind the "new posts" pill so the reading position never
     jumps. Existing posts are never reordered.
  ========================================================================== */

  const checkForNewPostsRef =
    useRef<(options?: { insertNow?: boolean }) => Promise<number>>(
      async () => 0,
    );

  const checkForNewPosts =
    useCallback(async (
      options: { insertNow?: boolean } = {},
    ): Promise<number> => {
      if (isCheckingNewRef.current || blockedRef.current) {
        return 0;
      }

      if (
        !options.insertNow &&
        Date.now() < pollBlockedUntilRef.current
      ) {
        return 0;
      }

      isCheckingNewRef.current = true;

      const generation = feedGenerationRef.current;

      try {
        const res = await getFeed(1, FEED_SCROLL_CONFIG.pageSize, {
          // No session: a one-off check must not store or replace the
          // ranking being scrolled.
          mode: mode === "for-you" ? "latest" : mode,
          timeoutMs: FEED_SCROLL_CONFIG.requestTimeoutMs,
        });

        if (generation !== feedGenerationRef.current) {
          return 0;
        }

        pollFailuresRef.current = 0;
        pollBlockedUntilRef.current = 0;

        if (Array.isArray(res?.products)) {
          setProducts((previous) => {
            const merged = new Map<string, Record<string, any>>();
            for (const product of previous) {
              const id = String(product?._id ?? product?.id ?? "");
              if (id) merged.set(id, product);
            }
            for (const product of res.products) {
              if (!product || typeof product !== "object") continue;
              const id = String(product._id ?? product.id ?? "");
              if (id) merged.set(id, product);
            }
            return Array.from(merged.values());
          });
        }

        const latest = mapFeedItemsToPosts(
          Array.isArray(res?.feed)
            ? (res.feed as BackendPostData[])
            : [],
        );

        const known = new Set([
          ...displayedIdsRef.current,
          ...pendingIdsRef.current,
        ]);

        // An empty feed shows whatever exists now.
        const fresh =
          displayedIdsRef.current.size === 0
            ? uniqueById(latest, known)
            : pickNewPosts(latest, newestKnownMsRef.current, known);

        if (fresh.length === 0) {
          return 0;
        }

        const nearTop =
          typeof window === "undefined" ||
          window.scrollY <= FEED_SCROLL_CONFIG.autoInsertScrollTop;

        if (
          options.insertNow ||
          nearTop ||
          displayedIdsRef.current.size === 0
        ) {
          prependPosts(fresh);

          if (renderedCountRef.current > 0) {
            setFeedStatus((status) =>
              status === "empty" ? "caught-up" : status,
            );
          }
        } else {
          fresh.forEach((post) => pendingIdsRef.current.add(post.id));
          trackNewest(fresh);
          setPendingNewPosts((previous) => [
            ...fresh,
            ...previous.filter((post) => !fresh.some((item) => item.id === post.id)),
          ]);
        }

        return fresh.length;
      } catch (error) {
        const info = classifyFeedError(error);

        if (info.kind === "aborted") {
          return 0;
        }

        if (info.kind === "auth") {
          blockedRef.current = true;
          return 0;
        }

        pollFailuresRef.current += 1;
        pollBlockedUntilRef.current =
          Date.now() +
          backoffDelay(
            pollFailuresRef.current - 1,
            {
              baseBackoffMs: FEED_SCROLL_CONFIG.pollIntervalMs,
              maxBackoffMs: 15 * 60_000,
            },
            info.retryAfterMs,
          );

        console.error("Feed refresh error:", error);
        return 0;
      } finally {
        isCheckingNewRef.current = false;
      }
    }, [mode, prependPosts]);

  /** Shows posts waiting behind the "new posts" pill. */
  const showPendingNewPosts = useCallback(() => {
    if (pendingNewPosts.length > 0) {
      prependPosts(pendingNewPosts);
    }

    setPendingNewPosts([]);
  }, [pendingNewPosts, prependPosts]);

  /* ==========================================================================
     REFRESH FEED
     Public entry point (e.g. called by FockisCreatePost after posting).
     The viewer's own new post is inserted right away.
  ========================================================================== */

  const refreshFeed =
    useCallback(async () => {
      await checkForNewPosts({ insertNow: true });
    }, [checkForNewPosts]);

  /** Manual retry after an error. */
  const retryFeed = useCallback(() => {
    blockedRef.current = false;
    retryAttemptRef.current = 0;

    if (gateKindRef.current === "backoff") {
      gateKindRef.current = "none";
      nextAllowedAtRef.current = 0;
    }

    setFeedError(null);
    void loadNextPageRef.current("manual");
  }, []);

  // Always call the newest versions from timers and observers.
  useEffect(() => {
    loadNextPageRef.current = loadNextPage;
    checkForNewPostsRef.current = checkForNewPosts;
  }, [loadNextPage, checkForNewPosts]);

  /* ==========================================================================
     INITIAL LOAD AND UNMOUNT
  ========================================================================== */

  useEffect(() => {
    void loadNextPage("initial");
    void loadStories();
    void loadNotifications();
    void loadSavedPostIds();

    return () => {
      // Ignore anything still in flight and stop all timers.
      feedGenerationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      isLoadingMoreRef.current = false;
      isCheckingNewRef.current = false;

      if (continueTimerRef.current !== null) {
        window.clearTimeout(continueTimerRef.current);
        continueTimerRef.current = null;
      }
    };
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================================================================
     FEED MODE SWITCH (For You / Following / Latest / Friends)
     Only runs when the mode actually changes. Cancels the old request,
     resets pagination, dedupe and cycle state, and loads page 1.
  ========================================================================== */

  useEffect(() => {
    if (lastModeRef.current === mode) {
      return;
    }

    lastModeRef.current = mode;
    feedGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;

    if (continueTimerRef.current !== null) {
      window.clearTimeout(continueTimerRef.current);
      continueTimerRef.current = null;
    }

    sessionIdRef.current = createFeedSessionId();
    pageRef.current = 1;
    cursorRef.current = undefined;
    hasMoreRef.current = true;
    isLoadingMoreRef.current = false;
    isCheckingNewRef.current = false;
    nextAllowedAtRef.current = 0;
    gateKindRef.current = "none";
    retryAttemptRef.current = 0;
    emptyPagesRef.current = 0;
    blockedRef.current = false;
    cycleRef.current = 0;
    cycleAddedRef.current = 0;
    exhaustedStreakRef.current = 0;
    displayedIdsRef.current = new Set();
    lastShownAtRef.current = new Map();
    renderedCountRef.current = 0;
    pendingIdsRef.current = new Set();
    newestKnownMsRef.current = Date.now() - 2 * 60_000;
    placedEventIdsRef.current = new Set();
    takenEventAnchorsRef.current = new Set();

    setPosts([]);
    setProducts([]);
    setFeedEvents([]);
    setPendingNewPosts([]);
    setFeedStatus("idle");
    setFeedError(null);
    setLoading(false);

    window.scrollTo({ top: 0, behavior: "auto" });

    void loadNextPage("initial");
  }, [mode, loadNextPage]);

  /* ==========================================================================
     INFINITE SCROLL SENTINEL
     One IntersectionObserver for the life of the feed. It only records
     whether the sentinel is near the viewport and asks for the next page;
     all gating (single flight, backoff, cooldown) is in loadNextPage.
  ========================================================================== */

  useEffect(() => {
    const element = feedLoaderRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);

        sentinelVisibleRef.current = visible;

        if (visible) {
          void loadNextPageRef.current("scroll");
        } else if (continueTimerRef.current !== null) {
          window.clearTimeout(continueTimerRef.current);
          continueTimerRef.current = null;
        }
      },
      {
        root: null,
        rootMargin: FEED_SCROLL_CONFIG.prefetchRootMargin,
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      sentinelVisibleRef.current = false;
    };
  }, []);

  /* ==========================================================================
     BACKGROUND NEW-POST CHECKS
     - every pollIntervalMs while the tab is visible (paused when hidden)
     - when the user returns (visibilitychange, focus, pageshow), debounced
     - when the network comes back, which also lifts an error backoff
     The backend has no "new post" socket event, so this is the only
     live-update path for the feed (no duplicate polling).
  ========================================================================== */

  useEffect(() => {
    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();

      if (
        now - lastVisibilityRefreshRef.current <
        FEED_SCROLL_CONFIG.visibilityRefreshCooldownMs
      ) {
        return;
      }

      lastVisibilityRefreshRef.current = now;
      void checkForNewPostsRef.current();

      // A suspended tab may have missed a scheduled continuation.
      if (sentinelVisibleRef.current) {
        void loadNextPageRef.current("continue");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        maybeRefresh();
      }
    };

    const handleOnline = () => {
      retryAttemptRef.current = 0;

      // Lift an error backoff only; a caught-up cooldown stays.
      if (!blockedRef.current && gateKindRef.current === "backoff") {
        gateKindRef.current = "none";
        nextAllowedAtRef.current = 0;
      }

      pollBlockedUntilRef.current = 0;
      lastVisibilityRefreshRef.current = 0;
      maybeRefresh();
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkForNewPostsRef.current();
      }
    }, FEED_SCROLL_CONFIG.pollIntervalMs);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // hasMore kept for existing callers: false only once the feed is
  // caught up or empty.
  useEffect(() => {
    setHasMore(feedStatus !== "caught-up" && feedStatus !== "empty");
  }, [feedStatus]);

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

        pendingIdsRef.current.delete(id);
        setPendingNewPosts((pending) =>
          pending.filter((post) => post.id !== id),
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
     FEED EVENTS
  ========================================================================== */

  /** Hides an event card for the rest of this session (and from later pages). */
  const dismissFeedEvent = useCallback((eventId: string) => {
    dismissedEventIdsRef.current.add(eventId);
    setFeedEvents((previous) =>
      previous.filter((item) => item.event.id !== eventId),
    );
  }, []);

  /** Lets rails report what they show, so the feed does not repeat it. */
  const markEventsShown = useCallback((eventIds: string[]) => {
    eventIds.forEach((id) => placedEventIdsRef.current.add(id));
  }, []);

  /* ==========================================================================
     RETURN
  ========================================================================== */

  return {
    posts,
    stories,
    products,

    notifications,
    notificationCount,

    loading,
    hasMore,

    // Attach this to the bottom sentinel in FockisFeedPage.
    feedLoaderRef,
    feedStatus,
    feedError,
    retryFeed,
    loadFeed,
    pendingNewPostsCount: pendingNewPosts.length,
    showPendingNewPosts,

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

    feedEvents,
    dismissFeedEvent,
    markEventsShown,
  };
}