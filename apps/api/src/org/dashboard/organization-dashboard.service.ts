/**
 * organization-dashboard.service.ts
 * -----------------------------------------------------------------------------
 * Read-only figures for the organization admin dashboard and a CSV export of
 * member records, plus logo uploads for the organization profile.
 *
 *   GET  /church/organizations/:organizationId/dashboard?days=30  (or ?from=&to= ISO)
 *   GET  /church/organizations/:organizationId/members-export
 *   POST /church/organizations/:organizationId/logo
 *
 * Every figure comes from the database (memberships, departments, groups,
 * events, attendance). Nothing is invented: a section the admin is not allowed
 * to see is returned as null, and the web app hides it.
 *
 * Authorization (always checked here, never only in the browser):
 *   - dashboard: MembersService.requireAdminDashboardAccess (owner or active
 *     administrator), then each section needs its own view permission.
 *   - export: ViewMembers; e-mail and phone only with ViewPrivateMemberInfo.
 *   - logo: UpdateOrganization (the owner always passes).
 *
 * Data isolation: every query is filtered by the organization's ObjectId.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';

import { Membership } from '../members/schemas/membership.schema';
import { Department } from '../departments/schemas/department.schema';
import { ChurchGroup } from '../groups/schemas/church-group.schema';
import { ChurchEvent, RsvpStatus } from '../events/schemas/church-event.schema';
import { Announcement } from '../communication/schemas/announcement.schema';
import { ChurchGift } from '../giving/church-giving.schemas';
import { MinistryAuditLog } from '../ministries/ministry.schemas';
import {
  MinistryAttendanceRecord,
  MinistryAttendanceSession,
  MinistryAttendanceStatus,
} from '../ministry-attendance/ministry-attendance.schemas';
import { AttendanceEntry } from '../attendance/schemas/attendance.schema';
import { Branch } from '../branches/schemas/branch.schema';
import { Organization } from '../organizations/schemas/organization.schema';
import { MembersService } from '../members/services/members.service';
import { ChurchPermission } from '../enums/permission.enum';
import { MembershipStatus } from '../enums/membership-status.enum';

const ALLOWED_RANGES = [7, 30, 90, 365] as const;
const MAX_RANGE_MS = 3 * 366 * 86_400_000;
const ACTIVITY_PER_SOURCE = 12;
const ACTIVITY_LIMIT = 25;
const GIVING_ROLES = new Set(['administrator', 'pastor_director']);

export interface ActivityItem {
  id: string;
  type: 'member' | 'event' | 'ministry' | 'announcement' | 'donation' | 'attendance';
  actorName: string;
  avatarUrl: string | null;
  /** Machine action key (e.g. "joined", "event.created"); the web app writes the sentence. */
  action: string;
  detail: string | null;
  status: string | null;
  at: string;
  memberId: string | null;
  targetId: string | null;
}
const EXPORT_LIMIT = 5000;

