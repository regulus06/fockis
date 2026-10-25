import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  InjectConnection,
  InjectModel,
} from '@nestjs/mongoose';

import {
  Connection,
  Model,
  Types,
} from 'mongoose';

import {
  Post,
  PostDocument,
} from '../posts/post.schema';

import { StoriesService } from '../stories/stories.service';
import { BlockVisibilityService } from '../friends/services/block-visibility.service';
import { EventsService } from '../events/services/events.service';
import { parseEventIdList } from '../events/utils/event-recommendation';

import {
  FeedEventSlot,
  ServedEventsStore,
  buildFeedEventSlots,
} from './feed-events';

import {
  FEED_RANKING_CONFIG,
  FeedMode,
  FeedSnapshotStore,
  MediaKind,
  RankablePost,
  ViewerSignals,
  emptyViewerSignals,
  extractHashtags,
  parseFeedMode,
  rankFeed,
} from './feed-ranking';

/*
|--------------------------------------------------------------------------
| FEED SERVICE
|--------------------------------------------------------------------------
|
| GET /feed?page=&limit=&mode=&session=&cursor=
|
| `cursor` is optional and only used by the chronological modes; the
| response carries `nextCursor` for it. Clients that keep sending only
| `page` get the original skip-based paging.
|
| Modes:
|   for-you    (default) personalized ranking, see feed-ranking.ts
|   following  newest first, accounts the viewer follows
|   friends    newest first, accepted friends
|   latest     newest first, everything the viewer may see
|
| Visibility is decided BEFORE anything is ranked:
|   - public posts
|   - "friends" posts only from accepted friends (and the viewer's own)
|   - private posts never appear in the feed
|   - authors in a blocked relationship with the viewer (either
|     direction) are excluded in the query, then every author on the
|     returned page is re-checked with BlockVisibilityService
|   - deleted posts no longer exist, and later pages re-fetch posts by
|     ID with the same filter, so a deleted or newly-restricted post
|     drops out instead of being served from the snapshot
|
| No mute, hide or "Not interested" data exists in this codebase yet, so
| only blocks are applied as negative feedback.
|
| Events
|   The response also carries `events`: recommended events placed between
|   the posts of this page (see feed-events.ts). They are real Event
|   documents, never stored as posts, and the query that loads them only
|   matches active events (endDate > now, not cancelled) the viewer may
|   see. `feed` itself is unchanged, so older clients are unaffected.
|
*/

type LeanPost = Record<string, any>;

type Filter = Record<string, any>;

interface GetFeedOptions {
  viewerId?: string;
  page?: number;
  limit?: number;
  mode?: string;
  session?: string;
  /**
   * Opaque keyset cursor for the chronological modes (nextCursor from the
   * previous page). When present it replaces page-based skipping, so new
   * posts arriving at the top cannot shift later pages.
   */
  cursor?: string;
  /** Comma-separated event IDs already shown/dismissed this session. */
  excludeEvents?: string;
  /** Viewer location, only sent when the user allowed it. */
  latitude?: number;
  longitude?: number;
}

interface ViewerRelationships {
  followedIds: string[];
  friendIds: string[];
  blockedIds: string[];
}

interface FeedPage {
  posts: LeanPost[];
  total: number;
  hasMore: boolean;
  scores?: Record<string, number>;
  nextCursor?: string;
}

/*
 * Fockis Shop products mixed into the feed.
 *
 * Every eligible product (active, configured for the feed, not expired)
 * from every shop is a candidate. Each feed page carries a small batch,
 * picked round-robin across shops so one seller cannot fill the feed:
 * every shop's newest product first, then every shop's second product,
 * and so on. The shop order is shuffled per viewer + session, so different
 * people (and each fresh session) see shops in a different order.
 *
 * For You remembers which products it already served in the session, so
 * scrolling keeps bringing new products. Latest has no session, so its
 * pages walk the same rotation by page number.
 */
const FEED_PRODUCTS_PER_PAGE = 2;
const FEED_PRODUCT_POOL_SIZE = 300;
/** For You: at most this many products from one shop per session. */
const FEED_PRODUCTS_PER_SHOP_PER_SESSION = 3;
const FEED_PRODUCT_MODES = new Set<FeedMode>(['for-you', 'latest']);
const STORE_MODEL_NAME = 'Store';

const MAX_PAGE_SIZE = 50;
const HISTORY_SAMPLE_SIZE = 500;
const MAX_SESSION_LENGTH = 100;
const BLOCK_CHECK_CONCURRENCY = 25;

/*
 * Models registered by FollowsModule and FriendsModule. They are read
 * through the shared Mongoose connection so this module does not depend
 * on those modules exporting their models or services.
 */
const FOLLOW_MODEL_NAME = 'Follow';
const FRIENDSHIP_MODEL_NAME = 'Friendship';

/* ============================================================================
   MEDIA HELPERS (unchanged from the previous FeedService)
============================================================================ */

