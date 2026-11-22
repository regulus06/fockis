/**
 * news-access.service.ts — newsroom roles, permissions, audit and helpers.
 *
 * Every private newsroom call goes through `require(outletId, userId, perm)`:
 * the outlet is loaded from the database by ID and the caller's membership is
 * checked server-side, so changing an ID in a request never reaches another
 * outlet's private data.
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { NotificationsService } from '../notifications/notifications.service';
import { MEDIA_PERMISSIONS, MEDIA_ROLES, NEWS_MODEL, type MediaPermission, type MediaRole } from './news.schemas';

type AnyModel = Model<any>;

/** Default permissions for each newsroom role (owners can adjust per outlet). */
export const DEFAULT_ROLE_PERMISSIONS: Record<MediaRole, MediaPermission[]> = {
  owner: [...MEDIA_PERMISSIONS],
  administrator: [...MEDIA_PERMISSIONS],
  editor_in_chief: [
    'write_articles',
    'review_articles',
    'publish_articles',
    'manage_breaking',
    'manage_broadcast',
    'manage_media_library',
    'manage_requests',
    'view_confidential_tips',
    'view_analytics',
    'moderate_comments',
  ],
  editor: ['write_articles', 'review_articles', 'publish_articles', 'manage_breaking', 'manage_media_library', 'manage_requests', 'view_analytics', 'moderate_comments'],
  journalist: ['write_articles', 'manage_media_library'],
  reporter: ['write_articles', 'manage_media_library'],
  photographer: ['manage_media_library', 'write_articles'],
  video_producer: ['manage_broadcast', 'manage_media_library'],
  advertising_manager: ['manage_ads', 'view_analytics'],
};

export const ROLE_LABELS: Record<MediaRole, string> = {
  owner: 'Owner',
  administrator: 'Administrator',
  editor_in_chief: 'Editor-in-Chief',
  editor: 'Editor',
  journalist: 'Journalist',
  reporter: 'Reporter',
  photographer: 'Photographer',
  video_producer: 'Video Producer',
  advertising_manager: 'Advertising Manager',
};

/** Permissions owners/admins may never remove (keeps the outlet manageable). */
const LOCKED: Partial<Record<MediaRole, MediaPermission[]>> = { owner: [...MEDIA_PERMISSIONS], administrator: ['manage_settings', 'manage_team'] };

export interface Actor {
  userId: string;
  name: string;
  role: MediaRole | null;
  isStaff: boolean;
  perms: Set<MediaPermission>;
  can: (p: MediaPermission) => boolean;
}

export const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max);
export const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);
export const sameId = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);
export const isOid = (v: unknown) => typeof v === 'string' && Types.ObjectId.isValid(v) && String(new Types.ObjectId(v)) === v;

export function oid(v: unknown, label = 'ID'): Types.ObjectId {
  if (v instanceof Types.ObjectId) return v;
  if (!isOid(String(v ?? ''))) throw new BadRequestException(`Invalid ${label}.`);
  return new Types.ObjectId(String(v));
}

export function slugify(v: string, max = 80) {
  return String(v ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

/** http(s) or site-relative URL, else ''. */
export function safeUrl(v: unknown, max = 1000) {
  const s = str(v, max);
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s)) return s;
  return '';
}

/* ----------------------------------------------------------------------------
 * Article HTML: strict allowlist (rich-text editor output only).
 * -------------------------------------------------------------------------- */

