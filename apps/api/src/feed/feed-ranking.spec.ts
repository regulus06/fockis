import {
  FEED_RANKING_CONFIG,
  FeedSnapshotStore,
  RankablePost,
  ViewerSignals,
  ageBucket,
  emptyViewerSignals,
  explorationScore,
  freshnessScore,
  rankFeed,
} from './feed-ranking';

const NOW = new Date('2026-10-17T12:00:00Z');
const HOUR = 3_600_000;

function post(
  id: string,
  authorId: string,
  hoursAgo: number,
  extra: Partial<RankablePost> = {},
): RankablePost {
  return {
    id,
    authorId,
    createdAt: new Date(NOW.getTime() - hoursAgo * HOUR),
    mediaKind: 'text',
    hashtags: [],
    likes: 0,
    meaningfulComments: 0,
    reposts: 0,
    shares: 0,
    gifts: 0,
    views: 0,
    ...extra,
  };
}

/** 40 posts from 20 authors spread from 2 minutes to ~6 weeks old. */
function mixedAgePool(): RankablePost[] {
  const ages = [
    0.03, 0.5, 1, 2, 4, 8, 12, 20, 26, 30, 40, 50, 60, 72, 80, 96, 110, 130,
    150, 168, 190, 220, 260, 300, 340, 400, 450, 500, 560, 620, 680, 720, 760,
    800, 850, 900, 950, 980, 1000, 1010,
  ];

  return ages.map((hoursAgo, index) =>
    post(`p${String(index).padStart(2, '0')}`, `a${index % 20}`, hoursAgo),
  );
}

const noFollowers = new Map<string, number>();

function rank(
  posts: RankablePost[],
  seed: string | undefined = 'viewer:session-1',
  viewer: ViewerSignals = emptyViewerSignals('viewer'),
) {
  return rankFeed(posts, viewer, noFollowers, NOW, FEED_RANKING_CONFIG, {
    explorationSeed: seed,
  });
}

function isStrictlyChronological(ids: string[], posts: RankablePost[]) {
  const byId = new Map(posts.map((item) => [item.id, item]));

  for (let index = 1; index < ids.length; index += 1) {
    if (
      byId.get(ids[index - 1])!.createdAt.getTime() <
      byId.get(ids[index])!.createdAt.getTime()
    ) {
      return false;
    }
  }

  return true;
}

describe('freshnessScore', () => {
  const tail = {
    share: FEED_RANKING_CONFIG.freshness.longTailShare,
    days: FEED_RANKING_CONFIG.freshness.longTailDays,
  };
  const at = (hoursAgo: number) =>
    freshnessScore(new Date(NOW.getTime() - hoursAgo * HOUR), NOW, 18, tail);

  it('keeps new posts ahead', () => {
    expect(at(0.1)).toBeGreaterThan(at(24));
    expect(at(24)).toBeGreaterThan(at(72));
    expect(at(72)).toBeGreaterThan(at(168));
  });

  it('keeps week-old and month-old posts competitive', () => {
    expect(at(168)).toBeGreaterThan(0.2);
    expect(at(24 * 28)).toBeGreaterThan(0.08);
  });

  it('handles invalid dates safely', () => {
    expect(freshnessScore(new Date('nope'), NOW, 18, tail)).toBe(0);
  });
});

