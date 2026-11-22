/**
 * newsroom.service.ts — Media Administration Center.
 *
 * Creating a media organization (with its Website Studio website), settings,
 * team & roles, the article CMS with its editorial workflow and distribution
 * to central Fockis News, broadcast items (videos, podcasts, programs), live
 * status, comment moderation, the dashboard, analytics, audit log and the
 * AI writing assistant (existing Website Studio language-model integration).
 *
 * Follower notifications respect each follower's per-media preferences and
 * mute switch, and fire at most once per article/item (atomic `notified` flag).
 */

import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { RequestUser } from '../website-studio/common/request-user';
import { websiteUrl } from '../website-studio/common/website-studio.config';
import { WebsitesService } from '../website-studio/websites/websites.service';
import { WebsiteAiService } from '../website-studio/ai/website-ai.service';
import { DEFAULT_ROLE_PERMISSIONS, NewsAccessService, ROLE_LABELS, iso, isOid, oid, safeUrl, sameId, sanitizeHtml, slugify, str, textOf, type Actor } from './news-access.service';
import {
  ITEM_KINDS,
  MEDIA_PERMISSIONS,
  MEDIA_ROLES,
  MEDIA_TYPES,
  NEWS_CATEGORIES,
  NEWS_LANGUAGES,
  NEWS_MODEL,
  type ArticleStatus,
  type FollowPref,
  type MediaRole,
} from './news.schemas';

type AnyModel = Model<any>;
type Lean = Record<string, any>;

const RESERVED = new Set([
  'www', 'api', 'admin', 'news', 'media', 'app', 'mail', 'support', 'help', 'fockis', 'static', 'cdn', 'sites', 'login', 'settings',
  // Fockis News page addresses (/news/<word>).
  'latest', 'breaking', 'trending', 'category', 'videos', 'live', 'radio', 'podcasts', 'directory', 'create', 'my-support', 'requests', 'me', 'read',
]);
/** Article addresses that would collide with /news/<media>/<page>. */
const RESERVED_ARTICLE_SLUGS = new Set(['support', 'contact', 'articles', 'videos', 'live', 'radio', 'podcasts', 'about']);
const EDITABLE_BY_AUTHOR: ArticleStatus[] = ['draft', 'changes_requested', 'rejected'];