const ALLOWED_TAGS: Record<string, string[]> = {
  p: [],
  br: [],
  hr: [],
  h2: [],
  h3: [],
  h4: [],
  strong: [],
  b: [],
  em: [],
  i: [],
  u: [],
  s: [],
  blockquote: [],
  ul: [],
  ol: [],
  li: [],
  a: ['href'],
  figure: [],
  figcaption: [],
  img: ['src', 'alt'],
};
const VOID = new Set(['br', 'hr', 'img']);
const escAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sanitizeHtml(input: unknown, max = 200_000): string {
  let html = String(input ?? '').slice(0, max);
  // Drop dangerous blocks with their content.
  html = html.replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)[\s\S]*?<\/\1\s*>/gi, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  return html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (whole, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    const allowed = ALLOWED_TAGS[tag];
    if (!allowed) return '';
    if (whole.startsWith('</')) return VOID.has(tag) ? '' : `</${tag}>`;
    const attrs: string[] = [];
    const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(rawAttrs))) {
      const name = m[1].toLowerCase();
      const value = m[3] ?? m[4] ?? m[5] ?? '';
      if (!allowed.includes(name)) continue;
      if (name === 'href' || name === 'src') {
        const url = value.trim();
        if (!/^https?:\/\//i.test(url) && !/^\/(?!\/)/.test(url) && !(name === 'href' && /^mailto:/i.test(url))) continue;
        attrs.push(`${name}="${escAttr(url)}"`);
      } else attrs.push(`${name}="${escAttr(value.slice(0, 300))}"`);
    }
    if (tag === 'a') attrs.push('rel="noopener nofollow" target="_blank"');
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  });
}

export const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

@Injectable()
export class NewsAccessService {
  private readonly logger = new Logger('FockisNews');

  constructor(
    @InjectModel(NEWS_MODEL.outlet) readonly outlets: AnyModel,
    @InjectModel(NEWS_MODEL.member) readonly members: AnyModel,
    @InjectModel(NEWS_MODEL.audit) private readonly audits: AnyModel,
    @InjectConnection() readonly connection: Connection,
    private readonly notifications: NotificationsService,
  ) {}

  /** Platform staff (Fockis administrators) — verification, featuring, moderation. */
  async isPlatformStaff(userId: string): Promise<boolean> {
    const User = this.connection.models['User'];
    if (!User || !isOid(userId)) return false;
    const u = (await User.findById(userId).select('role roles isSuperAdmin').lean().exec()) as Record<string, any> | null;
    if (!u) return false;
    const norm = (r: unknown) => String(r ?? '').toLowerCase().replace(/[\s-]+/g, '_');
    const staff = new Set(['admin', 'super_admin', 'superadmin']);
    return u.isSuperAdmin === true || staff.has(norm(u.role)) || (Array.isArray(u.roles) && u.roles.some((r: unknown) => staff.has(norm(r))));
  }

  async userName(userId: string): Promise<{ name: string; avatarUrl: string; email: string }> {
    const User = this.connection.models['User'];
    if (!User || !isOid(userId)) return { name: 'Fockis user', avatarUrl: '', email: '' };
    const u = (await User.findById(userId).select('name fullName username displayName avatar profilePicture email').lean().exec()) as Record<string, any> | null;
    return {
      name: String(u?.name || u?.fullName || u?.displayName || u?.username || 'Fockis user'),
      avatarUrl: String(u?.avatar || u?.profilePicture || ''),
      email: String(u?.email || ''),
    };
  }

  async findUser(identifier: string) {
    const User = this.connection.models['User'];
    if (!User) throw new BadRequestException('User lookup is unavailable.');
    const v = str(identifier, 200);
    if (!v) throw new BadRequestException('Enter a username, email or user ID.');
    const or: Record<string, unknown>[] = [{ email: v.toLowerCase() }, { username: v.replace(/^@/, '') }];
    if (isOid(v)) or.push({ _id: new Types.ObjectId(v) });
    const u = (await User.findOne({ $or: or }).select('_id name fullName username avatar').lean().exec()) as Record<string, any> | null;
    if (!u) throw new NotFoundException('No Fockis user matches that username or email.');
    return { id: String(u._id), name: String(u.name || u.fullName || u.username || 'Fockis user'), avatarUrl: String(u.avatar || '') };
  }

