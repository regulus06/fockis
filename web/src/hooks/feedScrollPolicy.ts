/* ============================================================================
   FOCKIS FEED SCROLL POLICY
   Pure helpers used by useFockisFeed for infinite scrolling, refresh and
   recovery. No React here, so the rules can be tested in isolation.
============================================================================ */

export const FEED_SCROLL_CONFIG = {
  /** Posts per request. */
  pageSize: 10,

  /** How early the bottom sentinel triggers the next page. */
  prefetchRootMargin: "0px 0px 1400px 0px",

  /** Request timeout for feed calls (the shared client default is 15 s). */
  requestTimeoutMs: 15_000,

  /**
   * Pages in a row that add nothing new (all duplicates or empty) before
   * the loader stops chaining requests and backs off.
   */
  maxEmptyPagesInARow: 3,

  /** Recoverable failures (network, timeout, 429) retried this many times. */
  maxRetries: 4,

  /** Server errors (5xx) are retried at most this many times. */
  maxServerRetries: 2,

  baseBackoffMs: 2_000,
  maxBackoffMs: 120_000,

  /** Wait after the feed is exhausted before trying a fresh cycle. */
  caughtUpCooldownMs: 45_000,
  maxCaughtUpCooldownMs: 5 * 60_000,

  /**
   * For You only: once a whole ranked cycle produced nothing unseen, real
   * posts already shown can come back, but only if at least this many
   * other posts were shown since. Smaller pools simply end in
   * "You're all caught up" instead of repeating.
   */
  recycleMinGap: 30,

  /** Background check for new posts while the tab is visible. */
  pollIntervalMs: 60_000,

  /** Debounce for focus / visibilitychange / pageshow / online. */
  visibilityRefreshCooldownMs: 15_000,

  /** Near the top, new posts are inserted directly instead of queued. */
  autoInsertScrollTop: 240,
} as const;

/* ============================================================================
   ERRORS
============================================================================ */

export type FeedErrorKind =
  | "aborted"
  | "auth"
  | "forbidden"
  | "rate-limited"
  | "server"
  | "timeout"
  | "network"
  | "unknown";

export interface ClassifiedFeedError {
  kind: FeedErrorKind;
  status?: number;
  /** From a Retry-After header, when the server sent one. */
  retryAfterMs?: number;
}

interface ErrorLike {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    headers?: Record<string, unknown> | { get?: (name: string) => unknown };
  };
}

function readHeader(
  headers: unknown,
  name: string,
): unknown {
  if (!headers) {
    return undefined;
  }

  if (typeof (headers as { get?: unknown }).get === "function") {
    try {
      return (headers as { get: (key: string) => unknown }).get(name);
    } catch {
      return undefined;
    }
  }

  const record = headers as Record<string, unknown>;

  return record[name] ?? record[name.toLowerCase()];
}

export function parseRetryAfter(value: unknown, now = Date.now()): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const date = Date.parse(String(value));

  if (Number.isFinite(date)) {
    return Math.max(0, date - now);
  }

  return undefined;
}

export function classifyFeedError(error: unknown): ClassifiedFeedError {
  const value = (error ?? {}) as ErrorLike;
  const name = String(value.name ?? "");
  const code = String(value.code ?? "");

  if (name === "CanceledError" || name === "AbortError" || code === "ERR_CANCELED") {
    return { kind: "aborted" };
  }

  const status = Number(value.response?.status);

  if (Number.isFinite(status) && status > 0) {
    if (status === 401) return { kind: "auth", status };
    if (status === 403) return { kind: "forbidden", status };

    if (status === 429) {
      return {
        kind: "rate-limited",
        status,
        retryAfterMs: parseRetryAfter(
          readHeader(value.response?.headers, "retry-after"),
        ),
      };
    }

    if (status === 408) return { kind: "timeout", status };
    if (status >= 500) return { kind: "server", status };

    return { kind: "unknown", status };
  }

  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || /timeout/i.test(String(value.message ?? ""))) {
    return { kind: "timeout" };
  }

  if (code === "ERR_NETWORK" || /network/i.test(String(value.message ?? ""))) {
    return { kind: "network" };
  }

  return { kind: "unknown" };
}

