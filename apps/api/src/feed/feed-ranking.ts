/*
|--------------------------------------------------------------------------
| FOCKIS FEED RANKING
|--------------------------------------------------------------------------
|
| Pure ranking logic for the "For You" feed. No database or Nest code
| lives here, so every rule can be unit-tested in isolation
| (see feed-ranking.spec.ts).
|
| Final score (each component normalized to 0..1, weights configurable):
|
|   27% relevance       viewer's own interaction history (hashtags and
|                       media types they engage with)
|   23% relationships   friends, followed accounts, and creators the
|                       viewer regularly interacts with
|   18% engagement      meaningful comments, shares, reposts, likes,
|                       gifts - normalized per view and per audience
|                       size, then percentile-ranked so viral posts
|                       cannot dominate
|   14% freshness       short-term decay plus a long tail, so new posts
|                       get an advantage but a week-old post is still
|                       competitive (not near zero)
|    8% discovery       creators the viewer has no relationship with,
|                       with a bonus for smaller creators
|   10% exploration     a bounded, deterministic per-session value. It
|                       breaks the ties that otherwise fall back to
|                       "newest first" (the reason a feed with little
|                       engagement data looked chronological) and makes
|                       each new session surface a different mix. It
|                       can only move a post within that 10% band; it
|                       is never a shuffle.
|
| A component whose input signal does not exist for this viewer (for
| example relevance for a brand-new account with no history) is left
| out and the remaining weights are renormalized. Nothing is invented.
|
| Adjustments after the weighted score:
|   - posts the viewer has already viewed (Post.viewedBy) are demoted,
|     not removed
|
| A deterministic diversity pass then spaces out posts from the same
| creator, breaks up runs of the same media type, the same hashtag
| topic and the same age band, and guarantees regular discovery slots.
|
| Ranking never changes a post's createdAt. Position and displayed age
| are independent.
|
*/

/* ============================================================================
   FEED MODES
============================================================================ */

export type FeedMode =
  | 'for-you'
  | 'following'
  | 'friends'
  | 'latest';

export const DEFAULT_FEED_MODE: FeedMode = 'for-you';

export function parseFeedMode(value: unknown): FeedMode {
  const mode = String(value ?? '')
    .trim()
    .toLowerCase();

  if (
    mode === 'for-you' ||
    mode === 'following' ||
    mode === 'friends' ||
    mode === 'latest'
  ) {
    return mode;
  }

  if (mode === 'foryou' || mode === 'for_you') {
    return 'for-you';
  }

  return DEFAULT_FEED_MODE;
}

/* ============================================================================
   CENTRAL CONFIGURATION
============================================================================ */

export interface FeedRankingWeights {
  relevance: number;
  relationships: number;
  engagement: number;
  freshness: number;
  discovery: number;
  exploration: number;
}

export type RankingComponent = keyof FeedRankingWeights;

export interface FeedRankingConfig {
  /** Starting weights. Must be non-negative; they are renormalized. */
  weights: FeedRankingWeights;

  /** Most-recent visible posts considered for one ranking pass. */
  candidatePoolSize: number;

  /**
   * Older posts added to the pool when the recent pool is full, chosen
   * by their stored engagement score (Post.score). Lets relevant
   * evergreen posts compete instead of being cut off by age alone.
   * 0 disables.
   */
  evergreenPoolSize: number;

  /** Hours for the short-term part of freshness to halve. */
  freshnessHalfLifeHours: number;

  freshness: {
    /** Share of freshness from the long tail (the rest decays fast). */
    longTailShare: number;
    /** Days at which the long-tail part has fallen to one half. */
    longTailDays: number;
  };

  engagement: {
    likeWeight: number;
    commentWeight: number;
    repostWeight: number;
    shareWeight: number;
    giftWeight: number;
    /** Bayesian smoothing: posts with few views pull toward the average rate. */
    priorViews: number;
    /** Share of engagement from per-view rate; the rest is audience-normalized volume. */
    rateShare: number;
  };

