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
    const actor =
      await this.requireDepartmentAdmin(
        organizationId,
        actorUserId,
      );

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
            this.normalizeLeaderIds(
              dto.leaderIds,
            ),

          isArchived: false,

          archivedAt: null,

          archivedByUserId: null,
        },
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
    const actor =
      await this.requireDepartmentAdmin(
        organizationId,
        actorUserId,
      );

    const doc =
      await this.findOrThrow(
        organizationId,
        departmentId,
        false,
      );

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
        this.normalizeLeaderIds(
          dto.leaderIds,
        );
    }

    await doc.save();

    return this.toResponse(
      doc,
      actor,
    );
  }

  /* =========================================================================
     ARCHIVE
     ========================================================================= */

  async remove(
    organizationId: string,
    departmentId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.requireDepartmentAdmin(
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
  }

  /* =========================================================================
     RESTORE
     ========================================================================= */

  async restore(
    organizationId: string,
    departmentId: string,
    actorUserId: string,
  ) {
    const actor =
      await this.requireDepartmentAdmin(
        organizationId,
        actorUserId,
      );

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

    await this.membersService.adjustDepartmentMembership(
      String(
        membership._id,
      ),
      departmentId,
      true,
    );
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

    await this.requireDepartmentAdmin(
      organizationId,
      actorUserId,
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
      true,
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

    await this.requireDepartmentAdmin(
      organizationId,
      actorUserId,
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