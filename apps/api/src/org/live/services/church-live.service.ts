/**
 * church-live.service.ts
 * -----------------------------------------------------------------------------
 * Organization livestreams: scheduling, access control, joining, viewing
 * sessions, statistics, analytics and notifications.
 *
 * Mounted under /church/organizations/:organizationId/live (see
 * ChurchLiveController). Records live in the existing church_live_events
 * collection (schema: ../schemas/live-event.schema.ts).
 *
 * Media transport is NOT implemented here:
 *   - "Fockis Live" broadcasts use the existing Fockis Live module
 *     (apps/api/src/my-live, LiveKit). Starting creates a linked live_streams
 *     record; the host broadcasts from the Fockis Live studio. The Fockis Live
 *     module calls canWatchOrganizationLive() before it issues a viewer token.
 *   - "Fockis Meeting" livestreams send authorized viewers to the meeting link
 *     the organizer pasted. The meeting's own admission rules still apply.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { createHash, randomBytes } from 'crypto';
import { Connection, Model, Types } from 'mongoose';

import { NotificationsService } from '../../../notifications/notifications.service';
import { createLiveRoomName } from '../../../my-live/utils/live-room.util';
import { MEDIA_PUBLIC_PREFIX } from '../../media/services/church-media.service';
import {
  LiveEvent,
  LiveEventDocument,
  LiveEventSchema,
  LiveEventSettings,
  LiveEventState,
  LiveEventVisibility,
  LiveSourceType,
} from '../schemas/live-event.schema';
import { OrgLiveInvitation, OrgLiveInvitationDocument } from '../schemas/live-invitation.schema';
import { OrgLiveView, OrgLiveViewDocument } from '../schemas/live-view.schema';
import {
  DENY_MESSAGE,
  LiveDenyReason,
  LiveViewer,
  evaluateLiveAccess,
  hasAcceptedInvitation,
  loadLiveViewer,
} from '../live-access';

/* Re-exported for church.module.ts and the DTOs (existing imports). */
export { LiveEvent, LiveEventSchema, LiveEventState, LiveEventVisibility, LiveSourceType };
export type { LiveEventDocument };

export interface ListLiveEventsQuery {
  page?: number | string;
  pageSize?: number | string;
  search?: string;
  tab?: string;
  visibility?: string;
  status?: string;
}

/** Status shown in the dashboard (derived from state + time). */
export type LiveDisplayStatus = 'draft' | 'scheduled' | 'waiting' | 'live' | 'completed' | 'cancelled' | 'failed';

export interface LiveEventInput {
  title?: string;
  description?: string;
  visibility?: LiveEventVisibility;
  scheduledStart?: string;
  scheduledEnd?: string | null;
  timeZone?: string;
  location?: string;
  branchId?: string | null;
  posterUrl?: string | null;
  coverUrl?: string | null;
  sourceType?: LiveSourceType;
  meetingUrl?: string;
  allowedGroupIds?: string[];
  allowedDepartmentIds?: string[];
  invitedGuestEmails?: string[];
  settings?: Partial<LiveEventSettings>;
  eventId?: string | null;
  isDraft?: boolean;
}