  /** How much each kind of viewer interaction counts toward affinity. */
  history: {
    like: number;
    comment: number;
    repost: number;
    share: number;
  };

  relationships: {
    friend: number;
    follow: number;
    ownPost: number;
    /** Ceiling for interaction-based affinity with a creator. */
    affinityMax: number;
    /** Interaction weight at which affinity reaches ~63% of its ceiling. */
    affinitySaturation: number;
  };

  relevance: {
    /** Interactions needed before relevance is treated as available. */
    minHistoryInteractions: number;
    /** Blend of hashtag match vs media-type match when a post has hashtags. */
    hashtagShare: number;
  };

  discovery: {
    base: number;
    smallCreatorBonus: number;
  };

  /** Score multiplier for posts the viewer has already viewed. */
  seenPenalty: number;

  diversity: {
    /** A creator may appear at most once in any window of this many posts. */
    minAuthorGap: number;
    /** Score multiplier per post a creator already has in the feed. */
    authorRepeatDecay: number;
    /** After this many same-type posts in a row, apply the run penalty. */
    sameKindRunLength: number;
    sameKindRunPenalty: number;
    /** Multiplier when a post shares a hashtag with the previous post. */
    sameTopicPenalty: number;
    /** After this many posts from the same age band, apply the penalty. */
    sameAgeRunLength: number;
    sameAgeRunPenalty: number;
    /** How far ahead the reranker looks for a better-fitting post. */
    lookahead: number;
    /** At least one discovery post in every N positions (0 disables). */
    discoveryEvery: number;
  };

  snapshot: {
    /** Idle time before a scrolling session's ranked order expires. */
    ttlMs: number;
    maxEntries: number;
  };
}

export const FEED_RANKING_CONFIG: FeedRankingConfig = {
  weights: {
    relevance: 0.27,
    relationships: 0.23,
    engagement: 0.18,
    freshness: 0.14,
    discovery: 0.08,
    exploration: 0.1,
  },

  candidatePoolSize: 800,
  evergreenPoolSize: 200,

  freshnessHalfLifeHours: 18,

  freshness: {
    longTailShare: 0.4,
    longTailDays: 10,
  },

  engagement: {
    likeWeight: 1,
    commentWeight: 3,
    repostWeight: 2,
    shareWeight: 4,
    giftWeight: 2,
    priorViews: 20,
    rateShare: 0.75,
  },

  history: {
    like: 1,
    comment: 3,
    repost: 2,
    share: 3,
  },

  relationships: {
    friend: 1,
    follow: 0.8,
    ownPost: 0.6,
    affinityMax: 0.7,
    affinitySaturation: 6,
  },

  relevance: {
    minHistoryInteractions: 3,
    hashtagShare: 0.6,
  },

  discovery: {
    base: 0.6,
    smallCreatorBonus: 0.4,
  },

  seenPenalty: 0.6,

  diversity: {
    minAuthorGap: 3,
    authorRepeatDecay: 0.85,
    sameKindRunLength: 2,
    sameKindRunPenalty: 0.8,
    sameTopicPenalty: 0.85,
    sameAgeRunLength: 3,
    sameAgeRunPenalty: 0.9,
    lookahead: 30,
    discoveryEvery: 5,
  },

  snapshot: {
    ttlMs: 30 * 60 * 1000,
    maxEntries: 500,
  },
};

/* ============================================================================
   TYPES
============================================================================ */

export type MediaKind = 'video' | 'image' | 'text';

export interface RankablePost {
  id: string;
  authorId: string;
  createdAt: Date;
  mediaKind: MediaKind;
  hashtags: string[];

  /** Distinct users other than the author. */
  likes: number;
  /** Distinct non-author commenters with a real comment. */
  meaningfulComments: number;
  /** Distinct non-author reposters. */
  reposts: number;
  /** Distinct non-author sharers. */
  shares: number;
  gifts: number;
  views: number;

