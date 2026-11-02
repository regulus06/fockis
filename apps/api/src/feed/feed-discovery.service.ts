import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

import { Post, PostDocument } from "../posts/post.schema";
import { FeedService, detectMediaType, getRawMedia } from "./feed.service";

/* ============================================================================
   FEED DISCOVERY — real data for the feed's discovery cards
   - Trending on Fockis: hashtags from recent posts the viewer may see
     (same audience / moderation / block rules as the feed), real counts.
   - People you may follow: accounts followed by people you follow
     (mutual connections) first, then active, well-followed accounts.
     Never you, never someone you already follow, never a blocked account.
============================================================================ */

export interface TrendingTag {
  tag: string;
  posts: number;
  lastPostAt: string | null;
  thumbnail: string | null;
  thumbnailType: "image" | "video" | null;
}

export interface SuggestedPerson {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified: boolean;
  bio: string;
  mutualCount: number;
  followersCount: number;
}

const HASHTAG = /#([\p{L}\p{N}_]{2,40})/gu;
const TRENDING_WINDOWS_DAYS = [7, 30];
const TRENDING_POST_SAMPLE = 3000;
const TRENDING_CACHE_MS = 2 * 60_000;

/** "#Fockis #fockis #FOCKIS" → one tag per post, case-insensitive. */
export function hashtagsIn(text: unknown): string[] {
  const seen = new Map<string, string>();
  for (const m of String(text ?? "").matchAll(HASHTAG)) {
    const key = m[1].toLowerCase();
    if (!/^\d+$/.test(key) && !seen.has(key)) seen.set(key, m[1]);
  }
  return [...seen.values()];
}

/** Ranks hashtags by posts, then by how recent the latest one is. */
export function rankHashtags(posts: Array<{ content?: unknown; createdAt?: unknown; media?: unknown; [k: string]: unknown }>, limit: number): TrendingTag[] {
  const byTag = new Map<string, { label: string; posts: number; last: number; thumb: string | null; thumbType: "image" | "video" | null; labels: Map<string, number> }>();
  for (const post of posts) {
    const at = new Date(String(post.createdAt ?? 0)).getTime() || 0;
    const media = getRawMedia(post);
    const mediaType = media ? detectMediaType(media, post) : "none";
    for (const label of hashtagsIn(post.content)) {
      const key = label.toLowerCase();
      const entry = byTag.get(key) ?? { label, posts: 0, last: 0, thumb: null, thumbType: null, labels: new Map() };
      entry.posts += 1;
      entry.labels.set(label, (entry.labels.get(label) ?? 0) + 1);
      if (at > entry.last) entry.last = at;
      if (!entry.thumb && media && mediaType !== "none") {
        entry.thumb = media;
        entry.thumbType = mediaType;
      }
      byTag.set(key, entry);
    }
  }
  return [...byTag.values()]
    .sort((a, b) => b.posts - a.posts || b.last - a.last)
    .slice(0, limit)
    .map((e) => ({
      // The spelling people use most ("#Haiti" over "#haiti").
      tag: [...e.labels.entries()].sort((a, b) => b[1] - a[1])[0][0],
      posts: e.posts,
      lastPostAt: e.last ? new Date(e.last).toISOString() : null,
      thumbnail: e.thumb,
      thumbnailType: e.thumbType,
    }));
}