  /** Loads an active outlet (or throws 404). */
  async outlet(outletId: string, includeSuspended = false) {
    const o = (await this.outlets.findOne({ _id: oid(outletId, 'media ID'), deletedAt: null }).lean().exec()) as Record<string, any> | null;
    if (!o || (!includeSuspended && o.status !== 'active')) throw new NotFoundException('Media organization not found.');
    return o;
  }

  async outletBySlug(slug: string) {
    const o = (await this.outlets.findOne({ slug: str(slug, 63).toLowerCase(), deletedAt: null, status: 'active' }).lean().exec()) as Record<string, any> | null;
    if (!o) throw new NotFoundException('Media organization not found.');
    return o;
  }

  permissionsFor(outlet: Record<string, any>, role: MediaRole | null): Set<MediaPermission> {
    if (!role) return new Set();
    const custom = outlet.settings?.rolePermissions?.[role] as string[] | undefined;
    const base = Array.isArray(custom) ? (custom.filter((p) => (MEDIA_PERMISSIONS as readonly string[]).includes(p)) as MediaPermission[]) : DEFAULT_ROLE_PERMISSIONS[role];
    return new Set([...(base ?? []), ...(LOCKED[role] ?? [])]);
  }

  async actor(outlet: Record<string, any>, userId: string): Promise<Actor> {
    let role: MediaRole | null = null;
    let name = '';
    if (sameId(outlet.ownerUserId, userId)) role = 'owner';
    const m = (await this.members.findOne({ outletId: outlet._id, userId: oid(userId), status: 'active' }).lean().exec()) as Record<string, any> | null;
    if (m && role !== 'owner') role = (MEDIA_ROLES as readonly string[]).includes(m.role) ? m.role : null;
    name = m?.displayName || '';
    if (!name) name = (await this.userName(userId)).name;
    const perms = this.permissionsFor(outlet, role);
    const isStaff = await this.isPlatformStaff(userId);
    return { userId, name, role, isStaff, perms, can: (p) => perms.has(p) };
  }

  /** Newsroom gate: must be a team member with the permission. */
  async require(outletId: string, userId: string, perm?: MediaPermission, message?: string) {
    const outlet = await this.outlet(outletId, true);
    const actor = await this.actor(outlet, userId);
    if (!actor.role) throw new ForbiddenException('You are not a member of this newsroom.');
    if (outlet.status !== 'active' && actor.role !== 'owner') throw new ForbiddenException('This media organization is suspended.');
    if (perm && !actor.can(perm)) throw new ForbiddenException(message ?? 'Your newsroom role does not allow this.');
    return { outlet, actor };
  }

  async audit(outletId: Types.ObjectId | string, actor: { userId: string; name: string } | null, action: string, detail = '', meta: unknown = null) {
    try {
      await this.audits.create({ outletId: oid(String(outletId)), actorUserId: actor ? oid(actor.userId) : null, actorName: actor?.name ?? 'System', action, detail: detail.slice(0, 500), meta });
    } catch (err) {
      this.logger.warn(`Audit failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** User IDs of active team members holding a permission (plus the owner). */
  async staffWith(outlet: Record<string, any>, perm: MediaPermission): Promise<string[]> {
    const rows = (await this.members.find({ outletId: outlet._id, status: 'active' }).select('userId role').lean().exec()) as Record<string, any>[];
    const ids = new Set<string>([String(outlet.ownerUserId)]);
    for (const r of rows) if (this.permissionsFor(outlet, r.role).has(perm)) ids.add(String(r.userId));
    return [...ids];
  }

  /** In-app notifications through the existing Fockis notification system. */
  async notify(userIds: string[], title: string, message: string, link: string, entityId?: string, entityType = 'news') {
    const unique = [...new Set(userIds.filter((u) => isOid(u)))];
    for (const recipientId of unique) {
      try {
        await this.notifications.create({ recipientId, type: 'SYSTEM', title: title.slice(0, 140), message: message.slice(0, 400), link, entityId, entityType });
      } catch (err) {
        this.logger.warn(`Notification failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