function extractMediaValue(value: any): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'object') {
    const possibleValues = [
      value.url,
      value.path,
      value.src,
      value.fileUrl,
      value.filePath,
      value.filename,
      value.fileName,
      value.location,
      value.key,
    ];

    for (const item of possibleValues) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
    }
  }

  return '';
}

function getRawMedia(post: any): string {
  if (!post) {
    return '';
  }

  if (Array.isArray(post.media)) {
    for (const item of post.media) {
      const media = extractMediaValue(item);

      if (media) {
        return media;
      }
    }
  } else {
    const media = extractMediaValue(post.media);

    if (media) {
      return media;
    }
  }

  const possibleFields = [
    post.image,
    post.imageUrl,
    post.file,
    post.fileUrl,
    post.filePath,
    post.photo,
    post.photoUrl,
    post.attachment,
    post.attachmentUrl,
    post.src,
    post.url,
    post.video,
    post.videoUrl,
  ];

  for (const value of possibleFields) {
    const media = extractMediaValue(value);

    if (media) {
      return media;
    }
  }

  for (const list of [
    post.images,
    post.imageUrls,
    post.attachments,
    post.files,
  ]) {
    if (Array.isArray(list)) {
      for (const item of list) {
        const media = extractMediaValue(item);

        if (media) {
          return media;
        }
      }
    }
  }

  return '';
}

function detectMediaType(
  media: string,
  post: any,
): 'image' | 'video' | 'none' {
  if (!media) {
    return 'none';
  }

  const backendType = String(
    post?.mediaType ||
      post?.mimeType ||
      post?.mime ||
      post?.fileType ||
      post?.type ||
      '',
  ).toLowerCase();

  if (
    backendType.includes('video') ||
    backendType.includes('mp4') ||
    backendType.includes('webm') ||
    backendType.includes('mov')
  ) {
    return 'video';
  }

  const videoExtensions = [
    '.mp4',
    '.webm',
    '.mov',
    '.m4v',
    '.avi',
    '.mkv',
    '.3gp',
    '.ogv',
  ];

  const lowerMedia = media.toLowerCase();

  if (videoExtensions.some((extension) => lowerMedia.includes(extension))) {
    return 'video';
  }

  return 'image';
}

/* ============================================================================
   SMALL HELPERS
============================================================================ */

function idOf(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return String(value._id ?? value.id ?? value.toString?.() ?? '');
  }

  return String(value);
}

function ownerIdOf(post: LeanPost): string {
  return idOf(post?.user);
}

function toNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

function distinctUsers(
  values: unknown,
  exclude: string,
): number {
  if (!Array.isArray(values)) {
    return 0;
  }

  const users = new Set<string>();

  for (const value of values) {
    const id = idOf(value);

    if (id && id !== exclude) {
      users.add(id);
    }
  }

  return users.size;
}

function and(...filters: Filter[]): Filter {
  const parts = filters.filter(
    (filter) => filter && Object.keys(filter).length > 0,
  );

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return { $and: parts };
}

/** FNV-1a: a stable pseudo-random number for seeded ordering. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
}

/* ----------------------------------------------------------------------------
   Keyset cursor for chronological pages: "<createdAt ms>_<ObjectId>".
---------------------------------------------------------------------------- */

function encodeCursor(post: LeanPost): string | undefined {
  const created = post?.createdAt ? new Date(post.createdAt).getTime() : NaN;
  const id = idOf(post?._id);

  if (!Number.isFinite(created) || !Types.ObjectId.isValid(id)) {
    return undefined;
  }

  return `${created}_${id}`;
}

