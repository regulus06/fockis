/**
 * departments.service.ts
 * -----------------------------------------------------------------------------
 * Business logic for Church Departments.
 *
 * Department membership lives on Membership.departmentIds.
 * Department leaders are Membership IDs stored in leaderIds.
 *
 * Authorization / visibility:
 * - Organization owner has full organization authority.
 * - Active organization members can see active departments.
 * - The creator of a department can always see that department.
 * - A department creator can still see their own department after leaving
 *   the organization.
 * - Archived departments are hidden from ordinary members.
 * - Administrators can explicitly request archived departments.
 * - Department management requires administrator/owner authority.
 *
 * Creator:
 * - createdByUserId is always populated from the authenticated JWT user.
 * - The client cannot supply or override createdByUserId.
 *
 * Archive:
 * - Archive is a SOFT DELETE.
 * - Department documents remain in MongoDB.
 * - Members remain attached.
 * - Leaders remain attached.
 * - createdByUserId remains preserved.
 * - createdAt remains preserved.
 * - Normal lists hide archived departments.
 * - Administrators can explicitly request archived departments.
 * - Archived departments can be restored.
 * -----------------------------------------------------------------------------
 */

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Department,
  DepartmentDocument,
} from "../schemas/department.schema";

import { CreateDepartmentDto } from "../dto/create-department.dto";

import { UpdateDepartmentDto } from "../dto/update-department.dto";

import {
  Membership,
  MembershipDocument,
} from "../../members/schemas/membership.schema";

import { MembersService } from "../../members/services/members.service";
import { ChurchEvent, ChurchEventDocument } from "../../events/schemas/church-event.schema";
import { Announcement, AnnouncementAudience, AnnouncementDocument } from "../../communication/schemas/announcement.schema";
import { AttendanceEntry, AttendanceEntryDocument, AttendanceEntryKind } from "../../attendance/schemas/attendance.schema";
import { ChurchMedia, ChurchMediaDocument, ChurchMediaType, ChurchMediaVisibility } from "../../media/schemas/church-media.schema";
import { EventType } from "../../enums/event-type.enum";
import { MembershipStatus } from "../../enums/membership-status.enum";
import { MinistryAccessService } from "../../ministries/ministry-access.service";
import { DEFAULT_MINISTRY_SETTINGS, type MinistrySettings } from "../../ministries/ministry.schemas";

/** Tag that links a media item (photo, Bible study…) to a ministry. */
export const ministryMediaTag = (departmentId: string) => `ministry:${departmentId}`;

/** Media categories counted as Bible studies on the ministry page. */
const STUDY_CATEGORIES = ["training", "message", "sermon", "resource"];