const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const MAX_INVITES_PER_CALL = 100;
const STORED_FILE = /^[a-f0-9]{24}\/[A-Za-z0-9._-]{1,200}$/;
const SETTING_KEYS: Array<Extract<keyof LiveEventSettings, string>> = [
  'showOnPublicPage',
  'showLockedPreview',
  'enableChat',
  'enableComments',
  'enableRecording',
  'allowReplay',
  'allowSharing',
  'notifyMembers',
  'requireRegistration',
  'waitingRoom',
  'requireApproval',
  'allowGuests',
  'attendanceEnabled',
  'allowAccessRequests',
  'bearerLinks',
];

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function cleanText(v: unknown, max: number): string {
  return String(v ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

function personName(u: Record<string, unknown>): string {
  return `${String(u.firstName ?? '')} ${String(u.lastName ?? '')}`.trim() || String(u.username ?? '') || 'Fockis user';
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** /meet/<token> from a pasted meeting link (full URL, path or bare token). */
export function meetingTokenOf(raw: string): string | null {
  let value = String(raw ?? '').trim();
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) value = new URL(value).pathname;
  } catch {
    return null;
  }
  const m = /^\/?meet\/([A-Za-z0-9_-]{6,200})\/?$/.exec(value);
  return m ? m[1] : null;
}

@Injectable()
export class ChurchLiveService {
  private readonly logger = new Logger(ChurchLiveService.name);

  constructor(
    @InjectModel(LiveEvent.name) private readonly liveEventModel: Model<LiveEventDocument>,
    @InjectModel(OrgLiveInvitation.name) private readonly invitationModel: Model<OrgLiveInvitationDocument>,
    @InjectModel(OrgLiveView.name) private readonly viewModel: Model<OrgLiveViewDocument>,
    @InjectConnection() private readonly connection: Connection,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  /* ==========================================================================
   * Helpers
   * ======================================================================== */

  private oid(value: unknown, label: string): Types.ObjectId {
    const s = String(value ?? '');
    if (!/^[a-f0-9]{24}$/i.test(s)) throw new BadRequestException(`Invalid ${label}.`);
    return new Types.ObjectId(s);
  }

  private viewer(organizationId: string, userId?: string | null): Promise<LiveViewer> {
    return loadLiveViewer(this.connection, organizationId, userId ?? null);
  }

  async assertManager(organizationId: string, userId?: string | null): Promise<void> {
    await this.requireManager(organizationId, userId);
  }

  private async requireManager(organizationId: string, userId?: string | null): Promise<LiveViewer> {
    if (!userId) throw new ForbiddenException('Please sign in.');
    const viewer = await this.viewer(organizationId, userId);
    if (!viewer.isManager) throw new ForbiddenException('You need the Manage live permission of this organization.');
    return viewer;
  }

  private async findOrThrow(organizationId: string, liveEventId: string): Promise<LiveEventDocument> {
    const doc = await this.liveEventModel.findOne({
      _id: this.oid(liveEventId, 'livestream'),
      organizationId: this.oid(organizationId, 'organization'),
    });
    if (!doc) throw new NotFoundException('Livestream not found.');
    return doc;
  }

  displayStatus(doc: Pick<LiveEvent, 'state' | 'scheduledStart'>, now = Date.now()): LiveDisplayStatus {
    switch (doc.state) {
      case LiveEventState.Draft:
        return 'draft';
      case LiveEventState.Live:
        return 'live';
      case LiveEventState.Ended:
        return 'completed';
      case LiveEventState.Cancelled:
        return 'cancelled';
      case LiveEventState.Failed:
        return 'failed';
      default:
        return new Date(doc.scheduledStart).getTime() <= now ? 'waiting' : 'scheduled';
    }
  }

  /** Only images uploaded to this organization's media library. */
  private image(organizationId: string, raw: unknown, label: string): string | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const s = String(raw).trim();
    const prefix = `${MEDIA_PUBLIC_PREFIX}/`;
    if (!s.startsWith(prefix) || !STORED_FILE.test(s.slice(prefix.length)) || !s.slice(prefix.length).startsWith(`${organizationId.toLowerCase()}/`)) {
      throw new BadRequestException(`${label}: upload an image for this organization.`);
    }
    return s;
  }

  private ids(raw: unknown, label: string): Types.ObjectId[] {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) throw new BadRequestException(`${label} must be a list.`);
    if (raw.length > 100) throw new BadRequestException(`At most 100 ${label.toLowerCase()}.`);
    return [...new Set(raw.map(String))].map((v) => this.oid(v, label.toLowerCase()));
  }

  /** Current viewers: Fockis Live counts sockets (deduplicated); meetings count active sessions. */
  private async currentViewers(docs: Pick<LiveEventDocument, '_id' | 'state' | 'sourceType' | 'liveStreamId'>[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    const live = docs.filter((d) => d.state === LiveEventState.Live);
    if (!live.length) return out;
    const streamIds = live.filter((d) => d.sourceType === LiveSourceType.FockisLive && d.liveStreamId).map((d) => d.liveStreamId as Types.ObjectId);
    if (streamIds.length) {
      const streams = await this.connection
        .collection('live_streams')
        .find({ _id: { $in: streamIds } }, { projection: { viewerCount: 1 } })
        .toArray();
      const byStream = new Map(streams.map((s) => [String(s._id), Number(s.viewerCount ?? 0)]));
      live.forEach((d) => d.liveStreamId && byStream.has(String(d.liveStreamId)) && out.set(String(d._id), byStream.get(String(d.liveStreamId))!));
    }
    const others = live.filter((d) => !out.has(String(d._id))).map((d) => d._id as Types.ObjectId);
    if (others.length) {
      const rows = await this.viewModel.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { liveEventId: { $in: others }, leftAt: null, isReplay: false, lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } } },
        { $group: { _id: '$liveEventId', n: { $sum: 1 } } },
      ]);
      rows.forEach((r) => out.set(String(r._id), r.n));
    }
    return out;
  }

  private async totalViews(ids: Types.ObjectId[]): Promise<Map<string, { views: number; unique: number }>> {
    const out = new Map<string, { views: number; unique: number }>();
    if (!ids.length) return out;
    const rows = await this.viewModel.aggregate<{ _id: Types.ObjectId; views: number; users: unknown[]; visitors: unknown[] }>([
      { $match: { liveEventId: { $in: ids } } },
      { $group: { _id: '$liveEventId', views: { $sum: 1 }, users: { $addToSet: '$userId' }, visitors: { $addToSet: '$visitorKey' } } },
    ]);
    rows.forEach((r) =>
      out.set(String(r._id), {
        views: r.views,
        unique: r.users.filter(Boolean).length + r.visitors.filter(Boolean).length,
      }),
    );
    return out;
  }

  /* ==========================================================================
   * Serialization
   * ======================================================================== */

  private serialize(
    doc: LiveEventDocument,
    viewer: LiveViewer,
    extra: { invited?: boolean; current?: number; totals?: { views: number; unique: number }; locked?: boolean } = {},
  ) {
    const manager = viewer.isManager;
    const access = evaluateLiveAccess(doc, viewer, Boolean(extra.invited));
    const status = this.displayStatus(doc);
    const s = doc.settings ?? ({} as LiveEventSettings);
    const meeting = doc.meeting ?? ({} as LiveEvent['meeting']);
    return {
      id: String(doc._id),
      organizationId: String(doc.organizationId),
      branchId: doc.branchId ? String(doc.branchId) : null,
      title: doc.title,
      description: extra.locked ? '' : doc.description ?? '',
      visibility: doc.visibility,
      state: doc.state,
      status,
      scheduledStart: doc.scheduledStart,
      scheduledEnd: doc.scheduledEnd ?? null,
      timeZone: doc.timeZone || '',
      location: extra.locked ? '' : doc.location || '',
      actualStart: doc.actualStart ?? null,
      endedAt: doc.endedAt ?? null,
      posterUrl: doc.posterUrl ?? null,
      thumbnailUrl: doc.posterUrl ?? null,
      coverUrl: doc.coverUrl ?? null,
      sourceType: doc.sourceType ?? LiveSourceType.FockisLive,
      eventId: doc.eventId ? String(doc.eventId) : null,
      settings: {
        showOnPublicPage: s.showOnPublicPage !== false,
        showLockedPreview: Boolean(s.showLockedPreview),
        enableChat: s.enableChat !== false,
        enableComments: s.enableComments !== false,
        enableRecording: s.enableRecording !== false,
        allowReplay: s.allowReplay !== false,
        allowSharing: s.allowSharing !== false,
        notifyMembers: Boolean(s.notifyMembers),
        requireRegistration: Boolean(s.requireRegistration),
        waitingRoom: Boolean(s.waitingRoom),
        requireApproval: Boolean(s.requireApproval),
        allowGuests: Boolean(s.allowGuests),
        attendanceEnabled: s.attendanceEnabled !== false,
        allowAccessRequests: Boolean(s.allowAccessRequests),
        bearerLinks: Boolean(s.bearerLinks),
        earlyJoinMinutes: s.earlyJoinMinutes ?? 15,
      },
      viewerCount: extra.current ?? 0,
      peakViewers: Math.max(doc.peakViewers ?? 0, extra.current ?? 0),
      totalViews: extra.totals?.views ?? undefined,
      uniqueViewers: extra.totals?.unique ?? undefined,
      currentUserHasAccess: access.allowed,
      accessReason: access.allowed ? null : access.reason,
      canManage: manager,
      isArchived: Boolean(doc.isArchived),
      // Never sent: playback URLs, the meeting link, the Fockis Live stream id.
      playbackUrl: null,
      ...(manager
        ? {
            meetingUrl: doc.meetingUrl || '',
            meeting: {
              meetingId: meeting.meetingId ? String(meeting.meetingId) : null,
              title: meeting.title || '',
              startsAt: meeting.startsAt ?? null,
              visibility: meeting.visibility || '',
              requireApproval: Boolean(meeting.requireApproval),
              waitingRoom: Boolean(meeting.waitingRoom),
              allowGuests: Boolean(meeting.allowGuests),
              validatedAt: meeting.validatedAt ?? null,
            },
            liveStreamId: doc.liveStreamId ? String(doc.liveStreamId) : null,
            allowedGroupIds: (doc.allowedGroupIds ?? []).map(String),
            allowedDepartmentIds: (doc.allowedDepartmentIds ?? []).map(String),
            invitedGuestEmails: doc.invitedGuestEmails ?? [],
            createdAt: doc.createdAt ?? null,
            updatedAt: doc.updatedAt ?? null,
          }
        : {}),
    };
  }

  /* ==========================================================================
   * Listings
   * ======================================================================== */

  /** What a non-manager may see listed: public, members (to members / locked preview), groups (to eligible), private (to invited). */
  private async listableFilter(organizationId: Types.ObjectId, viewer: LiveViewer): Promise<Record<string, any>> {
    const base: Record<string, any> = {
      organizationId,
      isArchived: { $ne: true },
      state: { $nin: [LiveEventState.Draft] },
    };
    if (viewer.isManager) return { organizationId };
    const or: Record<string, any>[] = [{ visibility: LiveEventVisibility.Public }];
    if (viewer.isMember) {
      or.push({ visibility: LiveEventVisibility.Members });
      const groups = viewer.groupIds.filter((g) => /^[a-f0-9]{24}$/i.test(g)).map((g) => new Types.ObjectId(g));
      const deps = viewer.departmentIds.filter((g) => /^[a-f0-9]{24}$/i.test(g)).map((g) => new Types.ObjectId(g));
      if (groups.length || deps.length) {
        or.push({ visibility: LiveEventVisibility.Groups, $or: [{ allowedGroupIds: { $in: groups } }, { allowedDepartmentIds: { $in: deps } }] });
      }
    } else {
      or.push({ visibility: LiveEventVisibility.Members, 'settings.showLockedPreview': true });
    }
    if (viewer.userId) {
      const invited = await this.invitationModel
        .find({ organizationId, userId: new Types.ObjectId(viewer.userId), status: { $in: ['accepted', 'pending'] } })
        .distinct('liveEventId');
      if (invited.length) or.push({ _id: { $in: invited } });
    }
    return { ...base, $or: or };
  }

  async listByOrganization(organizationId: string, query: ListLiveEventsQuery, viewerUserId?: string) {
    const org = this.oid(organizationId, 'organization');
    const viewer = await this.viewer(organizationId, viewerUserId);
    const page = clampInt(query.page, 1, 10_000, 1);
    const pageSize = clampInt(query.pageSize, 1, 100, 20);
    const filter: Record<string, any> = await this.listableFilter(org, viewer);
    const and: Record<string, any>[] = [];

    const search = cleanText(query.search, 100);
    if (search) and.push({ $or: [{ title: { $regex: escapeRegex(search), $options: 'i' } }, { description: { $regex: escapeRegex(search), $options: 'i' } }] });

    if (query.visibility && Object.values(LiveEventVisibility).includes(query.visibility as LiveEventVisibility)) and.push({ visibility: query.visibility });

    const now = new Date();
    const status = String(query.status ?? '');
    const byStatus: Record<string, Record<string, any>> = {
      draft: { state: LiveEventState.Draft },
      scheduled: { state: LiveEventState.Scheduled, scheduledStart: { $gt: now } },
      waiting: { state: LiveEventState.Scheduled, scheduledStart: { $lte: now } },
      live: { state: LiveEventState.Live },
      completed: { state: LiveEventState.Ended },
      cancelled: { state: LiveEventState.Cancelled },
      failed: { state: LiveEventState.Failed },
    };
    if (byStatus[status]) and.push(byStatus[status]);

    const tab = String(query.tab ?? 'all');
    let sort: Record<string, 1 | -1> = { scheduledStart: -1 };
    if (tab === 'scheduled') {
      and.push({ state: { $in: [LiveEventState.Scheduled, LiveEventState.Live] } });
      sort = { scheduledStart: 1 };
    } else if (tab === 'past') {
      and.push({ state: { $in: [LiveEventState.Ended, LiveEventState.Cancelled, LiveEventState.Failed] } });
    } else if (tab === 'archived') {
      and.push({ isArchived: true });
    }
    if (viewer.isManager && tab !== 'archived') and.push({ isArchived: { $ne: true } });

    const finalFilter = and.length ? { $and: [filter, ...and] } : filter;
    const [docs, total] = await Promise.all([
      this.liveEventModel
        .find(finalFilter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.liveEventModel.countDocuments(finalFilter),
    ]);
    // Live broadcasts first on the page.
    docs.sort((a, b) => Number(b.state === LiveEventState.Live) - Number(a.state === LiveEventState.Live));

    const [current, totals, invitedIds] = await Promise.all([
      this.currentViewers(docs),
      viewer.isManager ? this.totalViews(docs.map((d) => d._id as Types.ObjectId)) : Promise.resolve(new Map()),
      this.invitedSet(docs.map((d) => d._id as Types.ObjectId), viewer.userId),
    ]);

    return {
      items: docs.map((d) =>
        this.serialize(d, viewer, {
          current: current.get(String(d._id)),
          totals: totals.get(String(d._id)),
          invited: invitedIds.has(String(d._id)),
          locked: !viewer.isManager && !evaluateLiveAccess(d, viewer, invitedIds.has(String(d._id))).allowed,
        }),
      ),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  private async invitedSet(ids: Types.ObjectId[], userId: string | null): Promise<Set<string>> {
    if (!userId || !ids.length) return new Set();
    const now = new Date();
    const rows = await this.invitationModel
      .find({
        liveEventId: { $in: ids },
        userId: new Types.ObjectId(userId),
        status: 'accepted',
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      })
      .distinct('liveEventId');
    return new Set(rows.map(String));
  }

  async getUpcoming(organizationId: string, query: ListLiveEventsQuery, viewerUserId?: string) {
    return this.listByOrganization(organizationId, { ...query, tab: 'scheduled' }, viewerUserId);
  }

  /** The live broadcast this viewer may know about (locked preview included). */
  async getCurrent(organizationId: string, viewerUserId?: string) {
    const org = this.oid(organizationId, 'organization');
    const viewer = await this.viewer(organizationId, viewerUserId);
    const filter = await this.listableFilter(org, viewer);
    const doc = await this.liveEventModel
      .findOne({ $and: [filter, { state: LiveEventState.Live, isArchived: { $ne: true } }] })
      .sort({ actualStart: -1 })
      .exec();
    if (!doc) return null;
    const [current, invited] = await Promise.all([
      this.currentViewers([doc]),
      hasAcceptedInvitation(this.connection, doc._id, viewer.userId),
    ]);
    return this.serialize(doc, viewer, {
      current: current.get(String(doc._id)),
      invited,
      locked: !evaluateLiveAccess(doc, viewer, invited).allowed && !viewer.isManager,
    });
  }

  /**
   * Public organization page: live and upcoming streams marked "Show on public
   * page". Public streams in full; members-only streams only as a locked
   * preview when the organizer allows it; groups / private never.
   */
  async publicListing(organizationId: string, includePast: boolean) {
    const org = this.oid(organizationId, 'organization');
    const now = new Date();
    const visible = {
      organizationId: org,
      isArchived: { $ne: true },
      'settings.showOnPublicPage': { $ne: false },
      $or: [{ visibility: LiveEventVisibility.Public }, { visibility: LiveEventVisibility.Members, 'settings.showLockedPreview': true }],
    };
    const [live, upcoming, past] = await Promise.all([
      this.liveEventModel.find({ ...visible, state: LiveEventState.Live }).sort({ actualStart: -1 }).limit(3).exec(),
      this.liveEventModel
        .find({ ...visible, state: LiveEventState.Scheduled, scheduledStart: { $gte: new Date(now.getTime() - 6 * 3600e3) } })
        .sort({ scheduledStart: 1 })
        .limit(6)
        .exec(),
      includePast
        ? this.liveEventModel
            .find({ ...visible, visibility: LiveEventVisibility.Public, state: LiveEventState.Ended, 'settings.allowReplay': { $ne: false }, liveStreamId: { $ne: null } })
            .sort({ endedAt: -1 })
            .limit(6)
            .exec()
        : Promise.resolve([] as LiveEventDocument[]),
    ]);
    const current = await this.currentViewers(live);
    const pub = (d: LiveEventDocument) =>
      this.serialize(d, { userId: null, isOwner: false, isManager: false, isMember: false, groupIds: [], departmentIds: [] }, {
        current: current.get(String(d._id)),
        locked: d.visibility !== LiveEventVisibility.Public,
      });
    return { live: live.map(pub), upcoming: upcoming.map(pub), past: past.map(pub) };
  }

  /** Member portal: live now, upcoming, my invitations, past recordings. */
  async mine(organizationId: string, userId: string) {
    if (!userId) throw new ForbiddenException('Please sign in.');
    const org = this.oid(organizationId, 'organization');
    const viewer = await this.viewer(organizationId, userId);
    const filter = await this.listableFilter(org, viewer);
    const now = new Date();
    const [live, upcoming, past, invitations] = await Promise.all([
      this.liveEventModel.find({ $and: [filter, { state: LiveEventState.Live, isArchived: { $ne: true } }] }).sort({ actualStart: -1 }).limit(10).exec(),
      this.liveEventModel
        .find({ $and: [filter, { state: LiveEventState.Scheduled, isArchived: { $ne: true }, scheduledStart: { $gte: new Date(now.getTime() - 6 * 3600e3) } }] })
        .sort({ scheduledStart: 1 })
        .limit(20)
        .exec(),
      this.liveEventModel
        .find({ $and: [filter, { state: LiveEventState.Ended, isArchived: { $ne: true }, 'settings.allowReplay': { $ne: false }, liveStreamId: { $ne: null } }] })
        .sort({ endedAt: -1 })
        .limit(10)
        .exec(),
      this.invitationModel
        .find({ organizationId: org, userId: new Types.ObjectId(userId), kind: 'invite', status: { $in: ['pending', 'accepted'] } })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);
    const all = [...live, ...upcoming, ...past];
    const [current, invited] = await Promise.all([this.currentViewers(live), this.invitedSet(all.map((d) => d._id as Types.ObjectId), userId)]);
    const ser = (d: LiveEventDocument) =>
      this.serialize(d, viewer, {
        current: current.get(String(d._id)),
        invited: invited.has(String(d._id)),
        locked: !viewer.isManager && !evaluateLiveAccess(d, viewer, invited.has(String(d._id))).allowed,
      });
    const invitedEvents = await this.liveEventModel
      .find({ _id: { $in: invitations.map((i) => i.liveEventId) }, isArchived: { $ne: true }, state: { $nin: [LiveEventState.Draft, LiveEventState.Cancelled] } })
      .exec();
    const byId = new Map(invitedEvents.map((d) => [String(d._id), d]));
    return {
      isMember: viewer.isMember,
      live: live.map(ser),
      upcoming: upcoming.map(ser),
      past: past.map(ser),
      invitations: invitations
        .filter((i) => byId.has(String(i.liveEventId)))
        .map((i) => ({
          id: String(i._id),
          status: i.status,
          expiresAt: i.expiresAt ?? null,
          livestream: this.serialize(byId.get(String(i.liveEventId))!, viewer, { invited: i.status === 'accepted' }),
        })),
    };
  }

  async getOne(organizationId: string, liveEventId: string, viewerUserId?: string) {
    const doc = await this.findOrThrow(organizationId, liveEventId);
    const viewer = await this.viewer(organizationId, viewerUserId);
    const invited = await hasAcceptedInvitation(this.connection, doc._id, viewer.userId);
    if (!viewer.isManager) {
      if (doc.state === LiveEventState.Draft || doc.isArchived) throw new NotFoundException('Livestream not found.');
      const allowed = evaluateLiveAccess(doc, viewer, invited).allowed;
      const pendingInvite = viewer.userId
        ? await this.invitationModel.exists({ liveEventId: doc._id, userId: new Types.ObjectId(viewer.userId), status: 'pending' })
        : null;
      const visibleLocked =
        doc.visibility === LiveEventVisibility.Public ||
        doc.visibility === LiveEventVisibility.Members ||
        (doc.visibility === LiveEventVisibility.Groups && viewer.isMember) ||
        Boolean(pendingInvite) ||
        Boolean(doc.settings?.allowAccessRequests);
      // Private streams stay hidden unless the viewer was invited or requests are allowed.
      if (!allowed && !visibleLocked) throw new NotFoundException('Livestream not found.');
    }
    const [current, totals] = await Promise.all([
      this.currentViewers([doc]),
      viewer.isManager ? this.totalViews([doc._id as Types.ObjectId]) : Promise.resolve(new Map()),
    ]);
    const base = this.serialize(doc, viewer, {
      current: current.get(String(doc._id)),
      totals: totals.get(String(doc._id)),
      invited,
      locked: !viewer.isManager && !evaluateLiveAccess(doc, viewer, invited).allowed,
    });
    let request: { status: string } | null = null;
    if (viewer.userId && !viewer.isManager) {
      const r = await this.invitationModel.findOne({ liveEventId: doc._id, userId: new Types.ObjectId(viewer.userId), kind: 'request' }).sort({ createdAt: -1 }).lean();
      request = r ? { status: r.status } : null;
    }
    return { ...base, accessRequest: request, signedIn: Boolean(viewer.userId), isMember: viewer.isMember };
  }

  /* ==========================================================================
   * Statistics and analytics (managers)
   * ======================================================================== */

  async stats(organizationId: string, userId: string) {
    await this.requireManager(organizationId, userId);
    const org = this.oid(organizationId, 'organization');
    const now = new Date();
    const notArchived = { organizationId: org, isArchived: { $ne: true } };
    const [live, scheduled, completed, drafts] = await Promise.all([
      this.liveEventModel.find({ ...notArchived, state: LiveEventState.Live }).select('_id state sourceType liveStreamId').exec(),
      this.liveEventModel.countDocuments({ ...notArchived, state: LiveEventState.Scheduled, scheduledStart: { $gte: now } }),
      this.liveEventModel.countDocuments({ ...notArchived, state: LiveEventState.Ended }),
      this.liveEventModel.countDocuments({ ...notArchived, state: LiveEventState.Draft }),
    ]);
    const current = await this.currentViewers(live);
    let viewers = 0;
    current.forEach((n) => (viewers += n));
    return { currentlyLive: live.length, scheduled, currentViewers: viewers, previousStreams: completed, drafts, at: now };
  }

  async analytics(organizationId: string, userId: string, fromRaw?: string, toRaw?: string) {
    await this.requireManager(organizationId, userId);
    const org = this.oid(organizationId, 'organization');
    const to = toRaw && !Number.isNaN(Date.parse(toRaw)) ? new Date(toRaw) : new Date();
    const from = fromRaw && !Number.isNaN(Date.parse(fromRaw)) ? new Date(fromRaw) : new Date(to.getTime() - 90 * 86400e3);
    if (from > to) throw new BadRequestException('The start date must be before the end date.');

    const streams = await this.liveEventModel
      .find({ organizationId: org, scheduledStart: { $gte: from, $lte: to }, state: { $ne: LiveEventState.Draft } })
      .select('_id title state scheduledStart actualStart endedAt visibility sourceType liveStreamId peakViewers replayViews')
      .sort({ scheduledStart: -1 })
      .lean();
    const ids = streams.map((s) => s._id as Types.ObjectId);

    const [viewAgg, perStream, liveStreams] = await Promise.all([
      this.viewModel.aggregate<{
        _id: null;
        views: number;
        users: unknown[];
        visitors: unknown[];
        members: unknown[];
        memberViews: number;
        publicViews: number;
        replay: number;
        durationMs: number;
        timed: number;
      }>([
        { $match: { liveEventId: { $in: ids } } },
        {
          $project: {
            userId: 1,
            visitorKey: 1,
            isMember: 1,
            isReplay: 1,
            dur: { $subtract: [{ $ifNull: ['$leftAt', '$lastSeenAt'] }, '$joinedAt'] },
          },
        },
        {
          $group: {
            _id: null,
            views: { $sum: 1 },
            users: { $addToSet: '$userId' },
            visitors: { $addToSet: '$visitorKey' },
            members: { $addToSet: { $cond: ['$isMember', '$userId', null] } },
            memberViews: { $sum: { $cond: ['$isMember', 1, 0] } },
            publicViews: { $sum: { $cond: ['$isMember', 0, 1] } },
            replay: { $sum: { $cond: ['$isReplay', 1, 0] } },
            durationMs: { $sum: { $cond: [{ $gt: ['$dur', 0] }, '$dur', 0] } },
            timed: { $sum: { $cond: [{ $gt: ['$dur', 0] }, 1, 0] } },
          },
        },
      ]),
      this.viewModel.aggregate<{ _id: Types.ObjectId; views: number; users: unknown[]; visitors: unknown[]; members: unknown[] }>([
        { $match: { liveEventId: { $in: ids }, isReplay: false } },
        {
          $group: {
            _id: '$liveEventId',
            views: { $sum: 1 },
            users: { $addToSet: '$userId' },
            visitors: { $addToSet: '$visitorKey' },
            members: { $addToSet: { $cond: ['$isMember', '$userId', null] } },
          },
        },
      ]),
      this.connection
        .collection('live_streams')
        .find(
          { _id: { $in: streams.map((s) => s.liveStreamId).filter(Boolean) as Types.ObjectId[] } },
          { projection: { peakViewerCount: 1, likeCount: 1, commentCount: 1, shareCount: 1 } },
        )
        .toArray(),
    ]);
    const lsById = new Map(liveStreams.map((l) => [String(l._id), l]));
    // Meetings: time from the watch page signal. Fockis Live: seconds in the live room.
    const roomAgg = liveStreams.length
      ? await this.connection
          .collection('live_views')
          .aggregate<{ _id: null; seconds: number; n: number }>([
            { $match: { streamId: { $in: liveStreams.map((l) => String(l._id)) }, watchSeconds: { $gt: 0 } } },
            { $group: { _id: null, seconds: { $sum: '$watchSeconds' }, n: { $sum: 1 } } },
          ])
          .toArray()
      : [];
    const per = new Map(perStream.map((p) => [String(p._id), p]));
    const a = viewAgg[0];
    const meetingMs = a?.durationMs ?? 0;
    const meetingTimed = a?.timed ?? 0;
    const roomSeconds = roomAgg[0]?.seconds ?? 0;
    const roomTimed = roomAgg[0]?.n ?? 0;
    const averageMinutes = meetingTimed + roomTimed ? Math.round((meetingMs / 60000 + roomSeconds / 60) / (meetingTimed + roomTimed)) : null;
    let likes = 0;
    let comments = 0;
    let shares = 0;
    liveStreams.forEach((l) => {
      likes += Number(l.likeCount ?? 0);
      comments += Number(l.commentCount ?? 0);
      shares += Number(l.shareCount ?? 0);
    });

    const rows = streams.map((s) => {
      const p = per.get(String(s._id));
      const ls = s.liveStreamId ? lsById.get(String(s.liveStreamId)) : undefined;
      const durationMin = s.actualStart && s.endedAt ? Math.round((new Date(s.endedAt).getTime() - new Date(s.actualStart).getTime()) / 60000) : null;
      return {
        id: String(s._id),
        title: s.title,
        status: this.displayStatus(s as LiveEvent),
        visibility: s.visibility,
        scheduledStart: s.scheduledStart,
        durationMinutes: durationMin,
        views: p?.views ?? 0,
        uniqueViewers: (p?.users.filter(Boolean).length ?? 0) + (p?.visitors.filter(Boolean).length ?? 0),
        memberAttendees: p?.members.filter(Boolean).length ?? 0,
        peakViewers: Math.max(Number(s.peakViewers ?? 0), Number(ls?.peakViewerCount ?? 0)),
        replayViews: Number(s.replayViews ?? 0),
      };
    });

    return {
      from,
      to,
      totals: {
        livestreams: streams.length,
        completed: streams.filter((s) => s.state === LiveEventState.Ended).length,
        totalViews: a?.views ?? 0,
        uniqueViewers: (a?.users.filter(Boolean).length ?? 0) + (a?.visitors.filter(Boolean).length ?? 0),
        peakConcurrent: rows.reduce((m, r) => Math.max(m, r.peakViewers), 0),
        averageViewMinutes: averageMinutes,
        memberAttendees: a?.members.filter(Boolean).length ?? 0,
        memberViews: a?.memberViews ?? 0,
        publicViews: a?.publicViews ?? 0,
        replayViews: (a?.replay ?? 0) + streams.reduce((n, s) => n + Number(s.replayViews ?? 0), 0),
        likes,
        comments,
        shares,
      },
      streams: rows,
    };
  }

  /** Attendance report of one livestream (managers). */
  async attendance(organizationId: string, liveEventId: string, userId: string) {
    await this.requireManager(organizationId, userId);
    const doc = await this.findOrThrow(organizationId, liveEventId);
    const views = await this.viewModel.find({ liveEventId: doc._id, isReplay: false }).sort({ joinedAt: 1 }).limit(5000).lean();
    // Fockis Live: real presence in the live room (joined / left / seconds watched), from live_views.
    const roomViews = doc.liveStreamId
      ? await this.connection
          .collection('live_views')
          .find({ streamId: String(doc.liveStreamId) }, { projection: { userId: 1, joinedAt: 1, leftAt: 1, watchSeconds: 1 } })
          .limit(5000)
          .toArray()
      : [];
    const room = new Map<string, { seconds: number; first: Date | null; last: Date | null }>();
    roomViews.forEach((r) => {
      const key = String(r.userId ?? '');
      if (!/^[a-f0-9]{24}$/i.test(key)) return;
      const cur = room.get(key) ?? { seconds: 0, first: null, last: null };
      cur.seconds += Number(r.watchSeconds ?? 0);
      if (r.joinedAt && (!cur.first || r.joinedAt < cur.first)) cur.first = r.joinedAt;
      const end = r.leftAt ?? null;
      if (end && (!cur.last || end > cur.last)) cur.last = end;
      room.set(key, cur);
    });
    const userIds = [...new Set([...views.map((v) => v.userId).filter(Boolean).map(String), ...room.keys()])];
    const [users, members] = await Promise.all([
      this.connection
        .collection('users')
        .find({ _id: { $in: userIds.map((u) => new Types.ObjectId(u)) } }, { projection: { firstName: 1, lastName: 1, username: 1 } })
        .toArray(),
      this.connection
        .collection('church_members')
        .find({ organizationId: doc.organizationId, userId: { $in: userIds.map((u) => new Types.ObjectId(u)) } }, { projection: { userId: 1, 'profile.displayName': 1 } })
        .toArray(),
    ]);
    const nameOf = new Map<string, string>();
    users.forEach((u) => nameOf.set(String(u._id), personName(u)));
    members.forEach((m) => m.profile?.displayName && nameOf.set(String(m.userId), String(m.profile.displayName)));
    const memberSet = new Set(members.map((m) => String(m.userId)));
    const byPerson = new Map<string, { name: string; isMember: boolean; firstJoin: Date; lastLeave: Date; minutes: number; sessions: number }>();
    views.forEach((v) => {
      const key = v.userId ? String(v.userId) : `visitor:${v.visitorKey}`;
      const end = v.leftAt ?? v.lastSeenAt;
      const mins = Math.max(0, (new Date(end).getTime() - new Date(v.joinedAt).getTime()) / 60000);
      const cur = byPerson.get(key);
      if (cur) {
        cur.minutes += mins;
        cur.sessions += 1;
        if (v.joinedAt < cur.firstJoin) cur.firstJoin = v.joinedAt;
        if (end > cur.lastLeave) cur.lastLeave = end;
      } else {
        byPerson.set(key, {
          name: v.userId ? nameOf.get(String(v.userId)) ?? 'Fockis user' : 'Visitor',
          isMember: Boolean(v.isMember),
          firstJoin: v.joinedAt,
          lastLeave: end,
          minutes: mins,
          sessions: 1,
        });
      }
    });
    // Fockis Live room time replaces the click-time estimate; people who only joined the room are added.
    room.forEach((r, userKey) => {
      const cur = byPerson.get(userKey);
      const minutes = r.seconds / 60;
      if (cur) {
        if (minutes > 0) cur.minutes = minutes;
        if (r.last && r.last > cur.lastLeave) cur.lastLeave = r.last;
      } else if (r.first) {
        byPerson.set(userKey, {
          name: nameOf.get(userKey) ?? 'Fockis user',
          isMember: memberSet.has(userKey),
          firstJoin: r.first,
          lastLeave: r.last ?? r.first,
          minutes,
          sessions: 1,
        });
      }
    });
    return {
      livestream: { id: String(doc._id), title: doc.title, scheduledStart: doc.scheduledStart, attendanceEnabled: doc.settings?.attendanceEnabled !== false },
      attendees: [...byPerson.values()].map((p) => ({ ...p, minutes: Math.round(p.minutes) })),
    };
  }

  /* ==========================================================================
   * Create / update
   * ======================================================================== */

  private applyInput(doc: LiveEventDocument, organizationId: string, input: LiveEventInput, creating: boolean) {
    if (input.title !== undefined || creating) {
      const title = cleanText(input.title, 150);
      if (!title) throw new BadRequestException('Enter a title.');
      doc.title = title;
    }
    if (input.description !== undefined) doc.description = cleanText(input.description, 2000);
    if (input.visibility !== undefined) {
      if (!Object.values(LiveEventVisibility).includes(input.visibility)) throw new BadRequestException('Choose who can watch.');
      doc.visibility = input.visibility;
    }
    if (input.scheduledStart !== undefined) {
      const d = new Date(String(input.scheduledStart));
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Choose the date and start time.');
      doc.scheduledStart = d;
    }
    if (input.scheduledEnd !== undefined) {
      if (input.scheduledEnd === null || input.scheduledEnd === '') doc.scheduledEnd = null;
      else {
        const d = new Date(String(input.scheduledEnd));
        if (Number.isNaN(d.getTime())) throw new BadRequestException('Choose a valid end time.');
        doc.scheduledEnd = d;
      }
    }
    if (doc.scheduledEnd && doc.scheduledEnd <= doc.scheduledStart) throw new BadRequestException('The end time must be after the start time.');
    if (input.timeZone !== undefined) {
      const tz = cleanText(input.timeZone, 64);
      if (tz) {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: tz });
        } catch {
          throw new BadRequestException('Choose a valid time zone.');
        }
      }
      doc.timeZone = tz;
    }
    if (input.location !== undefined) doc.location = cleanText(input.location, 140);
    if (input.branchId !== undefined) doc.branchId = input.branchId ? this.oid(input.branchId, 'campus') : null;
    if (input.posterUrl !== undefined) doc.posterUrl = this.image(organizationId, input.posterUrl, 'Thumbnail');
    if (input.coverUrl !== undefined) doc.coverUrl = this.image(organizationId, input.coverUrl, 'Cover image');
    if (input.sourceType !== undefined) {
      if (!Object.values(LiveSourceType).includes(input.sourceType)) throw new BadRequestException('Choose the livestream source.');
      if (doc.state === LiveEventState.Live && input.sourceType !== doc.sourceType) throw new ConflictException('The source cannot change while the livestream is live.');
      doc.sourceType = input.sourceType;
    }
    if (input.allowedGroupIds !== undefined) doc.allowedGroupIds = this.ids(input.allowedGroupIds, 'Groups');
    if (input.allowedDepartmentIds !== undefined) doc.allowedDepartmentIds = this.ids(input.allowedDepartmentIds, 'Departments');
    if (input.invitedGuestEmails !== undefined) {
      doc.invitedGuestEmails = (Array.isArray(input.invitedGuestEmails) ? input.invitedGuestEmails : [])
        .map((e) => cleanText(e, 254).toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
        .slice(0, 200);
    }
    if (input.eventId !== undefined) doc.eventId = input.eventId ? this.oid(input.eventId, 'event') : null;
    if (input.settings && typeof input.settings === 'object') {
      const next = { ...((doc.settings as unknown as { toObject?: () => object })?.toObject?.() ?? doc.settings ?? {}) } as LiveEventSettings;
      for (const key of SETTING_KEYS) {
        const v = (input.settings as Record<string, unknown>)[key];
        if (typeof v === 'boolean') (next as unknown as Record<string, boolean>)[key] = v;
      }
      if (input.settings.earlyJoinMinutes !== undefined) next.earlyJoinMinutes = clampInt(input.settings.earlyJoinMinutes, 0, 120, 15);
      doc.settings = next;
    }

    // Settings that do not apply to the chosen access are turned off, so the
    // stored record never claims something the server does not enforce.
    const s = doc.settings;
    if (doc.visibility !== LiveEventVisibility.Private) s.bearerLinks = false;
    if (doc.visibility !== LiveEventVisibility.Public) s.allowGuests = false;
    if (doc.visibility !== LiveEventVisibility.Members) s.showLockedPreview = false;
    if (doc.visibility === LiveEventVisibility.Public) s.allowAccessRequests = false;
    if (doc.visibility === LiveEventVisibility.Groups && !doc.allowedGroupIds.length && !doc.allowedDepartmentIds.length && doc.state !== LiveEventState.Draft) {
      throw new BadRequestException('Choose at least one group or department.');
    }
  }

  private async validateMeetingLink(doc: LiveEventDocument) {
    if (doc.sourceType !== LiveSourceType.Meeting) return;
    const url = String(doc.meetingUrl ?? '').trim();
    if (!url) {
      if (doc.state !== LiveEventState.Draft) throw new BadRequestException('Paste the Fockis Meeting link.');
      return;
    }
    const info = await this.lookupMeeting(url);
    doc.meeting = {
      meetingId: info.meetingId ? new Types.ObjectId(info.meetingId) : null,
      title: info.title,
      startsAt: info.startsAt,
      visibility: info.visibility,
      requireApproval: info.requireApproval,
      waitingRoom: info.waitingRoom,
      allowGuests: info.allowGuests,
      validatedAt: new Date(),
    };
  }

  async create(organizationId: string, input: LiveEventInput, actorUserId: string) {
    const viewer = await this.requireManager(organizationId, actorUserId);
    const doc = new this.liveEventModel({
      organizationId: this.oid(organizationId, 'organization'),
      state: input.isDraft ? LiveEventState.Draft : LiveEventState.Scheduled,
      visibility: input.visibility ?? LiveEventVisibility.Members,
      sourceType: input.sourceType ?? LiveSourceType.FockisLive,
      createdBy: new Types.ObjectId(actorUserId),
      updatedBy: new Types.ObjectId(actorUserId),
    });
    this.applyInput(doc, organizationId, input, true);
    if (!doc.scheduledStart) throw new BadRequestException('Choose the date and start time.');
    if (input.meetingUrl !== undefined) doc.meetingUrl = this.cleanMeetingUrl(input.meetingUrl);
    await this.validateMeetingLink(doc);
    await doc.save();
    if (doc.state === LiveEventState.Scheduled && doc.settings?.notifyMembers) {
      void this.notifyEligible(doc, 'scheduled').catch((e) => this.logger.warn(`notify failed: ${String(e)}`));
    }
    return this.serialize(doc, viewer);
  }

  async update(organizationId: string, liveEventId: string, input: LiveEventInput, actorUserId: string) {
    const viewer = await this.requireManager(organizationId, actorUserId);
    const doc = await this.findOrThrow(organizationId, liveEventId);
    if ([LiveEventState.Ended, LiveEventState.Cancelled].includes(doc.state) && input.isDraft === undefined) {
      // Finished streams: only the details shown with the recording can change.
      const allowed: LiveEventInput = { title: input.title, description: input.description, posterUrl: input.posterUrl, coverUrl: input.coverUrl };
      if (input.settings?.allowReplay !== undefined || input.settings?.showOnPublicPage !== undefined) {
        allowed.settings = { allowReplay: input.settings.allowReplay, showOnPublicPage: input.settings.showOnPublicPage };
      }
      input = allowed;
    }
    const wasDraft = doc.state === LiveEventState.Draft;
    if (input.isDraft === false && wasDraft) doc.state = LiveEventState.Scheduled;
    if (input.isDraft === true && doc.state === LiveEventState.Scheduled) doc.state = LiveEventState.Draft;
    this.applyInput(doc, organizationId, input, false);
    if (input.meetingUrl !== undefined) doc.meetingUrl = this.cleanMeetingUrl(input.meetingUrl);
    if (input.meetingUrl !== undefined || input.sourceType !== undefined || (wasDraft && doc.state === LiveEventState.Scheduled)) {
      await this.validateMeetingLink(doc);
    }
    doc.updatedBy = new Types.ObjectId(actorUserId);
    await doc.save();
    await this.syncLinkedStream(doc);
    if (wasDraft && doc.state === LiveEventState.Scheduled && doc.settings?.notifyMembers) {
      void this.notifyEligible(doc, 'scheduled').catch((e) => this.logger.warn(`notify failed: ${String(e)}`));
    }
    return this.serialize(doc, viewer);
  }

  private cleanMeetingUrl(raw: unknown): string {
    const v = cleanText(raw, 2000);
    if (!v) return '';
    if (!meetingTokenOf(v)) throw new BadRequestException('Paste a Fockis Meeting link (it contains /meet/…).');
    return v;
  }

  /** Keep the linked Fockis Live record's title / description in step. */
  private async syncLinkedStream(doc: LiveEventDocument) {
    if (!doc.liveStreamId) return;
    await this.connection
      .collection('live_streams')
      .updateOne({ _id: doc.liveStreamId }, { $set: { title: doc.title.slice(0, 150), description: String(doc.description ?? '').slice(0, 1000) } })
      .catch(() => undefined);
  }

  /* ==========================================================================
   * Meetings
   * ======================================================================== */

  /** Details of a pasted Fockis Meeting link, and whether it is safe for this access policy. */
  private async lookupMeeting(url: string) {
    const token = meetingTokenOf(url);
    if (!token) throw new BadRequestException('Paste a Fockis Meeting link (it contains /meet/…).');
    const m = await this.connection.collection('meetings').findOne(
      { joinToken: token },
      { projection: { topic: 1, startTime: 1, endTime: 1, timezone: 1, visibility: 1, requireApproval: 1, allowGuests: 1, security: 1, status: 1, hostName: 1 } },
    );
    if (!m) throw new BadRequestException('No Fockis Meeting uses this link. Check that you copied the whole link.');
    return {
      meetingId: String(m._id),
      title: String(m.topic ?? ''),
      startsAt: m.startTime ? new Date(m.startTime) : null,
      endsAt: m.endTime ? new Date(m.endTime) : null,
      timeZone: String(m.timezone ?? ''),
      hostName: String(m.hostName ?? ''),
      status: String(m.status ?? ''),
      visibility: String(m.visibility ?? 'private'),
      requireApproval: Boolean(m.requireApproval),
      waitingRoom: Boolean(m.security?.waitingRoomEnabled),
      allowGuests: Boolean(m.allowGuests),
    };
  }

  /**
   * How the meeting's own settings combine with the livestream's access.
   * The meeting link itself is a key to the meeting: if the meeting admits
   * anyone with the link, a shared link bypasses the livestream's rules.
   */
  meetingCompatibility(visibility: string, m: { visibility: string; requireApproval: boolean; waitingRoom: boolean; allowGuests: boolean }) {
    const warnings: string[] = [];
    const hostAdmits = m.requireApproval || m.waitingRoom;
    const meetingOpen = m.visibility === 'public' || (m.allowGuests && !hostAdmits);
    let protectedByMeeting = true;
    if (visibility !== LiveEventVisibility.Public) {
      if (meetingOpen && !hostAdmits) {
        protectedByMeeting = false;
        warnings.push(
          'This meeting lets anyone with its link in. Fockis only gives the link to people allowed by this livestream, but if someone shares it, others can join. Turn on the waiting room or host approval in Fockis Meetings.',
        );
      } else if (!hostAdmits) {
        warnings.push('Turn on the waiting room in Fockis Meetings so the host sees who is joining.');
      }
      if (m.visibility === 'private' || m.visibility === 'invite_only') {
        warnings.push(
          'This meeting only admits people invited to the meeting. Members allowed by this livestream will wait for the host to admit them (or be refused). Use "members" or turn on the waiting room in the meeting.',
        );
      }
    } else if (m.visibility === 'private' || m.visibility === 'invite_only') {
      warnings.push('This livestream is public, but the meeting only admits invited people. Visitors will be refused by the meeting.');
    }
    return { protected: protectedByMeeting, warnings };
  }

  async validateMeeting(organizationId: string, userId: string, url: string, visibility?: string) {
    await this.requireManager(organizationId, userId);
    const info = await this.lookupMeeting(url);
    return { ...info, url: url.trim(), ...this.meetingCompatibility(visibility ?? LiveEventVisibility.Members, info) };
  }

  /* ==========================================================================
   * State changes
   * ======================================================================== */

  async updateState(organizationId: string, liveEventId: string, state: LiveEventState, actorUserId: string) {
    const viewer = await this.requireManager(organizationId, actorUserId);
    const doc = await this.findOrThrow(organizationId, liveEventId);
    let watch: { kind: 'fockis_live'; liveStreamId: string; studioUrl: string } | null = null;

    if (state === LiveEventState.Live) {
      if (doc.state !== LiveEventState.Scheduled && doc.state !== LiveEventState.Failed) {
        throw new ConflictException(doc.state === LiveEventState.Live ? 'This livestream is already live.' : 'Only a scheduled livestream can be started.');
      }
      if (doc.sourceType === LiveSourceType.Meeting) {
        if (!doc.meetingUrl) throw new BadRequestException('Paste the Fockis Meeting link before starting.');
      } else {
        const streamId = await this.createLinkedStream(doc, actorUserId);
        doc.liveStreamId = streamId;
        watch = { kind: 'fockis_live', liveStreamId: String(streamId), studioUrl: `/live/studio/${String(streamId)}` };
      }
      doc.state = LiveEventState.Live;
      doc.actualStart = new Date();
      doc.endedAt = null;
      await doc.save();
      void this.notifyEligible(doc, 'started').catch((e) => this.logger.warn(`notify failed: ${String(e)}`));
    } else if (state === LiveEventState.Ended) {
      if (doc.state !== LiveEventState.Live) throw new ConflictException('Only a livestream that is live can be ended.');
      await this.finish(doc, LiveEventState.Ended);
    } else if (state === LiveEventState.Cancelled) {
      if (![LiveEventState.Scheduled, LiveEventState.Draft, LiveEventState.Live].includes(doc.state)) {
        throw new ConflictException('This livestream can no longer be cancelled.');
      }
      const wasPublished = doc.state !== LiveEventState.Draft;
      await this.finish(doc, LiveEventState.Cancelled);
      if (wasPublished) void this.notifyEligible(doc, 'cancelled').catch((e) => this.logger.warn(`notify failed: ${String(e)}`));
    } else if (state === LiveEventState.Scheduled) {
      if (doc.state !== LiveEventState.Draft && doc.state !== LiveEventState.Failed && doc.state !== LiveEventState.Cancelled) {
        throw new ConflictException('Only drafts, failed or cancelled livestreams can be scheduled again.');
      }
      doc.state = LiveEventState.Scheduled;
      await this.validateMeetingLink(doc);
      await doc.save();
    } else if (state === LiveEventState.Failed) {
      if (doc.state !== LiveEventState.Live) throw new ConflictException('Only a live broadcast can be marked as failed.');
      await this.finish(doc, LiveEventState.Failed);
    } else {
      throw new BadRequestException('Unsupported change.');
    }
    const current = await this.currentViewers([doc]);
    return { ...this.serialize(doc, viewer, { current: current.get(String(doc._id)) }), watch };
  }

  /** Creates the Fockis Live record the host broadcasts with (hidden from public Fockis Live lists). */
  private async createLinkedStream(doc: LiveEventDocument, hostUserId: string): Promise<Types.ObjectId> {
    if (doc.liveStreamId) {
      const existing = await this.connection.collection('live_streams').findOne({ _id: doc.liveStreamId }, { projection: { status: 1 } });
      if (existing && existing.status === 'live') return doc.liveStreamId;
    }
    const id = new Types.ObjectId();
    const now = new Date();
    const thumb = doc.posterUrl || doc.coverUrl || '';
    await this.connection.collection('live_streams').insertOne({
      _id: id,
      hostId: String(hostUserId),
      roomName: createLiveRoomName(String(id)),
      title: doc.title.slice(0, 150),
      description: String(doc.description ?? '').slice(0, 1000),
      thumbnailUrl: thumb,
      thumbnailUpdatedAt: null,
      category: 'Organization',
      status: 'live',
      products: [],
      viewerCount: 0,
      peakViewerCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      startedAt: now,
      // Links used by the Fockis Live module for access control and listings.
      organizationId: doc.organizationId,
      orgLiveEventId: doc._id,
      // Recording follows the livestream setting.
      orgRecordingDisabled: doc.settings?.enableRecording === false,
      recording: { status: 'none', provider: '', egressId: '', objectKey: '', contentType: 'video/mp4', sizeBytes: 0, durationSeconds: 0, error: '', startAttempts: 0, publishedPostId: '', publishing: false },
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  private async finish(doc: LiveEventDocument, state: LiveEventState) {
    const endedStream = doc.liveStreamId && doc.state === LiveEventState.Live ? String(doc.liveStreamId) : null;
    doc.state = state;
    if (state === LiveEventState.Ended || state === LiveEventState.Failed) doc.endedAt = new Date();
    const current = await this.currentViewers([doc]);
    doc.peakViewers = Math.max(doc.peakViewers ?? 0, current.get(String(doc._id)) ?? 0);
    await doc.save();
    await this.viewModel.collection.updateMany({ liveEventId: doc._id, leftAt: null }, [{ $set: { leftAt: '$lastSeenAt' } }]);
    if (endedStream) {
      // The Fockis Live module ends the broadcast (stops recording, clears viewers).
      this.events?.emit('organization-live.end', { liveStreamId: endedStream });
    }
  }

  /** The host ended the broadcast from the Fockis Live studio. */
  @OnEvent('live.stream.ended')
  async onStreamEnded(payload: { streamId?: string; orgLiveEventId?: string | null }) {
    if (!payload?.orgLiveEventId || !/^[a-f0-9]{24}$/i.test(String(payload.orgLiveEventId))) return;
    const doc = await this.liveEventModel.findById(payload.orgLiveEventId);
    if (!doc || doc.state !== LiveEventState.Live) return;
    doc.state = LiveEventState.Ended;
    doc.endedAt = new Date();
    const ls = doc.liveStreamId
      ? await this.connection.collection('live_streams').findOne({ _id: doc.liveStreamId }, { projection: { peakViewerCount: 1 } })
      : null;
    doc.peakViewers = Math.max(doc.peakViewers ?? 0, Number(ls?.peakViewerCount ?? 0));
    await doc.save();
    await this.viewModel.collection.updateMany({ liveEventId: doc._id, leftAt: null }, [{ $set: { leftAt: '$lastSeenAt' } }]);
  }

  async remove(organizationId: string, liveEventId: string, actorUserId: string): Promise<void> {
    await this.requireManager(organizationId, actorUserId);
    const doc = await this.findOrThrow(organizationId, liveEventId);
    if (doc.state === LiveEventState.Live) throw new ConflictException('End the livestream before deleting it.');
    const hasViews = await this.viewModel.exists({ liveEventId: doc._id });
    if (hasViews || doc.state === LiveEventState.Ended) {
      throw new ConflictException('This livestream has viewers and attendance. Archive it instead to keep the history.');
    }
    await Promise.all([doc.deleteOne(), this.invitationModel.deleteMany({ liveEventId: doc._id })]);
  }

  async setArchived(organizationId: string, liveEventId: string, actorUserId: string, archived: boolean) {
    const viewer = await this.requireManager(organizationId, actorUserId);
    const doc = await this.findOrThrow(organizationId, liveEventId);
    if (archived && doc.state === LiveEventState.Live) throw new ConflictException('End the livestream before archiving it.');
    doc.isArchived = archived;
    doc.archivedAt = archived ? new Date() : null;
    await doc.save();
    return this.serialize(doc, viewer);
  }

  /* ==========================================================================
   * Viewers: join, heartbeat, leave
   * ======================================================================== */

  async join(
    organizationId: string,
    liveEventId: string,
    requesterUserId: string | undefined,
    options: { visitorKey?: string; replay?: boolean } = {},
  ) {
    const doc = await this.findOrThrow(organizationId, liveEventId);
    const viewer = await this.viewer(organizationId, requesterUserId);
    const invited = await hasAcceptedInvitation(this.connection, doc._id, viewer.userId);
    const access = evaluateLiveAccess(doc, viewer, invited);
    if (!access.allowed) throw new ForbiddenException({ message: DENY_MESSAGE[access.reason], reason: access.reason });
    if (doc.isArchived || doc.state === LiveEventState.Draft) throw new NotFoundException('Livestream not found.');
    if (doc.state === LiveEventState.Cancelled) throw new ConflictException({ message: 'This livestream was cancelled.', reason: 'cancelled' });

    const now = Date.now();
    const early = (doc.settings?.earlyJoinMinutes ?? 15) * 60000;
    let result: Record<string, unknown>;

    if (options.replay) {
      if (doc.state !== LiveEventState.Ended || doc.settings?.allowReplay === false || !doc.liveStreamId) {
        throw new ConflictException({ message: 'There is no recording to watch.', reason: 'no_recording' });
      }
      await this.liveEventModel.updateOne({ _id: doc._id }, { $inc: { replayViews: 1 } });
      result = { kind: 'replay', liveStreamId: String(doc.liveStreamId) };
    } else if (doc.sourceType === LiveSourceType.Meeting) {
      const end = doc.scheduledEnd ? doc.scheduledEnd.getTime() : doc.scheduledStart.getTime() + 4 * 3600e3;
      const open = doc.state === LiveEventState.Live || (doc.state === LiveEventState.Scheduled && now >= doc.scheduledStart.getTime() - early && now <= end);
      if (!open) {
        throw new ConflictException({
          message: doc.state === LiveEventState.Ended ? 'This livestream has ended.' : 'The meeting opens shortly before the start time.',
          reason: doc.state === LiveEventState.Ended ? 'ended' : 'not_started',
          opensAt: new Date(doc.scheduledStart.getTime() - early),
        });
      }
      if (!doc.meetingUrl) throw new ConflictException({ message: 'The meeting link has not been added yet.', reason: 'not_started' });
      result = { kind: 'meeting', url: doc.meetingUrl, waitingRoom: Boolean(doc.meeting?.waitingRoom || doc.meeting?.requireApproval) };
    } else {
      if (doc.state !== LiveEventState.Live || !doc.liveStreamId) {
        throw new ConflictException({
          message: doc.state === LiveEventState.Ended ? 'This livestream has ended.' : 'Waiting for the host to start the livestream.',
          reason: doc.state === LiveEventState.Ended ? 'ended' : 'waiting_for_host',
          startsAt: doc.scheduledStart,
        });
      }
      if (!viewer.userId) {
        throw new ForbiddenException({ message: 'Sign in to Fockis to watch this livestream.', reason: 'sign_in' });
      }
      result = { kind: 'fockis_live', liveStreamId: String(doc.liveStreamId), watchUrl: `/live/view/${String(doc.liveStreamId)}` };
    }

    // Viewing session (attendance). Only created after the access check passed and the person pressed Join.
    let viewId: string | null = null;
    if (doc.settings?.attendanceEnabled !== false || options.replay) {
      const visitorKey = viewer.userId ? '' : cleanText(options.visitorKey, 64).replace(/[^A-Za-z0-9_-]/g, '');
      if (viewer.userId || visitorKey) {
        const at = new Date();
        const existing = await this.viewModel.findOne({
          liveEventId: doc._id,
          leftAt: null,
          isReplay: Boolean(options.replay),
          ...(viewer.userId ? { userId: new Types.ObjectId(viewer.userId) } : { visitorKey }),
          lastSeenAt: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) },
        });
        if (existing) {
          existing.lastSeenAt = at;
          await existing.save();
          viewId = String(existing._id);
        } else {
          const created = await this.viewModel.create({
            organizationId: doc.organizationId,
            liveEventId: doc._id,
            userId: viewer.userId ? new Types.ObjectId(viewer.userId) : null,
            visitorKey,
            isMember: viewer.isMember,
            isReplay: Boolean(options.replay),
            source: doc.sourceType,
            joinedAt: at,
            lastSeenAt: at,
          });
          viewId = String(created._id);
        }
      }
    }
    if (doc.state === LiveEventState.Live && doc.sourceType === LiveSourceType.Meeting) {
      const current = await this.currentViewers([doc]);
      const n = current.get(String(doc._id)) ?? 0;
      if (n > (doc.peakViewers ?? 0)) await this.liveEventModel.updateOne({ _id: doc._id }, { $max: { peakViewers: n } });
    }
    return { ...result, viewId, state: doc.state, playbackUrl: '' };
  }

  async heartbeat(organizationId: string, liveEventId: string, viewId: string, userId?: string, visitorKey?: string, leaving = false) {
    if (!/^[a-f0-9]{24}$/i.test(String(viewId ?? ''))) return { ok: false };
    const filter: Record<string, any> = {
      _id: new Types.ObjectId(viewId),
      organizationId: this.oid(organizationId, 'organization'),
      liveEventId: this.oid(liveEventId, 'livestream'),
      leftAt: null,
      ...(userId ? { userId: new Types.ObjectId(userId) } : { userId: null, visitorKey: cleanText(visitorKey, 64) }),
    };
    const now = new Date();
    const res = await this.viewModel.updateOne(filter, leaving ? { $set: { lastSeenAt: now, leftAt: now } } : { $set: { lastSeenAt: now } });
    return { ok: res.modifiedCount > 0 };
  }

  /* ==========================================================================
   * Invitations and access requests
   * ======================================================================== */

  async listInvitations(organizationId: string, liveEventId: string, userId: string) {
    await this.requireManager(organizationId, userId);
    const doc = await this.findOrThrow(organizationId, liveEventId);
    const now = new Date();
    await this.invitationModel.updateMany({ liveEventId: doc._id, status: 'pending', expiresAt: { $ne: null, $lte: now } }, { $set: { status: 'expired' } });
    const rows = await this.invitationModel.find({ liveEventId: doc._id }).sort({ createdAt: -1 }).limit(500).lean();
    const userIds = rows.map((r) => r.userId).filter(Boolean) as Types.ObjectId[];
    const users = userIds.length
      ? await this.connection.collection('users').find({ _id: { $in: userIds } }, { projection: { firstName: 1, lastName: 1, username: 1 } }).toArray()
      : [];
    const byUser = new Map(users.map((u) => [String(u._id), u]));
    return {
      bearerLinks: Boolean(doc.settings?.bearerLinks),
      items: rows.map((r) => {
        const u = r.userId ? byUser.get(String(r.userId)) : undefined;
        return {
          id: String(r._id),
          kind: r.kind,
          status: r.status,
          isLink: Boolean(r.isLink),
          userId: r.userId ? String(r.userId) : null,
          name: r.displayName || (u ? personName(u) : '') || r.email || (r.isLink ? 'Invitation link' : 'Fockis user'),
          username: u?.username ? String(u.username) : '',
          email: r.email || '',
          message: r.message || '',
          expiresAt: r.expiresAt ?? null,
          acceptedAt: r.acceptedAt ?? null,
          lastSentAt: r.lastSentAt ?? null,
          createdAt: r.createdAt ?? null,
        };
      }),
    };
  }

  private inviteLink(organizationId: string, liveEventId: string, token: string) {
    return `/organizations/${organizationId}/live/${liveEventId}?invite=${token}`;
  }

  async createInvitations(
    organizationId: string,
    liveEventId: string,
    actorUserId: string,
    body: { userIds?: string[]; emails?: string[]; link?: boolean; expiresAt?: string | null; message?: string },
  ) {
    await this.requireManager(organizationId, actorUserId);
    const doc = await this.findOrThrow(organizationId, liveEventId);
    if ([LiveEventState.Ended, LiveEventState.Cancelled].includes(doc.state)) throw new ConflictException('This livestream is over.');
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) throw new BadRequestException('Choose an expiry date in the future.');
    if (body.link && !doc.settings?.bearerLinks) {
      throw new BadRequestException('Turn on "Anyone with the link" in Manage Invitations first.');
    }
    if (body.link && (!expiresAt || expiresAt.getTime() - Date.now() > 7 * 86400e3)) {
      throw new BadRequestException('Shareable links must expire within 7 days.');
    }
    const userIds = [...new Set((body.userIds ?? []).map(String))].filter((u) => /^[a-f0-9]{24}$/i.test(u));
    const emails = [...new Set((body.emails ?? []).map((e) => cleanText(e, 254).toLowerCase()))].filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (!userIds.length && !emails.length && !body.link) throw new BadRequestException('Choose people to invite, enter email addresses or create a link.');
    if (userIds.length + emails.length > MAX_INVITES_PER_CALL) throw new BadRequestException(`At most ${MAX_INVITES_PER_CALL} invitations at a time.`);

    const existingUsers = userIds.length
      ? await this.connection.collection('users').find({ _id: { $in: userIds.map((u) => new Types.ObjectId(u)) } }, { projection: { _id: 1, email: 1, firstName: 1, lastName: 1, username: 1 } }).toArray()
      : [];
    if (existingUsers.length !== userIds.length) throw new BadRequestException('Some of the selected people could not be found.');
    // Email addresses that belong to Fockis accounts become account invitations.
    const emailUsers = emails.length ? await this.connection.collection('users').find({ email: { $in: emails } }, { projection: { _id: 1, email: 1, firstName: 1, lastName: 1, username: 1 } }).toArray() : [];
    const emailToUser = new Map(emailUsers.map((u) => [String(u.email).toLowerCase(), u]));

    const message = cleanText(body.message, 500);
    const created: { id: string; link?: string; email?: string; userId?: string }[] = [];
    const base = {
      organizationId: doc.organizationId,
      liveEventId: doc._id,
      kind: 'invite' as const,
      status: 'pending' as const,
      expiresAt,
      message,
      invitedBy: new Types.ObjectId(actorUserId),
      lastSentAt: new Date(),
      sendCount: 1,
    };

    const targets: { userId: Types.ObjectId | null; email: string; name: string }[] = [
      ...existingUsers.map((u) => ({ userId: u._id as Types.ObjectId, email: '', name: personName(u) })),
      ...emails.map((e) => {
        const u = emailToUser.get(e);
        return { userId: u ? (u._id as Types.ObjectId) : null, email: e, name: u ? personName(u) : '' };
      }),
    ];
    for (const t of targets) {
      // One open invitation per person.
      const open = await this.invitationModel.findOne({
        liveEventId: doc._id,
        kind: 'invite',
        status: { $in: ['pending', 'accepted'] },
        ...(t.userId ? { userId: t.userId } : { email: t.email }),
      });
      if (open) {
        created.push({ id: String(open._id), userId: t.userId ? String(t.userId) : undefined, email: t.email || undefined });
        continue;
      }
      const token = randomBytes(24).toString('base64url');
      const inv = await this.invitationModel.create({ ...base, userId: t.userId, email: t.email, displayName: t.name, tokenHash: hashToken(token) });
      created.push({ id: String(inv._id), link: this.inviteLink(organizationId, liveEventId, token), userId: t.userId ? String(t.userId) : undefined, email: t.email || undefined });
      if (t.userId) void this.notify([String(t.userId)], `You're invited: ${doc.title}`, 'Open the invitation to accept it.', doc, this.inviteLink(organizationId, liveEventId, token));
    }
    if (body.link) {
      const token = randomBytes(24).toString('base64url');
      const inv = await this.invitationModel.create({ ...base, isLink: true, displayName: 'Invitation link', tokenHash: hashToken(token) });
      created.push({ id: String(inv._id), link: this.inviteLink(organizationId, liveEventId, token) });
    }
    return {
      created,
      note: emails.some((e) => !emailToUser.has(e))
        ? 'Email addresses without a Fockis account: copy each link and send it yourself. The person must sign in with that email address to accept.'
        : undefined,
    };
  }

  /** New link for an open invitation (the old link stops working). */
  async resendInvitation(organizationId: string, invitationId: string, actorUserId: string) {
    await this.requireManager(organizationId, actorUserId);
    const inv = await this.invitationModel.findOne({ _id: this.oid(invitationId, 'invitation'), organizationId: this.oid(organizationId, 'organization'), kind: 'invite' });
    if (!inv) throw new NotFoundException('Invitation not found.');
    if (inv.status !== 'pending' && inv.status !== 'expired') throw new ConflictException('Only pending or expired invitations can be sent again.');
    const doc = await this.findOrThrow(organizationId, String(inv.liveEventId));
    const token = randomBytes(24).toString('base64url');
    inv.tokenHash = hashToken(token);
    inv.status = 'pending';
    if (inv.expiresAt && inv.expiresAt <= new Date()) inv.expiresAt = new Date(Date.now() + (inv.isLink ? 2 : 7) * 86400e3);
    inv.lastSentAt = new Date();
    inv.sendCount = (inv.sendCount ?? 0) + 1;
    await inv.save();
    const link = this.inviteLink(organizationId, String(inv.liveEventId), token);
    if (inv.userId) void this.notify([String(inv.userId)], `Reminder: you're invited to ${doc.title}`, 'Open the invitation to accept it.', doc, link);
    return { id: String(inv._id), link };
  }

  async revokeInvitation(organizationId: string, invitationId: string, actorUserId: string) {
    await this.requireManager(organizationId, actorUserId);
    const inv = await this.invitationModel.findOne({ _id: this.oid(invitationId, 'invitation'), organizationId: this.oid(organizationId, 'organization') });
    if (!inv) throw new NotFoundException('Invitation not found.');
    if (inv.status === 'revoked') return { id: String(inv._id), status: inv.status };
    const wasActive = inv.status === 'accepted' || inv.status === 'pending';
    inv.status = 'revoked';
    inv.tokenHash = null;
    inv.respondedAt = new Date();
    inv.respondedBy = new Types.ObjectId(actorUserId);
    await inv.save();
    if (wasActive && inv.userId) {
      const doc = await this.liveEventModel.findById(inv.liveEventId);
      if (doc) void this.notify([String(inv.userId)], `Invitation withdrawn: ${doc.title}`, 'Your invitation to this livestream was withdrawn.', doc);
    }
    return { id: String(inv._id), status: inv.status };
  }

  /** Approve or deny an access request. */
  async respondToRequest(organizationId: string, invitationId: string, actorUserId: string, approve: boolean) {
    await this.requireManager(organizationId, actorUserId);
    const inv = await this.invitationModel.findOne({ _id: this.oid(invitationId, 'request'), organizationId: this.oid(organizationId, 'organization'), kind: 'request' });
    if (!inv) throw new NotFoundException('Request not found.');
    if (inv.status !== 'pending') throw new ConflictException('This request was already answered.');
    inv.status = approve ? 'accepted' : 'declined';
    inv.acceptedAt = approve ? new Date() : null;
    inv.respondedAt = new Date();
    inv.respondedBy = new Types.ObjectId(actorUserId);
    await inv.save();
    const doc = await this.liveEventModel.findById(inv.liveEventId);
    if (doc && inv.userId) {
      void this.notify(
        [String(inv.userId)],
        approve ? `Request approved: ${doc.title}` : `Request declined: ${doc.title}`,
        approve ? 'You can now watch this livestream.' : 'The organizer declined your request to watch this livestream.',
        doc,
      );
    }
    return { id: String(inv._id), status: inv.status };
  }

  async requestAccess(organizationId: string, liveEventId: string, userId: string, message?: string) {
    if (!userId) throw new ForbiddenException('Please sign in.');
    const doc = await this.findOrThrow(organizationId, liveEventId);
    if (!doc.settings?.allowAccessRequests || doc.visibility === LiveEventVisibility.Public) throw new ForbiddenException('This livestream does not take access requests.');
    if ([LiveEventState.Ended, LiveEventState.Cancelled, LiveEventState.Draft].includes(doc.state) || doc.isArchived) throw new ConflictException('This livestream is not open for requests.');
    const viewer = await this.viewer(organizationId, userId);
    if (evaluateLiveAccess(doc, viewer, await hasAcceptedInvitation(this.connection, doc._id, userId)).allowed) return { status: 'accepted' };
    const existing = await this.invitationModel.findOne({ liveEventId: doc._id, userId: new Types.ObjectId(userId), kind: 'request', status: { $in: ['pending', 'declined'] } });
    if (existing?.status === 'pending') return { status: 'pending' };
    if (existing?.status === 'declined' && existing.respondedAt && Date.now() - existing.respondedAt.getTime() < 24 * 3600e3) {
      throw new ConflictException('Your request was declined. You can ask again tomorrow.');
    }
    await this.invitationModel.create({
      organizationId: doc.organizationId,
      liveEventId: doc._id,
      kind: 'request',
      status: 'pending',
      userId: new Types.ObjectId(userId),
      message: cleanText(message, 500),
    });
    const managers = await this.managerIds(doc.organizationId);
    void this.notify(managers, `Access request: ${doc.title}`, 'Someone asked to watch this livestream.', doc, `/organizations/${organizationId}/admin/live?invitations=${String(doc._id)}`);
    return { status: 'pending' };
  }

  /** Accept an invitation link. Binds it to the signed-in account. */
  async acceptInvitation(organizationId: string, liveEventId: string, userId: string, token: string) {
    if (!userId) throw new ForbiddenException({ message: 'Sign in to accept this invitation.', reason: 'sign_in' });
    const clean = String(token ?? '').trim();
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(clean)) throw new BadRequestException('This invitation link is not valid.');
    const doc = await this.findOrThrow(organizationId, liveEventId);
    const inv = await this.invitationModel.findOne({ liveEventId: doc._id, tokenHash: hashToken(clean), kind: 'invite' });
    if (!inv) throw new ForbiddenException({ message: 'This invitation link is not valid.', reason: 'invalid' });
    if (inv.status === 'revoked') throw new ForbiddenException({ message: 'This invitation was withdrawn.', reason: 'revoked' });
    if (inv.status === 'declined') throw new ForbiddenException({ message: 'This invitation was declined.', reason: 'declined' });
    if (inv.expiresAt && inv.expiresAt <= new Date()) {
      if (inv.status === 'pending') await this.invitationModel.updateOne({ _id: inv._id }, { $set: { status: 'expired' } });
      throw new ForbiddenException({ message: 'This invitation has expired.', reason: 'expired' });
    }
    const me = new Types.ObjectId(userId);

    if (inv.isLink) {
      if (!doc.settings?.bearerLinks) throw new ForbiddenException({ message: 'Invitation links are turned off for this livestream.', reason: 'revoked' });
      // A shareable link grants each person who opens it their own invitation (revoking the link stops new ones).
      const mine = await this.invitationModel.findOne({ liveEventId: doc._id, userId: me, kind: 'invite', status: 'accepted' });
      if (!mine) {
        await this.invitationModel.create({
          organizationId: doc.organizationId,
          liveEventId: doc._id,
          kind: 'invite',
          status: 'accepted',
          userId: me,
          acceptedAt: new Date(),
          expiresAt: inv.expiresAt ?? null,
          invitedBy: inv.invitedBy ?? null,
          displayName: '',
          message: 'Joined with an invitation link',
        });
      }
      return { status: 'accepted' };
    }

    if (inv.userId && String(inv.userId) !== userId) {
      throw new ForbiddenException({ message: 'This invitation is for another Fockis account.', reason: 'other_account' });
    }
    if (!inv.userId && inv.email) {
      const user = await this.connection.collection('users').findOne({ _id: me }, { projection: { email: 1 } });
      if (String(user?.email ?? '').toLowerCase() !== inv.email) {
        throw new ForbiddenException({ message: `This invitation was sent to ${inv.email}. Sign in with that email address to accept it.`, reason: 'other_account' });
      }
      inv.userId = me;
    }
    if (inv.status !== 'accepted') {
      inv.status = 'accepted';
      inv.acceptedAt = new Date();
    }
    // Requiring host approval: the invitation is accepted, but the host still admits in the meeting / approves.
    await inv.save();
    return { status: 'accepted' };
  }

  /** Accept an invitation addressed to this account (from My Invitations; no link needed). */
  async acceptMine(organizationId: string, invitationId: string, userId: string) {
    if (!userId) throw new ForbiddenException('Please sign in.');
    const inv = await this.invitationModel.findOne({
      _id: this.oid(invitationId, 'invitation'),
      organizationId: this.oid(organizationId, 'organization'),
      userId: new Types.ObjectId(userId),
      kind: 'invite',
    });
    if (!inv) throw new NotFoundException('Invitation not found.');
    if (inv.status === 'accepted') return { status: inv.status };
    if (inv.status !== 'pending') throw new ForbiddenException(`This invitation is ${inv.status}.`);
    if (inv.expiresAt && inv.expiresAt <= new Date()) {
      inv.status = 'expired';
      await inv.save();
      throw new ForbiddenException('This invitation has expired.');
    }
    inv.status = 'accepted';
    inv.acceptedAt = new Date();
    await inv.save();
    return { status: inv.status };
  }

  async declineInvitation(organizationId: string, invitationId: string, userId: string) {
    const inv = await this.invitationModel.findOne({
      _id: this.oid(invitationId, 'invitation'),
      organizationId: this.oid(organizationId, 'organization'),
      userId: new Types.ObjectId(userId),
      kind: 'invite',
    });
    if (!inv) throw new NotFoundException('Invitation not found.');
    if (inv.status === 'pending' || inv.status === 'accepted') {
      inv.status = 'declined';
      inv.respondedAt = new Date();
      await inv.save();
    }
    return { status: inv.status };
  }

  /* ==========================================================================
   * Notifications (existing NotificationsService)
   * ======================================================================== */

  private async managerIds(organizationId: Types.ObjectId): Promise<string[]> {
    const [org, admins] = await Promise.all([
      this.connection.collection('church_organizations').findOne({ _id: organizationId }, { projection: { createdByUserId: 1 } }),
      this.connection
        .collection('church_members')
        .find(
          { organizationId, status: 'active', $or: [{ role: { $in: ['administrator', 'pastor_director'] } }, { permissions: 'manage_live' }] },
          { projection: { userId: 1 } },
        )
        .limit(50)
        .toArray(),
    ]);
    const ids = new Set(admins.map((a) => String(a.userId)));
    if (org?.createdByUserId) ids.add(String(org.createdByUserId));
    return [...ids];
  }

  /** Everyone who may watch (never everyone on Fockis: public streams notify members). */
  private async eligibleRecipients(doc: LiveEventDocument): Promise<string[]> {
    const ids = new Set<string>();
    if (doc.visibility === LiveEventVisibility.Private) {
      const invs = await this.invitationModel.find({ liveEventId: doc._id, kind: { $in: ['invite', 'request'] }, status: { $in: ['accepted', 'pending'] }, userId: { $ne: null } }).select('userId status kind').lean();
      invs.filter((i) => i.kind === 'invite' || i.status === 'accepted').forEach((i) => ids.add(String(i.userId)));
    } else {
      const filter: Record<string, unknown> = { organizationId: doc.organizationId, status: 'active' };
      if (doc.visibility === LiveEventVisibility.Groups) {
        filter.$or = [{ groupIds: { $in: doc.allowedGroupIds ?? [] } }, { departmentIds: { $in: doc.allowedDepartmentIds ?? [] } }];
      }
      const members = await this.connection.collection('church_members').find(filter, { projection: { userId: 1 } }).limit(5000).toArray();
      members.forEach((m) => m.userId && ids.add(String(m.userId)));
      const invs = await this.invitationModel.find({ liveEventId: doc._id, status: 'accepted', userId: { $ne: null } }).select('userId').lean();
      invs.forEach((i) => ids.add(String(i.userId)));
    }
    return [...ids];
  }

  private async notifyEligible(doc: LiveEventDocument, what: 'scheduled' | 'started' | 'cancelled' | 'starting_soon') {
    // "started" and "cancelled" go to eligible people; "scheduled" only when the organizer asked.
    if (what === 'scheduled' && !doc.settings?.notifyMembers) return;
    if (what === 'started' && !doc.settings?.notifyMembers && doc.visibility !== LiveEventVisibility.Private) return;
    const recipients = await this.eligibleRecipients(doc);
    const when = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(doc.timeZone ? { timeZone: doc.timeZone } : {}),
    }).format(doc.scheduledStart);
    const text = {
      scheduled: [`Livestream scheduled: ${doc.title}`, when],
      starting_soon: [`Starting soon: ${doc.title}`, when],
      started: [`Live now: ${doc.title}`, 'Join the livestream.'],
      cancelled: [`Cancelled: ${doc.title}`, `The livestream on ${when} was cancelled.`],
    }[what];
    await this.notify(recipients, text[0], text[1], doc);
  }

  private async notify(recipients: string[], title: string, message: string, doc: LiveEventDocument, link?: string) {
    if (!this.notifications || !recipients.length) return;
    const target = link ?? `/organizations/${String(doc.organizationId)}/live/${String(doc._id)}`;
    for (const recipientId of recipients) {
      if (!/^[a-f0-9]{24}$/i.test(recipientId)) continue;
      try {
        await this.notifications.create({
          recipientId,
          type: 'SYSTEM',
          title: title.slice(0, 200),
          message: message.slice(0, 500),
          entityId: String(doc._id),
          entityType: 'organization_livestream',
          link: target,
        });
      } catch (e) {
        this.logger.warn(`Notification failed: ${String(e)}`);
      }
    }
  }

  /** "Starting soon" notices (called every few minutes by the scheduler below). */
  async sendStartingSoon() {
    const now = Date.now();
    const due = await this.liveEventModel
      .find({
        state: LiveEventState.Scheduled,
        isArchived: { $ne: true },
        'settings.notifyMembers': true,
        startingSoonNotifiedAt: null,
        scheduledStart: { $gt: new Date(now), $lte: new Date(now + 15 * 60000) },
      })
      .limit(50)
      .exec();
    for (const doc of due) {
      const claimed = await this.liveEventModel.updateOne({ _id: doc._id, startingSoonNotifiedAt: null }, { $set: { startingSoonNotifiedAt: new Date() } });
      if (claimed.modifiedCount) await this.notifyEligible(doc, 'starting_soon').catch(() => undefined);
    }
  }

  private timer?: NodeJS.Timeout;
  onModuleInit() {
    this.timer = setInterval(() => void this.sendStartingSoon().catch(() => undefined), 5 * 60000);
    this.timer.unref?.();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /* ==========================================================================
   * Organization deletion
   * ======================================================================== */

  async deleteAllForOrganization(organizationId: string): Promise<void> {
    const org = this.oid(organizationId, 'organization');
    await Promise.all([
      this.liveEventModel.deleteMany({ organizationId: org }),
      this.invitationModel.deleteMany({ organizationId: org }),
      this.viewModel.deleteMany({ organizationId: org }),
    ]);
  }
}

export type { LiveDenyReason };
