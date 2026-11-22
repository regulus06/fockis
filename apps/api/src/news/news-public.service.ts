/**
 * news-public.service.ts — central Fockis News, Media Directory, public media
 * profiles, article reading, likes/bookmarks/comments and following with
 * per-media notification preferences.
 *
 * Only published content is ever returned here:
 *  - central Fockis News: status "published" + distribution.fockisNews + time reached;
 *  - a media profile: status "published" + time reached.
 * Drafts, reviews, scheduled-but-not-due and archived articles never leave the newsroom.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash } from 'crypto';

import { websiteUrl } from '../website-studio/common/website-studio.config';
import { NewsAccessService, iso, isOid, oid, sameId, str } from './news-access.service';
import { FOLLOW_PREFS, MEDIA_TYPES, NEWS_CATEGORIES, NEWS_LANGUAGES, NEWS_MODEL, type FollowPref } from './news.schemas';

type AnyModel = Model<any>;
type Lean = Record<string, any>;

export interface NewsFilters {
  country?: string;
  city?: string;
  language?: string;
  category?: string;
  mediaType?: string;
  outlet?: string;
  from?: string;
  to?: string;
  q?: string;
}

const PAGE = 24;
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

@Injectable()
export class NewsPublicService {
  constructor(
    private readonly access: NewsAccessService,
    @InjectModel(NEWS_MODEL.article) private readonly articles: AnyModel,
    @InjectModel(NEWS_MODEL.reaction) private readonly reactions: AnyModel,
    @InjectModel(NEWS_MODEL.comment) private readonly comments: AnyModel,
    @InjectModel(NEWS_MODEL.view) private readonly views: AnyModel,
    @InjectModel(NEWS_MODEL.follow) private readonly follows: AnyModel,
    @InjectModel(NEWS_MODEL.item) private readonly items: AnyModel,
    @InjectModel(NEWS_MODEL.campaign) private readonly campaigns: AnyModel,
    @InjectModel(NEWS_MODEL.member) private readonly members: AnyModel,
  ) {}

  /* ==========================================================================
   * Shapes
   * ======================================================================== */

  outletCard(o: Lean, following?: Set<string>) {
    return {
      id: String(o._id),
      slug: o.slug,
      name: o.name,
      mediaType: o.mediaType,
      logoUrl: o.logoUrl || '',
      coverUrl: o.coverUrl || '',
      tagline: o.tagline || '',
      country: o.country || '',
      city: o.city || '',
      verified: Boolean(o.verified),
      followerCount: o.followerCount ?? 0,
      articleCount: o.articleCount ?? 0,
      websiteUrl: o.websiteUrl || '',
      isFollowing: following ? following.has(String(o._id)) : false,
      live: { tv: Boolean(o.live?.tvLive && o.live?.tvStreamUrl), radio: Boolean(o.live?.radioLive && o.live?.radioStreamUrl) },
    };
  }

  articleCard(a: Lean, outlets: Map<string, Lean>) {
    const o = outlets.get(String(a.outletId));
    return {
      id: String(a._id),
      slug: a.slug,
      headline: a.headline,
      subtitle: a.subtitle || '',
      excerpt: a.excerpt || '',
      imageUrl: a.featuredImage?.url || '',
      category: a.category,
      language: a.language,
      city: a.city || '',
      country: a.country || '',
      isBreaking: Boolean(a.isBreaking),
      sponsored: Boolean(a.sponsored),
      authorName: a.authorName || '',
      publishedAt: iso(a.fockisPublishedAt ?? a.publishedAt),
      readingMinutes: a.readingMinutes ?? 1,
      views: a.views ?? 0,
      hasVideo: Boolean(a.videoUrl),
      outlet: o ? { id: String(o._id), slug: o.slug, name: o.name, logoUrl: o.logoUrl || '', verified: Boolean(o.verified) } : null,
    };
  }

  itemCard(i: Lean, outlets: Map<string, Lean>) {
    const o = outlets.get(String(i.outletId));
    return {
      id: String(i._id),
      kind: i.kind,
      title: i.title,
      description: i.description || '',
      mediaUrl: i.mediaUrl || '',
      thumbnailUrl: i.thumbnailUrl || '',
      showName: i.showName || '',
      episodeNumber: i.episodeNumber ?? null,
      durationSec: i.durationSec ?? null,
      presenters: i.presenters ?? [],
      schedule: i.schedule ?? null,
      publishedAt: iso(i.publishedAt),
      plays: i.plays ?? 0,
      outlet: o ? { id: String(o._id), slug: o.slug, name: o.name, logoUrl: o.logoUrl || '', verified: Boolean(o.verified) } : null,
    };
  }

  private async outletMap(ids: unknown[]) {
    const unique = [...new Set(ids.map(String))].filter(isOid).map((x) => new Types.ObjectId(x));
    const rows = (await this.access.outlets.find({ _id: { $in: unique } }).select('slug name logoUrl verified status').lean().exec()) as Lean[];
    return new Map(rows.map((o) => [String(o._id), o]));
  }

  private async suspendedOutletIds(): Promise<Types.ObjectId[]> {
    const rows = (await this.access.outlets.find({ $or: [{ status: { $ne: 'active' } }, { deletedAt: { $ne: null } }] }).select('_id').lean().exec()) as Lean[];
    return rows.map((r) => r._id);
  }

  private async followingSet(userId: string | null) {
    if (!userId) return new Set<string>();
    const rows = (await this.follows.find({ userId: oid(userId) }).select('outletId').lean().exec()) as Lean[];
    return new Set(rows.map((r) => String(r.outletId)));
  }

  /* ==========================================================================
   * Central Fockis News
   * ======================================================================== */

  /** Base query for content visible on central Fockis News. */
  private async centralQuery(f: NewsFilters = {}): Promise<Record<string, unknown>> {
    const now = new Date();
    const q: Record<string, unknown> = {
      deletedAt: null,
      status: 'published',
      'distribution.fockisNews': true,
      fockisPublishedAt: { $ne: null, $lte: now },
    };
    const blocked = await this.suspendedOutletIds();
    const outletIn: Types.ObjectId[] | null = await this.outletIdsMatching(f);
    if (outletIn) q.outletId = { $in: outletIn.filter((x) => !blocked.some((b) => b.equals(x))) };
    else if (blocked.length) q.outletId = { $nin: blocked };
    if (f.category && (NEWS_CATEGORIES as readonly string[]).includes(f.category)) q.category = f.category;
    if (f.language && (NEWS_LANGUAGES as readonly string[]).includes(f.language)) q.language = f.language;
    if (f.country) q.country = new RegExp(`^${escapeRe(str(f.country, 80))}$`, 'i');
    if (f.city) q.city = new RegExp(`^${escapeRe(str(f.city, 80))}$`, 'i');
    const range: Record<string, Date> = { $ne: null as unknown as Date, $lte: now };
    if (f.from && !Number.isNaN(Date.parse(f.from))) range.$gte = new Date(f.from);
    if (f.to && !Number.isNaN(Date.parse(f.to))) range.$lte = new Date(Math.min(Date.parse(f.to) + 86_399_999, now.getTime()));
    q.fockisPublishedAt = range;
    if (f.q) q.$text = { $search: str(f.q, 120) };
    return q;
  }

  /** Outlet filters (media type / specific outlet) → outlet IDs, or null for "any". */
  private async outletIdsMatching(f: NewsFilters): Promise<Types.ObjectId[] | null> {
    const oq: Record<string, unknown> = {};
    if (f.mediaType && (MEDIA_TYPES as readonly string[]).includes(f.mediaType)) oq.mediaType = f.mediaType;
    if (f.outlet) {
      if (isOid(f.outlet)) oq._id = new Types.ObjectId(f.outlet);
      else oq.slug = str(f.outlet, 63).toLowerCase();
    }
    if (!Object.keys(oq).length) return null;
    const rows = (await this.access.outlets.find({ ...oq, status: 'active', deletedAt: null }).select('_id').lean().exec()) as Lean[];
    return rows.map((r) => r._id);
  }

  private async cards(q: Record<string, unknown>, sort: Record<string, 1 | -1>, limit: number, skip = 0) {
    const rows = (await this.articles
      .find(q)
      .select('-body -revisions -gallery -sources -reviewNote')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()) as Lean[];
    const outlets = await this.outletMap(rows.map((r) => r.outletId));
    return rows.map((r) => this.articleCard(r, outlets));
  }

  async home(userId: string | null, f: NewsFilters) {
    const base = await this.centralQuery(f);
    const recent = { fockisPublishedAt: -1 } as const;
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const withImage = { ...base, 'featuredImage.url': { $nin: [null, ''] } };

    const [breaking, featuredFlag, latest, trending] = await Promise.all([
      this.cards({ ...base, isBreaking: true, fockisPublishedAt: { $gte: new Date(Date.now() - 2 * 86_400_000), $lte: new Date() } }, recent, 8),
      this.cards({ ...withImage, featured: true }, recent, 5),
      this.cards(base, recent, 12),
      this.cards({ ...base, fockisPublishedAt: { $gte: weekAgo, $lte: new Date() } }, { views: -1, fockisPublishedAt: -1 }, 6),
    ]);
    const topCandidates = featuredFlag.length ? featuredFlag : await this.cards(withImage, recent, 5);
    const top = topCandidates[0] ?? latest[0] ?? null;
    const used = new Set(top ? [top.id] : []);
    const headlines = latest.filter((a) => !used.has(a.id)).slice(0, 4);
    headlines.forEach((a) => used.add(a.id));
    const featured = (topCandidates.length > 1 ? topCandidates.slice(1) : await this.cards({ ...withImage, fockisPublishedAt: { $gte: weekAgo, $lte: new Date() } }, { views: -1 }, 8)).filter((a) => !used.has(a.id)).slice(0, 4);

    const section = (cats: string[], n = 4) => (f.category && !cats.includes(f.category) ? Promise.resolve([]) : this.cards({ ...base, category: { $in: cats } }, recent, n));
    const [politics, business, education, sports, technology, culture, international, local] = await Promise.all([
      section(['politics']),
      section(['business', 'economy']),
      section(['education']),
      section(['sports']),
      section(['technology']),
      section(['culture', 'entertainment']),
      section(['international']),
      section(['local', 'society']),
    ]);

    const [videos, podcasts, topMedia, live] = await Promise.all([this.itemsCentral('video', 8), this.itemsCentral('podcast', 6), this.topMedia(userId, 5), this.liveNow(8)]);
    return {
      breaking,
      top,
      headlines,
      latest,
      trending,
      featured,
      sections: { politics, business, education, sports, technology, culture, international, local },
      videos,
      podcasts,
      live,
      topMedia,
      filters: { categories: NEWS_CATEGORIES, languages: NEWS_LANGUAGES, mediaTypes: MEDIA_TYPES },
    };
  }

  async list(f: NewsFilters & { section?: string; page?: number }) {
    const page = Math.max(1, Math.min(200, Number(f.page) || 1));
    const base = await this.centralQuery(f);
    let q = base;
    let sort: Record<string, 1 | -1> = { fockisPublishedAt: -1 };
    if (f.section === 'breaking') q = { ...base, isBreaking: true };
    if (f.section === 'trending') {
      q = { ...base, fockisPublishedAt: { $gte: new Date(Date.now() - 7 * 86_400_000), $lte: new Date() } };
      sort = { views: -1 };
    }
    if (f.section === 'videos') q = { ...base, videoUrl: { $nin: [null, ''] } };
    const [items, total] = await Promise.all([this.cards(q, sort, PAGE, (page - 1) * PAGE), this.articles.countDocuments(q).exec()]);
    return { page, total, pageSize: PAGE, items };
  }

  private async itemsCentral(kind: string, limit: number, outletId?: Types.ObjectId) {
    const blocked = await this.suspendedOutletIds();
    const q: Record<string, unknown> = { kind, status: { $in: ['published', 'scheduled'] }, publishedAt: { $ne: null, $lte: new Date() }, deletedAt: null };
    if (outletId) q.outletId = outletId;
    else if (blocked.length) q.outletId = { $nin: blocked };
    const rows = (await this.items.find(q).sort({ publishedAt: -1 }).limit(limit).lean().exec()) as Lean[];
    const outlets = await this.outletMap(rows.map((r) => r.outletId));
    return rows.map((r) => this.itemCard(r, outlets));
  }

  async mediaItems(kind: string, page = 1, outletSlug?: string) {
    if (!['video', 'podcast', 'tv_program', 'radio_program'].includes(kind)) throw new BadRequestException('Unknown media kind.');
    const outlet = outletSlug ? await this.access.outletBySlug(outletSlug) : null;
    const p = Math.max(1, Math.min(100, Number(page) || 1));
    const blocked = await this.suspendedOutletIds();
    const q: Record<string, unknown> = { kind, deletedAt: null };
    if (kind === 'tv_program' || kind === 'radio_program') q.status = 'published';
    else Object.assign(q, { status: { $in: ['published', 'scheduled'] }, publishedAt: { $ne: null, $lte: new Date() } });
    if (outlet) q.outletId = outlet._id;
    else if (blocked.length) q.outletId = { $nin: blocked };
    const [rows, total] = await Promise.all([
      this.items.find(q).sort({ publishedAt: -1, createdAt: -1 }).skip((p - 1) * PAGE).limit(PAGE).lean().exec() as Promise<Lean[]>,
      this.items.countDocuments(q).exec(),
    ]);
    const outlets = await this.outletMap(rows.map((r) => r.outletId));
    return { page: p, total, pageSize: PAGE, items: rows.map((r) => this.itemCard(r, outlets)) };
  }

  async topMedia(userId: string | null, limit = 10) {
    const rows = (await this.access.outlets.find({ status: 'active', deletedAt: null }).sort({ verified: -1, followerCount: -1 }).limit(limit).lean().exec()) as Lean[];
    const following = await this.followingSet(userId);
    return rows.map((o) => this.outletCard(o, following));
  }

  async liveNow(limit = 12) {
    const rows = (await this.access.outlets
      .find({ status: 'active', deletedAt: null, $or: [{ 'live.tvLive': true }, { 'live.radioLive': true }] })
      .sort({ followerCount: -1 })
      .limit(limit)
      .lean()
      .exec()) as Lean[];
    const out: { outlet: ReturnType<NewsPublicService['outletCard']>; kind: 'tv' | 'radio'; title: string; streamUrl: string; startedAt: string | null }[] = [];
    for (const o of rows) {
      if (o.live?.tvLive && o.live?.tvStreamUrl) out.push({ outlet: this.outletCard(o), kind: 'tv', title: o.live.tvTitle || `${o.name} Live`, streamUrl: o.live.tvStreamUrl, startedAt: iso(o.live.liveStartedAt) });
      if (o.live?.radioLive && o.live?.radioStreamUrl) out.push({ outlet: this.outletCard(o), kind: 'radio', title: o.live.radioTitle || `${o.name} Live`, streamUrl: o.live.radioStreamUrl, startedAt: iso(o.live.liveStartedAt) });
    }
    return out;
  }

  /* ==========================================================================
   * Media Directory & public profile
   * ======================================================================== */

  async directory(userId: string | null, q: { type?: string; q?: string; country?: string; city?: string; language?: string; verified?: string; sort?: string; page?: number }) {
    const page = Math.max(1, Math.min(200, Number(q.page) || 1));
    const filter: Record<string, unknown> = { status: 'active', deletedAt: null };
    if (q.type && (MEDIA_TYPES as readonly string[]).includes(q.type)) filter.mediaType = q.type;
    if (q.country) filter.country = new RegExp(`^${escapeRe(str(q.country, 80))}$`, 'i');
    if (q.city) filter.city = new RegExp(`^${escapeRe(str(q.city, 80))}$`, 'i');
    if (q.language && (NEWS_LANGUAGES as readonly string[]).includes(q.language)) filter.$or = [{ primaryLanguage: q.language }, { languages: q.language }];
    if (q.verified === 'true') filter.verified = true;
    if (q.q) filter.name = new RegExp(escapeRe(str(q.q, 80)), 'i');
    const sort: Record<string, 1 | -1> = q.sort === 'newest' ? { createdAt: -1 } : q.sort === 'name' ? { name: 1 } : { verified: -1, followerCount: -1 };
    const [rows, total, counts] = await Promise.all([
      this.access.outlets.find(filter).sort(sort).skip((page - 1) * PAGE).limit(PAGE).lean().exec() as Promise<Lean[]>,
      this.access.outlets.countDocuments(filter).exec(),
      this.access.outlets.aggregate([{ $match: { status: 'active', deletedAt: null } }, { $group: { _id: '$mediaType', n: { $sum: 1 } } }]).exec() as Promise<{ _id: string; n: number }[]>,
    ]);
    const following = await this.followingSet(userId);
    return { page, total, pageSize: PAGE, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), items: rows.map((o) => this.outletCard(o, following)) };
  }

  private async publishedWebsite(o: Lean): Promise<{ url: string; status: string } | null> {
    if (!o.websiteId) return null;
    const Website = this.access.connection.models['WebsiteStudioWebsite'];
    if (!Website) return null;
    const w = (await Website.findOne({ _id: o.websiteId, deletedAt: null }).select('slug domain status').lean().exec()) as Lean | null;
    if (!w) return null;
    return { url: websiteUrl(w.slug, w.domain), status: w.status };
  }

  async profile(userId: string | null, slug: string) {
    const o = await this.access.outletBySlug(slug);
    const now = new Date();
    const pub = { outletId: o._id, deletedAt: null, status: 'published', publishedAt: { $ne: null, $lte: now } };
    const [follow, articleTotal, campaigns, team, site, actor] = await Promise.all([
      userId ? (this.follows.findOne({ outletId: o._id, userId: oid(userId) }).lean().exec() as Promise<Lean | null>) : Promise.resolve(null),
      this.articles.countDocuments(pub).exec(),
      this.campaigns.find({ outletId: o._id, status: 'active' }).sort({ createdAt: -1 }).limit(3).lean().exec() as Promise<Lean[]>,
      this.members.find({ outletId: o._id, status: 'active', showOnProfile: true }).select('displayName title role avatarUrl bio').limit(24).lean().exec() as Promise<Lean[]>,
      this.publishedWebsite(o),
      userId ? this.access.actor(o, userId) : Promise.resolve(null),
    ]);
    const raised = await this.campaignTotals(campaigns.map((c) => c._id));
    const website = site && site.status === 'published' ? site.url : o.websiteUrl || '';
    return {
      ...this.outletCard(o),
      about: o.about || '',
      address: o.address || '',
      email: o.email || '',
      phone: o.phone || '',
      primaryLanguage: o.primaryLanguage,
      languages: o.languages ?? [],
      socials: o.socials ?? {},
      foundedYear: o.foundedYear ?? null,
      websiteUrl: website,
      publishedArticles: articleTotal,
      supportMessage: o.settings?.supportMessage || '',
      donationsEnabled: o.settings?.donationsEnabled !== false,
      requestsEnabled: o.settings?.requestsEnabled !== false,
      currency: o.settings?.currency || 'USD',
      liveInfo: {
        tvLive: Boolean(o.live?.tvLive && o.live?.tvStreamUrl),
        tvStreamUrl: o.live?.tvLive ? o.live?.tvStreamUrl || '' : '',
        tvTitle: o.live?.tvTitle || '',
        radioLive: Boolean(o.live?.radioLive && o.live?.radioStreamUrl),
        radioStreamUrl: o.live?.radioLive ? o.live?.radioStreamUrl || '' : '',
        radioTitle: o.live?.radioTitle || '',
      },
      campaigns: campaigns.map((c) => this.campaignCard(c, raised.get(String(c._id)))),
      team: team.map((m) => ({ name: m.displayName, title: m.title || '', role: m.role, avatarUrl: m.avatarUrl || '', bio: m.bio || '' })),
      viewer: {
        isFollowing: Boolean(follow),
        muted: Boolean(follow?.muted),
        prefs: normalizePrefs(follow?.prefs),
        canManage: Boolean(actor?.role),
        role: actor?.role ?? null,
      },
    };
  }

  campaignCard(c: Lean, totals?: { raised: number; supporters: number }) {
    const raised = totals?.raised ?? 0;
    return {
      id: String(c._id),
      title: c.title,
      description: c.description || '',
      coverUrl: c.coverUrl || '',
      goal: c.goal,
      currency: c.currency || 'USD',
      deadline: c.deadline || '',
      status: c.status,
      raised,
      supporters: totals?.supporters ?? 0,
      progress: c.goal > 0 ? Math.min(100, Math.round((raised / c.goal) * 100)) : 0,
      updates: (c.updates ?? []).slice(-5).reverse().map((u: Lean) => ({ at: iso(u.at), text: u.text, byName: u.byName })),
    };
  }

  /** Raised amounts come from verified (paid) donations only. */
  async campaignTotals(ids: Types.ObjectId[]) {
    if (!ids.length) return new Map<string, { raised: number; supporters: number }>();
    const Donation = this.access.connection.models['NewsMediaDonation'];
    const rows = (await Donation.aggregate([
      { $match: { campaignId: { $in: ids }, status: 'paid' } },
      { $group: { _id: '$campaignId', raised: { $sum: '$amount' }, users: { $addToSet: '$userId' } } },
    ]).exec()) as { _id: Types.ObjectId; raised: number; users: unknown[] }[];
    return new Map(rows.map((r) => [String(r._id), { raised: Math.round(r.raised * 100) / 100, supporters: r.users.length }]));
  }

  async outletArticles(slug: string, q: { category?: string; page?: number }) {
    const o = await this.access.outletBySlug(slug);
    const page = Math.max(1, Math.min(200, Number(q.page) || 1));
    const filter: Record<string, unknown> = { outletId: o._id, deletedAt: null, status: 'published', publishedAt: { $ne: null, $lte: new Date() } };
    if (q.category && (NEWS_CATEGORIES as readonly string[]).includes(q.category)) filter.category = q.category;
    const [items, total] = await Promise.all([this.cards(filter, { publishedAt: -1 }, PAGE, (page - 1) * PAGE), this.articles.countDocuments(filter).exec()]);
    return { page, total, pageSize: PAGE, items };
  }

  /* ==========================================================================
   * Article reading
   * ======================================================================== */

  async article(userId: string | null, slug: string, articleSlug: string, viewer: { ip?: string; ua?: string; ref?: string; lang?: string }) {
    const o = await this.access.outletBySlug(slug);
    const a = (await this.articles.findOne({ outletId: o._id, slug: str(articleSlug, 140).toLowerCase(), deletedAt: null }).lean().exec()) as Lean | null;
    const live = a && a.status === 'published' && a.publishedAt && new Date(a.publishedAt) <= new Date();
    if (!a || !live) {
      // Team members can preview their own newsroom's unpublished work.
      if (a && userId) {
        const actor = await this.access.actor(o, userId);
        if (actor.role) return this.articleView(a, o, userId, true);
      }
      throw new NotFoundException('Article not found.');
    }
    await this.trackView(o._id, a._id, userId, viewer);
    return this.articleView(a, o, userId, false);
  }

  private async articleView(a: Lean, o: Lean, userId: string | null, preview: boolean) {
    const [liked, bookmarked, follow, related, site] = await Promise.all([
      userId ? this.reactions.exists({ articleId: a._id, userId: oid(userId), kind: 'like' }) : null,
      userId ? this.reactions.exists({ articleId: a._id, userId: oid(userId), kind: 'bookmark' }) : null,
      userId ? this.follows.exists({ outletId: o._id, userId: oid(userId) }) : null,
      this.cards({ outletId: o._id, _id: { $ne: a._id }, deletedAt: null, status: 'published', publishedAt: { $ne: null, $lte: new Date() }, category: a.category }, { publishedAt: -1 }, 4),
      this.publishedWebsite(o),
    ]);
    const outletMap = new Map([[String(o._id), o]]);
    return {
      ...this.articleCard(a, outletMap),
      body: a.body,
      featuredImage: a.featuredImage ?? null,
      gallery: a.gallery ?? [],
      videoUrl: a.videoUrl || '',
      audioUrl: a.audioUrl || '',
      sources: a.sources ?? [],
      tags: a.tags ?? [],
      seo: a.seo ?? {},
      likes: a.likes ?? 0,
      commentCount: a.commentCount ?? 0,
      commentsEnabled: a.commentsEnabled !== false && o.settings?.commentsEnabled !== false,
      updatedAt: iso(a.updatedAt),
      preview,
      status: preview ? a.status : 'published',
      outletFull: { ...this.outletCard(o), followerCount: o.followerCount ?? 0 },
      originalUrl: site && site.status === 'published' ? site.url : o.websiteUrl || '',
      viewer: { liked: Boolean(liked), bookmarked: Boolean(bookmarked), following: Boolean(follow), signedIn: Boolean(userId) },
      related,
    };
  }

  private async trackView(outletId: Types.ObjectId, articleId: Types.ObjectId, userId: string | null, v: { ip?: string; ua?: string; ref?: string; lang?: string }) {
    // Unique readers per day, keyed by user ID or a one-way hash (no raw IP stored).
    const viewerKey = userId ? `u:${userId}` : `a:${createHash('sha256').update(`${v.ip ?? ''}|${v.ua ?? ''}|${dayKey()}`).digest('hex').slice(0, 32)}`;
    let source = 'direct';
    if (v.ref) {
      try {
        const host = new URL(v.ref).hostname.replace(/^www\./, '');
        source = /fockis/.test(host) ? 'fockis' : host.slice(0, 80);
      } catch {
        source = 'other';
      }
    }
    try {
      await this.views.create({ outletId, articleId, viewerKey, day: dayKey(), source, language: str(v.lang, 10).slice(0, 2) });
      await this.articles.updateOne({ _id: articleId }, { $inc: { views: 1 } }).exec();
    } catch {
      /* duplicate view today — not counted again */
    }
  }

  async react(userId: string, articleId: string, kind: 'like' | 'bookmark', on: boolean) {
    const a = (await this.articles.findOne({ _id: oid(articleId, 'article ID'), deletedAt: null, status: 'published' }).select('_id').lean().exec()) as Lean | null;
    if (!a) throw new NotFoundException('Article not found.');
    if (on) {
      try {
        await this.reactions.create({ articleId: a._id, userId: oid(userId), kind });
        if (kind === 'like') await this.articles.updateOne({ _id: a._id }, { $inc: { likes: 1 } }).exec();
      } catch {
        /* already reacted */
      }
    } else {
      const r = await this.reactions.deleteOne({ articleId: a._id, userId: oid(userId), kind }).exec();
      if (r.deletedCount && kind === 'like') await this.articles.updateOne({ _id: a._id, likes: { $gt: 0 } }, { $inc: { likes: -1 } }).exec();
    }
    return { ok: true, on };
  }

  async bookmarks(userId: string, page = 1) {
    const p = Math.max(1, Number(page) || 1);
    const rows = (await this.reactions.find({ userId: oid(userId), kind: 'bookmark' }).sort({ createdAt: -1 }).skip((p - 1) * PAGE).limit(PAGE).lean().exec()) as Lean[];
    const ids = rows.map((r) => r.articleId);
    const items = await this.cards({ _id: { $in: ids }, deletedAt: null, status: 'published' }, { publishedAt: -1 }, PAGE);
    return { page: p, items };
  }

  async listComments(articleId: string) {
    const rows = (await this.comments.find({ articleId: oid(articleId, 'article ID'), status: 'visible' }).sort({ createdAt: -1 }).limit(100).lean().exec()) as Lean[];
    return { items: rows.map((c) => ({ id: String(c._id), userName: c.userName, body: c.body, createdAt: iso(c.createdAt), userId: String(c.userId) })) };
  }

  async addComment(userId: string, articleId: string, body: string) {
    const text = str(body, 2000);
    if (text.length < 2) throw new BadRequestException('Write a comment first.');
    const a = (await this.articles.findOne({ _id: oid(articleId, 'article ID'), deletedAt: null, status: 'published' }).lean().exec()) as Lean | null;
    if (!a) throw new NotFoundException('Article not found.');
    const o = await this.access.outlet(String(a.outletId));
    if (a.commentsEnabled === false || o.settings?.commentsEnabled === false) throw new ForbiddenException('Comments are turned off for this article.');
    const me = await this.access.userName(userId);
    const c = await this.comments.create({ articleId: a._id, outletId: a.outletId, userId: oid(userId), userName: me.name, body: text });
    await this.articles.updateOne({ _id: a._id }, { $inc: { commentCount: 1 } }).exec();
    return { id: String(c._id), userName: me.name, body: text, createdAt: iso(c.createdAt), userId };
  }

  async deleteOwnComment(userId: string, commentId: string) {
    const c = (await this.comments.findOne({ _id: oid(commentId, 'comment ID') }).lean().exec()) as Lean | null;
    if (!c) throw new NotFoundException('Comment not found.');
    if (!sameId(c.userId, userId)) {
      const o = await this.access.outlet(String(c.outletId), true);
      const actor = await this.access.actor(o, userId);
      if (!actor.can('moderate_comments')) throw new ForbiddenException('You cannot remove this comment.');
    }
    await this.comments.updateOne({ _id: c._id }, { status: 'hidden' }).exec();
    await this.articles.updateOne({ _id: c.articleId, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } }).exec();
    return { ok: true };
  }

  /* ==========================================================================
   * Following & notification preferences
   * ======================================================================== */

  async follow(userId: string, outletId: string) {
    const o = await this.access.outlet(outletId);
    try {
      await this.follows.create({ outletId: o._id, userId: oid(userId), prefs: { breaking: true } });
      await this.access.outlets.updateOne({ _id: o._id }, { $inc: { followerCount: 1 } }).exec();
    } catch {
      /* already following */
    }
    return this.followState(userId, outletId);
  }

  async unfollow(userId: string, outletId: string) {
    const r = await this.follows.deleteOne({ outletId: oid(outletId, 'media ID'), userId: oid(userId) }).exec();
    if (r.deletedCount) await this.access.outlets.updateOne({ _id: oid(outletId), followerCount: { $gt: 0 } }, { $inc: { followerCount: -1 } }).exec();
    return { isFollowing: false, muted: false, prefs: normalizePrefs({}) };
  }

  async followState(userId: string, outletId: string) {
    const f = (await this.follows.findOne({ outletId: oid(outletId, 'media ID'), userId: oid(userId) }).lean().exec()) as Lean | null;
    return { isFollowing: Boolean(f), muted: Boolean(f?.muted), prefs: normalizePrefs(f?.prefs) };
  }

  async setPrefs(userId: string, outletId: string, input: { prefs?: Record<string, unknown>; muted?: boolean; all?: boolean }) {
    const f = await this.follows.findOne({ outletId: oid(outletId, 'media ID'), userId: oid(userId) });
    if (!f) throw new BadRequestException('Follow this media first.');
    const prefs = normalizePrefs(f.prefs);
    if (typeof input.all === 'boolean') for (const k of FOLLOW_PREFS) prefs[k] = input.all;
    if (input.prefs && typeof input.prefs === 'object') for (const k of FOLLOW_PREFS) if (typeof input.prefs[k] === 'boolean') prefs[k] = input.prefs[k] as boolean;
    f.prefs = prefs;
    if (typeof input.muted === 'boolean') f.muted = input.muted;
    f.markModified('prefs');
    await f.save();
    return { isFollowing: true, muted: f.muted, prefs };
  }

  async myFollows(userId: string) {
    const rows = (await this.follows.find({ userId: oid(userId) }).sort({ createdAt: -1 }).limit(500).lean().exec()) as Lean[];
    const outlets = (await this.access.outlets.find({ _id: { $in: rows.map((r) => r.outletId) }, deletedAt: null }).lean().exec()) as Lean[];
    const byId = new Map(outlets.map((o) => [String(o._id), o]));
    return {
      items: rows
        .filter((r) => byId.has(String(r.outletId)))
        .map((r) => ({ outlet: this.outletCard(byId.get(String(r.outletId))!, new Set([String(r.outletId)])), muted: Boolean(r.muted), prefs: normalizePrefs(r.prefs) })),
    };
  }
}

export function normalizePrefs(p: unknown): Record<FollowPref, boolean> {
  const src = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
  return Object.fromEntries(FOLLOW_PREFS.map((k) => [k, src[k] === true])) as Record<FollowPref, boolean>;
}

export function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