export interface ListDepartmentsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  branchId?: string;

  /**
   * Only administrators should use this.
   *
   * false/undefined = active departments only.
   * true = active + archived departments.
   */
  includeArchived?: boolean;
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,

    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,

    private readonly membersService: MembersService,

    @InjectModel(ChurchEvent.name)
    private readonly eventModel: Model<ChurchEventDocument>,

    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,

    @InjectModel(AttendanceEntry.name)
    private readonly attendanceModel: Model<AttendanceEntryDocument>,

    @InjectModel(ChurchMedia.name)
    private readonly mediaModel: Model<ChurchMediaDocument>,

    private readonly ministryAccess: MinistryAccessService,
  ) {}

  /* =========================================================================
     RESPONSE MAPPING
     ========================================================================= */

  private async toResponse(
    doc: DepartmentDocument,
    viewerMembership: MembershipDocument | null,
  ) {
    const [
      memberCount,
      leaderDocs,
    ] = await Promise.all([
      this.membershipModel.countDocuments({
        departmentIds: doc._id,
      }),

      doc.leaderIds?.length
        ? this.membershipModel
            .find(
              {
                _id: {
                  $in: doc.leaderIds,
                },
              },
              {
                profile: 1,
                userId: 1,
              },
            )
            .lean()
        : Promise.resolve([]),
    ]);

    return {
      id: String(doc._id),

      organizationId:
        String(doc.organizationId),

      /**
       * Permanent creator.
       *
       * This value is never changed by archive/restore/update.
       */
      createdByUserId:
        doc.createdByUserId
          ? String(doc.createdByUserId)
          : null,

      branchId:
        doc.branchId
          ? String(doc.branchId)
          : null,

      name:
        doc.name,

      departmentType:
        doc.departmentType,

      description:
        doc.description ?? "",

      photoUrl:
        doc.photoUrl ?? null,

      leaderIds:
        (doc.leaderIds ?? []).map(
          (id) => String(id),
        ),

      leaders:
        leaderDocs.map(
          (membership: any) => ({
            id: String(
              membership.userId,
            ),

            membershipId: String(
              membership._id,
            ),

            displayName:
              membership.profile
                ?.displayName ??
              membership.profile
                ?.name ??
              null,

            avatarUrl:
              membership.profile
                ?.avatarUrl ??
              null,
          }),
        ),

      memberCount,

      leaderTitles: this.titlesOf(doc),

      meetingSchedule: this.scheduleOf(doc),

      /* Ministries management */
      category: MinistryAccessService.categoryOf(doc),
      ministryStatus: doc.ministryStatus || "active",
      status: MinistryAccessService.statusOf(doc),
      ministrySettings: this.ministryAccess.settingsOf(doc as { ministrySettings?: Partial<MinistrySettings> }),

      isCurrentUserMember:
        viewerMembership
          ? (
              viewerMembership.departmentIds ??
              []
            ).some(
              (id) =>
                String(id) ===
                String(doc._id),
            )
          : false,

      isArchived:
        Boolean(doc.isArchived),

      archivedAt:
        doc.archivedAt ?? null,

      archivedByUserId:
        doc.archivedByUserId
          ? String(
              doc.archivedByUserId,
            )
          : null,

      createdAt:
        doc.createdAt,

      updatedAt:
        doc.updatedAt,
    };
  }

  /* =========================================================================
     VALIDATION HELPERS
     ========================================================================= */

  private normalizeName(
    name: string,
  ): string {
    return String(name ?? "")
      .trim()
      .replace(/\s+/g, " ");
  }

  private validateObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (
      !value ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new NotFoundException(
        `${fieldName} is invalid.`,
      );
    }

    return new Types.ObjectId(value);
  }

  private escapeRegex(
    value: string,
  ): string {
    return value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
  }

  /* =========================================================================
     CREATOR / OWNER VISIBILITY
     ========================================================================= */

  /**
   * Returns true when the authenticated user created this department.
   *
   * Department creator identity comes exclusively from the database.
   */
  private isDepartmentCreator(
    doc: DepartmentDocument,
    userId: string,
  ): boolean {
    if (!doc.createdByUserId) {
      return false;
    }

    return (
      String(doc.createdByUserId) ===
      String(userId)
    );
  }

  /**
   * Determine whether a user can see a department.
   *
   * Visibility rules:
   *
   * 1. Organization owner -> yes.
   * 2. Department creator -> yes.
   * 3. Active organization member -> yes for active departments.
   * 4. Administrator requesting archived departments -> yes.
   * 5. Everyone else -> no.
   */
  private async canViewDepartment(
    organizationId: string,
    department: DepartmentDocument,
    viewerUserId: string,
    includeArchived = false,
  ): Promise<{
    allowed: boolean;
    membership: MembershipDocument | null;
  }> {
    const membership =
      await this.membersService.getMembershipOrNull(
        organizationId,
        viewerUserId,
      );

    /**
     * Organization owner always has visibility.
     */
    const organization =
      await this.membersService.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.membersService.getOrganizationCreatorId(
        organization,
      );

    if (
      String(ownerId) ===
      String(viewerUserId)
    ) {
      return {
        allowed: true,
        membership,
      };
    }

    /**
     * Department creator retains visibility even after leaving the
     * organization.
     *
     * This is deliberately checked BEFORE active membership.
     */
    if (
      this.isDepartmentCreator(
        department,
        viewerUserId,
      )
    ) {
      if (
        department.isArchived &&
        !includeArchived
      ) {
        return {
          allowed: false,
          membership,
        };
      }

      return {
        allowed: true,
        membership,
      };
    }

    /**
     * Everyone else needs active membership.
     */
    if (!membership) {
      return {
        allowed: false,
        membership: null,
      };
    }

    const isActive =
      String(
        membership.status,
      ).toLowerCase() ===
      "active";

    if (!isActive) {
      return {
        allowed: false,
        membership,
      };
    }

    /**
     * Archived departments require administrator access.
     */
    if (
      department.isArchived &&
      includeArchived
    ) {
      try {
        await this.requireDepartmentAdmin(
          organizationId,
          viewerUserId,
        );

        return {
          allowed: true,
          membership,
        };
      } catch {
        return {
          allowed: false,
          membership,
        };
      }
    }

    if (department.isArchived) {
      return {
        allowed: false,
        membership,
      };
    }

    return {
      allowed: true,
      membership,
    };
  }

  /* =========================================================================
     UNIQUE NAME
     ========================================================================= */

  private async ensureUniqueName(
    organizationId: string,
    name: string,
    excludeDepartmentId?: string,
  ): Promise<void> {
    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    const normalizedName =
      this.normalizeName(name);

    if (!normalizedName) {
      throw new ConflictException(
        "Department name is required.",
      );
    }

    /**
     * Legacy departments without isArchived are treated as active.
     */
    const filter: Record<
      string,
      any
    > = {
      organizationId:
        organizationObjectId,

      $or: [
        {
          isArchived: false,
        },
        {
          isArchived: {
            $exists: false,
          },
        },
      ],

      name: {
        $regex:
          `^${this.escapeRegex(
            normalizedName,
          )}$`,
        $options: "i",
      },
    };

    if (excludeDepartmentId) {
      filter._id = {
        $ne:
          this.validateObjectId(
            excludeDepartmentId,
            "Department ID",
          ),
      };
    }

    const existing =
      await this.departmentModel.findOne(
        filter,
      );

    if (existing) {
      throw new ConflictException(
        `A department named "${normalizedName}" already exists in this organization.`,
      );
    }
  }

  private normalizeLeaderIds(
    leaderIds?: string[],
  ): Types.ObjectId[] {
    if (!leaderIds?.length) {
      return [];
    }

    const uniqueIds =
      Array.from(
        new Set(
          leaderIds
            .map((id) =>
              String(id).trim(),
            )
            .filter(Boolean),
        ),
      );

    return uniqueIds.map((id) =>
      this.validateObjectId(
        id,
        "Leader ID",
      ),
    );
  }

  /* =========================================================================
     ORGANIZATION MEMBERSHIP ACCESS
     ========================================================================= */

  private async requireOrganizationMember(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument> {
    return this.membersService.requireActiveMembership(
      organizationId,
      userId,
    );
  }

  private async requireDepartmentAdmin(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument> {
    return this.membersService.requireAdmin(
      organizationId,
      userId,
    );
  }

  private titlesOf(doc: { leaderTitles?: unknown }): Record<string, string> {
    const raw = doc.leaderTitles as Map<string, string> | Record<string, string> | undefined;
    if (!raw) return {};
    return raw instanceof Map ? Object.fromEntries(raw.entries()) : { ...raw };
  }

  private scheduleOf(doc: { meetingSchedule?: unknown }) {
    const list = (doc.meetingSchedule ?? []) as Array<Record<string, unknown>>;
    return list.map((m) => ({
      name: String(m.name ?? ""),
      day: String(m.day ?? ""),
      startTime: String(m.startTime ?? ""),
      endTime: String(m.endTime ?? ""),
      location: String(m.location ?? ""),
      key: String(m.key ?? ""),
      frequency: String(m.frequency ?? ""),
      weekdays: Array.isArray(m.weekdays) ? (m.weekdays as number[]) : [],
      anchorDate: String(m.anchorDate ?? ""),
      endDate: String(m.endDate ?? ""),
      startClock: String(m.startClock ?? ""),
      endClock: String(m.endClock ?? ""),
      timeZone: String(m.timeZone ?? ""),
      attendance: m.attendance !== false,
    }));
  }

  /* =========================================================================
     PUBLIC MINISTRY OVERVIEW
     ========================================================================= */

  /**
   * Everything the public ministry page needs, in one call. Only public,
   * published information:
   *   - counts (members, leaders, upcoming events, studies, avg attendance)
   *   - leaders' name, photo and position (no contact details)
   *   - upcoming ministry events (internal "meeting" events excluded)
   *   - announcements addressed to everyone
   *   - public, published photos and Bible studies tagged for the ministry
   *   - meeting schedule
   * Never member lists, private media, attendance records or settings.
   */
  async getPublicOverview(organizationId: string, departmentId: string, viewerUserId?: string | null) {
    const ministry = await this.getPublic(organizationId, departmentId, viewerUserId);
    const orgId = new Types.ObjectId(organizationId);
    const deptId = new Types.ObjectId(departmentId);
    const tag = ministryMediaTag(departmentId);
    const now = new Date();

    const doc = (await this.departmentModel
      .findById(deptId)
      .select("leaderIds leaderTitles meetingSchedule")
      .lean()
      .exec()) as unknown as {
      leaderIds?: Types.ObjectId[];
      leaderTitles?: Record<string, string>;
      meetingSchedule?: unknown;
    } | null;

    const leaderIds = doc?.leaderIds ?? [];
    const titles = this.titlesOf(doc ?? {});

    const publicEventFilter = {
      organizationId: orgId,
      departmentId: deptId,
      eventType: { $ne: EventType.Meeting },
    };
    const mediaBase = {
      organizationId: orgId,
      tags: tag,
      visibility: ChurchMediaVisibility.Public,
      publishedAt: { $ne: null },
    };

    const [memberCount, leaderDocs, upcoming, upcomingCount, announcements, photos, studies, studyCount, pastEvents] = await Promise.all([
      this.membershipModel.countDocuments({ organizationId: orgId, departmentIds: deptId, status: MembershipStatus.Active }),
      leaderIds.length
        ? this.membershipModel.find({ _id: { $in: leaderIds } }, { profile: 1 }).lean().exec()
        : Promise.resolve([]),
      this.eventModel
        .find({ ...publicEventFilter, startsAt: { $gte: now } })
        .select("title startsAt endsAt location isOnline coverImageUrl eventType capacity requiresRsvp")
        .sort({ startsAt: 1 })
        .limit(3)
        .lean()
        .exec(),
      this.eventModel.countDocuments({ ...publicEventFilter, startsAt: { $gte: now } }),
      this.announcementModel
        .find({ organizationId: orgId, departmentId: deptId, audience: AnnouncementAudience.Everyone })
        .select("title body pinned publishedAt")
        .sort({ pinned: -1, publishedAt: -1 })
        .limit(3)
        .lean()
        .exec(),
      this.mediaModel
        .find({ ...mediaBase, mediaType: ChurchMediaType.Photo })
        .select("title fileUrl thumbnailUrl description")
        .sort({ order: 1, publishedAt: -1 })
        .limit(8)
        .lean()
        .exec(),
      this.mediaModel
        .find({ ...mediaBase, category: { $in: STUDY_CATEGORIES } })
        .select("title fileUrl thumbnailUrl durationSeconds speaker mediaType publishedAt")
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean()
        .exec(),
      this.mediaModel.countDocuments({ ...mediaBase, category: { $in: STUDY_CATEGORIES } }),
      this.eventModel
        .find({ organizationId: orgId, departmentId: deptId, startsAt: { $lt: now } })
        .select("_id")
        .sort({ startsAt: -1 })
        .limit(12)
        .lean()
        .exec(),
    ]);

    // Average attendance: mean check-ins per past ministry event, as a share of members.
    let averageAttendance: number | null = null;
    if (pastEvents.length > 0 && memberCount > 0) {
      const counts = await this.attendanceModel.aggregate<{ _id: Types.ObjectId; n: number }>([
        {
          $match: {
            organizationId: orgId,
            eventId: { $in: pastEvents.map((e) => (e as { _id: Types.ObjectId })._id) },
            kind: AttendanceEntryKind.CheckIn,
          },
        },
        { $group: { _id: "$eventId", n: { $sum: 1 } } },
      ]);
      if (counts.length > 0) {
        const total = counts.reduce((sum, c) => sum + c.n, 0);
        averageAttendance = Math.min(100, Math.round((total / pastEvents.length / memberCount) * 100));
      }
    }

    const leaders = leaderIds
      .map((id) => (leaderDocs as Array<{ _id: Types.ObjectId; profile?: { displayName?: string; avatarUrl?: string | null } }>).find((l) => String(l._id) === String(id)))
      .filter((l): l is { _id: Types.ObjectId; profile?: { displayName?: string; avatarUrl?: string | null } } => Boolean(l))
      .map((l) => ({
        membershipId: String(l._id),
        displayName: l.profile?.displayName ?? "Leader",
        avatarUrl: l.profile?.avatarUrl ?? null,
        title: titles[String(l._id)] ?? "",
      }));

    const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : null);

    return {
      ministry,
      stats: {
        members: memberCount,
        leaders: leaders.length,
        upcomingEvents: upcomingCount,
        bibleStudies: studyCount,
        averageAttendance,
      },
      leaders,
      meetingSchedule: this.scheduleOf(doc ?? {}),
      events: (upcoming as unknown as Array<Record<string, unknown>>).map((e) => ({
        id: String(e._id),
        title: String(e.title ?? ""),
        startsAt: iso(e.startsAt),
        endsAt: iso(e.endsAt),
        location: (e.location as string) ?? "",
        isOnline: Boolean(e.isOnline),
        coverImageUrl: (e.coverImageUrl as string) ?? null,
        requiresRsvp: Boolean(e.requiresRsvp),
      })),
      announcements: (announcements as unknown as Array<Record<string, unknown>>).map((a) => ({
        id: String(a._id),
        title: String(a.title ?? ""),
        body: String(a.body ?? ""),
        pinned: Boolean(a.pinned),
        publishedAt: iso(a.publishedAt),
      })),
      photos: (photos as unknown as Array<Record<string, unknown>>).map((m) => ({
        id: String(m._id),
        title: String(m.title ?? ""),
        url: String(m.fileUrl ?? ""),
        thumbnailUrl: (m.thumbnailUrl as string) ?? null,
      })),
      studies: (studies as unknown as Array<Record<string, unknown>>).map((m) => ({
        id: String(m._id),
        title: String(m.title ?? ""),
        url: String(m.fileUrl ?? ""),
        thumbnailUrl: (m.thumbnailUrl as string) ?? null,
        durationSeconds: (m.durationSeconds as number) ?? null,
        speaker: (m.speaker as string) ?? "",
        mediaType: String(m.mediaType ?? ""),
        publishedAt: iso(m.publishedAt),
      })),
    };
  }

  /* =========================================================================
     PUBLIC WEBSITE LIST
     ========================================================================= */

  /**
   * Ministries / departments shown on the organization's public website.
   * Works for guests. Returns presentation fields only (name, type,
   * description, photo) — never leaders, members or membership data.
   * Archived departments and suspended/archived organizations return nothing.
   */
  async listPublic(organizationId: string, limit = 12) {
    const organizationObjectId = this.validateObjectId(
      organizationId,
      "Organization ID",
    );

    const organization = (await this.membersService.getOrganization(
      organizationId,
    )) as unknown as { status?: string } | null;

    const status = String(organization?.status ?? "").toLowerCase();

    if (status === "suspended" || status === "archived") {
      return { items: [] };
    }

    const safeLimit = Math.min(Math.max(1, Math.floor(Number(limit) || 12)), 50);

    const docs = await this.departmentModel
      .find({
        organizationId: organizationObjectId,
        isArchived: { $ne: true },
        // Drafts, ministries awaiting approval and members-only/private
        // ministries are not listed on the public website.
        ministryStatus: { $nin: ["draft", "pending_approval"] },
        "ministrySettings.visibility": { $nin: ["members", "private"] },
      } as Record<string, unknown>)
      .select("name departmentType description photoUrl")
      .sort({ createdAt: 1 })
      .limit(safeLimit)
      .lean()
      .exec();

    return {
      items: docs.map((d) => {
        const doc = d as unknown as {
          _id: Types.ObjectId;
          name: string;
          departmentType: string;
          description?: string;
          photoUrl?: string | null;
        };
        return {
          id: String(doc._id),
          name: doc.name,
          departmentType: doc.departmentType,
          description: doc.description ?? "",
          photoUrl: doc.photoUrl ?? null,
        };
      }),
    };
  }

  /**
   * One ministry for its public page. Same presentation-only fields as
   * listPublic. Archived ministries, other organizations' ministries and
   * suspended/archived organizations return 404.
   */
  async getPublic(organizationId: string, departmentId: string, viewerUserId?: string | null) {
    const organizationObjectId = this.validateObjectId(organizationId, "Organization ID");
    const departmentObjectId = this.validateObjectId(departmentId, "Ministry ID");

    const organization = (await this.membersService.getOrganization(
      organizationId,
    )) as unknown as { status?: string } | null;
    const status = String(organization?.status ?? "").toLowerCase();

    const doc = (await this.departmentModel
      .findOne({
        _id: departmentObjectId,
        organizationId: organizationObjectId,
        isArchived: { $ne: true },
      })
      .select("organizationId name departmentType description photoUrl leaderIds createdByUserId ministryStatus ministrySettings category")
      .lean()
      .exec()) as unknown as {
      _id: Types.ObjectId;
      organizationId: Types.ObjectId;
      name: string;
      departmentType: string;
      description?: string;
      photoUrl?: string | null;
      leaderIds?: Types.ObjectId[];
      createdByUserId?: Types.ObjectId | null;
      ministryStatus?: string;
      ministrySettings?: Partial<MinistrySettings>;
      category?: string;
    } | null;

    if (!doc || status === "suspended" || status === "archived") {
      throw new NotFoundException("This ministry could not be found.");
    }

    // Drafts and members-only/private ministries: only people allowed to see them.
    const settings = this.ministryAccess.settingsOf(doc);
    const published = !["draft", "pending_approval"].includes(String(doc.ministryStatus ?? ""));
    if (!published || settings.visibility !== "public") {
      const actor = viewerUserId ? await this.ministryAccess.actor(organizationId, viewerUserId).catch(() => null) : null;
      if (!actor || !this.ministryAccess.canSee(actor, doc)) {
        throw new NotFoundException("This ministry could not be found.");
      }
    }

    return {
      id: String(doc._id),
      organizationId: String(organizationObjectId),
      name: doc.name,
      departmentType: doc.departmentType,
      description: doc.description ?? "",
      photoUrl: doc.photoUrl ?? null,
      category: MinistryAccessService.categoryOf(doc),
      status: MinistryAccessService.statusOf(doc),
      visibility: settings.visibility,
      joinMode: settings.joinMode,
    };
  }

  /* =========================================================================
     LIST
     ========================================================================= */

  async listByOrganization(
    organizationId: string,
    query: ListDepartmentsQuery = {},
    viewerUserId?: string,
  ) {
    if (
      !viewerUserId ||
      String(viewerUserId).trim() === ""
    ) {
      throw new ForbiddenException(
        "Authentication is required to view departments.",
      );
    }

    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    const page =
      query.page &&
      query.page > 0
        ? Math.floor(query.page)
        : 1;

    const pageSize =
      query.pageSize &&
      query.pageSize > 0
        ? Math.min(
            Math.floor(
              query.pageSize,
            ),
            100,
          )
        : 20;

    const includeArchived =
      Boolean(
        query.includeArchived,
      );

    /**
     * Get current membership if one exists.
     *
     * We intentionally do NOT require active membership immediately because
     * a department creator must retain visibility after leaving.
     */
    const viewerMembership =
      await this.membersService.getMembershipOrNull(
        organizationId,
        viewerUserId,
      );

    /**
     * Organization owner always has access.
     */
    const organization =
      await this.membersService.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.membersService.getOrganizationCreatorId(
        organization,
      );

    const isOrganizationOwner =
      String(ownerId) ===
      String(viewerUserId);

    /**
     * Determine whether this viewer has active organization membership.
     */
    const isActiveMember =
      viewerMembership
        ? String(
            viewerMembership.status,
          ).toLowerCase() ===
          "active"
        : false;

    /**
     * If archived departments are requested, only administrators/owners
     * may receive the organization's archived collection.
     *
     * A non-member department creator is still allowed to see their own
     * department, but not every archived department.
     */
    let isAdministrator =
      isOrganizationOwner;

    if (!isAdministrator) {
      try {
        await this.requireDepartmentAdmin(
          organizationId,
          viewerUserId,
        );

        isAdministrator = true;
      } catch {
        isAdministrator = false;
      }
    }

    /**
     * Build the query.
     *
     * For ordinary active members, return active departments.
     *
     * For a department creator who is no longer a member, we additionally
     * include their own department.
     */
    const filter: Record<
      string,
      any
    > = {
      organizationId:
        organizationObjectId,
    };

    if (query.branchId) {
      filter.branchId =
        this.validateObjectId(
          query.branchId,
          "Branch ID",
        );
    }

    if (query.search?.trim()) {
      filter.name = {
        $regex:
          this.escapeRegex(
            query.search.trim(),
          ),
        $options: "i",
      };
    }

    /**
     * Normal active member / owner view.
     */
    if (
      !includeArchived
    ) {
      const activeFilter = {
        $or: [
          {
            isArchived: false,
          },
          {
            isArchived: {
              $exists: false,
            },
          },
        ],
      };

      if (
        isOrganizationOwner ||
        isActiveMember
      ) {
        Object.assign(
          filter,
          activeFilter,
        );
      } else {
        /**
         * Non-members can only see departments they personally created.
         *
         * This is the important creator exception.
         */
        filter.$and = [
          activeFilter,
          {
            createdByUserId:
              this.validateObjectId(
                viewerUserId,
                "Creator user ID",
              ),
          },
        ];
      }
    } else {
      /**
       * Administrator/owner can request all departments.
       *
       * A non-admin creator can still see their own archived department.
       */
      if (isAdministrator) {
        // No archive restriction.
      } else {
        filter.$and = [
          {
            createdByUserId:
              this.validateObjectId(
                viewerUserId,
                "Creator user ID",
              ),
          },
        ];
      }
    }

    /**
     * Department type can be added by callers through the DTO/interface
     * later without affecting authorization.
     */

    const [
      docs,
      total,
    ] = await Promise.all([
      this.departmentModel
        .find(filter)
        .sort({
          isArchived: 1,
          name: 1,
        })
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(pageSize)
        .exec(),

      this.departmentModel.countDocuments(
        filter,
      ),
    ]);

    const items =
      await Promise.all(
        docs.map((doc) =>
          this.toResponse(
            doc,
            viewerMembership,
          ),
        ),
      );

    return {
      items,
      total,
      page,
      pageSize,
      hasMore:
        page * pageSize <
        total,
    };
  }

  /* =========================================================================
     GET ONE
     ========================================================================= */

  async getById(
    organizationId: string,
    departmentId: string,
    viewerUserId?: string,
    includeArchived = false,
  ) {
    if (
      !viewerUserId ||
      String(viewerUserId).trim() === ""
    ) {
      throw new ForbiddenException(
        "Authentication is required to view this department.",
      );
    }

    /**
     * Find the department without applying visibility yet.
     */
    const doc =
      await this.findOrThrow(
        organizationId,
        departmentId,
        true,
      );

    const visibility =
      await this.canViewDepartment(
        organizationId,
        doc,
        viewerUserId,
        includeArchived,
      );

    if (!visibility.allowed) {
      throw new ForbiddenException(
        doc.isArchived
          ? "You do not have access to this archived department."
          : "You must be an active member of this organization or the department creator to view this department.",
      );
    }

    /**
     * Archived resources require explicit administrator request unless
     * the viewer is the organization owner or resource creator.
     */
    if (
      doc.isArchived &&
      !includeArchived &&
      !this.isDepartmentCreator(
        doc,
        viewerUserId,
      )
    ) {
      throw new NotFoundException(
        "Department not found or archived.",
      );
    }

    return this.toResponse(
      doc,
      visibility.membership,
    );
  }

  /* =========================================================================
     CREATE
     ========================================================================= */

  async create(
    organizationId: string,
    dto: CreateDepartmentDto,
    actorUserId: string,
  ) {
    // Who may create ministries is set by the owner's ministry policy.
    const ministryActor =
      await this.ministryAccess.requireCreate(
        organizationId,
        actorUserId,
      );
    const actor = ministryActor.membership;

    const name =
      this.normalizeName(
        dto.name,
      );

    if (!name) {
      throw new ConflictException(
        "Department name is required.",
      );
    }

    await this.ensureUniqueName(
      organizationId,
      name,
    );

    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    let branchId:
      | Types.ObjectId
      | null = null;

    if (
      dto.branchId &&
      dto.branchId.trim()
    ) {
      branchId =
        this.validateObjectId(
          dto.branchId,
          "Branch ID",
        );
    }

    const creatorUserId =
      this.validateObjectId(
        actorUserId,
        "Creator user ID",
      );

    const created =
      await this.departmentModel.create(
        {
          organizationId:
            organizationObjectId,

          /**
           * Creator ALWAYS comes from JWT.
           */
          createdByUserId:
            creatorUserId,

          branchId,

          name,

          departmentType:
            dto.departmentType,

          description:
            dto.description?.trim() ||
            undefined,

          photoUrl:
            dto.photoUrl?.trim() ||
            null,

          leaderIds:
            await this.validLeaderIds(
              organizationId,
              dto.leaderIds,
            ),

          leaderTitles:
            this.cleanTitles(
              dto.leaderTitles,
            ),

          meetingSchedule:
            this.cleanSchedule(
              dto.meetingSchedule,
            ),

          category:
            dto.category ||
            MinistryAccessService.categoryOf({
              departmentType:
                dto.departmentType,
            }),

          ministryStatus:
            dto.ministryStatus ===
            "draft"
              ? "draft"
              : "active",

          // Owner defaults first, then what the creator chose.
          ministrySettings:
            MinistryAccessService.cleanSettings(
              dto.ministrySettings as Partial<MinistrySettings>,
              (
                await this.ministryAccess.policy(
                  organizationId,
                )
              ).defaults,
            ) as unknown as Record<string, unknown>,

          isArchived: false,

          archivedAt: null,

          archivedByUserId: null,
        },
      );

    await this.ministryAccess.audit(
      organizationId,
      created._id as Types.ObjectId,
      ministryActor,
      dto.ministryStatus === "draft"
        ? "draft_saved"
        : "created",
      name,
    );

    return this.toResponse(
      created,
      actor,
    );
  }

  /* =========================================================================
     UPDATE
     ========================================================================= */

  async update(
    organizationId: string,
    departmentId: string,
    dto: UpdateDepartmentDto,
    actorUserId: string,
  ) {
    // Church leadership, or a leader of this ministry (policy permitting).
    const rights =
      await this.ministryAccess.requireManage(
        organizationId,
        actorUserId,
        departmentId,
      );
    const actor = rights.actor.membership;

    const doc =
      await this.findOrThrow(
        organizationId,
        departmentId,
        false,
      );

    // Leaders and publishing status are decided by church leadership.
    if (
      !rights.canGovern &&
      (dto.leaderIds !== undefined ||
        dto.ministryStatus !== undefined)
    ) {
      throw new ForbiddenException(
        "Only church leadership can change ministry leaders or status.",
      );
    }

    if (dto.name !== undefined) {
      const name =
        this.normalizeName(
          dto.name,
        );

      if (!name) {
        throw new ConflictException(
          "Department name is required.",
        );
      }

      await this.ensureUniqueName(
        organizationId,
        name,
        departmentId,
      );

      doc.name = name;
    }

    if (
      dto.departmentType !==
      undefined
    ) {
      doc.departmentType =
        dto.departmentType;
    }

    if (
      dto.description !==
      undefined
    ) {
      doc.description =
        dto.description.trim();
    }

    if (
      dto.photoUrl !==
      undefined
    ) {
      doc.photoUrl =
        dto.photoUrl.trim() ||
        null;
    }

    if (
      dto.branchId !==
      undefined
    ) {
      doc.branchId =
        dto.branchId?.trim()
          ? this.validateObjectId(
              dto.branchId,
              "Branch ID",
            )
          : null;
    }

    if (
      dto.leaderIds !==
      undefined
    ) {
      doc.leaderIds =
        await this.validLeaderIds(
          organizationId,
          dto.leaderIds,
        );
    }

    if (dto.category !== undefined) {
      doc.category = dto.category;
    }

    if (dto.ministryStatus !== undefined) {
      doc.ministryStatus = dto.ministryStatus;
    }

    if (dto.ministrySettings !== undefined) {
      doc.set(
        "ministrySettings",
        MinistryAccessService.cleanSettings(
          dto.ministrySettings as Partial<MinistrySettings>,
          this.ministryAccess.settingsOf(
            doc as { ministrySettings?: Partial<MinistrySettings> },
          ),
        ),
      );
    }

    if (dto.leaderTitles !== undefined) {
      const titles = new Map<string, string>();
      for (const [membershipId, title] of Object.entries(dto.leaderTitles ?? {})) {
        const clean = String(title ?? "").trim().slice(0, 80);
        if (clean && Types.ObjectId.isValid(membershipId)) titles.set(membershipId, clean);
      }
      doc.set("leaderTitles", titles);
    }

    if (dto.meetingSchedule !== undefined) {
      doc.set(
        "meetingSchedule",
        (dto.meetingSchedule ?? [])
          .filter((m) => m && String(m.name ?? "").trim())
          .slice(0, 20)
          .map((m) => ({
            name: String(m.name).trim(),
            day: String(m.day ?? "").trim(),
            startTime: String(m.startTime ?? "").trim(),
            endTime: String(m.endTime ?? "").trim(),
            location: String(m.location ?? "").trim(),
            // Structured fields drive one attendance session per meeting date.
            key: String(m.key ?? "").trim() || new Types.ObjectId().toHexString(),
            frequency: m.frequency ?? "",
            weekdays: Array.isArray(m.weekdays) ? [...new Set(m.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : [],
            anchorDate: m.anchorDate ?? "",
            endDate: m.endDate ?? "",
            startClock: m.startClock ?? "",
            endClock: m.endClock ?? "",
            timeZone: m.timeZone ?? "",
            attendance: m.attendance !== false,
          })),
      );
    }

    await doc.save();

    await this.ministryAccess.audit(
      organizationId,
      doc._id as Types.ObjectId,
      rights.actor,
      "updated",
      Object.keys(dto).join(", "),
    );

    return this.toResponse(
      doc,
      actor,
    );
  }

  /* =========================================================================
     MINISTRY FIELD HELPERS
     ========================================================================= */

  /** Leader IDs must be active memberships of this organization. */
  private async validLeaderIds(
    organizationId: string,
    leaderIds?: string[],
  ): Promise<Types.ObjectId[]> {
    const ids = this.normalizeLeaderIds(leaderIds);
    if (!ids.length) return [];
    const found = await this.membershipModel
      .find({
        _id: { $in: ids },
        organizationId: this.validateObjectId(organizationId, "Organization ID"),
        status: MembershipStatus.Active,
      })
      .select("_id")
      .lean()
      .exec();
    if (found.length !== ids.length) {
      throw new ForbiddenException(
        "Ministry leaders must be active members of this organization.",
      );
    }
    return ids;
  }

  private cleanTitles(input?: Record<string, string>): Map<string, string> {
    const titles = new Map<string, string>();
    for (const [membershipId, title] of Object.entries(input ?? {})) {
      const clean = String(title ?? "").trim().slice(0, 80);
      if (clean && Types.ObjectId.isValid(membershipId)) titles.set(membershipId, clean);
    }
    return titles;
  }

  private cleanSchedule(list?: UpdateDepartmentDto["meetingSchedule"]) {
    return (list ?? [])
      .filter((m) => m && String(m.name ?? "").trim())
      .slice(0, 20)
      .map((m) => ({
        name: String(m.name).trim(),
        day: String(m.day ?? "").trim(),
        startTime: String(m.startTime ?? "").trim(),
        endTime: String(m.endTime ?? "").trim(),
        location: String(m.location ?? "").trim(),
        key: String(m.key ?? "").trim() || new Types.ObjectId().toHexString(),
        frequency: m.frequency ?? "",
        weekdays: Array.isArray(m.weekdays) ? [...new Set(m.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : [],
        anchorDate: m.anchorDate ?? "",
        endDate: m.endDate ?? "",
        startClock: m.startClock ?? "",
        endClock: m.endClock ?? "",
        timeZone: m.timeZone ?? "",
        attendance: m.attendance !== false,
      }));
  }

  /* =========================================================================
     ARCHIVE
     ========================================================================= */

  async remove(
    organizationId: string,
    departmentId: string,
    actorUserId: string,
  ): Promise<void> {
    const ministryActor =
      await this.ministryAccess.requireCreate(
        organizationId,
        actorUserId,
      );

    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    const departmentObjectId =
      this.validateObjectId(
        departmentId,
        "Department ID",
      );

    const doc =
      await this.departmentModel.findOne(
        {
          _id:
            departmentObjectId,

          organizationId:
            organizationObjectId,
        },
      );

    if (!doc) {
      throw new NotFoundException(
        "Department not found.",
      );
    }

    if (doc.isArchived) {
      throw new ConflictException(
        "Department is already archived.",
      );
    }

    doc.isArchived = true;

    doc.archivedAt =
      new Date();

    doc.archivedByUserId =
      this.validateObjectId(
        actorUserId,
        "Archiver user ID",
      );

    /**
     * IMPORTANT:
     *
     * Membership.departmentIds are NOT changed.
     *
     * This preserves the historical relationship.
     */
    await doc.save();

    await this.ministryAccess.audit(organizationId, doc._id as Types.ObjectId, ministryActor, "archived", doc.name);
  }

  /* =========================================================================
     RESTORE
     ========================================================================= */

  async restore(
    organizationId: string,
    departmentId: string,
    actorUserId: string,
  ) {
    const ministryActor =
      await this.ministryAccess.requireCreate(
        organizationId,
        actorUserId,
      );
    const actor = ministryActor.membership;

    const doc =
      await this.findOrThrow(
        organizationId,
        departmentId,
        true,
      );

    if (!doc.isArchived) {
      throw new ConflictException(
        "Department is already active.",
      );
    }

    await this.ensureUniqueName(
      organizationId,
      doc.name,
      departmentId,
    );

    doc.isArchived = false;

    doc.archivedAt = null;

    doc.archivedByUserId =
      null;

    await doc.save();

    await this.ministryAccess.audit(organizationId, doc._id as Types.ObjectId, ministryActor, "restored", doc.name);

    return this.toResponse(
      doc,
      actor,
    );
  }

  /* =========================================================================
     JOIN
     ========================================================================= */

  async join(
    organizationId: string,
    departmentId: string,
    requesterUserId: string,
  ): Promise<void> {
    const department =
      await this.findOrThrow(
        organizationId,
        departmentId,
        false,
      );

    if (department.isArchived) {
      throw new ForbiddenException(
        "Archived departments cannot accept new members.",
      );
    }

    const membership =
      await this.membersService.requireActiveMembership(
        organizationId,
        requesterUserId,
      );

    // Ministry join rules (open / application / invite, capacity, status).
    await this.assertCanJoinDirectly(
      department,
      membership,
    );

    await this.membersService.adjustDepartmentMembership(
      String(
        membership._id,
      ),
      departmentId,
      true,
    );
  }

  /**
   * Joining without review is only possible for open, published ministries
   * with room left. Applications go through MinistriesService.apply().
   */
  private async assertCanJoinDirectly(
    department: DepartmentDocument,
    membership: MembershipDocument,
  ): Promise<void> {
    const status = MinistryAccessService.statusOf(department);
    if (status !== "active") {
      throw new ForbiddenException("This ministry is not accepting members right now.");
    }
    const settings = this.ministryAccess.settingsOf(
      department as { ministrySettings?: Partial<MinistrySettings> },
    );
    const alreadyIn = (membership.departmentIds ?? []).some((id) => String(id) === String(department._id));
    if (alreadyIn) return;
    if (settings.joinMode === "application") {
      throw new ForbiddenException("This ministry reviews new members. Please send an application to join.");
    }
    if (settings.joinMode === "invite" || settings.visibility === "private") {
      throw new ForbiddenException("Members are added to this ministry by its leaders.");
    }
    await this.assertCapacity(department, settings);
  }

  async assertCapacity(
    department: { _id: unknown; organizationId: unknown },
    settings: Pick<MinistrySettings, "maxMembers"> = DEFAULT_MINISTRY_SETTINGS,
  ): Promise<void> {
    if (!settings.maxMembers) return;
    const count = await this.membershipModel.countDocuments({
      organizationId: department.organizationId as Types.ObjectId,
      departmentIds: department._id as Types.ObjectId,
      status: MembershipStatus.Active,
    });
    if (count >= settings.maxMembers) {
      throw new ForbiddenException("This ministry is full.");
    }
  }

  /* =========================================================================
     LEAVE
     ========================================================================= */

  async leave(
    organizationId: string,
    departmentId: string,
    requesterUserId: string,
  ): Promise<void> {
    /**
     * Archived departments are frozen.
     *
     * Existing historical membership relationships are intentionally
     * preserved.
     */
    const department =
      await this.findOrThrow(
        organizationId,
        departmentId,
        true,
      );

    if (department.isArchived) {
      throw new ForbiddenException(
        "Archived departments are read-only.",
      );
    }

    const membership =
      await this.membersService.requireActiveMembership(
        organizationId,
        requesterUserId,
      );

    await this.membersService.adjustDepartmentMembership(
      String(
        membership._id,
      ),
      departmentId,
      false,
    );
  }

  /* =========================================================================
     ADD MEMBER
     ========================================================================= */

  async addMember(
    organizationId: string,
    departmentId: string,
    memberId: string,
    actorUserId: string,
  ): Promise<void> {
    const department =
      await this.findOrThrow(
        organizationId,
        departmentId,
        false,
      );

    if (department.isArchived) {
      throw new ForbiddenException(
        "Archived departments cannot accept members.",
      );
    }

    const rights =
      await this.ministryAccess.requireManage(
        organizationId,
        actorUserId,
        departmentId,
      );

    const target =
      await this.membersService.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        "Member not found.",
      );
    }

    if (target.status !== MembershipStatus.Active) {
      throw new ForbiddenException(
        "Only active members can be added to a ministry.",
      );
    }

    if (!(target.departmentIds ?? []).some((id) => String(id) === String(department._id))) {
      await this.assertCapacity(
        department,
        this.ministryAccess.settingsOf(department as { ministrySettings?: Partial<MinistrySettings> }),
      );
    }

    await this.membersService.adjustDepartmentMembership(
      memberId,
      departmentId,
      true,
    );

    await this.ministryAccess.audit(
      organizationId,
      departmentId,
      rights.actor,
      "member_added",
      (target as unknown as { profile?: { displayName?: string } }).profile?.displayName ?? memberId,
    );
  }

  /* =========================================================================
     REMOVE MEMBER
     ========================================================================= */

  async removeMember(
    organizationId: string,
    departmentId: string,
    memberId: string,
    actorUserId: string,
  ): Promise<void> {
    const department =
      await this.findOrThrow(
        organizationId,
        departmentId,
        true,
      );

    if (department.isArchived) {
      throw new ForbiddenException(
        "Archived departments are read-only.",
      );
    }

    const rights =
      await this.ministryAccess.requireManage(
        organizationId,
        actorUserId,
        departmentId,
      );

    const target =
      await this.membersService.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        "Member not found.",
      );
    }

    await this.membersService.adjustDepartmentMembership(
      memberId,
      departmentId,
      false,
    );

    await this.ministryAccess.audit(
      organizationId,
      departmentId,
      rights.actor,
      "member_removed",
      (target as unknown as { profile?: { displayName?: string } }).profile?.displayName ?? memberId,
    );
  }

  /* =========================================================================
     ORGANIZATION CLEANUP
     ========================================================================= */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    await this.membershipModel.updateMany(
      {
        organizationId:
          organizationObjectId,
      },
      {
        $set: {
          departmentIds: [],
        },
      },
    );

    await this.departmentModel.deleteMany(
      {
        organizationId:
          organizationObjectId,
      },
    );
  }

  /* =========================================================================
     INTERNAL LOOKUP
     ========================================================================= */

  private async findOrThrow(
    organizationId: string,
    departmentId: string,
    includeArchived = false,
  ): Promise<DepartmentDocument> {
    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    const departmentObjectId =
      this.validateObjectId(
        departmentId,
        "Department ID",
      );

    const filter: Record<
      string,
      any
    > = {
      _id:
        departmentObjectId,

      organizationId:
        organizationObjectId,
    };

    if (!includeArchived) {
      filter.$or = [
        {
          isArchived: false,
        },
        {
          isArchived: {
            $exists: false,
          },
        },
      ];
    }

    const doc =
      await this.departmentModel.findOne(
        filter,
      );

    if (!doc) {
      throw new NotFoundException(
        includeArchived
          ? "Department not found."
          : "Department not found or archived.",
      );
    }

    return doc;
  }
}