/** Whether a failure of this kind should be retried automatically. */
export function shouldRetry(
  error: ClassifiedFeedError,
  attempt: number,
  config = FEED_SCROLL_CONFIG,
): boolean {
  switch (error.kind) {
    case "network":
    case "timeout":
    case "rate-limited":
      return attempt < config.maxRetries;
    case "server":
      return attempt < config.maxServerRetries;
    default:
      return false;
  }
}

/**
 * Exponential backoff with up to 20% jitter, capped. `attempt` is 0 for
 * the first retry. A server Retry-After always wins when it is longer.
 */
export function backoffDelay(
  attempt: number,
  config: { baseBackoffMs: number; maxBackoffMs: number } = FEED_SCROLL_CONFIG,
  retryAfterMs?: number,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(
    config.maxBackoffMs,
    config.baseBackoffMs * Math.pow(2, Math.max(0, attempt)),
  );
  const jittered = Math.round(exponential * (1 + 0.2 * random()));
  const capped = Math.min(config.maxBackoffMs, jittered);

  return retryAfterMs && retryAfterMs > capped
    ? Math.min(retryAfterMs, 15 * 60_000)
    : capped;
}

/** Cooldown after the feed was exhausted `streak` times in a row. */
export function caughtUpCooldown(streak: number, config = FEED_SCROLL_CONFIG): number {
  return Math.min(
    config.maxCaughtUpCooldownMs,
    config.caughtUpCooldownMs * Math.pow(2, Math.max(0, streak - 1)),
  );
}

/* ============================================================================
   DEDUPLICATION AND RECYCLING
============================================================================ */

interface HasId {
  id: string;
}

/** Incoming items whose id is not known yet, without duplicates among themselves. */
export function uniqueById<T extends HasId>(
  incoming: readonly T[],
  known: ReadonlySet<string>,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of incoming) {
    if (!item?.id || known.has(item.id) || seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    result.push(item);
  }

  return result;
}

/**
 * Choose already-shown posts that may be shown again.
 *
 * `lastShownAt` maps a post id to the feed position it was last rendered
 * at; `nextPosition` is the position the first recycled post would take.
 * A post only returns when at least `minGap` other posts have been shown
 * since, and never twice in one batch.
 */
export function selectRecyclable<T extends HasId>(
  candidates: readonly T[],
  lastShownAt: ReadonlyMap<string, number>,
  nextPosition: number,
  minGap: number,
): T[] {
  const chosen: T[] = [];
  const used = new Set<string>();

  for (const item of candidates) {
    if (!item?.id || used.has(item.id)) {
      continue;
    }

    const shownAt = lastShownAt.get(item.id);
    const position = nextPosition + chosen.length;

    if (shownAt !== undefined && position - shownAt < minGap) {
      continue;
    }

    used.add(item.id);
    chosen.push(item);
  }

  return chosen;
}

/* ============================================================================
   NEW POSTS
============================================================================ */

interface HasCreatedAt extends HasId {
  createdAt?: string;
}

export function createdAtMs(item: { createdAt?: string }): number {
  const value = item?.createdAt ? Date.parse(item.createdAt) : NaN;

  return Number.isFinite(value) ? value : 0;
}

/**
 * Posts in a "latest" response that are genuinely new: created after the
 * newest post this feed already knew about, and not already displayed or
 * queued.
 */
export function pickNewPosts<T extends HasCreatedAt>(
  incoming: readonly T[],
  newestKnownMs: number,
  known: ReadonlySet<string>,
): T[] {
  return uniqueById(incoming, known)
    .filter((item) => createdAtMs(item) > newestKnownMs)
    .sort((a, b) => createdAtMs(b) - createdAtMs(a));
}