  /** True when Post.viewedBy contains the viewer. Missing = not seen. */
  seenByViewer?: boolean;
}

export interface ViewerSignals {
  viewerId?: string;
  followedAuthorIds: ReadonlySet<string>;
  friendAuthorIds: ReadonlySet<string>;
  /** Weighted interaction count per creator. */
  authorAffinity: ReadonlyMap<string, number>;
  /** Weighted interaction count per hashtag (lowercase). */
  hashtagAffinity: ReadonlyMap<string, number>;
  /** Weighted interaction count per media kind. */
  mediaKindAffinity: ReadonlyMap<MediaKind, number>;
  /** Number of posts the viewer has interacted with. */
  historyInteractions: number;
}

export interface RankingComponents {
  /** null when the viewer has no interaction history to compare against. */
  relevance: number | null;
  relationships: number;
  engagement: number;
  freshness: number;
  discovery: number;
  /** null when no exploration seed was supplied. */
  exploration: number | null;
}

export interface ScoredPost {
  post: RankablePost;
  score: number;
  components: RankingComponents;
  isDiscovery: boolean;
}

export interface RankOptions {
  /**
   * Seed for the exploration component, normally viewer + session. The
   * same seed always gives the same order; a new session gives a new mix.
   * Omit to disable exploration (its weight is then renormalized away).
   */
  explorationSeed?: string;
}

export function emptyViewerSignals(
  viewerId?: string,
): ViewerSignals {
  return {
    viewerId,
    followedAuthorIds: new Set(),
    friendAuthorIds: new Set(),
    authorAffinity: new Map(),
    hashtagAffinity: new Map(),
    mediaKindAffinity: new Map(),
    historyInteractions: 0,
  };
}

/* ============================================================================
   HELPERS
============================================================================ */

const HASHTAG_PATTERN =
  /#([A-Za-z0-9_À-ɏ]{2,50})/g;

export function extractHashtags(text: unknown): string[] {
  if (typeof text !== 'string' || !text) {
    return [];
  }

  const tags = new Set<string>();

  for (const match of text.matchAll(HASHTAG_PATTERN)) {
    tags.add(match[1].toLowerCase());
  }

  return Array.from(tags);
}

function finite(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : 0;
}

/**
 * Percentile rank of each value in 0..1. Ties share their average rank,
 * so a list where every value is equal maps to 0.5 everywhere (the
 * component then has no effect on ordering).
 */
export function percentileRanks(values: number[]): number[] {
  const count = values.length;

  if (count === 0) {
    return [];
  }

  if (count === 1) {
    return [0.5];
  }

  const order = values
    .map((value, index) => ({
      value: Number.isFinite(value) ? value : 0,
      index,
    }))
    .sort((a, b) => a.value - b.value);

  const ranks = new Array<number>(count);

  let start = 0;

  while (start < count) {
    let end = start;

    while (
      end + 1 < count &&
      order[end + 1].value === order[start].value
    ) {
      end += 1;
    }

    const averageRank = (start + end) / 2 / (count - 1);

    for (let position = start; position <= end; position += 1) {
      ranks[order[position].index] = averageRank;
    }

    start = end + 1;
  }

  return ranks;
}

/**
 * Freshness in 0..1:
 *   (1 - longTailShare) * 0.5^(ageHours / halfLifeHours)   fast decay
 * +  longTailShare      * 1 / (1 + ageDays / longTailDays)  long tail
 *
 * With the defaults: 1 h ≈ 0.98, 1 day ≈ 0.60, 3 days ≈ 0.35,
 * 1 week ≈ 0.24, 4 weeks ≈ 0.11. A new post is ahead, but an older post
 * with better relevance or engagement can still outrank it.
 *
 * The longTail argument is optional so older callers keep the pure
 * exponential behaviour.
 */