@Injectable()
export class FeedDiscoveryService {
  private readonly logger = new Logger(FeedDiscoveryService.name);
  private readonly trendingCache = new Map<string, { at: number; value: TrendingTag[] }>();

  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly feed: FeedService,
  ) {}

  /* ---------------------------------------------------------------- trending */

  async trending(viewerId: string | undefined, limit = 8): Promise<TrendingTag[]> {
    const size = Math.max(1, Math.min(20, Number(limit) || 8));
    const relationships = await this.feed.relationshipsFor(viewerId);
    // Viewers with the same blocks see the same list; cache by that.
    const cacheKey = `${relationships.blockedIds.slice().sort().join(",")}|${relationships.friendIds.length ? viewerId : "-"}|${size}`;
    const cached = this.trendingCache.get(cacheKey);
    if (cached && Date.now() - cached.at < TRENDING_CACHE_MS) return cached.value;

    const visibility = this.feed.visibilityFilterFor(viewerId, relationships);
    let result: TrendingTag[] = [];
    for (const days of TRENDING_WINDOWS_DAYS) {
      const since = new Date(Date.now() - days * 86_400_000);
      const posts = (await this.postModel
        .find({ $and: [visibility, { createdAt: { $gte: since } }, { content: { $regex: "#" } }] } as any)
        .sort({ createdAt: -1 })
        .limit(TRENDING_POST_SAMPLE)
        .select("content createdAt media image imageUrl images video videoUrl mediaType type")
        .lean()
        .exec()
        .catch((error: unknown) => {
          this.logger.warn(`Trending query failed: ${String(error)}`);
          return [];
        })) as any[];
      result = rankHashtags(posts, size);
      if (result.length >= Math.min(3, size)) break;
    }
    this.trendingCache.set(cacheKey, { at: Date.now(), value: result });
    if (this.trendingCache.size > 200) this.trendingCache.delete(this.trendingCache.keys().next().value as string);
    return result;
  }

  /* ---------------------------------------------------------------- people */

  async people(viewerId: string | undefined, options: { limit?: number; exclude?: string[] } = {}): Promise<SuggestedPerson[]> {
    if (!viewerId || !Types.ObjectId.isValid(viewerId)) return [];
    const size = Math.max(1, Math.min(20, Number(options.limit) || 6));
    const userModel = this.connection.models["User"];
    const followModel = this.connection.models["Follow"];
    if (!userModel) return [];

    const relationships = await this.feed.relationshipsFor(viewerId);
    const skip = new Set<string>([
      viewerId,
      ...relationships.followedIds.map(String),
      ...relationships.blockedIds.map(String),
      ...(options.exclude ?? []).filter((id) => Types.ObjectId.isValid(id)),
    ]);

    // 1. Mutual connections: people followed by people you follow.
    const mutual = new Map<string, number>();
    if (followModel && relationships.followedIds.length) {
      const rows = (await followModel
        .find({ followerId: { $in: relationships.followedIds.slice(0, 500).map((id) => new Types.ObjectId(String(id))) } })
        .select("followingId")
        .limit(5000)
        .lean()
        .exec()
        .catch(() => [])) as any[];
      for (const row of rows) {
        const id = String(row.followingId);
        if (!skip.has(id)) mutual.set(id, (mutual.get(id) ?? 0) + 1);
      }
    }

    const mutualIds = [...mutual.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([id]) => id);
    const fields = "username firstName lastName name profilePicture avatar bio verified isVerified followersCount followers isActive";
    const notSkipped = { $nin: [...skip].map((id) => new Types.ObjectId(id)) };

    const [mutualUsers, popularUsers] = await Promise.all([
      mutualIds.length
        ? (userModel.find({ _id: { $in: mutualIds.map((id) => new Types.ObjectId(id)) }, isActive: { $ne: false } }).select(fields).lean().exec().catch(() => []) as Promise<any[]>)
        : Promise.resolve([] as any[]),
      // 2. Well-followed, active accounts to fill the list.
      userModel
        .find({ _id: notSkipped, isActive: { $ne: false }, username: { $exists: true, $ne: "" } })
        .sort({ followersCount: -1, createdAt: -1 })
        .limit(60)
        .select(fields)
        .lean()
        .exec()
        .catch(() => []) as Promise<any[]>,
    ]);

    const seen = new Set<string>();
    const scored = [...mutualUsers, ...popularUsers]
      .filter((u) => {
        const id = String(u._id);
        if (seen.has(id) || skip.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((u) => {
        const followers = Number(u.followersCount ?? (Array.isArray(u.followers) ? u.followers.length : 0)) || 0;
        const mutualCount = mutual.get(String(u._id)) ?? 0;
        const verified = Boolean(u.verified || u.isVerified);
        return { u, followers, mutualCount, verified, score: mutualCount * 10 + Math.log10(followers + 1) * 2 + (verified ? 1.5 : 0) + Math.random() };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, size);

    // Last check: drop anyone the viewer can't see (blocks either way).
    const visible: SuggestedPerson[] = [];
    for (const s of scored) {
      const u = s.u;
      visible.push({
        id: String(u._id),
        name: u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Fockis user",
        username: String(u.username ?? ""),
        avatar: String(u.profilePicture || u.avatar || ""),
        verified: s.verified,
        bio: String(u.bio ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
        mutualCount: s.mutualCount,
        followersCount: s.followers,
      });
    }
    return visible;
  }
}
