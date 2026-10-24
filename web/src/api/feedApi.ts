import { api } from "./api";
import { normalizeEvent } from "../features/events/services/eventsApi";
import type { FeedEventSlot } from "../features/events/types/event.types";

/* ============================================================================
   FEED MODES
   Must match the backend's parseFeedMode (feed/feed-ranking.ts).
============================================================================ */

export type FeedMode =
  | "for-you"
  | "following"
  | "friends"
  | "latest";

export const FEED_MODES: readonly FeedMode[] = [
  "for-you",
  "following",
  "friends",
  "latest",
];

export const DEFAULT_FEED_MODE: FeedMode = "for-you";

export function parseFeedMode(value: unknown): FeedMode {
  const mode = String(value ?? "")
    .trim()
    .toLowerCase();

  return (FEED_MODES as readonly string[]).includes(mode)
    ? (mode as FeedMode)
    : DEFAULT_FEED_MODE;
}

/* ============================================================================
   FEED TYPES
============================================================================ */

export type FeedResponse = {
  feed: any[];
  stories: any[];
  products: any[];
  page: number;
  hasMore: boolean;
  mode?: FeedMode;
  session?: string;
  /** Chronological modes: pass back as `cursor` to get the next page. */
  nextCursor?: string;
  /**
   * Recommended events to show between this page's posts. Each slot names
   * the post it follows. Absent on older backends.
   */
  events: FeedEventSlot[];
  serverTime?: string;
};

export interface FeedRequestOptions {
  /** Defaults to the backend default (For You). */
  mode?: FeedMode;

  /**
   * One id per scrolling session. For You pages requested with the same
   * session are consecutive slices of one ranked list, so the order does
   * not change while the user scrolls.
   */
  session?: string;

  /**
   * Keyset cursor from the previous response's `nextCursor`
   * (Following / Friends / Latest). Ignored by For You.
   */
  cursor?: string;

  /** Event IDs already shown or dismissed in this scrolling session. */
  excludeEvents?: string[];

  /** Viewer location, only when the user allowed it (Events → near me). */
  location?: { latitude: number; longitude: number } | null;

  /** Cancels the request (mode switch, unmount). */
  signal?: AbortSignal;

  /** Overrides the shared client's timeout for this request. */
  timeoutMs?: number;
}

/* ============================================================================
   GET FEED
   Backend:
   GET /feed?page=1&limit=20&mode=for-you&session=...[&cursor=...]

   Authentication is handled by the shared `api` Axios instance.
============================================================================ */

export async function getFeed(
  page: number = 1,
  limit: number = 20,
  options: FeedRequestOptions = {},
): Promise<FeedResponse> {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);

  const response = await api.get<FeedResponse>("/feed", {
    params: {
      page: safePage,
      limit: safeLimit,
      ...(options.mode ? { mode: options.mode } : {}),
      ...(options.session ? { session: options.session } : {}),
      ...(options.cursor ? { cursor: options.cursor } : {}),
      ...(options.excludeEvents?.length
        ? { excludeEvents: options.excludeEvents.join(",") }
        : {}),
      ...(options.location
        ? { lat: options.location.latitude, lng: options.location.longitude }
        : {}),
    },
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.timeoutMs ? { timeout: options.timeoutMs } : {}),
  });

  const data = response.data;

  return {
    feed: Array.isArray(data?.feed)
      ? data.feed
      : [],

    stories: Array.isArray(data?.stories)
      ? data.stories
      : [],

    products: Array.isArray(data?.products)
      ? data.products
      : [],

    page:
      typeof data?.page === "number"
        ? data.page
        : safePage,

    hasMore:
      typeof data?.hasMore === "boolean"
        ? data.hasMore
        : false,

    mode: data?.mode
      ? parseFeedMode(data.mode)
      : undefined,

    session:
      typeof data?.session === "string"
        ? data.session
        : undefined,

    nextCursor:
      typeof data?.nextCursor === "string" && data.nextCursor
        ? data.nextCursor
        : undefined,

    events: parseFeedEvents((data as { events?: unknown })?.events),

    serverTime:
      typeof data?.serverTime === "string" ? data.serverTime : undefined,
  };
}

/* Invalid slots are dropped instead of breaking the page. */
function parseFeedEvents(value: unknown): FeedEventSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const slots: FeedEventSlot[] = [];

  for (const item of value) {
    try {
      if (!item || typeof item !== "object" || !item.event) {
        continue;
      }

      const event = normalizeEvent(item.event);

      slots.push({
        type: "event",
        key: String(item.key ?? `event:${event.id}`),
        afterPostId: String(item.afterPostId ?? ""),
        afterIndex: Number.isFinite(Number(item.afterIndex))
          ? Number(item.afterIndex)
          : 0,
        event,
      });
    } catch {
      // Skip malformed slot.
    }
  }

  return slots;
}
