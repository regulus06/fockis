/**
 * church-groups.service.ts
 * -----------------------------------------------------------------------------
 * Business logic for Church Groups.
 *
 * Group membership lives on Membership.groupIds.
 * Group leaders are Membership IDs stored in leaderIds.
 *
 * Visibility:
 * - Organization owner can see groups.
 * - Active organization members can see active groups.
 * - Group creator can always see their own group.
 * - Group creator retains visibility after leaving the organization.
 * - Archived groups are hidden from ordinary members.
 * - Administrators can explicitly request archived groups.
 *
 * Creator:
 * - createdByUserId is always taken from the authenticated JWT user.
 * - The client cannot supply or override it.
 *
 * Archive:
 * - Group removal is a SOFT DELETE.
 * - The group document remains in MongoDB.
 * - Existing membership relationships remain.
 * - Leaders remain attached.
 * - Creator remains attached.
 * - createdAt remains preserved.
 *
 * Group membership:
 * - Organization membership is never deleted when removing someone
 *   from a group.
 * - Membership.groupIds[] is the source of truth for group membership.
 * - Group member IDs exposed by this service are Membership IDs.
 * -----------------------------------------------------------------------------
 */

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  ChurchGroup,
  ChurchGroupDocument,
} from "../schemas/church-group.schema";

import { CreateChurchGroupDto } from "../dto/create-church-group.dto";
import { UpdateChurchGroupDto } from "../dto/update-church-group.dto";

import {
  Membership,
  MembershipDocument,
} from "../../members/schemas/membership.schema";

import { MembersService } from "../../members/services/members.service";

/* ============================================================================
   TYPES
============================================================================ */

export interface ListGroupsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  includeArchived?: boolean;
}

