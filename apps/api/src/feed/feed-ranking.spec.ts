import {
  FEED_RANKING_CONFIG,
  FeedSnapshotStore,
  RankablePost,
  ServedHistoryStore,
  servedCounts,
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

describe('refresh rotation (served history)', () => {
  /** A strong own post + a strong friend post on top of a flat pool. */
  function poolWithLeaders(): RankablePost[] {
    return [
      post('own', 'viewer', 0.05, { likes: 40, meaningfulComments: 10 }),
      post('friend', 'f1', 0.2, { likes: 60, meaningfulComments: 12 }),
      ...mixedAgePool(),
    ];
  }

  const viewer: ViewerSignals = {
    ...emptyViewerSignals('viewer'),
    followingIds: new Set(['f1']),
    friendIds: new Set(['f1']),
  };

  function refreshFiveTimes() {
    let clock = 0;
    const history = new ServedHistoryStore(12, 4, 45 * 60_000, 100, () => clock);
    const pages: string[][] = [];

    for (let refresh = 1; refresh <= 5; refresh += 1) {
      clock += 60_000;
      const session = `s${refresh}`;
      const ranked = rankFeed(
        poolWithLeaders(),
        viewer,
        noFollowers,
        NOW,
        FEED_RANKING_CONFIG,
        {
          explorationSeed: `viewer:${session}`,
          recentlyServed: history.counts('viewer', session),
        },
      );
      const ids = ranked.map((item) => item.post.id);
      history.record('viewer', session, ids.slice(0, history.topSize));
      pages.push(ids);
    }

    return pages;
  }

  it('does not keep the same first post across 5 refreshes', () => {
    const pages = refreshFiveTimes();
    const firsts = pages.map((ids) => ids[0]);

    expect(new Set(firsts).size).toBeGreaterThanOrEqual(3);
    // nothing is stuck at #1 for consecutive refreshes
    for (let i = 1; i < firsts.length; i += 1) {
      expect(firsts[i]).not.toBe(firsts[i - 1]);
    }
  });

  it('changes the first page and lets other posts reach the top', () => {
    const pages = refreshFiveTimes();
    const topFives = pages.map((ids) => ids.slice(0, 5).join(','));

    expect(new Set(topFives).size).toBe(5);

    const reachedTop = new Set(pages.flatMap((ids) => ids.slice(0, 5)));
    expect(reachedTop.size).toBeGreaterThan(8);
  });

  it('demotes but never removes posts, and never duplicates', () => {
    for (const ids of refreshFiveTimes()) {
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(poolWithLeaders().length);
      expect(ids).toContain('own');
      expect(ids).toContain('friend');
    }
  });

  it('still lets a new own post lead the first session', () => {
    expect(['own', 'friend']).toContain(refreshFiveTimes()[0][0]);
  });

  it('gives the same order when the same session re-ranks page 1', () => {
    let clock = 0;
    const history = new ServedHistoryStore(12, 4, 45 * 60_000, 100, () => clock);
    history.record('viewer', 's0', ['own', 'friend']);

    const once = () => {
      const ranked = rankFeed(poolWithLeaders(), viewer, noFollowers, NOW, FEED_RANKING_CONFIG, {
        explorationSeed: 'viewer:s1',
        recentlyServed: history.counts('viewer', 's1'),
      });
      const ids = ranked.map((item) => item.post.id);
      history.record('viewer', 's1', ids.slice(0, 12));
      return ids;
    };

    const first = once();
    clock += 1_000;
    expect(once()).toEqual(first);
  });

  it('bounds the penalty with minServedFactor', () => {
    const counts = new Map([['friend', 50]]);
    const ranked = rankFeed(poolWithLeaders(), viewer, noFollowers, NOW, FEED_RANKING_CONFIG, {
      explorationSeed: 'viewer:x',
      recentlyServed: counts,
    });
    const plain = rankFeed(poolWithLeaders(), viewer, noFollowers, NOW, FEED_RANKING_CONFIG, {
      explorationSeed: 'viewer:x',
    });
    const score = (list: typeof ranked) => list.find((i) => i.post.id === 'friend')!.score;

    expect(score(ranked) / score(plain)).toBeCloseTo(FEED_RANKING_CONFIG.minServedFactor!, 5);
  });
});

describe('ServedHistoryStore', () => {
  it('ignores the current session and expires old ones', () => {
    let clock = 0;
    const store = new ServedHistoryStore(3, 2, 1_000, 10, () => clock);

    store.record('v', 'a', ['p1', 'p2']);
    store.record('v', 'b', ['p2', 'p3']);
    expect(store.counts('v', 'b')).toEqual(new Map([['p1', 1.5], ['p2', 1]]));
    expect(store.counts('v', 'c').get('p2')).toBe(2.5);

    store.record('v', 'c', ['p9']);
    expect(store.sessions('v').map((s) => s.session)).toEqual(['b', 'c']);

    clock = 5_000;
    expect(store.sessions('v')).toEqual([]);
  });

  it('evicts least recently used viewers', () => {
    const store = new ServedHistoryStore(3, 2, 60_000, 2);
    store.record('v1', 'a', ['p1']);
    store.record('v2', 'a', ['p1']);
    store.record('v3', 'a', ['p1']);
    expect(store.sessions('v1')).toEqual([]);
    expect(store.sessions('v3')).toHaveLength(1);
  });

  it('servedCounts counts each post once per session', () => {
    expect(
      servedCounts([{ session: 'a', ids: ['x', 'x'], at: 0 }], 'z').get('x'),
    ).toBe(1.5);
  });
});

describe('fresh lead (an already-seen post does not keep opening the feed)', () => {
  // One dominant photo post with lots of engagement among weak text posts.
  function dominantPool(seen: boolean): RankablePost[] {
    const pool: RankablePost[] = [
      post('dominant', 'star', 2, {
        mediaKind: 'image',
        likes: 80,
        meaningfulComments: 25,
        shares: 10,
        views: 120,
        seenByViewer: seen,
      }),
    ];

    for (let index = 0; index < 12; index += 1) {
      pool.push(
        post(`p${index}`, `a${index}`, 30 + index * 8, {
          likes: index % 3,
          views: 10,
        }),
      );
    }

    return pool;
  }

  it('leads with the dominant post while it is unseen', () => {
    const ranked = rankFeed(
      dominantPool(false),
      emptyViewerSignals('viewer'),
      new Map(),
      NOW,
      FEED_RANKING_CONFIG,
      { explorationSeed: 'viewer:s1' },
    );

    expect(ranked[0].post.id).toBe('dominant');
  });

  it('moves an already-seen post out of the top slots when a fresh post is close enough', () => {
    const ranked = rankFeed(
      dominantPool(true),
      emptyViewerSignals('viewer'),
      new Map(),
      NOW,
      FEED_RANKING_CONFIG,
      { explorationSeed: 'viewer:s1' },
    );

    const position = ranked.findIndex((item) => item.post.id === 'dominant');

    expect(ranked).toHaveLength(13);
    expect(position).toBeGreaterThanOrEqual(1);
    expect(ranked[0].post.seenByViewer).toBeFalsy();
  });

  it('rotates a dominant post that keeps leading even when seen data never arrives', () => {
    // Seen tracking failed for this post (e.g. a card taller than the
    // screen). The served penalty alone bottoms out at minServedFactor,
    // which is not enough to move a post this far ahead.
    const pool: RankablePost[] = [
      post('dominant', 'star', 2, {
        mediaKind: 'image',
        likes: 80,
        meaningfulComments: 25,
        shares: 10,
        views: 120,
      }),
    ];

    for (let index = 0; index < 6; index += 1) {
      pool.push(
        post(`old${index}`, `o${index}`, 24 * 20 + index * 24, {
          views: 200,
          seenByViewer: true,
        }),
      );
    }

    const ranked = rankFeed(
      pool,
      emptyViewerSignals('viewer'),
      new Map(),
      NOW,
      FEED_RANKING_CONFIG,
      {
        explorationSeed: 'viewer:s1',
        recentlyServed: new Map([['dominant', 3]]),
      },
    );

    expect(ranked[0].post.id).not.toBe('dominant');
    expect(ranked.map((item) => item.post.id)).toContain('dominant');
    expect(ranked).toHaveLength(7);
  });

  it('keeps the viewer\'s own seen post eligible to lead', () => {
    const pool = dominantPool(true).map((item) =>
      item.id === 'dominant' ? { ...item, authorId: 'viewer' } : item,
    );

    const ranked = rankFeed(
      pool,
      emptyViewerSignals('viewer'),
      new Map(),
      NOW,
      FEED_RANKING_CONFIG,
      { explorationSeed: 'viewer:s1' },
    );

    expect(ranked.some((item) => item.post.id === 'dominant')).toBe(true);
  });

  it('never forces up a much weaker post', () => {
    const ranked = rankFeed(
      [
        post('strong', 'a', 1, { likes: 50, views: 60, seenByViewer: true }),
        post('weak', 'b', 24 * 30, { views: 500 }),
      ],
      emptyViewerSignals('viewer'),
      new Map(),
      NOW,
      { ...FEED_RANKING_CONFIG, freshLead: { slots: 3, window: 25, minScoreRatio: 0.99, ledThreshold: 1.5 } },
      {},
    );

    expect(ranked[0].post.id).toBe('strong');
  });
});