describe('explorationScore', () => {
  it('is deterministic and bounded', () => {
    const a = explorationScore('seed', 'post-1');
    expect(a).toBe(explorationScore('seed', 'post-1'));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it('changes with the seed', () => {
    const values = new Set(
      ['s1', 's2', 's3', 's4'].map((seed) => explorationScore(seed, 'post-1')),
    );
    expect(values.size).toBe(4);
  });
});

describe('rankFeed: mixing post ages', () => {
  it('does not return a strictly chronological feed when signals are flat', () => {
    const pool = mixedAgePool();
    const ids = rank(pool).map((item) => item.post.id);

    expect(ids).toHaveLength(pool.length);
    expect(isStrictlyChronological(ids, pool)).toBe(false);
  });

  it('puts older posts between recent ones on the first page', () => {
    const pool = mixedAgePool();
    const firstPage = rank(pool).slice(0, 10);
    const buckets = new Set(
      firstPage.map((item) => ageBucket(item.post.createdAt, NOW)),
    );

    // Not only "today": at least three different age bands on page one.
    expect(buckets.size).toBeGreaterThanOrEqual(3);
  });

  it('still gives new posts a freshness advantage on average', () => {
    const pool = mixedAgePool();
    const recentIds = new Set(
      pool.filter((item) => NOW.getTime() - item.createdAt.getTime() < 24 * HOUR).map((item) => item.id),
    );
    const oldIds = new Set(
      pool.filter((item) => NOW.getTime() - item.createdAt.getTime() > 21 * 24 * HOUR).map((item) => item.id),
    );

    let recentSum = 0;
    let oldSum = 0;
    const seeds = 30;

    for (let run = 0; run < seeds; run += 1) {
      rank(pool, `viewer:s${run}`).forEach((item, position) => {
        if (recentIds.has(item.post.id)) recentSum += position;
        if (oldIds.has(item.post.id)) oldSum += position;
      });
    }

    const recentAverage = recentSum / (seeds * recentIds.size);
    const oldAverage = oldSum / (seeds * oldIds.size);

    expect(recentAverage).toBeLessThan(oldAverage);
  });

  it('lets a relevant older post outrank a newer one', () => {
    const viewer: ViewerSignals = {
      ...emptyViewerSignals('viewer'),
      followedAuthorIds: new Set(['friend-author']),
    };

    const pool = [
      post('new-stranger', 'stranger', 0.2),
      post('old-followed', 'friend-author', 96, {
        likes: 30,
        meaningfulComments: 8,
        views: 120,
      }),
    ];

    // Exploration is bounded but can flip a close pair in some sessions;
    // the older, more relevant post must win in the large majority.
    let olderFirst = 0;
    const sessions = 50;

    for (let run = 0; run < sessions; run += 1) {
      if (rank(pool, `viewer:s${run}`, viewer)[0].post.id === 'old-followed') {
        olderFirst += 1;
      }
    }

    expect(olderFirst / sessions).toBeGreaterThanOrEqual(0.8);
  });

  it('never changes createdAt', () => {
    const pool = mixedAgePool();
    const before = new Map(pool.map((item) => [item.id, item.createdAt.getTime()]));

    for (const item of rank(pool)) {
      expect(item.post.createdAt.getTime()).toBe(before.get(item.post.id));
    }
  });
});

describe('rankFeed: stability and refresh', () => {
  it('gives the same order for the same session seed', () => {
    const pool = mixedAgePool();
    expect(rank(pool, 'v:a').map((i) => i.post.id)).toEqual(
      rank(pool, 'v:a').map((i) => i.post.id),
    );
  });

  it('gives a different mix for a new session', () => {
    const pool = mixedAgePool();
    const first = rank(pool, 'v:a').slice(0, 10).map((i) => i.post.id);
    const second = rank(pool, 'v:b').slice(0, 10).map((i) => i.post.id);

    expect(first).not.toEqual(second);
  });

  it('demotes posts the viewer has already seen', () => {
    const fresh = rank([
      post('seen', 'a1', 1, { seenByViewer: true }),
      post('unseen', 'a2', 1),
    ]);

    const seenScore = fresh.find((i) => i.post.id === 'seen')!.score;
    const unseenScore = fresh.find((i) => i.post.id === 'unseen')!.score;
    const seenRaw = rank([post('seen', 'a1', 1), post('unseen', 'a2', 1)]).find(
      (i) => i.post.id === 'seen',
    )!.score;

    expect(seenScore).toBeCloseTo(seenRaw * FEED_RANKING_CONFIG.seenPenalty, 6);
    expect(unseenScore).toBeGreaterThan(0);
  });

  it('never returns a post twice, even if the pool contains duplicates', () => {
    const pool = mixedAgePool();
    const ids = rank([...pool, ...pool.slice(0, 5)]).map((i) => i.post.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(pool.length);
  });
});

describe('rankFeed: diversity', () => {
  it('does not show the same creator twice in a row while others exist', () => {
    const pool = [
      ...Array.from({ length: 8 }, (_, i) =>
        post(`big${i}`, 'big-creator', i * 0.1, {
          likes: 50,
          meaningfulComments: 10,
          views: 100,
        }),
      ),
      ...Array.from({ length: 8 }, (_, i) => post(`o${i}`, `other${i}`, 30 + i * 10)),
    ];

    const authors = rank(pool).map((i) => i.post.authorId);

    for (let index = 1; index < authors.length - 6; index += 1) {
      expect(authors[index]).not.toBe(authors[index - 1]);
    }
  });

  it('avoids back-to-back posts on the same hashtag when alternatives exist', () => {
    const pool = [
      ...Array.from({ length: 5 }, (_, i) =>
        post(`t${i}`, `ta${i}`, i, { hashtags: ['football'] }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        post(`n${i}`, `na${i}`, i + 0.5, { hashtags: [`topic${i}`] }),
      ),
    ];

    const ranked = rank(pool);
    let sameTopicPairs = 0;

    for (let index = 1; index < ranked.length; index += 1) {
      const previous = new Set(ranked[index - 1].post.hashtags);
      if (ranked[index].post.hashtags.some((tag) => previous.has(tag))) {
        sameTopicPairs += 1;
      }
    }

    expect(sameTopicPairs).toBeLessThanOrEqual(1);
  });
});

describe('FeedSnapshotStore pagination', () => {
  it('serves consecutive, non-overlapping slices', () => {
    const store = new FeedSnapshotStore(60_000, 10);
    const ids = rank(mixedAgePool()).map((i) => i.post.id);

    store.set('viewer:session', ids);

    const snapshot = store.get('viewer:session')!;
    const pages = [0, 1, 2, 3].map((page) =>
      snapshot.postIds.slice(page * 10, page * 10 + 10),
    );
    const flat = pages.flat();

    expect(new Set(flat).size).toBe(flat.length);
    expect(flat).toEqual(ids);
  });

  it('expires idle sessions', () => {
    let clock = 0;
    const store = new FeedSnapshotStore(1000, 10, () => clock);

    store.set('k', ['a']);
    clock = 2000;

    expect(store.get('k')).toBeUndefined();
  });
});