export function freshnessScore(
  createdAt: Date,
  now: Date,
  halfLifeHours: number,
  longTail?: { share: number; days: number },
): number {
  const created = createdAt.getTime();

  if (!Number.isFinite(created) || halfLifeHours <= 0) {
    return 0;
  }

  const ageHours =
    Math.max(0, now.getTime() - created) / 3_600_000;

  const fast = Math.pow(0.5, ageHours / halfLifeHours);

  if (!longTail || longTail.share <= 0 || longTail.days <= 0) {
    return fast;
  }

  const share = Math.min(1, longTail.share);
  const tail = 1 / (1 + ageHours / 24 / longTail.days);

  return (1 - share) * fast + share * tail;
}

/**
 * Deterministic value in [0, 1) for (seed, postId). FNV-1a 32-bit, then
 * a final avalanche so similar ids do not produce similar values.
 */
export function explorationScore(seed: string, postId: string): number {
  let hash = 0x811c9dc5;
  const input = `${seed}|${postId}`;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return (hash >>> 0) / 0x1_0000_0000;
}

/** Age band used by the diversity pass: 0 <6h, 1 <1d, 2 <3d, 3 <1w, 4 older. */
export function ageBucket(createdAt: Date, now: Date): number {
  const created = createdAt.getTime();

  if (!Number.isFinite(created)) {
    return 4;
  }

  const hours = Math.max(0, now.getTime() - created) / 3_600_000;

  if (hours < 6) return 0;
  if (hours < 24) return 1;
  if (hours < 72) return 2;
  if (hours < 168) return 3;

  return 4;
}

function maxValue(values: Iterable<number>): number {
  let max = 0;

  for (const value of values) {
    if (value > max) {
      max = value;
    }
  }

  return max;
}

function sumValues(values: Iterable<number>): number {
  let sum = 0;

  for (const value of values) {
    sum += value;
  }

  return sum;
}

/** Deterministic order: score, then newest, then id. */
export function compareScored(a: ScoredPost, b: ScoredPost): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  const timeDifference =
    (b.post.createdAt.getTime() || 0) -
    (a.post.createdAt.getTime() || 0);

  if (timeDifference !== 0) {
    return timeDifference;
  }

  return b.post.id.localeCompare(a.post.id);
}

/* ============================================================================
   SCORING
============================================================================ */