/** Hostname without "www.", or "" when the text is not a web address. */
function hostOf(u: string): string {
  try {
    return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

@Injectable()
export class NewsroomService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('FockisNewsroom');
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly access: NewsAccessService,
    private readonly websites: WebsitesService,
    private readonly ai: WebsiteAiService,
    @InjectModel(NEWS_MODEL.member) private readonly members: AnyModel,
    @InjectModel(NEWS_MODEL.article) private readonly articles: AnyModel,
    @InjectModel(NEWS_MODEL.item) private readonly items: AnyModel,
    @InjectModel(NEWS_MODEL.follow) private readonly follows: AnyModel,
    @InjectModel(NEWS_MODEL.comment) private readonly comments: AnyModel,
    @InjectModel(NEWS_MODEL.view) private readonly views: AnyModel,
    @InjectModel(NEWS_MODEL.donation) private readonly donations: AnyModel,
    @InjectModel(NEWS_MODEL.campaign) private readonly campaigns: AnyModel,
    @InjectModel(NEWS_MODEL.request) private readonly requests: AnyModel,
    @InjectModel(NEWS_MODEL.audit) private readonly audits: AnyModel,
  ) {}

  /* ==========================================================================
   * Scheduler: scheduled articles/items go live and notify followers.
   * ======================================================================== */

  onModuleInit() {
    if (process.env.NEWS_SCHEDULER_DISABLED === 'true') return;
    this.timer = setInterval(() => void this.runSchedule().catch((err) => this.logger.warn(`Scheduler: ${err instanceof Error ? err.message : String(err)}`)), 60_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runSchedule() {
    const now = new Date();
    const due = (await this.articles.find({ status: 'scheduled', publishedAt: { $lte: now }, deletedAt: null }).limit(200).lean().exec()) as Lean[];
    for (const a of due) {
      const r = await this.articles.updateOne({ _id: a._id, status: 'scheduled' }, { $set: { status: 'published' }, $push: { revisions: { at: now, byUserId: a.authorUserId, byName: 'Scheduler', action: 'published (scheduled)' } } }).exec();
      if (r.modifiedCount) {
        await this.access.outlets.updateOne({ _id: a.outletId }, { $inc: { articleCount: 1 } }).exec();
        await this.dispatchArticle(String(a._id));
      }
    }
    const dueItems = (await this.items.find({ status: 'scheduled', publishedAt: { $lte: now }, deletedAt: null }).limit(200).lean().exec()) as Lean[];
    for (const it of dueItems) {
      const r = await this.items.updateOne({ _id: it._id, status: 'scheduled' }, { $set: { status: 'published' } }).exec();
      if (r.modifiedCount) await this.dispatchItem(String(it._id));
    }
  }

  /** Notify followers who enabled the matching category (once per article). */
  async dispatchArticle(articleId: string) {
    const a = (await this.articles.findOneAndUpdate({ _id: oid(articleId), notified: false, status: 'published', publishedAt: { $lte: new Date() } }, { $set: { notified: true } }, { new: true }).lean().exec()) as Lean | null;
    if (!a) return;
    const o = (await this.access.outlets.findById(a.outletId).lean().exec()) as Lean | null;
    if (!o || o.status !== 'active') return;
    const pref: FollowPref = a.isBreaking ? 'breaking' : 'articles';
    const link = `/news/${o.slug}/${a.slug}`;
    await this.notifyFollowers(o, pref, a.isBreaking ? `Breaking — ${o.name}` : `New from ${o.name}`, a.headline, link, String(a._id));
  }

  async dispatchItem(itemId: string) {
    const it = (await this.items.findOneAndUpdate({ _id: oid(itemId), notified: false, status: 'published' }, { $set: { notified: true } }, { new: true }).lean().exec()) as Lean | null;
    if (!it || !['video', 'podcast'].includes(it.kind)) return;
    const o = (await this.access.outlets.findById(it.outletId).lean().exec()) as Lean | null;
    if (!o || o.status !== 'active') return;
    const pref: FollowPref = it.kind === 'video' ? 'videos' : 'podcasts';
    await this.notifyFollowers(o, pref, `${it.kind === 'video' ? 'New video' : 'New episode'} — ${o.name}`, it.title, `/news/${o.slug}?tab=${it.kind === 'video' ? 'videos' : 'podcasts'}`, String(it._id));
  }

  private async notifyFollowers(o: Lean, pref: FollowPref, title: string, message: string, link: string, entityId: string) {
    const cursor = this.follows.find({ outletId: o._id, muted: { $ne: true }, [`prefs.${pref}`]: true }).select('userId').lean().cursor();
    const batch: string[] = [];
    for await (const f of cursor as AsyncIterable<Lean>) {
      batch.push(String(f.userId));
      if (batch.length >= 200) await this.access.notify(batch.splice(0), title, message, link, entityId, 'news');
    }
    if (batch.length) await this.access.notify(batch, title, message, link, entityId, 'news');
  }

  /* ==========================================================================
   * Media organizations
   * ======================================================================== */

  private outletAdminView(o: Lean, actor: Actor) {
    return {
      id: String(o._id),
      slug: o.slug,
      name: o.name,
      mediaType: o.mediaType,
      logoUrl: o.logoUrl || '',
      coverUrl: o.coverUrl || '',
      tagline: o.tagline || '',
      about: o.about || '',
      country: o.country || '',
      city: o.city || '',
      address: o.address || '',
      email: o.email || '',
      phone: o.phone || '',
      primaryLanguage: o.primaryLanguage || 'en',
      languages: o.languages ?? [],
      socials: o.socials ?? {},
      websiteUrl: o.websiteUrl || '',
      foundedYear: o.foundedYear ?? null,
      verified: Boolean(o.verified),
      status: o.status,
      followerCount: o.followerCount ?? 0,
      organizationId: o.organizationId ? String(o.organizationId) : null,
      websiteId: o.websiteId ? String(o.websiteId) : null,
      settings: {
        commentsEnabled: o.settings?.commentsEnabled !== false,
        donationsEnabled: o.settings?.donationsEnabled !== false,
        requestsEnabled: o.settings?.requestsEnabled !== false,
        supportMessage: o.settings?.supportMessage || '',
        currency: o.settings?.currency || 'USD',
        seoTitle: o.settings?.seoTitle || '',
        seoDescription: o.settings?.seoDescription || '',
        allowIndexing: o.settings?.allowIndexing !== false,
      },
      live: {
        tvStreamUrl: o.live?.tvStreamUrl || '',
        tvLive: Boolean(o.live?.tvLive),
        tvTitle: o.live?.tvTitle || '',
        radioStreamUrl: o.live?.radioStreamUrl || '',
        radioLive: Boolean(o.live?.radioLive),
        radioTitle: o.live?.radioTitle || '',
      },
      viewer: { role: actor.role, roleLabel: actor.role ? ROLE_LABELS[actor.role] : '', permissions: [...actor.perms] },
    };
  }

  async myOutlets(userId: string) {
    const memberRows = (await this.members.find({ userId: oid(userId), status: 'active' }).select('outletId role').lean().exec()) as Lean[];
    const ids = memberRows.map((m) => m.outletId);
    const rows = (await this.access.outlets.find({ deletedAt: null, $or: [{ ownerUserId: oid(userId) }, { _id: { $in: ids } }] }).sort({ createdAt: -1 }).lean().exec()) as Lean[];
    const roleOf = new Map(memberRows.map((m) => [String(m.outletId), m.role as MediaRole]));
    return {
      items: rows.map((o) => {
        const role: MediaRole = sameId(o.ownerUserId, userId) ? 'owner' : (roleOf.get(String(o._id)) ?? 'journalist');
        return { id: String(o._id), slug: o.slug, name: o.name, mediaType: o.mediaType, logoUrl: o.logoUrl || '', verified: Boolean(o.verified), status: o.status, role, roleLabel: ROLE_LABELS[role], followerCount: o.followerCount ?? 0 };
      }),
    };
  }

  /** Organizations the user owns (to link instead of creating duplicates). */
  async linkableOrganizations(userId: string) {
    const Org = this.access.connection.models['Organization'];
    if (!Org) return { items: [] };
    const rows = (await Org.find({ createdByUserId: oid(userId), deletedAt: { $in: [null, undefined] } }).select('name organizationType logoUrl').limit(100).lean().exec()) as Lean[];
    return { items: rows.map((o) => ({ id: String(o._id), name: o.name, type: o.organizationType ?? '', logoUrl: o.logoUrl ?? '' })) };
  }

  async slugAvailable(slug: string) {
    const s = slugify(slug, 63);
    if (s.length < 3) return { slug: s, available: false, reason: 'Use at least 3 letters or numbers.' };
    if (RESERVED.has(s)) return { slug: s, available: false, reason: 'This address is reserved.' };
    const taken = (await this.access.outlets.exists({ slug: s })) || (await this.websiteSlugTaken(s));
    return { slug: s, available: !taken, reason: taken ? 'This address is already taken.' : '' };
  }

  private async websiteSlugTaken(slug: string) {
    const Website = this.access.connection.models['WebsiteStudioWebsite'];
    return Website ? Boolean(await Website.exists({ slug })) : false;
  }

  private cleanProfile(input: Record<string, unknown>) {
    const languages = Array.isArray(input.languages) ? (input.languages as unknown[]).map((l) => str(l, 5)).filter((l) => (NEWS_LANGUAGES as readonly string[]).includes(l)) : undefined;
    const socials: Record<string, string> = {};
    if (input.socials && typeof input.socials === 'object') {
      for (const k of ['facebook', 'x', 'instagram', 'youtube', 'tiktok', 'linkedin', 'whatsapp']) {
        const v = safeUrl((input.socials as Record<string, unknown>)[k], 300);
        if (v) socials[k] = v;
      }
    }
    const out: Record<string, unknown> = {};
    if (input.name !== undefined) out.name = str(input.name, 120);
    if (input.mediaType !== undefined) {
      if (!(MEDIA_TYPES as readonly string[]).includes(String(input.mediaType))) throw new BadRequestException('Choose a media type.');
      out.mediaType = input.mediaType;
    }
    for (const [k, max] of [
      ['tagline', 400],
      ['about', 6000],
      ['country', 80],
      ['city', 80],
      ['address', 300],
      ['phone', 40],
    ] as const)
      if (input[k] !== undefined) out[k] = str(input[k], max);
    if (input.email !== undefined) {
      const e = str(input.email, 200).toLowerCase();
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new BadRequestException('Enter a valid contact email.');
      out.email = e;
    }
    if (input.logoUrl !== undefined) out.logoUrl = safeUrl(input.logoUrl);
    if (input.coverUrl !== undefined) out.coverUrl = safeUrl(input.coverUrl);
    if (input.websiteUrl !== undefined) out.websiteUrl = safeUrl(input.websiteUrl, 300);
    if (input.primaryLanguage !== undefined) out.primaryLanguage = (NEWS_LANGUAGES as readonly string[]).includes(String(input.primaryLanguage)) ? input.primaryLanguage : 'en';
    if (languages) out.languages = [...new Set(languages)];
    if (input.socials !== undefined) out.socials = socials;
    if (input.foundedYear !== undefined) {
      const y = Number(input.foundedYear);
      out.foundedYear = Number.isInteger(y) && y > 1600 && y <= new Date().getFullYear() ? y : null;
    }
    return out;
  }

  /**
   * Create a media organization (wizard). Optionally creates its Website Studio
   * website from the chosen template and publishes it after explicit confirmation.
   */
  async createOutlet(user: RequestUser, rawUser: unknown, input: Record<string, unknown>) {
    const userId = user.id;
    const profile = this.cleanProfile(input);
    if (!profile.name || String(profile.name).length < 2) throw new BadRequestException('Enter the media organization name.');
    if (!profile.mediaType) throw new BadRequestException('Choose a media type.');
    const owned = (await this.access.outlets.countDocuments({ ownerUserId: oid(userId), deletedAt: null }).exec()) as number;
    if (owned >= 10) throw new BadRequestException('You can create up to 10 media organizations.');
    const slugCheck = await this.slugAvailable(str(input.slug, 63) || String(profile.name));
    if (!slugCheck.available) throw new ConflictException(`Website address: ${slugCheck.reason}`);

    let organizationId: Types.ObjectId | null = null;
    if (input.organizationId) {
      const linkable = await this.linkableOrganizations(userId);
      if (!linkable.items.some((o) => o.id === String(input.organizationId))) throw new ForbiddenException('You can only link an organization you own.');
      if (await this.access.outlets.exists({ organizationId: oid(input.organizationId), deletedAt: null })) throw new ConflictException('This organization already has a media profile.');
      organizationId = oid(input.organizationId);
    }

    const outlet = await this.access.outlets.create({
      ...profile,
      ownerUserId: oid(userId),
      organizationId,
      slug: slugCheck.slug,
      settings: { commentsEnabled: true, donationsEnabled: true, requestsEnabled: true, currency: 'USD', allowIndexing: true, supportMessage: str(input.supportMessage, 600) },
      live: {},
    });
    const me = await this.access.userName(userId);
    await this.members.create({ outletId: outlet._id, userId: oid(userId), role: 'owner', displayName: me.name, avatarUrl: me.avatarUrl, title: 'Owner' });

    let website: { id: string; url: string; status: string; slug: string } | null = null;
    let websiteNote = '';
    if (input.createWebsite !== false) {
      try {
        const created = (await this.websites.create(user, rawUser, {
          name: String(profile.name),
          mode: 'template',
          templateSlug: str(input.templateSlug, 80) || undefined,
          categorySlug: 'news-and-magazine',
          organizationId: organizationId ? String(organizationId) : undefined,
        })) as Lean;
        let slug = String(created.slug);
        try {
          const updated = (await this.websites.update(user, String(created.id), { slug: slugCheck.slug })) as Lean;
          slug = String(updated.slug);
        } catch (err) {
          websiteNote = `Your website address was set to ${slug} because ${slugCheck.slug} is not available in Website Studio.`;
        }
        let status = 'draft';
        let url = String(created.url);
        if (input.publishWebsite === true) {
          const pub = (await this.websites.publish(user, String(created.id))) as Lean;
          status = String(pub.status);
          url = String(pub.url);
        }
        website = { id: String(created.id), url, status, slug };
        await this.access.outlets.updateOne({ _id: outlet._id }, { websiteId: oid(String(created.id)) }).exec();
      } catch (err) {
        websiteNote = `The media profile was created, but the website could not be created: ${err instanceof Error ? err.message : 'unknown error'}. You can create it later from Website Design.`;
      }
    }
    await this.access.audit(outlet._id, { userId, name: me.name }, 'outlet_created', String(profile.name));
    return { id: String(outlet._id), slug: slugCheck.slug, website, websiteNote };
  }

  async getOutlet(outletId: string, userId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    return this.outletAdminView(outlet, actor);
  }

  async updateOutlet(outletId: string, userId: string, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'manage_settings', 'Only administrators can change media settings.');
    const set: Record<string, unknown> = this.cleanProfile(input);
    if (set.name !== undefined && String(set.name).length < 2) throw new BadRequestException('The name is too short.');
    if (input.settings && typeof input.settings === 'object') {
      const s = input.settings as Record<string, unknown>;
      const cur = outlet.settings ?? {};
      set.settings = {
        ...cur,
        commentsEnabled: s.commentsEnabled === undefined ? cur.commentsEnabled !== false : Boolean(s.commentsEnabled),
        donationsEnabled: s.donationsEnabled === undefined ? cur.donationsEnabled !== false : Boolean(s.donationsEnabled),
        requestsEnabled: s.requestsEnabled === undefined ? cur.requestsEnabled !== false : Boolean(s.requestsEnabled),
        supportMessage: s.supportMessage === undefined ? cur.supportMessage ?? '' : str(s.supportMessage, 600),
        currency: s.currency === undefined ? cur.currency ?? 'USD' : /^[A-Z]{3}$/.test(String(s.currency)) ? String(s.currency) : 'USD',
        seoTitle: s.seoTitle === undefined ? cur.seoTitle ?? '' : str(s.seoTitle, 70),
        seoDescription: s.seoDescription === undefined ? cur.seoDescription ?? '' : str(s.seoDescription, 170),
        allowIndexing: s.allowIndexing === undefined ? cur.allowIndexing !== false : Boolean(s.allowIndexing),
      };
    }
    await this.access.outlets.updateOne({ _id: outlet._id }, { $set: set }).exec();
    await this.access.audit(outlet._id, actor, 'settings_updated', Object.keys(set).join(', '));
    return this.getOutlet(outletId, userId);
  }

  /** Live TV / radio status. Going live notifies followers who enabled it (once per session). */
  async setLive(outletId: string, userId: string, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'manage_broadcast', 'Only broadcast staff can control live streams.');
    const cur = outlet.live ?? {};
    const next = {
      tvStreamUrl: input.tvStreamUrl === undefined ? cur.tvStreamUrl ?? '' : safeUrl(input.tvStreamUrl),
      tvTitle: input.tvTitle === undefined ? cur.tvTitle ?? '' : str(input.tvTitle, 160),
      tvLive: input.tvLive === undefined ? Boolean(cur.tvLive) : Boolean(input.tvLive),
      radioStreamUrl: input.radioStreamUrl === undefined ? cur.radioStreamUrl ?? '' : safeUrl(input.radioStreamUrl),
      radioTitle: input.radioTitle === undefined ? cur.radioTitle ?? '' : str(input.radioTitle, 160),
      radioLive: input.radioLive === undefined ? Boolean(cur.radioLive) : Boolean(input.radioLive),
      liveStartedAt: cur.liveStartedAt ?? null,
    };
    if (next.tvLive && !next.tvStreamUrl) throw new BadRequestException('Add the live TV stream URL before going live.');
    if (next.radioLive && !next.radioStreamUrl) throw new BadRequestException('Add the radio stream URL before going live.');
    const startedTv = next.tvLive && !cur.tvLive;
    const startedRadio = next.radioLive && !cur.radioLive;
    if (startedTv || startedRadio) next.liveStartedAt = new Date();
    if (!next.tvLive && !next.radioLive) next.liveStartedAt = null;
    await this.access.outlets.updateOne({ _id: outlet._id }, { $set: { live: next } }).exec();
    if (startedTv) await this.notifyFollowers(outlet, 'liveTv', `${outlet.name} is live`, next.tvTitle || 'Live TV broadcast now', `/news/${outlet.slug}?tab=live`, String(outlet._id));
    if (startedRadio) await this.notifyFollowers(outlet, 'liveRadio', `${outlet.name} radio is live`, next.radioTitle || 'Listen live now', `/news/${outlet.slug}?tab=radio`, String(outlet._id));
    await this.access.audit(outlet._id, actor, 'live_updated', `TV ${next.tvLive ? 'on' : 'off'} · Radio ${next.radioLive ? 'on' : 'off'}`);
    return this.getOutlet(outletId, userId);
  }

  /** Website Studio link (status, address, primary domain) for Website Design / Domains. */
  /** Creates the independent website for a media organization that doesn't have one yet (Website Studio). */
  async createWebsiteFor(user: RequestUser, rawUser: unknown, outletId: string, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, user.id, 'manage_settings', 'Only administrators can create the website.');
    if (outlet.websiteId) throw new ConflictException('This media organization already has a website.');
    const created = (await this.websites.create(user, rawUser, {
      name: String(outlet.name),
      mode: 'template',
      templateSlug: str(input.templateSlug, 80) || undefined,
      categorySlug: 'news-and-magazine',
      organizationId: outlet.organizationId ? String(outlet.organizationId) : undefined,
    })) as Lean;
    let note = '';
    try {
      await this.websites.update(user, String(created.id), { slug: String(outlet.slug) });
    } catch {
      note = `The website address ${outlet.slug} is not available in Website Studio, so another address was chosen. You can change it in Website Studio.`;
    }
    // Claim atomically so two admins can't attach two websites.
    const r = await this.access.outlets.updateOne({ _id: outlet._id, websiteId: null }, { $set: { websiteId: oid(String(created.id)) } }).exec();
    if (!r.modifiedCount) throw new ConflictException('This media organization already has a website.');
    await this.access.audit(outlet._id, actor, 'website_created', String(created.name ?? outlet.name));
    return { ...(await this.websiteInfo(outletId, user.id)), note };
  }

  async websiteInfo(outletId: string, userId: string) {
    const { outlet } = await this.access.require(outletId, userId);
    if (!outlet.websiteId) return { website: null };
    const Website = this.access.connection.models['WebsiteStudioWebsite'];
    const Domain = this.access.connection.models['WebsiteStudioDomain'];
    const w = Website ? ((await Website.findOne({ _id: outlet.websiteId, deletedAt: null }).select('slug domain status publishedAt templateSlug settings ownerId managers hasUnpublishedChanges').lean().exec()) as Lean | null) : null;
    if (!w) return { website: null };
    const domains = Domain ? ((await Domain.find({ websiteId: w._id }).select('domain verificationStatus sslStatus isPrimary').lean().exec()) as Lean[]) : [];
    return {
      website: {
        id: String(w._id),
        slug: w.slug,
        status: w.status,
        url: websiteUrl(w.slug, w.domain),
        primaryDomain: w.domain ?? null,
        publishedAt: iso(w.publishedAt),
        templateName: w.settings?.templateName ?? w.templateSlug ?? '',
        hasUnpublishedChanges: Boolean(w.hasUnpublishedChanges),
        canEdit: sameId(w.ownerId, userId) || (Array.isArray(w.managers) && w.managers.some((m: Lean) => sameId(m.userId, userId))),
        domains: domains.map((d) => ({ domain: d.domain, verification: d.verificationStatus, ssl: d.sslStatus, primary: Boolean(d.isPrimary) })),
      },
    };
  }

  /* ==========================================================================
   * Team & roles
   * ======================================================================== */

  async team(outletId: string, userId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const rows = (await this.members.find({ outletId: outlet._id, status: 'active' }).sort({ createdAt: 1 }).lean().exec()) as Lean[];
    return {
      canManage: actor.can('manage_team'),
      canConfigure: actor.role === 'owner',
      roles: MEDIA_ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r] })),
      permissions: MEDIA_PERMISSIONS,
      rolePermissions: Object.fromEntries(MEDIA_ROLES.map((r) => [r, [...this.access.permissionsFor(outlet, r)]])),
      defaults: DEFAULT_ROLE_PERMISSIONS,
      items: rows.map((m) => ({
        id: String(m._id),
        userId: String(m.userId),
        displayName: m.displayName,
        avatarUrl: m.avatarUrl || '',
        role: sameId(outlet.ownerUserId, m.userId) ? 'owner' : m.role,
        roleLabel: ROLE_LABELS[(sameId(outlet.ownerUserId, m.userId) ? 'owner' : m.role) as MediaRole],
        title: m.title || '',
        bio: m.bio || '',
        showOnProfile: Boolean(m.showOnProfile),
        joinedAt: iso(m.createdAt),
      })),
    };
  }

  async addMember(outletId: string, userId: string, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'manage_team', 'Only administrators can manage the team.');
    const role = String(input.role) as MediaRole;
    if (!(MEDIA_ROLES as readonly string[]).includes(role) || role === 'owner') throw new BadRequestException('Choose a newsroom role.');
    if (role === 'administrator' && actor.role !== 'owner') throw new ForbiddenException('Only the owner can add administrators.');
    const target = await this.access.findUser(str(input.identifier, 200));
    if (sameId(outlet.ownerUserId, target.id)) throw new BadRequestException('The owner already has full access.');
    const existing = await this.members.findOne({ outletId: outlet._id, userId: oid(target.id) });
    if (existing && existing.status === 'active') throw new ConflictException(`${target.name} is already on the team.`);
    if (existing) Object.assign(existing, { status: 'active', role, title: str(input.title, 120), displayName: target.name, avatarUrl: target.avatarUrl });
    const doc = existing ?? new this.members({ outletId: outlet._id, userId: oid(target.id), role, title: str(input.title, 120), displayName: target.name, avatarUrl: target.avatarUrl });
    await doc.save();
    await this.access.notify([target.id], `You joined ${outlet.name}`, `${actor.name} added you to the newsroom as ${ROLE_LABELS[role]}.`, `/news/admin/${outlet._id}`, String(outlet._id));
    await this.access.audit(outlet._id, actor, 'member_added', `${target.name} as ${ROLE_LABELS[role]}`);
    return this.team(outletId, userId);
  }

  async updateMember(outletId: string, userId: string, memberId: string, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const m = await this.members.findOne({ _id: oid(memberId, 'member ID'), outletId: outlet._id, status: 'active' });
    if (!m) throw new NotFoundException('Team member not found.');
    const self = sameId(m.userId, userId);
    const isOwnerRow = sameId(outlet.ownerUserId, m.userId);
    // Members may edit their own public bio; everything else needs manage_team.
    if (!actor.can('manage_team') && !self) throw new ForbiddenException('Only administrators can manage the team.');
    if (input.role !== undefined && !isOwnerRow) {
      if (!actor.can('manage_team')) throw new ForbiddenException('You cannot change roles.');
      const role = String(input.role) as MediaRole;
      if (!(MEDIA_ROLES as readonly string[]).includes(role) || role === 'owner') throw new BadRequestException('Choose a newsroom role.');
      if ((role === 'administrator' || m.role === 'administrator') && actor.role !== 'owner') throw new ForbiddenException('Only the owner can change administrators.');
      m.role = role;
    }
    if (input.title !== undefined) m.title = str(input.title, 120);
    if (input.bio !== undefined) m.bio = str(input.bio, 1000);
    if (input.displayName !== undefined && str(input.displayName, 120)) m.displayName = str(input.displayName, 120);
    if (input.showOnProfile !== undefined) m.showOnProfile = Boolean(input.showOnProfile);
    await m.save();
    await this.access.audit(outlet._id, actor, 'member_updated', m.displayName);
    return this.team(outletId, userId);
  }

  async removeMember(outletId: string, userId: string, memberId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const m = await this.members.findOne({ _id: oid(memberId, 'member ID'), outletId: outlet._id, status: 'active' });
    if (!m) throw new NotFoundException('Team member not found.');
    if (sameId(outlet.ownerUserId, m.userId)) throw new ForbiddenException('The owner cannot be removed.');
    const self = sameId(m.userId, userId);
    if (!self && !actor.can('manage_team')) throw new ForbiddenException('Only administrators can manage the team.');
    if (!self && m.role === 'administrator' && actor.role !== 'owner') throw new ForbiddenException('Only the owner can remove administrators.');
    m.status = 'removed';
    await m.save();
    await this.access.audit(outlet._id, actor, self ? 'member_left' : 'member_removed', m.displayName);
    return { ok: true };
  }

  async saveRolePermissions(outletId: string, userId: string, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    if (actor.role !== 'owner') throw new ForbiddenException('Only the owner can change role permissions.');
    const map: Record<string, string[]> = {};
    for (const role of MEDIA_ROLES) {
      if (role === 'owner') continue;
      const v = (input as Record<string, unknown>)[role];
      if (Array.isArray(v)) map[role] = v.map(String).filter((p) => (MEDIA_PERMISSIONS as readonly string[]).includes(p));
    }
    await this.access.outlets.updateOne({ _id: outlet._id }, { $set: { 'settings.rolePermissions': map } }).exec();
    await this.access.audit(outlet._id, actor, 'permissions_updated', Object.keys(map).join(', '));
    return this.team(outletId, userId);
  }

  /* ==========================================================================
   * Articles
   * ======================================================================== */

  private articleRow(a: Lean, actor: Actor) {
    return {
      id: String(a._id),
      headline: a.headline,
      subtitle: a.subtitle || '',
      slug: a.slug,
      category: a.category,
      language: a.language,
      status: a.status as ArticleStatus,
      isBreaking: Boolean(a.isBreaking),
      featured: Boolean(a.featured),
      featureRequested: Boolean(a.featureRequested),
      distribution: { website: a.distribution?.website !== false, fockisNews: Boolean(a.distribution?.fockisNews), fockisNewsAt: iso(a.distribution?.fockisNewsAt) },
      authorName: a.authorName,
      authorUserId: String(a.authorUserId),
      isMine: sameId(a.authorUserId, actor.userId),
      imageUrl: a.featuredImage?.url || '',
      publishedAt: iso(a.publishedAt),
      fockisPublishedAt: iso(a.fockisPublishedAt),
      updatedAt: iso(a.updatedAt),
      views: a.views ?? 0,
      likes: a.likes ?? 0,
      commentCount: a.commentCount ?? 0,
      aiAssisted: Boolean(a.aiAssisted),
      sponsored: Boolean(a.sponsored),
      reviewNote: a.reviewNote || '',
    };
  }

  async listArticles(outletId: string, userId: string, q: { status?: string; q?: string; mine?: string; category?: string; breaking?: string; page?: number }) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const page = Math.max(1, Math.min(500, Number(q.page) || 1));
    const filter: Record<string, unknown> = { outletId: outlet._id, deletedAt: null };
    // Writers without review rights only see their own work plus published articles.
    if (!actor.can('review_articles') && !actor.can('publish_articles')) filter.$or = [{ authorUserId: oid(userId) }, { status: 'published' }];
    if (q.mine === 'true') filter.authorUserId = oid(userId);
    if (q.status === 'review') filter.status = { $in: ['submitted', 'under_review'] };
    else if (q.status) filter.status = q.status;
    if (q.category) filter.category = str(q.category, 40);
    if (q.breaking === 'true') filter.isBreaking = true;
    if (q.q) filter.headline = new RegExp(str(q.q, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [rows, total, counts] = await Promise.all([
      this.articles.find(filter).select('-body -revisions -gallery').sort({ updatedAt: -1 }).skip((page - 1) * 25).limit(25).lean().exec() as Promise<Lean[]>,
      this.articles.countDocuments(filter).exec(),
      this.articles.aggregate([{ $match: { outletId: outlet._id, deletedAt: null } }, { $group: { _id: '$status', n: { $sum: 1 } } }]).exec() as Promise<{ _id: string; n: number }[]>,
    ]);
    return { page, total, pageSize: 25, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), items: rows.map((a) => this.articleRow(a, actor)) };
  }

  async getArticle(outletId: string, userId: string, articleId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const a = (await this.articles.findOne({ _id: oid(articleId, 'article ID'), outletId: outlet._id, deletedAt: null }).lean().exec()) as Lean | null;
    if (!a) throw new NotFoundException('Article not found.');
    if (!sameId(a.authorUserId, userId) && !actor.can('review_articles') && !actor.can('publish_articles') && a.status !== 'published') throw new ForbiddenException('You can only open your own drafts.');
    return {
      ...this.articleRow(a, actor),
      body: a.body,
      excerpt: a.excerpt || '',
      featuredImage: a.featuredImage ?? null,
      gallery: a.gallery ?? [],
      videoUrl: a.videoUrl || '',
      audioUrl: a.audioUrl || '',
      sources: a.sources ?? [],
      tags: a.tags ?? [],
      country: a.country || '',
      city: a.city || '',
      seo: a.seo ?? {},
      commentsEnabled: a.commentsEnabled !== false,
      revisions: (a.revisions ?? []).slice(-50).reverse().map((r: Lean) => ({ at: iso(r.at), byName: r.byName, action: r.action, note: r.note ?? '', headline: r.headline ?? '' })),
      permissions: this.articlePermissions(a, actor),
    };
  }

  private articlePermissions(a: Lean, actor: Actor) {
    const mine = sameId(a.authorUserId, actor.userId);
    const status = a.status as ArticleStatus;
    const review = actor.can('review_articles');
    const publish = actor.can('publish_articles');
    return {
      edit: (mine && EDITABLE_BY_AUTHOR.includes(status)) || (review && status !== 'archived') || (publish && status !== 'archived'),
      submit: mine && EDITABLE_BY_AUTHOR.includes(status),
      review: review && ['submitted', 'under_review'].includes(status),
      publish: publish && !['published', 'archived'].includes(status),
      archive: publish && ['published', 'scheduled', 'approved'].includes(status),
      restore: (mine || review) && ['archived', 'rejected'].includes(status),
      breaking: actor.can('manage_breaking'),
      delete: (mine && status === 'draft') || actor.role === 'owner' || actor.role === 'administrator',
    };
  }

  private cleanArticle(input: Record<string, unknown>, actor: Actor) {
    const out: Record<string, unknown> = {};
    if (input.headline !== undefined) out.headline = str(input.headline, 220);
    if (input.subtitle !== undefined) out.subtitle = str(input.subtitle, 400);
    if (input.body !== undefined) {
      const body = sanitizeHtml(input.body);
      out.body = body;
      const words = textOf(body).split(' ').filter(Boolean).length;
      out.readingMinutes = Math.max(1, Math.round(words / 220));
      if (input.excerpt === undefined) out.excerpt = textOf(body).slice(0, 280);
    }
    if (input.excerpt !== undefined) out.excerpt = str(input.excerpt, 500);
    if (input.featuredImage !== undefined) {
      const fi = input.featuredImage as Record<string, unknown> | null;
      const url = fi ? safeUrl(fi.url) : '';
      out.featuredImage = url ? { url, caption: str(fi?.caption, 300), credit: str(fi?.credit, 160) } : null;
    }
    if (input.gallery !== undefined)
      out.gallery = (Array.isArray(input.gallery) ? (input.gallery as Record<string, unknown>[]) : [])
        .map((g) => ({ url: safeUrl(g?.url), caption: str(g?.caption, 300), credit: str(g?.credit, 160) }))
        .filter((g) => g.url)
        .slice(0, 40);
    if (input.videoUrl !== undefined) out.videoUrl = safeUrl(input.videoUrl);
    if (input.audioUrl !== undefined) out.audioUrl = safeUrl(input.audioUrl);
    if (input.sources !== undefined)
      out.sources = (Array.isArray(input.sources) ? (input.sources as Record<string, unknown>[]) : [])
        .map((s) => ({ title: str(s?.title, 200), url: safeUrl(s?.url, 600) }))
        .filter((s) => s.title || s.url)
        .slice(0, 30)
        .map((s, i) => {
          // A source name that is itself a web address must point to the same site as the link,
          // so readers are never shown one address and sent to another.
          if (!/^(https?:\/\/|www\.)\S+$/i.test(s.title)) return s;
          const named = hostOf(s.title);
          if (!s.url) return { title: s.title, url: safeUrl(/^https?:\/\//i.test(s.title) ? s.title : `https://${s.title}`, 600) };
          const opens = hostOf(s.url);
          if (named && opens && named !== opens)
            throw new BadRequestException(`Source ${i + 1}: the name is a link to ${named}, but the link opens ${opens}. Fix one of them.`);
          return s;
        });
    if (input.category !== undefined) {
      if (!(NEWS_CATEGORIES as readonly string[]).includes(String(input.category))) throw new BadRequestException('Choose a category.');
      out.category = input.category;
    }
    if (input.tags !== undefined)
      out.tags = [...new Set((Array.isArray(input.tags) ? input.tags : String(input.tags ?? '').split(',')).map((t) => slugify(String(t), 40)).filter(Boolean))].slice(0, 15);
    if (input.language !== undefined) out.language = (NEWS_LANGUAGES as readonly string[]).includes(String(input.language)) ? input.language : 'en';
    if (input.country !== undefined) out.country = str(input.country, 80);
    if (input.city !== undefined) out.city = str(input.city, 80);
    if (input.seo !== undefined) {
      const s = (input.seo ?? {}) as Record<string, unknown>;
      out.seo = { title: str(s.title, 70), description: str(s.description, 170), canonicalUrl: safeUrl(s.canonicalUrl, 600), shareImage: safeUrl(s.shareImage) };
    }
    if (input.commentsEnabled !== undefined) out.commentsEnabled = Boolean(input.commentsEnabled);
    if (input.distribution !== undefined) {
      const d = (input.distribution ?? {}) as Record<string, unknown>;
      const at = d.fockisNewsAt && !Number.isNaN(Date.parse(String(d.fockisNewsAt))) ? new Date(String(d.fockisNewsAt)) : null;
      out.distribution = { website: true, fockisNews: Boolean(d.fockisNews), fockisNewsAt: at };
    }
    if (input.isBreaking !== undefined) {
      if (Boolean(input.isBreaking) && !actor.can('manage_breaking')) throw new ForbiddenException('Your role cannot mark breaking news.');
      out.isBreaking = Boolean(input.isBreaking);
    }
    if (input.featureRequested !== undefined) out.featureRequested = Boolean(input.featureRequested) && actor.can('publish_articles');
    if (input.sponsored !== undefined) out.sponsored = Boolean(input.sponsored);
    if (input.aiAssisted === true) out.aiAssisted = true;
    return out;
  }

  private async uniqueArticleSlug(outletId: Types.ObjectId, headline: string, exceptId?: Types.ObjectId) {
    let base = slugify(headline, 110) || 'article';
    if (RESERVED_ARTICLE_SLUGS.has(base)) base = `${base}-story`;
    let slug = base;
    for (let i = 2; i < 200; i++) {
      const filter: Record<string, unknown> = { outletId, slug };
      if (exceptId) filter._id = { $ne: exceptId };
      if (!(await this.articles.exists(filter))) return slug;
      slug = `${base}-${i}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async createArticle(outletId: string, userId: string, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'write_articles', 'Your role cannot write articles.');
    const data = this.cleanArticle(input, actor);
    if (!data.headline || String(data.headline).length < 4) throw new BadRequestException('Write a headline.');
    const slug = await this.uniqueArticleSlug(outlet._id, String(data.headline));
    const doc = await this.articles.create({
      language: outlet.primaryLanguage || 'en',
      country: outlet.country || '',
      city: outlet.city || '',
      ...data,
      outletId: outlet._id,
      authorUserId: oid(userId),
      authorName: actor.name,
      slug,
      status: 'draft',
      revisions: [{ at: new Date(), byUserId: oid(userId), byName: actor.name, action: 'created', headline: data.headline }],
    });
    await this.access.audit(outlet._id, actor, 'article_created', String(data.headline));
    return this.getArticle(outletId, userId, String(doc._id));
  }

  async updateArticle(outletId: string, userId: string, articleId: string, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const a = await this.articles.findOne({ _id: oid(articleId, 'article ID'), outletId: outlet._id, deletedAt: null });
    if (!a) throw new NotFoundException('Article not found.');
    if (!this.articlePermissions(a.toObject(), actor).edit) throw new ForbiddenException('You cannot edit this article in its current state.');
    const data = this.cleanArticle(input, actor);
    if (data.headline !== undefined && String(data.headline).length < 4) throw new BadRequestException('Write a headline.');
    if (input.slug !== undefined && a.status !== 'published') {
      const s = slugify(String(input.slug), 110);
      if (s && s !== a.slug) a.slug = await this.uniqueArticleSlug(outlet._id, s, a._id);
    }
    Object.assign(a, data);
    if (a.status === 'published' && a.distribution?.fockisNews && !a.fockisPublishedAt) a.fockisPublishedAt = a.distribution.fockisNewsAt && a.distribution.fockisNewsAt > new Date() ? a.distribution.fockisNewsAt : new Date();
    if (a.status === 'published' && !a.distribution?.fockisNews) a.fockisPublishedAt = null;
    a.revisions.push({ at: new Date(), byUserId: oid(userId), byName: actor.name, action: 'edited', headline: a.headline, bodyLength: String(a.body ?? '').length } as any);
    if (a.revisions.length > 200) a.revisions = a.revisions.slice(-200);
    a.markModified('distribution');
    await a.save();
    return this.getArticle(outletId, userId, articleId);
  }

  /** Editorial workflow transitions. */
  async articleAction(outletId: string, userId: string, articleId: string, input: { action?: string; note?: string; scheduledAt?: string; confirmAiReviewed?: boolean }) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const a = await this.articles.findOne({ _id: oid(articleId, 'article ID'), outletId: outlet._id, deletedAt: null });
    if (!a) throw new NotFoundException('Article not found.');
    const p = this.articlePermissions(a.toObject(), actor);
    const action = String(input.action);
    const note = str(input.note, 2000);
    const from = a.status as ArticleStatus;
    const step = (label: string) => a.revisions.push({ at: new Date(), byUserId: oid(userId), byName: actor.name, action: label, note, headline: a.headline } as any);
    const notifyAuthor = async (title: string, msg: string) => {
      if (!sameId(a.authorUserId, userId)) await this.access.notify([String(a.authorUserId)], title, msg, `/news/admin/${outlet._id}/articles/${a._id}`, String(a._id));
    };
    const validateForPublish = () => {
      if (!a.headline || a.headline.length < 4) throw new BadRequestException('The headline is missing.');
      if (textOf(a.body ?? '').length < 40) throw new BadRequestException('The article body is too short to publish.');
      if (a.aiAssisted && input.confirmAiReviewed !== true) throw new BadRequestException('This article used the AI assistant. Confirm that a person reviewed it before publishing.');
    };

    switch (action) {
      case 'submit': {
        if (!p.submit) throw new ForbiddenException('Only the author can submit this article.');
        if (textOf(a.body ?? '').length < 40) throw new BadRequestException('Write the article before submitting it.');
        a.status = 'submitted';
        step('submitted for review');
        const reviewers = (await this.access.staffWith(outlet, 'review_articles')).filter((u) => u !== userId);
        await this.access.notify(reviewers, `Article to review — ${outlet.name}`, `${actor.name}: ${a.headline}`, `/news/admin/${outlet._id}/review`, String(a._id));
        break;
      }
      case 'start_review':
        if (!p.review) throw new ForbiddenException('You cannot review this article.');
        a.status = 'under_review';
        step('review started');
        break;
      case 'request_changes':
        if (!p.review) throw new ForbiddenException('You cannot review this article.');
        if (!note) throw new BadRequestException('Explain what needs to change.');
        a.status = 'changes_requested';
        a.reviewNote = note;
        step('changes requested');
        await notifyAuthor('Changes requested', `${a.headline}: ${note.slice(0, 160)}`);
        break;
      case 'approve':
        if (!p.review) throw new ForbiddenException('You cannot review this article.');
        a.status = 'approved';
        a.reviewNote = note;
        step('approved');
        await notifyAuthor('Article approved', a.headline);
        break;
      case 'reject':
        if (!p.review) throw new ForbiddenException('You cannot review this article.');
        if (!note) throw new BadRequestException('Explain why the article is rejected.');
        a.status = 'rejected';
        a.reviewNote = note;
        step('rejected');
        await notifyAuthor('Article rejected', `${a.headline}: ${note.slice(0, 160)}`);
        break;
      case 'publish': {
        if (!p.publish) throw new ForbiddenException('Only authorized editors can publish.');
        validateForPublish();
        const now = new Date();
        a.status = 'published';
        a.publishedAt = now;
        a.fockisPublishedAt = a.distribution?.fockisNews ? (a.distribution.fockisNewsAt && a.distribution.fockisNewsAt > now ? a.distribution.fockisNewsAt : now) : null;
        step('published');
        await notifyAuthor('Article published', a.headline);
        break;
      }
      case 'schedule': {
        if (!p.publish) throw new ForbiddenException('Only authorized editors can schedule publication.');
        validateForPublish();
        const at = input.scheduledAt && !Number.isNaN(Date.parse(input.scheduledAt)) ? new Date(input.scheduledAt) : null;
        if (!at || at.getTime() < Date.now() + 60_000) throw new BadRequestException('Choose a publication time in the future.');
        a.status = 'scheduled';
        a.publishedAt = at;
        a.fockisPublishedAt = a.distribution?.fockisNews ? (a.distribution.fockisNewsAt && a.distribution.fockisNewsAt > at ? a.distribution.fockisNewsAt : at) : null;
        a.notified = false;
        step(`scheduled for ${at.toISOString()}`);
        break;
      }
      case 'archive':
        if (!p.archive) throw new ForbiddenException('You cannot archive this article.');
        a.status = 'archived';
        step('archived (unpublished)');
        break;
      case 'restore':
        if (!p.restore) throw new ForbiddenException('You cannot restore this article.');
        a.status = 'draft';
        step('moved back to draft');
        break;
      default:
        throw new BadRequestException('Unknown action.');
    }
    if (a.revisions.length > 200) a.revisions = a.revisions.slice(-200);
    await a.save();
    if (from !== 'published' && a.status === 'published') {
      await this.access.outlets.updateOne({ _id: outlet._id }, { $inc: { articleCount: 1 } }).exec();
      await this.dispatchArticle(String(a._id));
    }
    if (from === 'published' && a.status !== 'published') await this.access.outlets.updateOne({ _id: outlet._id, articleCount: { $gt: 0 } }, { $inc: { articleCount: -1 } }).exec();
    await this.access.audit(outlet._id, actor, `article_${action}`, a.headline);
    return this.getArticle(outletId, userId, articleId);
  }

  async deleteArticle(outletId: string, userId: string, articleId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const a = await this.articles.findOne({ _id: oid(articleId, 'article ID'), outletId: outlet._id, deletedAt: null });
    if (!a) throw new NotFoundException('Article not found.');
    if (!this.articlePermissions(a.toObject(), actor).delete) throw new ForbiddenException('You cannot delete this article.');
    const wasPublished = a.status === 'published';
    a.deletedAt = new Date();
    await a.save();
    if (wasPublished) await this.access.outlets.updateOne({ _id: outlet._id, articleCount: { $gt: 0 } }, { $inc: { articleCount: -1 } }).exec();
    await this.access.audit(outlet._id, actor, 'article_deleted', a.headline);
    return { ok: true };
  }

  /* ==========================================================================
   * AI writing assistant (existing Fockis AI integration; human review required)
   * ======================================================================== */

  async aiAssist(outletId: string, userId: string, input: Record<string, unknown>) {
    const { outlet } = await this.access.require(outletId, userId, 'write_articles', 'Your role cannot use the writing assistant.');
    const action = String(input.action);
    const headline = str(input.headline, 220);
    const text = textOf(sanitizeHtml(input.body)).slice(0, 7000);
    const lang = str(input.language, 5) || 'en';
    const target = str(input.targetLanguage, 5);
    const LANG: Record<string, string> = { en: 'English', fr: 'French', ht: 'Haitian Creole', es: 'Spanish' };
    const prompts: Record<string, [string, string]> = {
      draft: ['Write a factual news article draft from the reporter notes. Neutral tone, inverted pyramid, short paragraphs, no invented quotes or facts. Return JSON {"headline": string, "subtitle": string, "paragraphs": string[]}.', `Language: ${LANG[lang] ?? 'English'}\nNotes:\n${text || headline}`],
      headline: ['Suggest 5 accurate, non-clickbait news headlines under 90 characters. Return JSON {"headlines": string[]}.', `Language: ${LANG[lang] ?? 'English'}\nHeadline: ${headline}\nArticle: ${text}`],
      grammar: ['Correct grammar, spelling and punctuation without changing meaning or facts. Keep paragraph breaks. Return JSON {"paragraphs": string[]}.', text],
      summary: ['Summarize this news article in 2-3 neutral sentences. Return JSON {"summary": string}.', `${headline}\n${text}`],
      translate: ['Translate this news article faithfully. Return JSON {"headline": string, "subtitle": string, "paragraphs": string[]}.', `Target language: ${LANG[target] ?? 'English'}\nHeadline: ${headline}\nSubtitle: ${str(input.subtitle, 400)}\nArticle:\n${text}`],
      seo: ['Write an SEO title (max 60 chars) and meta description (max 155 chars) for this news article. Return JSON {"title": string, "description": string}.', `${headline}\n${text}`],
      categories: [`Pick the best category from [${NEWS_CATEGORIES.join(', ')}] and up to 6 short tags. Return JSON {"category": string, "tags": string[]}.`, `${headline}\n${text}`],
      captions: ['Write 3 short social media captions (with no more than 2 hashtags each) promoting this article. Return JSON {"captions": string[]}.', `${outlet.name}\n${headline}\n${text}`],
    };
    const p = prompts[action];
    if (!p) throw new BadRequestException('Unknown assistant action.');
    if (!this.ai.hasLanguageModel) throw new BadRequestException('The AI writing assistant is not configured on this server.');
    if (!text && !headline) throw new BadRequestException('Write a headline or some notes first.');
    const out = await this.ai.llmJson(`You are a careful newsroom assistant for ${outlet.name}. Never fabricate facts, names, numbers or quotes.`, `${p[0]}\n\n${p[1]}`);
    if (!out) throw new BadRequestException('The assistant did not respond. Please try again.');
    const paragraphsHtml = Array.isArray(out.paragraphs) ? out.paragraphs.map((x: unknown) => `<p>${escapeHtml(str(x, 3000))}</p>`).join('') : '';
    return {
      action,
      headline: str(out.headline, 220),
      subtitle: str(out.subtitle, 400),
      bodyHtml: paragraphsHtml,
      headlines: Array.isArray(out.headlines) ? out.headlines.map((h: unknown) => str(h, 220)).slice(0, 6) : [],
      summary: str(out.summary, 800),
      seo: { title: str(out.title, 70), description: str(out.description, 170) },
      category: (NEWS_CATEGORIES as readonly string[]).includes(String(out.category)) ? String(out.category) : '',
      tags: Array.isArray(out.tags) ? out.tags.map((t: unknown) => slugify(String(t), 40)).filter(Boolean).slice(0, 6) : [],
      captions: Array.isArray(out.captions) ? out.captions.map((c: unknown) => str(c, 400)).slice(0, 5) : [],
      notice: 'AI suggestions must be reviewed by a person before publication.',
    };
  }

  /* ==========================================================================
   * Videos, podcasts, programs
   * ======================================================================== */

  private itemView(i: Lean) {
    return {
      id: String(i._id),
      kind: i.kind,
      title: i.title,
      description: i.description || '',
      mediaUrl: i.mediaUrl || '',
      thumbnailUrl: i.thumbnailUrl || '',
      category: i.category || '',
      tags: i.tags ?? [],
      showName: i.showName || '',
      episodeNumber: i.episodeNumber ?? null,
      durationSec: i.durationSec ?? null,
      presenters: i.presenters ?? [],
      schedule: i.schedule ?? null,
      status: i.status,
      publishedAt: iso(i.publishedAt),
      plays: i.plays ?? 0,
      updatedAt: iso(i.updatedAt),
    };
  }

  async listItems(outletId: string, userId: string, kind: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    if (!(ITEM_KINDS as readonly string[]).includes(kind)) throw new BadRequestException('Unknown media kind.');
    const rows = (await this.items.find({ outletId: outlet._id, kind, deletedAt: null }).sort({ publishedAt: -1, createdAt: -1 }).limit(300).lean().exec()) as Lean[];
    return { canManage: actor.can('manage_broadcast'), items: rows.map((i) => this.itemView(i)) };
  }

  async saveItem(outletId: string, userId: string, itemId: string | null, input: Record<string, unknown>) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'manage_broadcast', 'Only broadcast staff can manage videos, podcasts and programs.');
    const kind = String(input.kind);
    if (!(ITEM_KINDS as readonly string[]).includes(kind)) throw new BadRequestException('Unknown media kind.');
    const title = str(input.title, 200);
    if (title.length < 2) throw new BadRequestException('Add a title.');
    const mediaUrl = safeUrl(input.mediaUrl);
    if ((kind === 'video' || kind === 'podcast') && !mediaUrl) throw new BadRequestException(kind === 'video' ? 'Upload the video or paste its URL.' : 'Upload the audio or paste its URL.');
    let schedule: Lean | null = null;
    if (kind === 'tv_program' || kind === 'radio_program') {
      const s = (input.schedule ?? {}) as Record<string, unknown>;
      const days = Array.isArray(s.days) ? [...new Set((s.days as unknown[]).map(Number).filter((d) => d >= 0 && d <= 6))] : [];
      const time = (v: unknown) => (/^\d{2}:\d{2}$/.test(String(v)) ? String(v) : '');
      schedule = { days, startTime: time(s.startTime), endTime: time(s.endTime) };
      if (!days.length || !schedule.startTime) throw new BadRequestException('Choose the days and start time of the program.');
    }
    const requested = String(input.status ?? 'draft');
    let status: 'draft' | 'published' | 'scheduled' = requested === 'published' ? 'published' : requested === 'scheduled' ? 'scheduled' : 'draft';
    let publishedAt: Date | null = null;
    if (status === 'published') publishedAt = new Date();
    if (status === 'scheduled') {
      const at = input.publishedAt && !Number.isNaN(Date.parse(String(input.publishedAt))) ? new Date(String(input.publishedAt)) : null;
      if (!at || at <= new Date()) throw new BadRequestException('Choose a future publication time.');
      publishedAt = at;
    }
    const data = {
      kind,
      title,
      description: str(input.description, 4000),
      mediaUrl,
      thumbnailUrl: safeUrl(input.thumbnailUrl),
      category: (NEWS_CATEGORIES as readonly string[]).includes(String(input.category)) ? String(input.category) : '',
      tags: (Array.isArray(input.tags) ? input.tags : String(input.tags ?? '').split(',')).map((t) => slugify(String(t), 40)).filter(Boolean).slice(0, 12),
      showName: str(input.showName, 160),
      episodeNumber: Number.isInteger(Number(input.episodeNumber)) && Number(input.episodeNumber) > 0 ? Number(input.episodeNumber) : null,
      durationSec: Number(input.durationSec) > 0 ? Math.round(Number(input.durationSec)) : null,
      presenters: (Array.isArray(input.presenters) ? input.presenters : String(input.presenters ?? '').split(',')).map((p) => str(p, 80)).filter(Boolean).slice(0, 10),
      schedule,
    };
    let doc;
    if (itemId) {
      doc = await this.items.findOne({ _id: oid(itemId, 'item ID'), outletId: outlet._id, deletedAt: null });
      if (!doc) throw new NotFoundException('Item not found.');
      if (doc.status === 'published' && status === 'published') publishedAt = doc.publishedAt;
      Object.assign(doc, data, { status, publishedAt });
      await doc.save();
    } else {
      doc = await this.items.create({ ...data, outletId: outlet._id, status, publishedAt, createdBy: oid(userId) });
    }
    if (status === 'published') await this.dispatchItem(String(doc._id));
    await this.access.audit(outlet._id, actor, `${kind}_saved`, title);
    return this.itemView(doc.toObject());
  }

  async deleteItem(outletId: string, userId: string, itemId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'manage_broadcast');
    const r = await this.items.updateOne({ _id: oid(itemId, 'item ID'), outletId: outlet._id, deletedAt: null }, { deletedAt: new Date() }).exec();
    if (!r.matchedCount) throw new NotFoundException('Item not found.');
    await this.access.audit(outlet._id, actor, 'item_deleted', itemId);
    return { ok: true };
  }

  /* ==========================================================================
   * Comments moderation
   * ======================================================================== */

  async listComments(outletId: string, userId: string, status = 'visible') {
    const { outlet } = await this.access.require(outletId, userId, 'moderate_comments');
    const rows = (await this.comments.find({ outletId: outlet._id, status: status === 'hidden' ? 'hidden' : 'visible' }).sort({ createdAt: -1 }).limit(200).lean().exec()) as Lean[];
    const heads = (await this.articles.find({ _id: { $in: rows.map((r) => r.articleId) } }).select('headline slug').lean().exec()) as Lean[];
    const byId = new Map(heads.map((h) => [String(h._id), h]));
    return { items: rows.map((c) => ({ id: String(c._id), body: c.body, userName: c.userName, createdAt: iso(c.createdAt), status: c.status, article: byId.get(String(c.articleId)) ? { headline: byId.get(String(c.articleId))!.headline, slug: byId.get(String(c.articleId))!.slug } : null })) };
  }

  async moderateComment(outletId: string, userId: string, commentId: string, hide: boolean) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'moderate_comments');
    const c = await this.comments.findOne({ _id: oid(commentId, 'comment ID'), outletId: outlet._id });
    if (!c) throw new NotFoundException('Comment not found.');
    const next = hide ? 'hidden' : 'visible';
    if (c.status !== next) {
      c.status = next;
      await c.save();
      await this.articles.updateOne({ _id: c.articleId }, { $inc: { commentCount: hide ? -1 : 1 } }).exec();
      await this.access.audit(outlet._id, actor, hide ? 'comment_hidden' : 'comment_restored', c.body.slice(0, 80));
    }
    return { ok: true };
  }

  /* ==========================================================================
   * Dashboard & analytics (real records only)
   * ======================================================================== */

  async dashboard(outletId: string, userId: string) {
    const { outlet, actor } = await this.access.require(outletId, userId);
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const since14 = new Date(Date.now() - 13 * 86_400_000);
    const finance = actor.can('view_finance') || actor.can('manage_donations');
    const [statusCounts, viewsAgg, unique30, daily, followers, donationsAgg, campaignsActive, pendingRequests, videoPlays, recent] = await Promise.all([
      this.articles.aggregate([{ $match: { outletId: outlet._id, deletedAt: null } }, { $group: { _id: '$status', n: { $sum: 1 } } }]).exec() as Promise<{ _id: string; n: number }[]>,
      this.articles.aggregate([{ $match: { outletId: outlet._id, deletedAt: null } }, { $group: { _id: null, views: { $sum: '$views' } } }]).exec() as Promise<{ views: number }[]>,
      this.views.distinct('viewerKey', { outletId: outlet._id, day: { $gte: since30.toISOString().slice(0, 10) } }).exec() as Promise<string[]>,
      this.views.aggregate([{ $match: { outletId: outlet._id, day: { $gte: since14.toISOString().slice(0, 10) } } }, { $group: { _id: '$day', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]).exec() as Promise<{ _id: string; n: number }[]>,
      Promise.resolve(outlet.followerCount ?? 0),
      finance
        ? (this.donations.aggregate([{ $match: { outletId: outlet._id, status: 'paid' } }, { $group: { _id: '$currency', total: { $sum: '$amount' }, n: { $sum: 1 } } }]).exec() as Promise<{ _id: string; total: number; n: number }[]>)
        : Promise.resolve(null),
      this.campaigns.countDocuments({ outletId: outlet._id, status: 'active' }).exec(),
      actor.can('manage_requests') ? this.requests.countDocuments({ outletId: outlet._id, status: { $in: ['submitted', 'received', 'under_review', 'more_info'] } }).exec() : Promise.resolve(null),
      this.items.aggregate([{ $match: { outletId: outlet._id, kind: 'video', deletedAt: null } }, { $group: { _id: null, plays: { $sum: '$plays' } } }]).exec() as Promise<{ plays: number }[]>,
      this.audits.find({ outletId: outlet._id }).sort({ createdAt: -1 }).limit(10).lean().exec() as Promise<Lean[]>,
    ]);
    const counts = Object.fromEntries(statusCounts.map((c) => [c._id, c.n])) as Record<string, number>;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const days: { day: string; views: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      days.push({ day: d, views: daily.find((x) => x._id === d)?.n ?? 0 });
    }
    return {
      outlet: this.outletAdminView(outlet, actor),
      stats: {
        totalArticles: total,
        published: counts.published ?? 0,
        drafts: (counts.draft ?? 0) + (counts.changes_requested ?? 0),
        pendingReview: (counts.submitted ?? 0) + (counts.under_review ?? 0),
        scheduled: counts.scheduled ?? 0,
        totalViews: viewsAgg[0]?.views ?? 0,
        uniqueVisitors30: unique30.length,
        followers,
        donations: donationsAgg ? donationsAgg.map((d) => ({ currency: d._id, total: Math.round(d.total * 100) / 100, count: d.n })) : null,
        activeCampaigns: campaignsActive,
        pendingRequests,
        videoViews: videoPlays[0]?.plays ?? 0,
        liveNow: Boolean(outlet.live?.tvLive || outlet.live?.radioLive),
      },
      viewsByDay: days,
      recent: recent.map((r) => ({ id: String(r._id), action: r.action, detail: r.detail, actorName: r.actorName, at: iso(r.createdAt) })),
    };
  }

  /** Followers ("subscribers"): totals, notification choices and the most recent followers (names only). */
  async followers(outletId: string, userId: string, page = 1) {
    const { outlet } = await this.access.require(outletId, userId);
    const size = 30;
    const p = Math.max(1, Math.min(200, Math.floor(Number(page) || 1)));
    const [total, muted, prefRows, last30, rows] = await Promise.all([
      this.follows.countDocuments({ outletId: outlet._id }).exec(),
      this.follows.countDocuments({ outletId: outlet._id, muted: true }).exec(),
      this.follows
        .aggregate([
          { $match: { outletId: outlet._id, muted: { $ne: true } } },
          { $project: { p: { $objectToArray: { $ifNull: ['$prefs', {}] } } } },
          { $unwind: '$p' },
          { $match: { 'p.v': true } },
          { $group: { _id: '$p.k', n: { $sum: 1 } } },
        ])
        .exec() as Promise<{ _id: string; n: number }[]>,
      this.follows.countDocuments({ outletId: outlet._id, createdAt: { $gte: new Date(Date.now() - 30 * 86_400_000) } }).exec(),
      this.follows.find({ outletId: outlet._id }).sort({ createdAt: -1 }).skip((p - 1) * size).limit(size).lean().exec() as Promise<Lean[]>,
    ]);
    const people = await Promise.all(rows.map(async (r) => ({ ...(await this.access.userName(String(r.userId))), at: iso(r.createdAt), muted: Boolean(r.muted) })));
    return {
      total,
      muted,
      newLast30Days: last30,
      prefs: Object.fromEntries(prefRows.map((r) => [r._id, r.n])),
      page: p,
      pageSize: size,
      // Followers' email addresses are never shown to the newsroom.
      items: people.map((x) => ({ name: x.name, avatarUrl: x.avatarUrl, at: x.at, muted: x.muted })),
    };
  }

  /** Category usage for this newsroom (categories are the shared Fockis News sections). */
  async categoryCounts(outletId: string, userId: string) {
    const { outlet } = await this.access.require(outletId, userId);
    const rows = (await this.articles
      .aggregate([
        { $match: { outletId: outlet._id, deletedAt: null } },
        { $group: { _id: '$category', total: { $sum: 1 }, published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } }, views: { $sum: '$views' } } },
      ])
      .exec()) as { _id: string; total: number; published: number; views: number }[];
    return { items: rows.map((r) => ({ category: r._id, total: r.total, published: r.published, views: r.views })) };
  }

  async analytics(outletId: string, userId: string, q: { from?: string; to?: string }) {
    const { outlet, actor } = await this.access.require(outletId, userId, 'view_analytics', 'Your role cannot view analytics.');
    const to = q.to && !Number.isNaN(Date.parse(q.to)) ? new Date(q.to) : new Date();
    const from = q.from && !Number.isNaN(Date.parse(q.from)) ? new Date(q.from) : new Date(to.getTime() - 29 * 86_400_000);
    if (to.getTime() - from.getTime() > 366 * 86_400_000) throw new BadRequestException('Choose a range of one year or less.');
    const range = { $gte: from.toISOString().slice(0, 10), $lte: to.toISOString().slice(0, 10) };
    const match = { outletId: outlet._id, day: range };
    const finance = actor.can('view_finance') || actor.can('manage_donations');
    const [byDay, readers, top, sources, languages, follows, donations, requests, plays] = await Promise.all([
      this.views.aggregate([{ $match: match }, { $group: { _id: '$day', views: { $sum: 1 }, readers: { $addToSet: '$viewerKey' } } }, { $project: { views: 1, readers: { $size: '$readers' } } }, { $sort: { _id: 1 } }]).exec() as Promise<{ _id: string; views: number; readers: number }[]>,
      this.views.distinct('viewerKey', match).exec() as Promise<string[]>,
      this.views.aggregate([{ $match: { ...match, articleId: { $ne: null } } }, { $group: { _id: '$articleId', views: { $sum: 1 } } }, { $sort: { views: -1 } }, { $limit: 10 }]).exec() as Promise<{ _id: Types.ObjectId; views: number }[]>,
      this.views.aggregate([{ $match: match }, { $group: { _id: '$source', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]).exec() as Promise<{ _id: string; n: number }[]>,
      this.views.aggregate([{ $match: match }, { $group: { _id: '$language', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]).exec() as Promise<{ _id: string; n: number }[]>,
      this.follows.countDocuments({ outletId: outlet._id, createdAt: { $gte: from, $lte: new Date(to.getTime() + 86_399_999) } }).exec(),
      finance
        ? (this.donations.aggregate([{ $match: { outletId: outlet._id, status: 'paid', paidAt: { $gte: from, $lte: new Date(to.getTime() + 86_399_999) } } }, { $group: { _id: '$currency', total: { $sum: '$amount' }, n: { $sum: 1 } } }]).exec() as Promise<{ _id: string; total: number; n: number }[]>)
        : Promise.resolve(null),
      this.requests.aggregate([{ $match: { outletId: outlet._id, createdAt: { $gte: from, $lte: new Date(to.getTime() + 86_399_999) } } }, { $group: { _id: '$type', n: { $sum: 1 } } }]).exec() as Promise<{ _id: string; n: number }[]>,
      this.items.aggregate([{ $match: { outletId: outlet._id, deletedAt: null } }, { $group: { _id: '$kind', plays: { $sum: '$plays' } } }]).exec() as Promise<{ _id: string; plays: number }[]>,
    ]);
    const heads = (await this.articles.find({ _id: { $in: top.map((t) => t._id) } }).select('headline slug readingMinutes').lean().exec()) as Lean[];
    const headById = new Map(heads.map((h) => [String(h._id), h]));
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      totals: { views: byDay.reduce((a, d) => a + d.views, 0), uniqueReaders: readers.length, newFollowers: follows, followers: outlet.followerCount ?? 0 },
      byDay: byDay.map((d) => ({ day: d._id, views: d.views, readers: d.readers })),
      topArticles: top.map((t) => ({ id: String(t._id), headline: headById.get(String(t._id))?.headline ?? '(deleted)', slug: headById.get(String(t._id))?.slug ?? '', views: t.views, readingMinutes: headById.get(String(t._id))?.readingMinutes ?? null })),
      sources: sources.map((s) => ({ source: s._id || 'direct', views: s.n })),
      languages: languages.map((l) => ({ language: l._id || 'unknown', views: l.n })),
      donations: donations ? donations.map((d) => ({ currency: d._id, total: Math.round(d.total * 100) / 100, count: d.n })) : null,
      requests: Object.fromEntries(requests.map((r) => [r._id, r.n])),
      plays: Object.fromEntries(plays.map((p) => [p._id, p.plays])),
      notTracked: ['Audience locations (no geolocation is collected)', 'Live viewers and radio listeners (needs the streaming provider)', 'Subscription and advertising revenue (not connected yet)'],
    };
  }

  async auditLog(outletId: string, userId: string) {
    const { outlet } = await this.access.require(outletId, userId, 'manage_settings', 'Only administrators can see the audit log.');
    const rows = (await this.audits.find({ outletId: outlet._id }).sort({ createdAt: -1 }).limit(200).lean().exec()) as Lean[];
    return { items: rows.map((r) => ({ id: String(r._id), action: r.action, detail: r.detail, actorName: r.actorName, at: iso(r.createdAt) })) };
  }

  /* ==========================================================================
   * Fockis staff: verification & featuring (never self-service)
   * ======================================================================== */

  async staffVerify(userId: string, outletId: string, verified: boolean) {
    if (!(await this.access.isPlatformStaff(userId))) throw new ForbiddenException('Only Fockis staff can verify media organizations.');
    const o = await this.access.outlet(outletId, true);
    await this.access.outlets.updateOne({ _id: o._id }, { $set: { verified, verifiedAt: verified ? new Date() : null } }).exec();
    await this.access.audit(o._id, { userId, name: 'Fockis staff' }, verified ? 'verified' : 'verification_removed', o.name);
    return { ok: true, verified };
  }

  async staffFeature(userId: string, articleId: string, featured: boolean) {
    if (!(await this.access.isPlatformStaff(userId))) throw new ForbiddenException('Only Fockis News staff can feature articles.');
    const r = await this.articles.updateOne({ _id: oid(articleId, 'article ID'), deletedAt: null }, { $set: { featured, featureRequested: false } }).exec();
    if (!r.matchedCount) throw new NotFoundException('Article not found.');
    return { ok: true, featured };
  }

  async staffFeatureRequests(userId: string) {
    if (!(await this.access.isPlatformStaff(userId))) throw new ForbiddenException('Only Fockis News staff can review feature requests.');
    const rows = (await this.articles.find({ featureRequested: true, status: 'published', deletedAt: null }).select('headline slug outletId publishedAt').sort({ publishedAt: -1 }).limit(100).lean().exec()) as Lean[];
    return { items: rows.map((r) => ({ id: String(r._id), headline: r.headline, slug: r.slug, outletId: String(r.outletId), publishedAt: iso(r.publishedAt) })) };
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