const LOGO_DIRECTORY = resolve(process.cwd(), 'uploads', 'organization-logos');
const LOGO_PUBLIC_PREFIX = '/uploads/organization-logos';
const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface UploadedLogoFile {
  buffer: Buffer;
  mimetype?: string;
  size?: number;
  originalname?: string;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Neutralize spreadsheet formulas and quote everything.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

@Injectable()
export class OrganizationDashboardService {
  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<any>,
    @InjectModel(Department.name) private readonly departmentModel: Model<any>,
    @InjectModel(ChurchGroup.name) private readonly groupModel: Model<any>,
    @InjectModel(ChurchEvent.name) private readonly eventModel: Model<any>,
    @InjectModel(AttendanceEntry.name) private readonly attendanceModel: Model<any>,
    @InjectModel(Branch.name) private readonly branchModel: Model<any>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<any>,
    @InjectModel(Announcement.name) private readonly announcementModel: Model<any>,
    @InjectModel(ChurchGift.name) private readonly giftModel: Model<any>,
    @InjectModel(MinistryAuditLog.name) private readonly ministryAuditModel: Model<any>,
    @InjectModel(MinistryAttendanceRecord.name) private readonly ministryRecordModel: Model<any>,
    @InjectModel(MinistryAttendanceSession.name) private readonly ministrySessionModel: Model<any>,
    private readonly members: MembersService,
  ) {}

  private oid(id: string, what: string): Types.ObjectId {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${what}.`);
    }
    return new Types.ObjectId(id);
  }

  /** Active members who had joined by `at` (joinedAt, else createdAt). */
  private activeAt(orgId: Types.ObjectId, at: Date) {
    return this.membershipModel.countDocuments({
      organizationId: orgId,
      status: MembershipStatus.Active,
      $or: [
        { joinedAt: { $lte: at } },
        { joinedAt: null, createdAt: { $lte: at } },
      ],
    });
  }

  /* ==========================================================================
     DASHBOARD
  ========================================================================== */

  /**
   * Resolve the reporting window. The web app sends `from`/`to` (ISO, computed
   * in the viewer's time zone for Today / This year / Custom range); the older
   * `days` (7, 30, 90, 365) still works.
   */
  private window(rawDays?: string, rawFrom?: string, rawTo?: string): { since: Date; until: Date; days: number; custom: boolean } {
    const now = new Date();
    if (rawFrom || rawTo) {
      const since = new Date(String(rawFrom ?? ''));
      const until = rawTo ? new Date(String(rawTo)) : now;
      if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
        throw new BadRequestException('Invalid date range.');
      }
      if (since >= until) throw new BadRequestException('The start date must be before the end date.');
      if (until.getTime() - since.getTime() > MAX_RANGE_MS) throw new BadRequestException('Choose a range of 3 years or less.');
      const capped = until > now ? now : until;
      if (since >= capped) throw new BadRequestException('Choose a range that has already started.');
      return { since, until: capped, days: Math.max(1, Math.round((capped.getTime() - since.getTime()) / 86_400_000)), custom: true };
    }
    const requested = Number(rawDays);
    const days = (ALLOWED_RANGES as readonly number[]).includes(requested) ? requested : 30;
    return { since: new Date(now.getTime() - days * 86_400_000), until: now, days, custom: false };
  }

  async getDashboard(organizationId: string, userId: string, rawDays?: string, rawFrom?: string, rawTo?: string) {
    const orgId = this.oid(organizationId, 'organization ID');
    const access = await this.members.requireAdminDashboardAccess(organizationId, userId);

    const granted = new Set<string>(access.permissions ?? []);
    const can = (p: ChurchPermission) => access.isOwner || granted.has(p);

    const { since, until, days, custom } = this.window(rawDays, rawFrom, rawTo);
    const now = new Date();
    const span = until.getTime() - since.getTime();
    const previousSince = new Date(since.getTime() - span);
    const inRange = { $gte: since, $lte: until };

    const canMembers = can(ChurchPermission.ViewMembers);
    const canAttendance = can(ChurchPermission.ViewAttendance) || can(ChurchPermission.ManageAttendance);
    const canEvents = can(ChurchPermission.ViewEvents) || can(ChurchPermission.ManageEvents);
    const canDepartments = can(ChurchPermission.ViewDepartments) || can(ChurchPermission.ManageDepartments);
    const canGroups = can(ChurchPermission.ViewGroups) || can(ChurchPermission.ManageGroups);
    const canCommunication = can(ChurchPermission.ViewCommunication) || can(ChurchPermission.ManageCommunication);
    // Same rule as Giving: the owner, administrators / pastors, or the Settings permission.
    const canGiving =
      access.isOwner || GIVING_ROLES.has(String(access.role)) || can(ChurchPermission.ManageSettings);

    const notArchived = { organizationId: orgId, isArchived: { $ne: true } };
    const joinedIn = (range: Record<string, Date>) => ({
      $or: [{ joinedAt: range }, { joinedAt: null, createdAt: range }],
    });

    const [
      totalMembers,
      pendingApplications,
      inactiveMembers,
      newMembers,
      previousNewMembers,
      departments,
      newDepartments,
      groups,
      newGroups,
      branches,
      upcomingEventCount,
    ] = await Promise.all([
      canMembers ? this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Active }) : null,
      canMembers ? this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Pending }) : null,
      canMembers ? this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Inactive }) : null,
      canMembers
        ? this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Active, ...joinedIn(inRange) })
        : null,
      canMembers
        ? this.membershipModel.countDocuments({
            organizationId: orgId,
            status: MembershipStatus.Active,
            ...joinedIn({ $gte: previousSince, $lt: since }),
          })
        : null,
      canDepartments ? this.departmentModel.countDocuments(notArchived) : null,
      canDepartments ? this.departmentModel.countDocuments({ ...notArchived, createdAt: inRange }) : null,
      canGroups ? this.groupModel.countDocuments(notArchived) : null,
      canGroups ? this.groupModel.countDocuments({ ...notArchived, createdAt: inRange }) : null,
      this.branchModel.countDocuments({ organizationId: orgId }),
      canEvents ? this.eventModel.countDocuments({ organizationId: orgId, startsAt: { $gte: now } }) : null,
    ]);

    /* ---------------------------------------------------------- growth */

    let growth: { points: { date: string; total: number }[]; changePercent: number | null; added: number } | null = null;

    if (canMembers) {
      const count = days <= 1 ? 7 : days <= 7 ? 8 : days <= 31 ? 9 : 12;
      const step = span / (count - 1);
      const stamps = Array.from({ length: count }, (_, i) => new Date(since.getTime() + step * i));
      const totals = await Promise.all(stamps.map((at) => this.activeAt(orgId, at)));
      const start = totals[0] ?? 0;
      const end = totals[totals.length - 1] ?? 0;
      growth = {
        points: stamps.map((at, i) => ({ date: at.toISOString(), total: totals[i] })),
        changePercent: start > 0 ? Math.round(((end - start) / start) * 1000) / 10 : null,
        added: end - start,
      };
    }

    /* ------------------------------------------------------ attendance */
    // Two record kinds exist: organization check-ins / absence reports
    // (church_attendance) and ministry attendance (ministry_attendance_records).

    let attendance: {
      checkIns: number;
      previousCheckIns: number;
      absences: number;
      membersPresent: number;
      participationRate: number | null;
      byWeek: { weekStart: string; checkIns: number }[];
    } | null = null;

    if (canAttendance) {
      const presentStatuses = [MinistryAttendanceStatus.Present, MinistryAttendanceStatus.Late];
      const [checkIns, previousCheckIns, absences, distinct, weekly, mCheckIns, mPrevious, mExcused, mDistinct, mWeekly] =
        await Promise.all([
          this.attendanceModel.countDocuments({ organizationId: orgId, kind: 'check_in', occurredAt: inRange }),
          this.attendanceModel.countDocuments({ organizationId: orgId, kind: 'check_in', occurredAt: { $gte: previousSince, $lt: since } }),
          this.attendanceModel.countDocuments({ organizationId: orgId, kind: 'absence_report', occurredAt: inRange }),
          this.attendanceModel.distinct('memberId', { organizationId: orgId, kind: 'check_in', occurredAt: inRange }),
          this.attendanceModel
            .aggregate<{ _id: Date; checkIns: number }>([
              { $match: { organizationId: orgId, kind: 'check_in', occurredAt: inRange } },
              { $group: { _id: { $dateTrunc: { date: '$occurredAt', unit: 'week' } }, checkIns: { $sum: 1 } } },
            ])
            .exec(),
          this.ministryRecordModel.countDocuments({ organizationId: orgId, status: { $in: presentStatuses }, scheduledStartAt: inRange }),
          this.ministryRecordModel.countDocuments({
            organizationId: orgId,
            status: { $in: presentStatuses },
            scheduledStartAt: { $gte: previousSince, $lt: since },
          }),
          this.ministryRecordModel.countDocuments({ organizationId: orgId, status: MinistryAttendanceStatus.Excused, scheduledStartAt: inRange }),
          this.ministryRecordModel.distinct('membershipId', { organizationId: orgId, status: { $in: presentStatuses }, scheduledStartAt: inRange }),
          this.ministryRecordModel
            .aggregate<{ _id: Date; checkIns: number }>([
              { $match: { organizationId: orgId, status: { $in: presentStatuses }, scheduledStartAt: inRange } },
              { $group: { _id: { $dateTrunc: { date: '$scheduledStartAt', unit: 'week' } }, checkIns: { $sum: 1 } } },
            ])
            .exec(),
        ]);

      const activeCount = typeof totalMembers === 'number'
        ? totalMembers
        : await this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Active });
      const present = new Set([...distinct, ...mDistinct].map((id) => String(id)));
      const weeks = new Map<string, number>();
      for (const w of [...weekly, ...mWeekly]) {
        const key = new Date(w._id).toISOString();
        weeks.set(key, (weeks.get(key) ?? 0) + w.checkIns);
      }

      attendance = {
        checkIns: checkIns + mCheckIns,
        previousCheckIns: previousCheckIns + mPrevious,
        absences: absences + mExcused,
        membersPresent: present.size,
        participationRate: activeCount > 0 ? Math.min(100, Math.round((present.size / activeCount) * 1000) / 10) : null,
        byWeek: [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, n]) => ({ weekStart, checkIns: n })),
      };
    }

    /* ------------------------------------------------- recent activity */

    const recentActivity = await this.activity(orgId, {
      members: canMembers,
      events: canEvents,
      ministries: canDepartments,
      announcements: canCommunication,
      donations: canGiving,
      attendance: canAttendance,
    });

    /* -------------------------------------------------- upcoming events */

    const upcomingEvents = canEvents
      ? (
          await this.eventModel
            .find({ organizationId: orgId, startsAt: { $gte: now } })
            .sort({ startsAt: 1 })
            .limit(5)
            .select('title startsAt endsAt location eventType coverImageUrl isOnline capacity requiresRsvp rsvps.status')
            .lean<any[]>()
            .exec()
        ).map((e) => ({
          id: String(e._id),
          title: e.title ?? '',
          startsAt: e.startsAt ? new Date(e.startsAt).toISOString() : null,
          endsAt: e.endsAt ? new Date(e.endsAt).toISOString() : null,
          location: e.location ?? null,
          eventType: e.eventType ?? null,
          coverImageUrl: e.coverImageUrl ?? null,
          isOnline: Boolean(e.isOnline),
          capacity: typeof e.capacity === 'number' ? e.capacity : null,
          requiresRsvp: Boolean(e.requiresRsvp),
          going: (e.rsvps ?? []).filter((r: { status?: string }) => r?.status === RsvpStatus.Going).length,
        }))
      : null;

    return {
      organizationId,
      rangeDays: days,
      range: { from: since.toISOString(), to: until.toISOString(), custom },
      generatedAt: now.toISOString(),
      viewer: {
        isOwner: access.isOwner,
        role: access.role,
        permissions: access.isOwner ? Object.values(ChurchPermission) : [...granted],
      },
      counts: {
        totalMembers,
        newMembers,
        previousNewMembers,
        pendingApplications,
        inactiveMembers,
        departments,
        newDepartments,
        groups,
        newGroups,
        branches,
        upcomingEvents: upcomingEventCount,
      },
      growth,
      attendance,
      recentActivity,
      upcomingEvents,
    };
  }

  /* ==========================================================================
     RECENT ACTIVITY (one feed from each source the viewer may see)
  ========================================================================== */

  private async activity(
    orgId: Types.ObjectId,
    allow: { members: boolean; events: boolean; ministries: boolean; announcements: boolean; donations: boolean; attendance: boolean },
  ): Promise<ActivityItem[] | null> {
    if (!Object.values(allow).some(Boolean)) return null;
    const N = ACTIVITY_PER_SOURCE;
    const items: ActivityItem[] = [];
    const iso = (d: unknown) => new Date((d as Date) ?? Date.now()).toISOString();

    const [history, events, ministryLogs, announcements, gifts, sessions] = await Promise.all([
      allow.members
        ? this.membershipModel
            .aggregate<any>([
              { $match: { organizationId: orgId } },
              { $project: { profile: 1, history: 1 } },
              { $unwind: '$history' },
              { $sort: { 'history.at': -1 } },
              { $limit: N },
            ])
            .exec()
        : [],
      allow.events
        ? this.eventModel.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(N).select('title startsAt createdAt coverImageUrl').lean<any[]>().exec()
        : [],
      allow.ministries
        ? this.ministryAuditModel.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(N).lean<any[]>().exec()
        : [],
      allow.announcements
        ? this.announcementModel.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(N).select('title authorId createdAt publishedAt').lean<any[]>().exec()
        : [],
      allow.donations
        ? this.giftModel
            .find({ organizationId: orgId, status: 'paid' })
            .sort({ paidAt: -1 })
            .limit(N)
            .select('giverName anonymous amount currency fundLabel paidAt membershipId')
            .lean<any[]>()
            .exec()
        : [],
      allow.attendance
        ? this.ministryRecordModel
            .aggregate<{ _id: Types.ObjectId; at: Date; count: number }>([
              { $match: { organizationId: orgId, status: { $in: [MinistryAttendanceStatus.Present, MinistryAttendanceStatus.Late] } } },
              { $group: { _id: '$sessionId', at: { $max: '$recordedAt' }, count: { $sum: 1 } } },
              { $sort: { at: -1 } },
              { $limit: N },
            ])
            .exec()
        : [],
    ]);

    // Names and avatars of people referenced by id.
    const memberIds = [
      ...announcements.map((a) => a.authorId),
      ...gifts.filter((g) => !g.anonymous && g.membershipId).map((g) => g.membershipId),
    ].filter(Boolean);
    const people = memberIds.length
      ? await this.membershipModel.find({ _id: { $in: memberIds }, organizationId: orgId }).select('profile').lean<any[]>().exec()
      : [];
    const person = new Map(people.map((m) => [String(m._id), { name: m.profile?.displayName ?? 'Member', avatar: m.profile?.avatarUrl ?? null }]));

    for (const r of history) {
      items.push({
        id: `m-${r._id}-${new Date(r.history?.at ?? 0).getTime()}`,
        type: 'member',
        actorName: r.profile?.displayName ?? 'Member',
        avatarUrl: r.profile?.avatarUrl ?? null,
        action: r.history?.note ?? r.history?.status ?? 'updated',
        detail: r.history?.role ?? null,
        status: r.history?.status ?? null,
        at: iso(r.history?.at),
        memberId: String(r._id),
        targetId: String(r._id),
      });
    }
    for (const e of events) {
      if (!e.createdAt) continue;
      items.push({
        id: `e-${e._id}`,
        type: 'event',
        actorName: e.title ?? 'Event',
        avatarUrl: e.coverImageUrl ?? null,
        action: 'event.created',
        detail: e.startsAt ? new Date(e.startsAt).toISOString() : null,
        status: null,
        at: iso(e.createdAt),
        memberId: null,
        targetId: String(e._id),
      });
    }
    for (const l of ministryLogs) {
      items.push({
        id: `a-${l._id}`,
        type: 'ministry',
        actorName: l.actorName || 'Ministry team',
        avatarUrl: null,
        action: l.action ?? 'updated',
        detail: l.detail || null,
        status: null,
        at: iso(l.createdAt),
        memberId: null,
        targetId: l.ministryId ? String(l.ministryId) : null,
      });
    }
    for (const a of announcements) {
      const who = person.get(String(a.authorId));
      items.push({
        id: `n-${a._id}`,
        type: 'announcement',
        actorName: who?.name ?? 'Administrator',
        avatarUrl: who?.avatar ?? null,
        action: 'announcement.published',
        detail: a.title ?? null,
        status: null,
        at: iso(a.publishedAt ?? a.createdAt),
        memberId: a.authorId ? String(a.authorId) : null,
        targetId: String(a._id),
      });
    }
    for (const g of gifts) {
      const who = !g.anonymous && g.membershipId ? person.get(String(g.membershipId)) : null;
      items.push({
        id: `g-${g._id}`,
        type: 'donation',
        actorName: g.anonymous ? 'Anonymous giver' : (who?.name ?? g.giverName ?? 'Giver'),
        avatarUrl: who?.avatar ?? null,
        action: 'donation.received',
        detail: `${g.amount} ${g.currency}${g.fundLabel ? ` · ${g.fundLabel}` : ''}`,
        status: null,
        at: iso(g.paidAt),
        memberId: !g.anonymous && g.membershipId ? String(g.membershipId) : null,
        targetId: String(g._id),
      });
    }
    if (sessions.length) {
      const docs = await this.ministrySessionModel
        .find({ _id: { $in: sessions.map((s) => s._id) }, organizationId: orgId })
        .select('title ministryId')
        .lean<any[]>()
        .exec();
      const title = new Map(docs.map((d) => [String(d._id), d]));
      for (const s of sessions) {
        const doc = title.get(String(s._id));
        items.push({
          id: `s-${s._id}`,
          type: 'attendance',
          actorName: doc?.title || 'Attendance',
          avatarUrl: null,
          action: 'attendance.recorded',
          detail: String(s.count),
          status: null,
          at: iso(s.at),
          memberId: null,
          targetId: doc?.ministryId ? String(doc.ministryId) : null,
        });
      }
    }

    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, ACTIVITY_LIMIT);
  }

  /* ==========================================================================
     MEMBER EXPORT (CSV)
  ========================================================================== */

  async exportMembersCsv(
    organizationId: string,
    userId: string,
    filters: { status?: string; role?: string; departmentId?: string; search?: string },
  ): Promise<{ filename: string; csv: string }> {
    const orgId = this.oid(organizationId, 'organization ID');
    await this.members.requirePermission(organizationId, userId, ChurchPermission.ViewMembers);
    const withPrivate = await this.members.hasPermission(
      organizationId,
      userId,
      ChurchPermission.ViewPrivateMemberInfo,
    );

    const filter: Record<string, unknown> = { organizationId: orgId };
    if (filters.status && (Object.values(MembershipStatus) as string[]).includes(filters.status)) {
      filter.status = filters.status;
    }
    if (filters.role) filter.role = String(filters.role).slice(0, 60);
    if (filters.departmentId && Types.ObjectId.isValid(filters.departmentId)) {
      filter.departmentIds = new Types.ObjectId(filters.departmentId);
    }
    if (filters.search?.trim()) {
      const escaped = filters.search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter['profile.displayName'] = { $regex: escaped, $options: 'i' };
    }

    const [organization, rows, departments] = await Promise.all([
      this.organizationModel.findById(orgId).select('name slug').lean<any>().exec(),
      this.membershipModel
        .find(filter)
        .sort({ 'profile.displayName': 1 })
        .limit(EXPORT_LIMIT)
        .select('profile privateProfile role status joinedAt createdAt departmentIds domain')
        .lean<any[]>()
        .exec(),
      this.departmentModel.find({ organizationId: orgId }).select('name').lean<any[]>().exec(),
    ]);
    if (!organization) throw new NotFoundException('Organization not found.');

    const departmentName = new Map(departments.map((d) => [String(d._id), d.name ?? '']));

    const header = ['Name', 'Role', 'Status', 'Joined', 'Departments', 'Fockis address'];
    if (withPrivate) header.push('Email', 'Phone');

    const lines = [header.map(csvCell).join(',')];
    for (const m of rows) {
      const joined = m.joinedAt ?? (m.status === MembershipStatus.Pending ? null : m.createdAt);
      const cells: unknown[] = [
        m.profile?.displayName ?? '',
        m.role ?? '',
        m.status ?? '',
        joined ? new Date(joined).toISOString().slice(0, 10) : '',
        (m.departmentIds ?? []).map((id: unknown) => departmentName.get(String(id)) ?? '').filter(Boolean).join('; '),
        m.domain ?? '',
      ];
      if (withPrivate) {
        cells.push(m.privateProfile?.email ?? m.profile?.email ?? '', m.privateProfile?.phone ?? m.profile?.phone ?? '');
      }
      lines.push(cells.map(csvCell).join(','));
    }

    const base = String(organization.slug || organization.name || 'organization')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'organization';

    return {
      filename: `${base}-members-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: '﻿' + lines.join('\r\n') + '\r\n',
    };
  }

  /* ==========================================================================
     LOGO UPLOAD
  ========================================================================== */

  async uploadLogo(organizationId: string, userId: string, file?: UploadedLogoFile) {
    const orgId = this.oid(organizationId, 'organization ID');
    await this.members.requirePermission(organizationId, userId, ChurchPermission.UpdateOrganization);

    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('Please choose a logo image.');
    }
    if (file.buffer.length > LOGO_MAX_BYTES) {
      throw new BadRequestException('The logo must be 5 MB or smaller.');
    }
    const extension = LOGO_TYPES[String(file.mimetype ?? '').toLowerCase().trim()];
    if (!extension) {
      throw new BadRequestException('The logo must be a PNG, JPG, WebP or GIF image.');
    }

    const organization = await this.organizationModel.findById(orgId).exec();
    if (!organization) throw new NotFoundException('Organization not found.');

    const directory = join(LOGO_DIRECTORY, String(orgId));
    await fs.mkdir(directory, { recursive: true });
    const filename = `logo-${Date.now()}-${randomBytes(6).toString('hex')}.${extension}`;
    await fs.writeFile(join(directory, filename), file.buffer);

    const previous: string | null = organization.logoUrl ?? null;
    const url = `${LOGO_PUBLIC_PREFIX}/${String(orgId)}/${filename}`;
    organization.logoUrl = url;
    await organization.save();

    // Remove the previous uploaded logo for this organization (never anything else).
    const ownPrefix = `${LOGO_PUBLIC_PREFIX}/${String(orgId)}/`;
    if (previous && previous !== url && previous.startsWith(ownPrefix)) {
      const old = previous.slice(ownPrefix.length);
      if (/^logo-[0-9]+-[a-f0-9]+\.(png|jpg|webp|gif)$/.test(old)) {
        await fs.unlink(join(directory, old)).catch(() => undefined);
      }
    }

    return { organizationId, logoUrl: url };
  }
}