export function scorePosts(
  posts: RankablePost[],
  viewer: ViewerSignals,
  authorFollowerCounts: ReadonlyMap<string, number>,
  now: Date,
  config: FeedRankingConfig = FEED_RANKING_CONFIG,
  options: RankOptions = {},
): ScoredPost[] {
  if (posts.length === 0) {
    return [];
  }

  const { weights } = config;
  const explorationSeed = options.explorationSeed?.trim() || '';

  /* ---------------- engagement ---------------- */

  const engagementConfig = config.engagement;

  const weightedEngagement = posts.map(
    (post) =>
      finite(post.likes) * engagementConfig.likeWeight +
      finite(post.meaningfulComments) * engagementConfig.commentWeight +
      finite(post.reposts) * engagementConfig.repostWeight +
      finite(post.shares) * engagementConfig.shareWeight +
      finite(post.gifts) * engagementConfig.giftWeight,
  );

  const totalEngagement = sumValues(weightedEngagement);

  const totalViews = sumValues(
    posts.map((post) => finite(post.views)),
  );

  const priorRate =
    totalViews > 0 ? totalEngagement / totalViews : 0;

  const engagementRates = posts.map(
    (post, index) =>
      (weightedEngagement[index] +
        priorRate * engagementConfig.priorViews) /
      (finite(post.views) + engagementConfig.priorViews),
  );

  const audienceNormalizedVolume = posts.map(
    (post, index) =>
      Math.log1p(weightedEngagement[index]) /
      Math.log2(
        2 + finite(authorFollowerCounts.get(post.authorId)),
      ),
  );

  const ratePercentiles = percentileRanks(engagementRates);
  const volumePercentiles = percentileRanks(
    audienceNormalizedVolume,
  );

  /* ---------------- creator size (for discovery) ---------------- */

  const authorIds = Array.from(
    new Set(posts.map((post) => post.authorId)),
  );

  const authorSizePercentiles = percentileRanks(
    authorIds.map((authorId) =>
      finite(authorFollowerCounts.get(authorId)),
    ),
  );

  const authorSize = new Map(
    authorIds.map((authorId, index) => [
      authorId,
      authorSizePercentiles[index],
    ]),
  );

  /* ---------------- relevance inputs ---------------- */

  const relevanceAvailable =
    viewer.historyInteractions >=
    config.relevance.minHistoryInteractions;

  const maxHashtagAffinity = maxValue(
    viewer.hashtagAffinity.values(),
  );

  const totalKindAffinity = sumValues(
    viewer.mediaKindAffinity.values(),
  );

  const maxKindShare =
    totalKindAffinity > 0
      ? maxValue(viewer.mediaKindAffinity.values()) /
        totalKindAffinity
      : 0;

  const longTail = {
    share: config.freshness?.longTailShare ?? 0,
    days: config.freshness?.longTailDays ?? 0,
  };

  /* ---------------- per post ---------------- */

  return posts.map((post, index) => {
    const isOwn = Boolean(
      viewer.viewerId && post.authorId === viewer.viewerId,
    );

    const isFriend = viewer.friendAuthorIds.has(post.authorId);
    const isFollowed = viewer.followedAuthorIds.has(post.authorId);

    const affinity = finite(
      viewer.authorAffinity.get(post.authorId),
    );

    /* relationships */

    const relationshipConfig = config.relationships;

    const relationships = isOwn
      ? relationshipConfig.ownPost
      : 1 -
        (1 - (isFriend ? relationshipConfig.friend : 0)) *
          (1 - (isFollowed ? relationshipConfig.follow : 0)) *
          (1 -
            relationshipConfig.affinityMax *
              (1 -
                Math.exp(
                  -affinity / relationshipConfig.affinitySaturation,
                )));

    /* relevance */

    let relevance: number | null = null;

    if (relevanceAvailable) {
      const kindShare =
        totalKindAffinity > 0
          ? finite(viewer.mediaKindAffinity.get(post.mediaKind)) /
            totalKindAffinity
          : 0;

      const kindScore =
        maxKindShare > 0 ? kindShare / maxKindShare : 0;

      let hashtagScore: number | null = null;

      if (post.hashtags.length > 0 && maxHashtagAffinity > 0) {
        hashtagScore = 0;

        for (const tag of post.hashtags) {
          const tagScore =
            finite(viewer.hashtagAffinity.get(tag)) /
            maxHashtagAffinity;

          if (tagScore > hashtagScore) {
            hashtagScore = tagScore;
          }
        }
      }

      relevance =
        hashtagScore === null
          ? kindScore
          : config.relevance.hashtagShare * hashtagScore +
            (1 - config.relevance.hashtagShare) * kindScore;
    }

    /* engagement */

    const engagement =
      engagementConfig.rateShare * ratePercentiles[index] +
      (1 - engagementConfig.rateShare) * volumePercentiles[index];

    /* freshness */

    const freshness = freshnessScore(
      post.createdAt,
      now,
      config.freshnessHalfLifeHours,
      longTail,
    );

    /* discovery */

    const isDiscovery =
      !isOwn && !isFriend && !isFollowed && affinity <= 0;

    const discovery = isDiscovery
      ? config.discovery.base +
        config.discovery.smallCreatorBonus *
          (1 - (authorSize.get(post.authorId) ?? 0.5))
      : 0;

    /* exploration */

    const exploration = explorationSeed
      ? explorationScore(explorationSeed, post.id)
      : null;

    /* weighted average over the components that exist */

    const components: RankingComponents = {
      relevance,
      relationships,
      engagement,
      freshness,
      discovery,
      exploration,
    };

    let weightedSum = 0;
    let weightTotal = 0;

    (Object.keys(weights) as RankingComponent[]).forEach(
      (component) => {
        const value = components[component];
        const weight = Math.max(0, weights[component] ?? 0);

        if (value === null || value === undefined || weight === 0) {
          return;
        }

        weightedSum += weight * value;
        weightTotal += weight;
      },
    );

    let score = weightTotal > 0 ? weightedSum / weightTotal : 0;

    if (post.seenByViewer && !isOwn) {
      score *= config.seenPenalty ?? 1;
    }

    return {
      post,
      score,
      components,
      isDiscovery,
    };
  });
}