function decodeCursor(
  value: string | undefined,
): { createdAt: Date; id: Types.ObjectId } | undefined {
  if (typeof value !== 'string' || value.length > 64) {
    return undefined;
  }

  const match = /^(\d{1,15})_([a-f0-9]{24})$/i.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const createdAt = new Date(Number(match[1]));

  if (Number.isNaN(createdAt.getTime())) {
    return undefined;
  }

  return { createdAt, id: new Types.ObjectId(match[2]) };
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  private readonly snapshots = new FeedSnapshotStore(
    FEED_RANKING_CONFIG.snapshot.ttlMs,
    FEED_RANKING_CONFIG.snapshot.maxEntries,
  );

  private readonly servedEvents = new ServedEventsStore();

  /** Products already served per (viewer, For You session). */
  private readonly servedProducts = new ServedEventsStore();

  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly storiesService: StoriesService,

    private readonly blockVisibilityService: BlockVisibilityService,

    private readonly eventsService: EventsService,
  ) {}

  /* ==========================================================================
     GET FEED
  ========================================================================== */

  async getFeed(options: GetFeedOptions = {}) {
    const page = Math.max(1, Math.floor(Number(options.page) || 1));

    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.floor(Number(options.limit) || 20)),
    );

    const mode = parseFeedMode(options.mode);
    const viewerId = options.viewerId ? String(options.viewerId) : undefined;
    const session = this.cleanSession(options.session);

    const relationships = await this.loadViewerRelationships(viewerId);

    const visibilityFilter = this.buildVisibilityFilter(
      viewerId,
      relationships,
    );

    const result =
      mode === 'for-you'
        ? await this.getRankedPage(
            viewerId,
            session,
            relationships,
            visibilityFilter,
            page,
            limit,
          )
        : await this.getChronologicalPage(
            mode,
            relationships,
            visibilityFilter,
            page,
            limit,
            options.cursor,
          );

    const visiblePosts = await this.filterByBlockVisibility(
      viewerId,
      result.posts,
    );

    const [stories, events, products] = await Promise.all([
      this.storiesService.findAll(),
      this.loadFeedEvents({
        viewerId,
        mode,
        session,
        relationships,
        postIds: visiblePosts.map((post) => idOf(post._id)),
        excludeEvents: options.excludeEvents,
        latitude: options.latitude,
        longitude: options.longitude,
      }),
      this.loadFeedProducts({ viewerId, mode, session, page }),
    ]);

    return {
      feed: visiblePosts.map((post) =>
        this.toFeedItem(post, result.scores?.[idOf(post._id)]),
      ),

      // Recommended events for this page, placed after specific posts.
      events,

      serverTime: new Date().toISOString(),

      stories: (stories || []).map((story: any) => {
        const obj = story?.toObject?.() || story || {};

        return {
          ...obj,
          _id: obj._id?.toString?.() || obj.id,
          id: obj._id?.toString?.() || obj.id,
          createdAt: obj.createdAt || new Date(),
        };
      }),

      products,

      page,

      limit,

      total: result.total,

      hasMore: result.hasMore,

      // Chronological modes only; pass back as ?cursor= for the next page.
      nextCursor: result.nextCursor,

      mode,

      session: mode === 'for-you' ? session : undefined,
    };
  }

  /**
   * Fockis Shop products for this feed page.
   *
   * Never fails the feed: if anything goes wrong the page is served with no
   * products. The product and store models are read from the shared
   * Mongoose connection so FeedModule does not register second copies.
   */
  private async loadFeedProducts(input: {
    viewerId?: string;
    mode: FeedMode;
    session?: string;
    page: number;
  }): Promise<Record<string, any>[]> {
    // Following and Friends only show people the viewer chose.
    if (!FEED_PRODUCT_MODES.has(input.mode)) {
      return [];
    }

    const productModel = this.connection.models['Product'];

    if (!productModel) {
      this.logger.warn(
        'Product model is not registered on the shared Mongoose connection; feed products are unavailable.',
      );
      return [];
    }

    const now = new Date();

    let pool: Record<string, any>[];

    try {
      pool = (await productModel
        .find({
          isActive: true,
          displayLocations: 'feed',
          $or: [
            { feedExpiresAt: null },
            { feedExpiresAt: { $exists: false } },
            { feedExpiresAt: { $gt: now } },
          ],
        })
        .sort({ createdAt: -1, _id: -1 })
        .limit(FEED_PRODUCT_POOL_SIZE)
        .lean()
        .exec()) as Record<string, any>[];
    } catch (error) {
      // Product discovery must never take down the main social feed.
      this.logger.warn(`Could not load feed products: ${String(error)}`);
      return [];
    }

    if (pool.length === 0) {
      return [];
    }

    const memoryKey =
      input.mode === 'for-you' && input.session
        ? `${input.viewerId ?? 'anonymous'}:${input.session}`
        : undefined;

    const seed =
      memoryKey ??
      `${input.viewerId ?? 'anonymous'}:h${Math.floor(now.getTime() / 3_600_000)}`;

    const rotation = this.buildProductRotation(pool, seed);

    let picked: Record<string, any>[];

    if (memoryKey) {
      const served = new Set(this.servedProducts.get(memoryKey));
      const servedPerShop = new Map<string, number>();

      for (const product of pool) {
        if (served.has(idOf(product._id))) {
          const shopId = this.shopIdOf(product);
          servedPerShop.set(shopId, (servedPerShop.get(shopId) ?? 0) + 1);
        }
      }

      picked = this.pickOnePerShop(
        rotation.filter(
          (product) =>
            !served.has(idOf(product._id)) &&
            (servedPerShop.get(this.shopIdOf(product)) ?? 0) <
              FEED_PRODUCTS_PER_SHOP_PER_SESSION,
        ),
        FEED_PRODUCTS_PER_PAGE,
      );
      this.servedProducts.add(
        memoryKey,
        picked.map((product) => idOf(product._id)),
      );
    } else {
      // No session (Latest, background checks): walk the rotation by page.
      const start =
        ((input.page - 1) * FEED_PRODUCTS_PER_PAGE) % rotation.length;
      picked = this.pickOnePerShop(
        [...rotation.slice(start), ...rotation.slice(0, start)],
        FEED_PRODUCTS_PER_PAGE,
      );
    }

    const withStores = await this.attachStores(picked);

    return withStores.map((product) => ({
      ...product,
      _id: idOf(product._id),
      id: idOf(product._id),
    }));
  }

  private shopIdOf(product: Record<string, any>): string {
    return (
      idOf(product.storeId) ||
      idOf(product.seller) ||
      `product:${idOf(product._id)}`
    );
  }

  /**
   * Round-robin across shops: every shop's newest product, then every
   * shop's second product, and so on. Shop order is shuffled by `seed`.
   */
  private buildProductRotation(
    products: Record<string, any>[],
    seed: string,
  ): Record<string, any>[] {
    const byShop = new Map<string, Record<string, any>[]>();

    // `products` is newest first, so each shop's list is newest first too.
    for (const product of products) {
      const shopId = this.shopIdOf(product);
      const list = byShop.get(shopId);

      if (list) {
        list.push(product);
      } else {
        byShop.set(shopId, [product]);
      }
    }

    const shops = Array.from(byShop.keys()).sort(
      (a, b) =>
        hashString(`${seed}:${a}`) - hashString(`${seed}:${b}`) ||
        a.localeCompare(b),
    );

    const rotation: Record<string, any>[] = [];

    for (let round = 0; rotation.length < products.length; round += 1) {
      for (const shopId of shops) {
        const product = byShop.get(shopId)?.[round];

        if (product) {
          rotation.push(product);
        }
      }
    }

    return rotation;
  }

  /** Up to `count` products, never two from the same shop on one page. */
  private pickOnePerShop(
    candidates: Record<string, any>[],
    count: number,
  ): Record<string, any>[] {
    const picked: Record<string, any>[] = [];
    const shops = new Set<string>();

    for (const product of candidates) {
      const shopId = this.shopIdOf(product);

      if (shops.has(shopId)) {
        continue;
      }

      shops.add(shopId);
      picked.push(product);

      if (picked.length >= count) {
        break;
      }
    }

    return picked;
  }

  /**
   * Adds `store: { id, name, logo, slug }` so the feed card can show the
   * shop instead of a generic label. Optional: products are returned
   * unchanged if the Store model is missing or the lookup fails.
   */
  private async attachStores(
    products: Record<string, any>[],
  ): Promise<Record<string, any>[]> {
    const storeModel = this.connection.models[STORE_MODEL_NAME];

    const storeIds = toObjectIds(
      Array.from(
        new Set(products.map((product) => idOf(product.storeId)).filter(Boolean)),
      ),
    );

    if (!storeModel || storeIds.length === 0) {
      return products;
    }

    try {
      const stores = (await storeModel
        .find({ _id: { $in: storeIds } })
        .lean()
        .exec()) as Record<string, any>[];

      const byId = new Map(stores.map((store) => [idOf(store._id), store]));

      return products.map((product) => {
        const store = byId.get(idOf(product.storeId));

        if (!store) {
          return product;
        }

        return {
          ...product,
          store: {
            id: idOf(store._id),
            name: store.name ?? store.storeName ?? store.title ?? undefined,
            logo:
              store.logo ??
              store.logoUrl ??
              store.avatar ??
              store.image ??
              undefined,
            slug: store.slug ?? undefined,
          },
        };
      });
    } catch (error) {
      this.logger.warn(`Could not load feed product stores: ${String(error)}`);
      return products;
    }
  }

  /* ==========================================================================
     EVENTS BETWEEN POSTS
  ========================================================================== */

  /**
   * Never fails the feed: if anything goes wrong the page is served with
   * no events.
   */
  private async loadFeedEvents(input: {
    viewerId?: string;
    mode: FeedMode;
    session?: string;
    relationships: ViewerRelationships;
    postIds: string[];
    excludeEvents?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<FeedEventSlot[]> {
    if (!input.viewerId || input.postIds.length === 0) {
      return [];
    }

    let organizerIds: string[] | undefined;

    if (input.mode === 'following') {
      organizerIds = input.relationships.followedIds;
    } else if (input.mode === 'friends') {
      organizerIds = input.relationships.friendIds;
    }

    if (organizerIds && organizerIds.length === 0) {
      return [];
    }

    const memoryKey =
      input.mode === 'for-you' && input.session
        ? `${input.viewerId}:${input.session}`
        : undefined;

    const exclude = Array.from(
      new Set([
        ...parseEventIdList(input.excludeEvents),
        ...this.servedEvents.get(memoryKey),
      ]),
    );

    try {
      const recommended = await this.eventsService.recommendForFeed({
        viewerId: input.viewerId,
        relationships: input.relationships,
        excludeIds: exclude,
        organizerIds,
        limit: 3,
        latitude: input.latitude,
        longitude: input.longitude,
      });

      const slots = buildFeedEventSlots(input.postIds, recommended);

      this.servedEvents.add(
        memoryKey,
        slots.map((slot) => slot.event.id),
      );

      return slots;
    } catch (error) {
      this.logger.warn(`Could not load feed events: ${String(error)}`);
      return [];
    }
  }

  /* ==========================================================================
     FOR YOU
  ========================================================================== */

  private async getRankedPage(
    viewerId: string | undefined,
    session: string | undefined,
    relationships: ViewerRelationships,
    visibilityFilter: Filter,
    page: number,
    limit: number,
  ): Promise<FeedPage> {
    const snapshotKey = session
      ? `${viewerId ?? 'anonymous'}:${session}`
      : undefined;

    /*
     * Page 1 always ranks fresh. Later pages reuse the order stored for
     * this session so pages are consecutive slices of one list.
     */
    let snapshot =
      page > 1 && snapshotKey
        ? this.snapshots.get(snapshotKey)
        : undefined;

    if (!snapshot) {
      const startedAt = Date.now();

      let candidates = await this.loadCandidatePool(visibilityFilter);

      /*
       * Apply the canonical block rule to every candidate author before
       * ranking, so nothing the viewer may not see is ever scored. The
       * Friendship query above already removed known blocks; this catches
       * anything else BlockVisibilityService enforces.
       */
      candidates = await this.filterByBlockVisibility(
        viewerId,
        candidates,
      );

      const rankable = candidates.map((post) =>
        this.toRankable(post, viewerId),
      );

      const authorIds = Array.from(
        new Set(rankable.map((post) => post.authorId).filter(Boolean)),
      );

      const [signals, followerCounts] = await Promise.all([
        this.loadViewerSignals(viewerId, relationships),
        this.loadFollowerCounts(authorIds),
      ]);

      const ranked = rankFeed(
        rankable,
        signals,
        followerCounts,
        new Date(),
        FEED_RANKING_CONFIG,
        { explorationSeed: this.explorationSeed(viewerId, session) },
      );

      const postIds = ranked.map((item) => item.post.id);

      const scores: Record<string, number> = {};

      for (const item of ranked) {
        scores[item.post.id] = Number(item.score.toFixed(4));
      }

      if (snapshotKey) {
        this.snapshots.set(snapshotKey, postIds, scores);
      }

      snapshot = {
        postIds,
        scores,
        touchedAt: Date.now(),
      };

      this.logger.debug(
        `Ranked ${postIds.length} posts for ${viewerId ?? 'anonymous'} in ${
          Date.now() - startedAt
        }ms`,
      );
    }

    const skip = (page - 1) * limit;
    const pageIds = snapshot.postIds.slice(skip, skip + limit);

    /*
     * Re-read the page by ID with the visibility filter applied again.
     * Counts are current, and anything deleted or no longer visible since
     * ranking is dropped rather than served.
     */
    const docs = pageIds.length
      ? ((await this.postModel
          .find(
            and(visibilityFilter, {
              _id: { $in: toObjectIds(pageIds) },
            }),
          )
          .lean()
          .exec()) as LeanPost[])
      : [];

    const byId = new Map(docs.map((doc) => [idOf(doc._id), doc]));

    return {
      posts: pageIds
        .map((id) => byId.get(id))
        .filter((doc): doc is LeanPost => Boolean(doc)),
      total: snapshot.postIds.length,
      hasMore: skip + limit < snapshot.postIds.length,
      scores: snapshot.scores,
    };
  }

  /**
   * Candidate pool for one ranking pass:
   *   1. the most recent visible posts (candidatePoolSize)
   *   2. when that pool is full, older visible posts with the highest
   *      stored engagement score (Post.score), so relevant evergreen posts
   *      are not excluded just because they are old
   * Both queries carry the same visibility filter. Two bounded queries,
   * never a full collection scan into memory.
   */
  private async loadCandidatePool(
    visibilityFilter: Filter,
  ): Promise<LeanPost[]> {
    const recent = (await this.postModel
      .find(visibilityFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(FEED_RANKING_CONFIG.candidatePoolSize)
      .lean()
      .exec()) as LeanPost[];

    const evergreenSize = FEED_RANKING_CONFIG.evergreenPoolSize;

    if (
      evergreenSize <= 0 ||
      recent.length < FEED_RANKING_CONFIG.candidatePoolSize
    ) {
      return recent;
    }

    const oldest = recent[recent.length - 1]?.createdAt;

    if (!oldest) {
      return recent;
    }

    try {
      const evergreen = (await this.postModel
        .find(
          and(visibilityFilter, {
            createdAt: { $lt: new Date(oldest) },
            score: { $gt: 0 },
          }),
        )
        .sort({ score: -1, _id: -1 })
        .limit(evergreenSize)
        .lean()
        .exec()) as LeanPost[];

      const known = new Set(recent.map((post) => idOf(post._id)));

      return [
        ...recent,
        ...evergreen.filter((post) => !known.has(idOf(post._id))),
      ];
    } catch (error) {
      this.logger.warn(`Could not load evergreen posts: ${String(error)}`);
      return recent;
    }
  }

  /**
   * Seed for the bounded exploration component. Same viewer + session
   * gives the same order (so a recomputed snapshot matches); a new
   * session gives a different mix. Without a session the seed changes
   * once per hour.
   */
  private explorationSeed(
    viewerId: string | undefined,
    session: string | undefined,
  ): string {
    const scope = session ?? `h${Math.floor(Date.now() / 3_600_000)}`;

    return `${viewerId ?? 'anonymous'}:${scope}`;
  }

  /* ==========================================================================
     FOLLOWING / FRIENDS / LATEST
  ========================================================================== */

  private async getChronologicalPage(
    mode: Exclude<FeedMode, 'for-you'>,
    relationships: ViewerRelationships,
    visibilityFilter: Filter,
    page: number,
    limit: number,
    cursor?: string,
  ): Promise<FeedPage> {
    let modeFilter: Filter = {};

    if (mode === 'following') {
      modeFilter = { user: { $in: relationships.followedIds } };
    }

    if (mode === 'friends') {
      modeFilter = { user: { $in: relationships.friendIds } };
    }

    if (
      (mode === 'following' && relationships.followedIds.length === 0) ||
      (mode === 'friends' && relationships.friendIds.length === 0)
    ) {
      return { posts: [], total: 0, hasMore: false };
    }

    const filter = and(visibilityFilter, modeFilter);
    const parsedCursor = decodeCursor(cursor);

    /*
     * Keyset pagination when the client sends a cursor: "older than the
     * last post I have", ordered by (createdAt, _id). New posts at the top
     * cannot shift it. Without a cursor the original page/skip behaviour
     * is kept for older clients.
     */
    const skip = parsedCursor ? 0 : (page - 1) * limit;

    const pageFilter = parsedCursor
      ? and(filter, {
          $or: [
            { createdAt: { $lt: parsedCursor.createdAt } },
            {
              createdAt: parsedCursor.createdAt,
              _id: { $lt: parsedCursor.id },
            },
          ],
        })
      : filter;

    // One extra row tells us whether another page exists.
    const [rows, total] = await Promise.all([
      this.postModel
        .find(pageFilter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit + 1)
        .lean()
        .exec() as Promise<LeanPost[]>,

      this.postModel.countDocuments(filter).exec(),
    ]);

    const hasMore = rows.length > limit;
    const posts = hasMore ? rows.slice(0, limit) : rows;
    const last = posts[posts.length - 1];

    return {
      posts,
      total,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last) : undefined,
    };
  }

  /* ==========================================================================
     VISIBILITY
  ========================================================================== */

  private buildVisibilityFilter(
    viewerId: string | undefined,
    relationships: ViewerRelationships,
  ): Filter {
    const audience: Filter[] = [{ audience: 'public' }];

    if (viewerId) {
      audience.push({ audience: 'friends', user: viewerId });

      if (relationships.friendIds.length > 0) {
        audience.push({
          audience: 'friends',
          user: { $in: relationships.friendIds },
        });
      }
    }

    const filters: Filter[] = [
      { $or: audience },
      // Posts removed by moderation are never shown.
      { moderationStatus: { $ne: 'removed' } },
    ];

    if (relationships.blockedIds.length > 0) {
      filters.push({ user: { $nin: relationships.blockedIds } });
    }

    return and(...filters);
  }

  /**
   * Final authorization check with the same rule profiles and single-post
   * views use. One call per distinct author, never per post. Fails closed.
   */
  private async filterByBlockVisibility(
    viewerId: string | undefined,
    posts: LeanPost[],
  ): Promise<LeanPost[]> {
    if (!viewerId || posts.length === 0) {
      return posts;
    }

    const authors = Array.from(
      new Set(
        posts
          .map((post) => ownerIdOf(post))
          .filter((authorId) => authorId && authorId !== viewerId),
      ),
    );

    const allowed = new Map<string, boolean>();

    for (
      let start = 0;
      start < authors.length;
      start += BLOCK_CHECK_CONCURRENCY
    ) {
      await Promise.all(
        authors
          .slice(start, start + BLOCK_CHECK_CONCURRENCY)
          .map(async (authorId) => {
            try {
              allowed.set(
                authorId,
                await this.blockVisibilityService.canView(viewerId, authorId),
              );
            } catch (error) {
              this.logger.warn(
                `Block check failed for author ${authorId}; hiding their posts. ${String(error)}`,
              );
              allowed.set(authorId, false);
            }
          }),
      );
    }

    return posts.filter((post) => {
      const authorId = ownerIdOf(post);

      return !authorId || authorId === viewerId || allowed.get(authorId) === true;
    });
  }

  /* ==========================================================================
     VIEWER DATA
  ========================================================================== */

  private async loadViewerRelationships(
    viewerId: string | undefined,
  ): Promise<ViewerRelationships> {
    const relationships: ViewerRelationships = {
      followedIds: [],
      friendIds: [],
      blockedIds: [],
    };

    if (!viewerId || !Types.ObjectId.isValid(viewerId)) {
      return relationships;
    }

    const viewerObjectId = new Types.ObjectId(viewerId);

    const followModel = this.connection.models[FOLLOW_MODEL_NAME];
    const friendshipModel = this.connection.models[FRIENDSHIP_MODEL_NAME];

    const [follows, friendships] = await Promise.all([
      followModel
        ? followModel
            .find({ followerId: viewerObjectId })
            .select('followingId')
            .lean()
            .exec()
            .catch((error: unknown) => {
              this.logger.warn(`Could not load follows: ${String(error)}`);
              return null;
            })
        : Promise.resolve(null),

      friendshipModel
        ? friendshipModel
            .find({
              status: { $in: ['accepted', 'blocked'] },
              $or: [
                { requester: viewerObjectId },
                { receiver: viewerObjectId },
              ],
            })
            .select('requester receiver status')
            .lean()
            .exec()
            .catch((error: unknown) => {
              this.logger.warn(`Could not load friendships: ${String(error)}`);
              return null;
            })
        : Promise.resolve(null),
    ]);

    if (!followModel || !friendshipModel) {
      this.logger.warn(
        `Relationship models not registered (Follow: ${Boolean(
          followModel,
        )}, Friendship: ${Boolean(friendshipModel)}).`,
      );
    }

    if (Array.isArray(follows)) {
      relationships.followedIds = Array.from(
        new Set(
          follows.map((item: any) => idOf(item.followingId)).filter(Boolean),
        ),
      );
    }

    if (Array.isArray(friendships)) {
      const friends = new Set<string>();
      const blocked = new Set<string>();

      for (const item of friendships as any[]) {
        const requester: string = idOf(item.requester);
        const receiver: string = idOf(item.receiver);
        const other: string = requester === viewerId ? receiver : requester;

        if (!other || other === viewerId) {
          continue;
        }

        // A block in either direction hides both users from each other.
        if (item.status === 'blocked') {
          blocked.add(other);
        } else if (item.status === 'accepted') {
          friends.add(other);
        }
      }

      for (const id of blocked) {
        friends.delete(id);
      }

      relationships.friendIds = Array.from(friends);
      relationships.blockedIds = Array.from(blocked);
    }

    relationships.followedIds = relationships.followedIds.filter(
      (id) => !relationships.blockedIds.includes(id),
    );

    return relationships;
  }

  /**
   * Interest signals come only from what the viewer has actually done:
   * likes, comments, reposts and shares on other people's posts.
   */
  private async loadViewerSignals(
    viewerId: string | undefined,
    relationships: ViewerRelationships,
  ): Promise<ViewerSignals> {
    const signals = emptyViewerSignals(viewerId);

    const result: ViewerSignals = {
      ...signals,
      followedAuthorIds: new Set(relationships.followedIds),
      friendAuthorIds: new Set(relationships.friendIds),
    };

    if (!viewerId) {
      return result;
    }

    let history: LeanPost[] = [];

    try {
      history = await this.postModel
        .aggregate([
          {
            $match: {
              user: { $ne: viewerId },
              $or: [
                { likedBy: viewerId },
                { repostedBy: viewerId },
                { 'comments.userId': viewerId },
                { 'shareEvents.userId': viewerId },
              ],
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: HISTORY_SAMPLE_SIZE },
          {
            $project: {
              user: 1,
              content: 1,
              media: 1,
              type: 1,
              liked: {
                $cond: [
                  { $in: [viewerId, { $ifNull: ['$likedBy', []] }] },
                  1,
                  0,
                ],
              },
              reposted: {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$repostedBy', []] },
                    cond: { $eq: ['$$this', viewerId] },
                  },
                },
              },
              commented: {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$comments', []] },
                    cond: { $eq: ['$$this.userId', viewerId] },
                  },
                },
              },
              shared: {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$shareEvents', []] },
                    cond: { $eq: ['$$this.userId', viewerId] },
                  },
                },
              },
            },
          },
        ])
        .exec();
    } catch (error) {
      this.logger.warn(`Could not load interaction history: ${String(error)}`);
      return result;
    }

    const weights = FEED_RANKING_CONFIG.history;

    const authorAffinity = new Map<string, number>();
    const hashtagAffinity = new Map<string, number>();
    const mediaKindAffinity = new Map<MediaKind, number>();

    let interactedPosts = 0;

    for (const item of history) {
      // Cap repeat actions so spamming one post cannot dominate affinity.
      const weight =
        (item.liked ? weights.like : 0) +
        Math.min(toNumber(item.commented), 3) * weights.comment +
        Math.min(toNumber(item.reposted), 1) * weights.repost +
        Math.min(toNumber(item.shared), 1) * weights.share;

      if (weight <= 0) {
        continue;
      }

      interactedPosts += 1;

      const author = ownerIdOf(item);

      if (author && author !== viewerId) {
        authorAffinity.set(author, (authorAffinity.get(author) ?? 0) + weight);
      }

      for (const tag of extractHashtags(item.content)) {
        hashtagAffinity.set(tag, (hashtagAffinity.get(tag) ?? 0) + weight);
      }

      const kind = this.mediaKindOf(item);

      mediaKindAffinity.set(kind, (mediaKindAffinity.get(kind) ?? 0) + weight);
    }

    return {
      ...result,
      authorAffinity,
      hashtagAffinity,
      mediaKindAffinity,
      historyInteractions: interactedPosts,
    };
  }

  private async loadFollowerCounts(
    authorIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const followModel = this.connection.models[FOLLOW_MODEL_NAME];
    const objectIds = toObjectIds(authorIds);

    if (!followModel || objectIds.length === 0) {
      return counts;
    }

    try {
      const rows = await followModel
        .aggregate([
          { $match: { followingId: { $in: objectIds } } },
          { $group: { _id: '$followingId', count: { $sum: 1 } } },
        ])
        .exec();

      for (const row of rows) {
        counts.set(idOf(row._id), toNumber(row.count));
      }
    } catch (error) {
      this.logger.warn(`Could not load follower counts: ${String(error)}`);
    }

    return counts;
  }

  /* ==========================================================================
     MAPPING
  ========================================================================== */

  private mediaKindOf(post: LeanPost): MediaKind {
    const media = getRawMedia(post);

    if (!media) {
      return 'text';
    }

    return detectMediaType(media, post) === 'video' ? 'video' : 'image';
  }

  private toRankable(post: LeanPost, viewerId?: string): RankablePost {
    const authorId = ownerIdOf(post);

    const meaningfulCommenters = new Set<string>();

    if (Array.isArray(post.comments)) {
      for (const comment of post.comments) {
        const commenter = idOf(comment?.userId);
        const text = String(comment?.content ?? '').trim();

        if (commenter && commenter !== authorId && text.length >= 2) {
          meaningfulCommenters.add(commenter);
        }
      }
    }

    const sharers = Array.isArray(post.shareEvents)
      ? post.shareEvents.map((event: any) => event?.userId)
      : [];

    const createdAt = post.createdAt ? new Date(post.createdAt) : new Date(0);

    return {
      id: idOf(post._id),
      authorId,
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt,
      mediaKind: this.mediaKindOf(post),
      hashtags: extractHashtags(post.content),
      likes: Array.isArray(post.likedBy)
        ? distinctUsers(post.likedBy, authorId)
        : toNumber(post.likes),
      meaningfulComments: meaningfulCommenters.size,
      reposts: distinctUsers(post.repostedBy, authorId),
      shares: sharers.length
        ? distinctUsers(sharers, authorId)
        : toNumber(post.shares),
      gifts: toNumber(post.giftsCount),
      views: Math.max(
        toNumber(post.views),
        Array.isArray(post.viewedBy) ? post.viewedBy.length : 0,
      ),
      seenByViewer: Boolean(
        viewerId &&
          Array.isArray(post.viewedBy) &&
          post.viewedBy.some((id: unknown) => idOf(id) === viewerId),
      ),
    };
  }

  /**
   * Same response shape as before, plus the fields the client already
   * reads but this endpoint used to drop (likedBy, repostedBy, viewedBy,
   * reposts, views, userPhoto). Without likedBy the client could not tell
   * a post was already liked, so tapping like would un-like it.
   */
  private toFeedItem(post: LeanPost, score?: number) {
    const rawMedia = getRawMedia(post);
    const id = idOf(post._id);

    const user = typeof post.user === 'object' ? post.user : null;

    return {
      _id: id,
      id,

      user: ownerIdOf(post) || undefined,

      username:
        post.username ||
        user?.username ||
        post.author?.username ||
        post.name ||
        'Unknown',

      userPhoto: post.userPhoto || user?.avatar || undefined,

      content: post.content || post.caption || post.text || '',

      media: rawMedia || null,

      mediaType: detectMediaType(rawMedia, post),

      type: 'post',

      audience: post.audience || 'public',

      likes: post.likes || 0,
      shares: post.shares || 0,
      reposts: post.reposts || 0,
      views: post.views || 0,
      giftsCount: post.giftsCount || 0,

      likedBy: Array.isArray(post.likedBy) ? post.likedBy : [],
      repostedBy: Array.isArray(post.repostedBy) ? post.repostedBy : [],
      viewedBy: Array.isArray(post.viewedBy) ? post.viewedBy : [],

      comments: post.comments || [],

      createdAt: post.createdAt ? new Date(post.createdAt) : new Date(0),

      score: typeof score === 'number' ? score : undefined,
    };
  }

  private cleanSession(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const session = value.trim();

    if (
      !session ||
      session.length > MAX_SESSION_LENGTH ||
      !/^[A-Za-z0-9_-]+$/.test(session)
    ) {
      return undefined;
    }

    return session;
  }
}
