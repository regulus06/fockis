/**
 * organization-dashboard.service.ts
 * -----------------------------------------------------------------------------
 * Read-only figures for the organization admin dashboard and a CSV export of
 * member records, plus logo uploads for the organization profile.
 *
 *   GET  /church/organizations/:organizationId/dashboard?days=30
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
import { ChurchEvent } from '../events/schemas/church-event.schema';
import { AttendanceEntry } from '../attendance/schemas/attendance.schema';
import { Branch } from '../branches/schemas/branch.schema';
import { Organization } from '../organizations/schemas/organization.schema';
import { MembersService } from '../members/services/members.service';
import { ChurchPermission } from '../enums/permission.enum';
import { MembershipStatus } from '../enums/membership-status.enum';

const ALLOWED_RANGES = [7, 30, 90, 365] as const;
const GROWTH_POINTS = 8;
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

  async getDashboard(organizationId: string, userId: string, rawDays?: string) {
    const orgId = this.oid(organizationId, 'organization ID');
    const access = await this.members.requireAdminDashboardAccess(organizationId, userId);

    const granted = new Set<string>(access.permissions ?? []);
    const can = (p: ChurchPermission) => access.isOwner || granted.has(p);

    const requested = Number(rawDays);
    const days = (ALLOWED_RANGES as readonly number[]).includes(requested) ? requested : 30;
    const now = new Date();
    const since = new Date(now.getTime() - days * 86_400_000);
    const previousSince = new Date(since.getTime() - days * 86_400_000);

    const canMembers = can(ChurchPermission.ViewMembers);
    const canAttendance = can(ChurchPermission.ViewAttendance) || can(ChurchPermission.ManageAttendance);
    const canEvents = can(ChurchPermission.ViewEvents) || can(ChurchPermission.ManageEvents);
    const canDepartments = can(ChurchPermission.ViewDepartments) || can(ChurchPermission.ManageDepartments);
    const canGroups = can(ChurchPermission.ViewGroups) || can(ChurchPermission.ManageGroups);

    const notArchived = { organizationId: orgId, isArchived: { $ne: true } };

    const [
      totalMembers,
      pendingApplications,
      inactiveMembers,
      newMembers,
      departments,
      groups,
      branches,
      upcomingEventCount,
    ] = await Promise.all([
      canMembers ? this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Active }) : null,
      canMembers ? this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Pending }) : null,
      canMembers ? this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Inactive }) : null,
      canMembers
        ? this.membershipModel.countDocuments({
            organizationId: orgId,
            status: MembershipStatus.Active,
            $or: [{ joinedAt: { $gte: since } }, { joinedAt: null, createdAt: { $gte: since } }],
          })
        : null,
      canDepartments ? this.departmentModel.countDocuments(notArchived) : null,
      canGroups ? this.groupModel.countDocuments(notArchived) : null,
      this.branchModel.countDocuments({ organizationId: orgId }),
      canEvents ? this.eventModel.countDocuments({ organizationId: orgId, startsAt: { $gte: now } }) : null,
    ]);

    /* ---------------------------------------------------------- growth */

    let growth: { points: { date: string; total: number }[]; changePercent: number | null } | null = null;

    if (canMembers) {
      const step = (now.getTime() - since.getTime()) / (GROWTH_POINTS - 1);
      const stamps = Array.from({ length: GROWTH_POINTS }, (_, i) => new Date(since.getTime() + step * i));
      const totals = await Promise.all(stamps.map((at) => this.activeAt(orgId, at)));
      const start = totals[0] ?? 0;
      const end = totals[totals.length - 1] ?? 0;
      growth = {
        points: stamps.map((at, i) => ({ date: at.toISOString(), total: totals[i] })),
        changePercent: start > 0 ? Math.round(((end - start) / start) * 1000) / 10 : null,
      };
    }

    /* ------------------------------------------------------ attendance */

    let attendance: {
      checkIns: number;
      previousCheckIns: number;
      absences: number;
      membersPresent: number;
      participationRate: number | null;
      byWeek: { weekStart: string; checkIns: number }[];
    } | null = null;

    if (canAttendance) {
      const [checkIns, previousCheckIns, absences, distinct, weekly] = await Promise.all([
        this.attendanceModel.countDocuments({ organizationId: orgId, kind: 'check_in', occurredAt: { $gte: since } }),
        this.attendanceModel.countDocuments({
          organizationId: orgId,
          kind: 'check_in',
          occurredAt: { $gte: previousSince, $lt: since },
        }),
        this.attendanceModel.countDocuments({ organizationId: orgId, kind: 'absence_report', occurredAt: { $gte: since } }),
        this.attendanceModel.distinct('memberId', { organizationId: orgId, kind: 'check_in', occurredAt: { $gte: since } }),
        this.attendanceModel
          .aggregate<{ _id: Date; checkIns: number }>([
            { $match: { organizationId: orgId, kind: 'check_in', occurredAt: { $gte: since } } },
            { $group: { _id: { $dateTrunc: { date: '$occurredAt', unit: 'week' } }, checkIns: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ])
          .exec(),
      ]);

      const activeCount = typeof totalMembers === 'number'
        ? totalMembers
        : await this.membershipModel.countDocuments({ organizationId: orgId, status: MembershipStatus.Active });

      attendance = {
        checkIns,
        previousCheckIns,
        absences,
        membersPresent: distinct.length,
        participationRate: activeCount > 0 ? Math.round((distinct.length / activeCount) * 1000) / 10 : null,
        byWeek: weekly.map((w) => ({ weekStart: new Date(w._id).toISOString(), checkIns: w.checkIns })),
      };
    }

    /* ------------------------------------------------- recent activity */

    let recentActivity: {
      memberId: string;
      name: string;
      avatarUrl: string | null;
      at: string;
      status: string | null;
      role: string | null;
      note: string | null;
    }[] | null = null;

    if (canMembers) {
      const rows = await this.membershipModel
        .aggregate<any>([
          { $match: { organizationId: orgId } },
          { $project: { profile: 1, history: 1 } },
          { $unwind: '$history' },
          { $sort: { 'history.at': -1 } },
          { $limit: 10 },
        ])
        .exec();
      recentActivity = rows.map((r) => ({
        memberId: String(r._id),
        name: r.profile?.displayName ?? 'Member',
        avatarUrl: r.profile?.avatarUrl ?? null,
        at: new Date(r.history?.at ?? Date.now()).toISOString(),
        status: r.history?.status ?? null,
        role: r.history?.role ?? null,
        note: r.history?.note ?? null,
      }));
    }

    /* -------------------------------------------------- upcoming events */

    const upcomingEvents = canEvents
      ? (
          await this.eventModel
            .find({ organizationId: orgId, startsAt: { $gte: now } })
            .sort({ startsAt: 1 })
            .limit(5)
            .select('title startsAt endsAt location eventType')
            .lean<any[]>()
            .exec()
        ).map((e) => ({
          id: String(e._id),
          title: e.title ?? '',
          startsAt: e.startsAt ? new Date(e.startsAt).toISOString() : null,
          endsAt: e.endsAt ? new Date(e.endsAt).toISOString() : null,
          location: e.location ?? null,
          eventType: e.eventType ?? null,
        }))
      : null;

    return {
      organizationId,
      rangeDays: days,
      generatedAt: now.toISOString(),
      viewer: {
        isOwner: access.isOwner,
        role: access.role,
        permissions: access.isOwner ? Object.values(ChurchPermission) : [...granted],
      },
      counts: {
        totalMembers,
        newMembers,
        pendingApplications,
        inactiveMembers,
        departments,
        groups,
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