/* ============================================================================
   DIVERSITY RERANK
============================================================================ */

/**
 * Greedy, deterministic rerank of an already-sorted list.
 *
 * At each position it looks at the next `lookahead` posts and picks the
 * one with the best adjusted score, where:
 *   - a creator who appeared in the last (minAuthorGap - 1) positions is
 *     skipped while any alternative exists
 *   - each earlier appearance of the creator multiplies the score by
 *     authorRepeatDecay
 *   - continuing a run of the same media type is penalized
 *   - sharing a hashtag with the previous post is penalized
 *   - continuing a run of posts from the same age band is penalized, so
 *     the feed does not show every post from today before yesterday's
 *   - if the last (discoveryEvery - 1) posts had no discovery post, the
 *     best discovery post in the window is chosen
 */
export function diversifyRanking(
  sorted: ScoredPost[],
  config: FeedRankingConfig = FEED_RANKING_CONFIG,
  now: Date = new Date(),
): ScoredPost[] {
  const {
    minAuthorGap,
    authorRepeatDecay,
    sameKindRunLength,
    sameKindRunPenalty,
    lookahead,
    discoveryEvery,
  } = config.diversity;

  const sameTopicPenalty = config.diversity.sameTopicPenalty ?? 1;
  const sameAgeRunLength = config.diversity.sameAgeRunLength ?? 0;
  const sameAgeRunPenalty = config.diversity.sameAgeRunPenalty ?? 1;

  const remaining = [...sorted];
  const result: ScoredPost[] = [];
  const authorCounts = new Map<string, number>();
  const buckets = new Map<string, number>();

  const bucketOf = (item: ScoredPost): number => {
    let bucket = buckets.get(item.post.id);

    if (bucket === undefined) {
      bucket = ageBucket(item.post.createdAt, now);
      buckets.set(item.post.id, bucket);
    }

    return bucket;
  };

  while (remaining.length > 0) {
    const windowSize = Math.min(
      remaining.length,
      Math.max(1, lookahead),
    );

    const recentAuthors = new Set(
      result
        .slice(Math.max(0, result.length - (minAuthorGap - 1)))
        .map((item) => item.post.authorId),
    );

    const recentKinds = result
      .slice(Math.max(0, result.length - sameKindRunLength))
      .map((item) => item.post.mediaKind);

    const kindRun =
      sameKindRunLength > 0 &&
      recentKinds.length === sameKindRunLength &&
      recentKinds.every((kind) => kind === recentKinds[0])
        ? recentKinds[0]
        : null;

    const previousTags = new Set(
      result.length > 0 ? result[result.length - 1].post.hashtags : [],
    );

    const recentBuckets =
      sameAgeRunLength > 0
        ? result
            .slice(Math.max(0, result.length - sameAgeRunLength))
            .map(bucketOf)
        : [];

    const ageRun =
      sameAgeRunLength > 0 &&
      recentBuckets.length === sameAgeRunLength &&
      recentBuckets.every((bucket) => bucket === recentBuckets[0])
        ? recentBuckets[0]
        : null;

    const discoveryWindow = discoveryEvery - 1;

    const needsDiscovery =
      discoveryEvery > 0 &&
      result.length >= discoveryWindow &&
      result
        .slice(result.length - discoveryWindow)
        .every((item) => !item.isDiscovery);

    let bestIndex = -1;
    let bestAdjusted = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < windowSize; index += 1) {
      const candidate = remaining[index];

      if (recentAuthors.has(candidate.post.authorId)) {
        continue;
      }

      let adjusted =
        candidate.score *
        Math.pow(
          authorRepeatDecay,
          authorCounts.get(candidate.post.authorId) ?? 0,
        );

      if (kindRun !== null && candidate.post.mediaKind === kindRun) {
        adjusted *= sameKindRunPenalty;
      }

      if (
        previousTags.size > 0 &&
        candidate.post.hashtags.some((tag) => previousTags.has(tag))
      ) {
        adjusted *= sameTopicPenalty;
      }

      if (ageRun !== null && bucketOf(candidate) === ageRun) {
        adjusted *= sameAgeRunPenalty;
      }

      if (needsDiscovery && candidate.isDiscovery) {
        adjusted += 1;
      }

      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    }

    // Every post in the window is from a recent creator: take the top one.
    if (bestIndex === -1) {
      bestIndex = 0;
    }

    const [chosen] = remaining.splice(bestIndex, 1);

    result.push(chosen);

    authorCounts.set(
      chosen.post.authorId,
      (authorCounts.get(chosen.post.authorId) ?? 0) + 1,
    );
  }

  return result;
}