export interface ListGroupMembersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface AddGroupMemberInput {
  userId?: string;
  email?: string;
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class ChurchGroupsService {
  constructor(
    @InjectModel(ChurchGroup.name)
    private readonly groupModel: Model<ChurchGroupDocument>,

    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,

    private readonly membersService: MembersService,
  ) {}

  /* ==========================================================================
     RESPONSE HELPERS
  ========================================================================== */

  /**
   * Convert a group document into the API response shape.
   */
  private async toResponse(
    doc: ChurchGroupDocument,
    viewerMembership: MembershipDocument | null,
  ) {
    const [memberCount, leaderDocs] =
      await Promise.all([
        this.membershipModel.countDocuments({
          organizationId: doc.organizationId,
          groupIds: doc._id,
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

      createdByUserId:
        doc.createdByUserId
          ? String(doc.createdByUserId)
          : null,

      departmentId:
        doc.departmentId
          ? String(doc.departmentId)
          : null,

      name: doc.name,

      groupType:
        doc.groupType,

      description:
        doc.description ??
        null,

      photoUrl:
        doc.photoUrl ??
        null,

      leaderIds:
        (doc.leaderIds ?? []).map(
          (id) => String(id),
        ),

      leaders:
        leaderDocs.map(
          (membership: any) => ({
            id: String(
              membership._id,
            ),

            membershipId:
              String(
                membership._id,
              ),

            userId:
              String(
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

      meetingSchedule:
        doc.meetingSchedule ??
        null,

      location:
        doc.location ??
        null,

      capacity:
        doc.capacity ??
        null,

      memberCount,

      isCurrentUserMember:
        viewerMembership
          ? (
              viewerMembership.groupIds ??
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
        doc.archivedAt ??
        null,

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

  /**
   * Convert a Membership into the
   * Member-compatible group response shape.
   *
   * IMPORTANT:
   *
   * id, _id, and membershipId all
   * refer to the Membership document ID.
   */
  private membershipToResponse(
    membership: any,
  ) {
    return {
      id: String(
        membership._id,
      ),

      _id: String(
        membership._id,
      ),

      membershipId:
        String(
          membership._id,
        ),

      organizationId:
        String(
          membership.organizationId,
        ),

      userId:
        String(
          membership.userId,
        ),

      profile:
        membership.profile ??
        null,

      role:
        membership.role,

      status:
        membership.status,

      permissions:
        Array.isArray(
          membership.permissions,
        )
          ? membership.permissions
          : [],

      groupIds:
        (
          membership.groupIds ??
          []
        ).map(
          (id: any) =>
            String(id),
        ),

      isActive:
        String(
          membership.status,
        ).toLowerCase() ===
        "active",
    };
  }

  /* ==========================================================================
     VALIDATION / HELPERS
  ========================================================================== */

  private validateObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    const normalized =
      String(value ?? "").trim();

    if (
      !normalized ||
      !Types.ObjectId.isValid(
        normalized,
      )
    ) {
      throw new NotFoundException(
        `${fieldName} is invalid.`,
      );
    }

    return new Types.ObjectId(
      normalized,
    );
  }

  /**
   * Escape a value before placing it
   * inside a MongoDB regex.
   */
  private escapeRegex(
    value: string,
  ): string {
    return value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
  }

  private isGroupCreator(
    doc: ChurchGroupDocument,
    userId: string,
  ): boolean {
    if (!doc.createdByUserId) {
      return false;
    }

    return (
      String(
        doc.createdByUserId,
      ) ===
      String(userId)
    );
  }

  /**
   * Require organization administrator access.
   *
   * MembersService is the authoritative
   * authorization layer.
   */
  private async requireGroupAdmin(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument> {
    return this.membersService.requireAdmin(
      organizationId,
      userId,
    );
  }

  /**
   * Verify that a group exists and belongs
   * to the requested organization.
   */
  private async findOrThrow(
    organizationId: string,
    groupId: string,
    includeArchived = false,
  ): Promise<ChurchGroupDocument> {
    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    const groupObjectId =
      this.validateObjectId(
        groupId,
        "Group ID",
      );

    const filter: Record<
      string,
      any
    > = {
      _id: groupObjectId,

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
      await this.groupModel.findOne(
        filter,
      );

    if (!doc) {
      throw new NotFoundException(
        includeArchived
          ? "Group not found."
          : "Group not found or archived.",
      );
    }

    return doc;
  }

  /* ==========================================================================
     LIST GROUPS
  ========================================================================== */

  async listByOrganization(
    organizationId: string,
    query: ListGroupsQuery = {},
    viewerUserId?: string,
  ) {
    const normalizedViewerUserId =
      String(
        viewerUserId ?? "",
      ).trim();

    if (!normalizedViewerUserId) {
      throw new ForbiddenException(
        "Authentication is required to view groups.",
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
        ? Math.floor(
            query.page,
          )
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

    const viewer =
      await this.membersService.getMembershipOrNull(
        organizationId,
        normalizedViewerUserId,
      );

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
      normalizedViewerUserId;

    const isActiveMember =
      viewer
        ? String(
            viewer.status,
          ).toLowerCase() ===
          "active"
        : false;

    let isAdministrator =
      isOrganizationOwner;

    if (!isAdministrator) {
      try {
        await this.requireGroupAdmin(
          organizationId,
          normalizedViewerUserId,
        );

        isAdministrator =
          true;
      } catch {
        isAdministrator =
          false;
      }
    }

    const filter: Record<
      string,
      any
    > = {
      organizationId:
        organizationObjectId,
    };

    if (
      query.departmentId?.trim()
    ) {
      filter.departmentId =
        this.validateObjectId(
          query.departmentId,
          "Department ID",
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

    if (!query.includeArchived) {
      if (
        isOrganizationOwner ||
        isActiveMember ||
        isAdministrator
      ) {
        Object.assign(
          filter,
          activeFilter,
        );
      } else {
        filter.$and = [
          activeFilter,
          {
            createdByUserId:
              this.validateObjectId(
                normalizedViewerUserId,
                "Creator user ID",
              ),
          },
        ];
      }
    } else if (!isAdministrator) {
      filter.$and = [
        {
          createdByUserId:
            this.validateObjectId(
              normalizedViewerUserId,
              "Creator user ID",
            ),
        },
      ];
    }

    const [docs, total] =
      await Promise.all([
        this.groupModel
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

        this.groupModel.countDocuments(
          filter,
        ),
      ]);

    const items =
      await Promise.all(
        docs.map((doc) =>
          this.toResponse(
            doc,
            viewer,
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

  /* ==========================================================================
     GET ONE GROUP
  ========================================================================== */

  async getById(
    organizationId: string,
    groupId: string,
    viewerUserId?: string,
    includeArchived = false,
  ) {
    const normalizedViewerUserId =
      String(
        viewerUserId ?? "",
      ).trim();

    if (!normalizedViewerUserId) {
      throw new ForbiddenException(
        "Authentication is required to view this group.",
      );
    }

    const doc =
      await this.findOrThrow(
        organizationId,
        groupId,
        true,
      );

    const viewer =
      await this.membersService.getMembershipOrNull(
        organizationId,
        normalizedViewerUserId,
      );

    const organization =
      await this.membersService.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.membersService.getOrganizationCreatorId(
        organization,
      );

    const isOwner =
      String(ownerId) ===
      normalizedViewerUserId;

    const isCreator =
      this.isGroupCreator(
        doc,
        normalizedViewerUserId,
      );

    const isActiveMember =
      viewer
        ? String(
            viewer.status,
          ).toLowerCase() ===
          "active"
        : false;

    if (doc.isArchived) {
      if (
        isOwner ||
        isCreator
      ) {
        return this.toResponse(
          doc,
          viewer,
        );
      }

      if (!includeArchived) {
        throw new NotFoundException(
          "Group not found or archived.",
        );
      }

      await this.requireGroupAdmin(
        organizationId,
        normalizedViewerUserId,
      );

      return this.toResponse(
        doc,
        viewer,
      );
    }

    if (
      !isOwner &&
      !isCreator &&
      !isActiveMember
    ) {
      throw new ForbiddenException(
        "You must be an active member of this organization or the group creator to view this group.",
      );
    }

    return this.toResponse(
      doc,
      viewer,
    );
  }

  /* ==========================================================================
     CREATE
  ========================================================================== */

  async create(
    organizationId: string,
    dto: CreateChurchGroupDto,
    actorUserId: string,
  ) {
    const actor =
      await this.requireGroupAdmin(
        organizationId,
        actorUserId,
      );

    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    const creatorUserId =
      this.validateObjectId(
        actorUserId,
        "Creator user ID",
      );

    /**
     * IMPORTANT:
     *
     * Do not use null for optional schema
     * fields whose TypeScript type is string
     * or ObjectId.
     *
     * Use undefined instead.
     */
    const created =
      await this.groupModel.create({
        organizationId:
          organizationObjectId,

        createdByUserId:
          creatorUserId,

        departmentId:
          dto.departmentId
            ? this.validateObjectId(
                dto.departmentId,
                "Department ID",
              )
            : undefined,

        name:
          dto.name.trim(),

        groupType:
          dto.groupType,

        description:
          dto.description?.trim() ||
          undefined,

        photoUrl:
          dto.photoUrl?.trim() ||
          undefined,

        leaderIds:
          (
            dto.leaderIds ??
            []
          ).map(
            (id) =>
              this.validateObjectId(
                id,
                "Leader ID",
              ),
          ),

        meetingSchedule:
          dto.meetingSchedule,

        location:
          dto.location,

        capacity:
          dto.capacity ??
          undefined,

        isArchived:
          false,

        archivedAt:
          undefined,

        archivedByUserId:
          undefined,
      });

    return this.toResponse(
      created,
      actor,
    );
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  async update(
    organizationId: string,
    groupId: string,
    dto: UpdateChurchGroupDto,
    actorUserId: string,
  ) {
    const actor =
      await this.requireGroupAdmin(
        organizationId,
        actorUserId,
      );

    const doc =
      await this.findOrThrow(
        organizationId,
        groupId,
        false,
      );

    if (
      dto.name !==
      undefined
    ) {
      doc.name =
        dto.name.trim();
    }

    if (
      dto.groupType !==
      undefined
    ) {
      doc.groupType =
        dto.groupType;
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
        undefined;
    }

    if (
      dto.departmentId !==
      undefined
    ) {
      doc.departmentId =
        dto.departmentId
          ? this.validateObjectId(
              dto.departmentId,
              "Department ID",
            )
          : undefined;
    }

    if (
      dto.leaderIds !==
      undefined
    ) {
      doc.leaderIds =
        dto.leaderIds.map(
          (id) =>
            this.validateObjectId(
              id,
              "Leader ID",
            ),
        );
    }

    if (
      dto.meetingSchedule !==
      undefined
    ) {
      doc.meetingSchedule =
        dto.meetingSchedule;
    }

    if (
      dto.location !==
      undefined
    ) {
      doc.location =
        dto.location;
    }

    if (
      dto.capacity !==
      undefined
    ) {
      doc.capacity =
        dto.capacity ??
        undefined;
    }

    await doc.save();

    return this.toResponse(
      doc,
      actor,
    );
  }

  /* ==========================================================================
     ARCHIVE
  ========================================================================== */

  async remove(
    organizationId: string,
    groupId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.requireGroupAdmin(
      organizationId,
      actorUserId,
    );

    const doc =
      await this.findOrThrow(
        organizationId,
        groupId,
        true,
      );

    if (doc.isArchived) {
      throw new ConflictException(
        "Group is already archived.",
      );
    }

    doc.isArchived =
      true;

    doc.archivedAt =
      new Date();

    doc.archivedByUserId =
      this.validateObjectId(
        actorUserId,
        "Archiver user ID",
      );

    /**
     * Existing Membership.groupIds
     * relationships are deliberately
     * preserved.
     */

    await doc.save();
  }

  /* ==========================================================================
     RESTORE
  ========================================================================== */

  async restore(
    organizationId: string,
    groupId: string,
    actorUserId: string,
  ) {
    const actor =
      await this.requireGroupAdmin(
        organizationId,
        actorUserId,
      );

    const doc =
      await this.findOrThrow(
        organizationId,
        groupId,
        true,
      );

    if (!doc.isArchived) {
      throw new ConflictException(
        "Group is already active.",
      );
    }

    doc.isArchived =
      false;

    doc.archivedAt =
      undefined;

    doc.archivedByUserId =
      undefined;

    await doc.save();

    return this.toResponse(
      doc,
      actor,
    );
  }

  /* ==========================================================================
     JOIN
  ========================================================================== */

  async join(
    organizationId: string,
    groupId: string,
    requesterUserId: string,
  ): Promise<void> {
    const group =
      await this.findOrThrow(
        organizationId,
        groupId,
        false,
      );

    if (group.isArchived) {
      throw new ForbiddenException(
        "Archived groups cannot accept new members.",
      );
    }

    const membership =
      await this.membersService.requireActiveMembership(
        organizationId,
        requesterUserId,
      );

    const alreadyMember =
      (
        membership.groupIds ??
        []
      ).some(
        (id) =>
          String(id) ===
          String(group._id),
      );

    if (
      !alreadyMember &&
      group.capacity !=
        null
    ) {
      const currentCount =
        await this.membershipModel.countDocuments(
          {
            organizationId:
              group.organizationId,

            groupIds:
              group._id,
          },
        );

      if (
        currentCount >=
        group.capacity
      ) {
        throw new ConflictException(
          "This group has reached its capacity.",
        );
      }
    }

    await this.membersService.adjustGroupMembership(
      String(
        membership._id,
      ),

      groupId,

      true,
    );
  }

  /* ==========================================================================
     LEAVE
  ========================================================================== */

  async leave(
    organizationId: string,
    groupId: string,
    requesterUserId: string,
  ): Promise<void> {
    const group =
      await this.findOrThrow(
        organizationId,
        groupId,
        true,
      );

    if (group.isArchived) {
      throw new ForbiddenException(
        "Archived groups are read-only.",
      );
    }

    const membership =
      await this.membersService.requireActiveMembership(
        organizationId,
        requesterUserId,
      );

    await this.membersService.adjustGroupMembership(
      String(
        membership._id,
      ),

      groupId,

      false,
    );
  }

  /* ==========================================================================
     LIST GROUP MEMBERS
  ========================================================================== */

  /**
   * List the Church memberships belonging
   * to a group.
   *
   * Membership relationships are stored in:
   *
   * Membership.groupIds[]
   */
  async listMembers(
    organizationId: string,
    groupId: string,
    query: ListGroupMembersQuery = {},
    viewerUserId?: string,
  ) {
    const normalizedViewerUserId =
      String(
        viewerUserId ?? "",
      ).trim();

    if (!normalizedViewerUserId) {
      throw new ForbiddenException(
        "Authentication is required to view group members.",
      );
    }

    const group =
      await this.findOrThrow(
        organizationId,
        groupId,
        true,
      );

    const viewer =
      await this.membersService.getMembershipOrNull(
        organizationId,
        normalizedViewerUserId,
      );

    const organization =
      await this.membersService.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.membersService.getOrganizationCreatorId(
        organization,
      );

    const isOwner =
      String(ownerId) ===
      normalizedViewerUserId;

    const isCreator =
      this.isGroupCreator(
        group,
        normalizedViewerUserId,
      );

    const isActiveMember =
      viewer
        ? String(
            viewer.status,
          ).toLowerCase() ===
          "active"
        : false;

    let isAdministrator =
      isOwner;

    if (!isAdministrator) {
      try {
        await this.requireGroupAdmin(
          organizationId,
          normalizedViewerUserId,
        );

        isAdministrator =
          true;
      } catch {
        isAdministrator =
          false;
      }
    }

    if (
      !isOwner &&
      !isCreator &&
      !isActiveMember &&
      !isAdministrator
    ) {
      throw new ForbiddenException(
        "You must be an active organization member, administrator, or group creator to view group members.",
      );
    }

    const page =
      query.page &&
      query.page > 0
        ? Math.floor(
            query.page,
          )
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

    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    const groupObjectId =
      this.validateObjectId(
        groupId,
        "Group ID",
      );

    const filter: Record<
      string,
      any
    > = {
      organizationId:
        organizationObjectId,

      groupIds:
        groupObjectId,
    };

    if (query.search?.trim()) {
      const search =
        this.escapeRegex(
          query.search.trim(),
        );

      filter.$or = [
        {
          "profile.displayName": {
            $regex: search,
            $options: "i",
          },
        },

        {
          "profile.name": {
            $regex: search,
            $options: "i",
          },
        },

        {
          "profile.email": {
            $regex: search,
            $options: "i",
          },
        },

        {
          userId: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const [docs, total] =
      await Promise.all([
        this.membershipModel
          .find(filter)
          .sort({
            createdAt: 1,
          })
          .skip(
            (page - 1) *
              pageSize,
          )
          .limit(pageSize)
          .lean()
          .exec(),

        this.membershipModel.countDocuments(
          filter,
        ),
      ]);

    const items =
      docs.map(
        (membership: any) =>
          this.membershipToResponse(
            membership,
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

  /* ==========================================================================
     ADD EXISTING MEMBER
  ========================================================================== */

  /**
   * Add an existing organization member
   * to a group.
   *
   * This does NOT create a new Fockis account.
   *
   * The target must already have an active
   * Church Membership.
   */
  async addMember(
    organizationId: string,
    groupId: string,
    input: AddGroupMemberInput,
    actorUserId: string,
  ) {
    const actor =
      await this.requireGroupAdmin(
        organizationId,
        actorUserId,
      );

    const group =
      await this.findOrThrow(
        organizationId,
        groupId,
        false,
      );

    if (group.isArchived) {
      throw new ForbiddenException(
        "Archived groups cannot accept members.",
      );
    }

    const targetUserId =
      input.userId?.trim();

    const targetEmail =
      input.email?.trim();

    if (
      !targetUserId &&
      !targetEmail
    ) {
      throw new ConflictException(
        "A userId or email is required to add a group member.",
      );
    }

    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    let targetMembership:
      | MembershipDocument
      | null = null;

    if (targetUserId) {
      targetMembership =
        await this.membershipModel.findOne(
          {
            organizationId:
              organizationObjectId,

            userId:
              targetUserId,
          },
        );
    }

    if (
      !targetMembership &&
      targetEmail
    ) {
      targetMembership =
        await this.membershipModel.findOne(
          {
            organizationId:
              organizationObjectId,

            "profile.email": {
              $regex:
                `^${this.escapeRegex(
                  targetEmail,
                )}$`,

              $options: "i",
            },
          },
        );
    }

    if (!targetMembership) {
      throw new NotFoundException(
        "The requested user is not a member of this organization.",
      );
    }

    if (
      String(
        targetMembership.status,
      ).toLowerCase() !==
      "active"
    ) {
      throw new ForbiddenException(
        "Only active organization members can be added to a group.",
      );
    }

    const alreadyMember =
      (
        targetMembership.groupIds ??
        []
      ).some(
        (id) =>
          String(id) ===
          String(group._id),
      );

    if (alreadyMember) {
      throw new ConflictException(
        "This member is already in the group.",
      );
    }

    if (
      group.capacity !=
      null
    ) {
      const currentCount =
        await this.membershipModel.countDocuments(
          {
            organizationId:
              group.organizationId,

            groupIds:
              group._id,
          },
        );

      if (
        currentCount >=
        group.capacity
      ) {
        throw new ConflictException(
          "This group has reached its capacity.",
        );
      }
    }

    await this.membersService.adjustGroupMembership(
      String(
        targetMembership._id,
      ),

      groupId,

      true,
    );

    const updated =
      await this.membershipModel.findById(
        targetMembership._id,
      );

    if (!updated) {
      throw new NotFoundException(
        "Group membership could not be loaded after adding the member.",
      );
    }

    return {
      ...this.membershipToResponse(
        updated,
      ),

      addedByUserId:
        String(
          actor.userId,
        ),
    };
  }

  /* ==========================================================================
     REMOVE MEMBER FROM GROUP
  ========================================================================== */

  /**
   * Remove a Church membership from a group.
   *
   * This does NOT delete the organization
   * membership.
   *
   * It only removes the group ID from:
   *
   * Membership.groupIds[]
   */
  async removeMember(
    organizationId: string,
    groupId: string,
    memberId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.requireGroupAdmin(
      organizationId,
      actorUserId,
    );

    const group =
      await this.findOrThrow(
        organizationId,
        groupId,
        true,
      );

    if (group.isArchived) {
      throw new ForbiddenException(
        "Archived groups are read-only.",
      );
    }

    const organizationObjectId =
      this.validateObjectId(
        organizationId,
        "Organization ID",
      );

    const membershipObjectId =
      this.validateObjectId(
        memberId,
        "Member ID",
      );

    const membership =
      await this.membershipModel.findOne(
        {
          _id:
            membershipObjectId,

          organizationId:
            organizationObjectId,
        },
      );

    if (!membership) {
      throw new NotFoundException(
        "Organization membership not found.",
      );
    }

    const isMember =
      (
        membership.groupIds ??
        []
      ).some(
        (id) =>
          String(id) ===
          String(group._id),
      );

    if (!isMember) {
      throw new NotFoundException(
        "This member does not belong to the group.",
      );
    }

    await this.membersService.adjustGroupMembership(
      String(
        membership._id,
      ),

      groupId,

      false,
    );
  }

  /* ==========================================================================
     ORGANIZATION CLEANUP
  ========================================================================== */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    await this.groupModel.deleteMany(
      {
        organizationId:
          this.validateObjectId(
            organizationId,
            "Organization ID",
          ),
      },
    );
  }
}