/* ============================================================================
   RANK
============================================================================ */

export function rankFeed(
  posts: RankablePost[],
  viewer: ViewerSignals,
  authorFollowerCounts: ReadonlyMap<string, number>,
  now: Date,
  config: FeedRankingConfig = FEED_RANKING_CONFIG,
  options: RankOptions = {},
): ScoredPost[] {
  // Defensive: the pool is built from two queries, never rank a post twice.
  const seen = new Set<string>();
  const unique = posts.filter((post) => {
    if (!post.id || seen.has(post.id)) {
      return false;
    }

    seen.add(post.id);
    return true;
  });

  const scored = scorePosts(
    unique,
    viewer,
    authorFollowerCounts,
    now,
    config,
    options,
  ).sort(compareScored);

  return diversifyRanking(scored, config, now);
}

/* ============================================================================
   SESSION SNAPSHOTS
============================================================================ */

/*
| The ranked order for a scrolling session is stored here so page 2, 3,
| ... are slices of the same list. Without this, likes arriving between
| page requests would re-sort the feed and cause duplicated or skipped
| posts.
|
| In-memory and per process. If the API runs on several instances, or
| restarts mid-session, a missing snapshot is recomputed with the same
| exploration seed, so the order is close to the original; the client
| also drops duplicate post IDs.
*/

export interface FeedSnapshot {
  postIds: string[];
  scores: Record<string, number>;
  touchedAt: number;
}

export class FeedSnapshotStore {
  private readonly entries = new Map<string, FeedSnapshot>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly clock: () => number = Date.now,
  ) {}

  get(key: string): FeedSnapshot | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    const now = this.clock();

    if (now - entry.touchedAt > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }

    // Sliding expiry and most-recently-used ordering.
    entry.touchedAt = now;
    this.entries.delete(key);
    this.entries.set(key, entry);

    return entry;
  }

  set(
    key: string,
    postIds: string[],
    scores: Record<string, number> = {},
  ): void {
    this.entries.delete(key);

    this.entries.set(key, {
      postIds: [...postIds],
      scores: { ...scores },
      touchedAt: this.clock(),
    });

    this.prune();
  }

  get size(): number {
    return this.entries.size;
  }

  private prune(): void {
    const now = this.clock();

    for (const [key, entry] of this.entries) {
      if (now - entry.touchedAt > this.ttlMs) {
        this.entries.delete(key);
      }
    }

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      this.entries.delete(oldestKey);
    }
  }
}
