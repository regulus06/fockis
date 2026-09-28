/**
 * members.service.ts
 * -----------------------------------------------------------------------------
 * FOCKIS CHURCH — MEMBERS SERVICE
 *
 * Authorization model:
 *
 * 1. Organization.createdByUserId is the ONLY source of ownership.
 * 2. Owner has full organization authority and bypasses permissions[].
 * 3. Owner membership is always Active + Administrator.
 * 4. Non-owners must have an ACTIVE membership for protected operations.
 * 5. Protected operations use exact ChurchPermission values.
 * 6. Roles do not grant feature permissions by themselves.
 * 7. ManageAdministrators is required for Administrator/Pastor-Director changes.
 * 8. ManagePermissions is required to modify permissions[].
 * 9. Non-owners cannot modify the owner's membership.
 * 10. Non-owners cannot grant permissions to themselves.
 * 11. Dangerous organization permissions cannot be self-granted.
 *
 * MEMBERSHIP ACTIONS:
 *
 * Accept:
 *   POST /organizations/:organizationId/members/:memberId/accept
 *
 * Reject:
 *   POST /organizations/:organizationId/members/:memberId/reject
 *
 * Enable:
 *   PATCH /organizations/:organizationId/members/:memberId/status
 *   { "status": "active" }
 *
 * Disable:
 *   PATCH /organizations/:organizationId/members/:memberId/status
 *   { "status": "inactive" }
 *
 * Remove:
 *   DELETE /organizations/:organizationId/members/:memberId
 *
 * ADMIN DASHBOARD:
 *
 *   GET /organizations/:organizationId/members/me/admin-access
 *
 * The backend determines whether the authenticated user can enter the
 * organization administration dashboard.
 *
 * IMPORTANT:
 *
 * MembershipStatus does NOT contain "Rejected".
 *
 * A rejected pending request is archived using:
 *
 *   MembershipStatus.Archived
 * ---------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Membership,
  MembershipDocument,
} from '../schemas/membership.schema';

import {
  Department,
  DepartmentDocument,
} from '../../departments/schemas/department.schema';

import {
  ChurchGroup,
  ChurchGroupDocument,
} from '../../groups/schemas/church-group.schema';

import {
  Organization,
  OrganizationDocument,
} from '../../organizations/schemas/organization.schema';

import {
  OrganizationDomain,
  OrganizationDomainDocument,
  OrganizationDomainType,
} from '../../../organization-identity/schemas/organization-domain.schema';

import { AddMemberDto } from '../dto/add-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';

import { MembershipStatus } from '../../enums/membership-status.enum';

import {
  ADMIN_MEMBER_ROLES,
  MemberRole,
} from '../../enums/member-role.enum';

import {
  ChurchPermission,
} from '../../enums/permission.enum';

import {
  OrganizationBadgeService,
} from '../../../organization-badges/services/organization-badge.service';

/* ============================================================================
   TYPES
============================================================================ */

export interface ListMembersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: MembershipStatus;
  role?: MemberRole;
  branchId?: string;
  departmentId?: string;
  groupId?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AuthUser {
  id: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface ChurchActor {
  organizationId?: string | Types.ObjectId | null;
  userId?: string | Types.ObjectId | null;
  id?: string | Types.ObjectId | null;
}

export interface AdminDashboardAccess {
  allowed: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  status: MembershipStatus;
  role: MemberRole;
  permissions: ChurchPermission[];
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,

    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,

    @InjectModel(ChurchGroup.name)
    private readonly groupModel: Model<ChurchGroupDocument>,

    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,

    @InjectModel(OrganizationDomain.name)
    private readonly organizationDomainModel: Model<OrganizationDomainDocument>,

    private readonly organizationBadgeService: OrganizationBadgeService,
  ) {}

  /* ==========================================================================
     OBJECT ID HELPERS
  ========================================================================== */

  private toObjectId(
    value: string,
    fieldName = 'ID',
  ): Types.ObjectId {
    if (
      !value ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new BadRequestException(
        `Invalid ${fieldName}.`,
      );
    }

    return new Types.ObjectId(value);
  }

  private toOptionalObjectId(
    value?: string | null,
    fieldName = 'ID',
  ): Types.ObjectId | undefined {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return undefined;
    }

    return this.toObjectId(
      value,
      fieldName,
    );
  }

  /* ==========================================================================
     ACTOR HELPERS
  ========================================================================== */

  private getActorOrganizationId(
    actor: ChurchActor,
  ): string {
    const organizationId =
      actor.organizationId;

    if (
      organizationId === undefined ||
      organizationId === null ||
      String(organizationId).trim() === ''
    ) {
      throw new BadRequestException(
        'Organization ID is required.',
      );
    }

    return String(
      organizationId,
    );
  }

  private getActorUserId(
    actor: ChurchActor,
  ): string {
    const userId =
      actor.userId ??
      actor.id;

    if (
      userId === undefined ||
      userId === null ||
      String(userId).trim() === ''
    ) {
      throw new BadRequestException(
        'User ID is required.',
      );
    }

    return String(
      userId,
    );
  }

  /* ==========================================================================
     ORGANIZATION BADGE SYNCHRONIZATION
  ========================================================================== */

  private async syncOrganizationBadge(
    membership: MembershipDocument,
  ): Promise<void> {
    if (
      membership.status !==
      MembershipStatus.Active
    ) {
      return;
    }

    await this.organizationBadgeService.createOrUpdateForMembership(
      String(membership._id),
    );
  }

  private async deactivateOrganizationBadge(
    membership: MembershipDocument,
  ): Promise<void> {
    await this.organizationBadgeService.deactivateForMembership(
      String(membership._id),
    );
  }

  /* ==========================================================================
     ORGANIZATION
  ========================================================================== */

  /**
   * PUBLIC INTENTIONALLY.
   *
   * Church DepartmentsService and ChurchGroupsService use this method to
   * resolve the organization before applying their own visibility rules.
   */
  async getOrganization(
    organizationId: string,
  ): Promise<OrganizationDocument> {
    const id =
      this.toObjectId(
        organizationId,
        'organization ID',
      );

    const organization =
      await this.organizationModel.findById(id);

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    return organization;
  }

  /**
   * PUBLIC INTENTIONALLY.
   *
   * Ownership is determined from Organization.createdByUserId.
   *
   * Legacy organizations without createdByUserId can recover ownership from
   * the oldest active administrator-level membership.
   *
   * Once recovered, ownership is permanently written to
   * Organization.createdByUserId.
   */
  async getOrganizationCreatorId(
    organizationOrId:
      | OrganizationDocument
      | string,
  ): Promise<Types.ObjectId> {
    const organization =
      typeof organizationOrId === 'string'
        ? await this.getOrganization(
            organizationOrId,
          )
        : organizationOrId;

    const recordedOwner =
      (organization as any)
        .createdByUserId;

    if (
      recordedOwner &&
      Types.ObjectId.isValid(
        String(recordedOwner),
      )
    ) {
      return new Types.ObjectId(
        String(recordedOwner),
      );
    }

    const legacyOwner =
      await this.membershipModel
        .findOne({
          organizationId:
            organization._id,

          status:
            MembershipStatus.Active,

          role: {
            $in: [
              ...ADMIN_MEMBER_ROLES,
            ],
          },
        })
        .sort({
          createdAt: 1,
          _id: 1,
        });

    if (!legacyOwner) {
      throw new ForbiddenException(
        'Organization ownership could not be established.',
      );
    }

    const ownerId =
      new Types.ObjectId(
        String(
          legacyOwner.userId,
        ),
      );

    await this.organizationModel.updateOne(
      {
        _id:
          organization._id,

        $or: [
          {
            createdByUserId: {
              $exists: false,
            },
          },
          {
            createdByUserId: null,
          },
        ],
      },
      {
        $set: {
          createdByUserId:
            ownerId,
        },
      },
    );

    return ownerId;
  }

  /**
   * Compatibility alias used by Church services.
   */
  async isOrganizationOwner(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    return this.isOwner(
      organizationId,
      userId,
    );
  }

  /* ==========================================================================
     ORGANIZATION DOMAIN
  ========================================================================== */

  /**
   * Returns the organization's configured Fockis identity domain.
   *
   * The domain is resolved from organization-identity because that module
   * remains the source of truth for domain records.
   */
  private async getOrganizationBaseDomain(
    organizationId: Types.ObjectId,
  ): Promise<string | null> {
    const domain =
      await this.organizationDomainModel.findOne({
        organizationId,

        domainType:
          OrganizationDomainType.Organization,
      });

    if (!domain) {
      return null;
    }

    const value =
      (domain as any).domain;

    if (
      typeof value !== 'string' ||
      !value.trim()
    ) {
      return null;
    }

    return value
      .trim()
      .toLowerCase();
  }

  /**
   * Requires an organization to have a configured Fockis base domain before
   * member provisioning.
   *
   * Example:
   *
   *   springfieldchurch.fockis.com
   *
   * This does not perform DNS verification. It verifies that Fockis has a
   * stored organization identity domain.
   */
  private async requireOrganizationBaseDomain(
    organizationId: Types.ObjectId,
  ): Promise<string> {
    const domain =
      await this.getOrganizationBaseDomain(
        organizationId,
      );

    if (!domain) {
      throw new BadRequestException(
        'This organization does not have a configured Fockis base domain.',
      );
    }

    return domain;
  }

  /**
   * Builds a member-specific Fockis domain.
   *
   * Example:
   *
   *   john.springfieldchurch.fockis.com
   *
   * This is a logical namespace helper. It does not claim that a DNS record
   * has been created.
   */
  private buildMemberDomain(
    baseDomain: string,
    memberPrefix: string,
  ): string {
    const normalizedBase =
      baseDomain
        .trim()
        .toLowerCase()
        .replace(/\.$/, '');

    const normalizedPrefix =
      memberPrefix
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

    if (!normalizedPrefix) {
      throw new BadRequestException(
        'A valid member domain prefix is required.',
      );
    }

    return `${normalizedPrefix}.${normalizedBase}`;
  }

  /**
   * Public compatibility helper for services that need the organization's
   * base Fockis domain.
   */
  async getOrganizationDomain(
    organizationId: string,
  ): Promise<string> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organization ID',
      );

    return this.requireOrganizationBaseDomain(
      organizationObjectId,
    );
  }

  /**
   * Returns the logical member namespace for a user.
   *
   * This does not persist a member-domain record by itself.
   */
  async getMemberDomain(
    organizationId: string,
    memberId: string,
  ): Promise<string> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const baseDomain =
      await this.requireOrganizationBaseDomain(
        organization._id,
      );

    const prefix =
      String(target.userId);

    return this.buildMemberDomain(
      baseDomain,
      prefix,
    );
  }

  /* ==========================================================================
     OWNERSHIP
  ========================================================================== */

  async isOwner(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    return (
      String(ownerId) ===
      String(userId)
    );
  }

  async ensureOwnerMembership(
    organizationId: string,
  ): Promise<MembershipDocument> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    let membership =
      await this.membershipModel.findOne({
        organizationId:
          organization._id,

        userId:
          ownerId,
      });

    if (!membership) {
      membership =
        await this.membershipModel.create({
          organizationId:
            organization._id,

          userId:
            ownerId,

          status:
            MembershipStatus.Active,

          role:
            MemberRole.Administrator,

          permissions: [],

          joinedAt:
            new Date(),
        });

      await this.syncOrganizationBadge(
        membership,
      );

      return membership;
    }

    const repaired =
      await this.repairOwnerMembership(
        membership,
        organization,
        ownerId,
      );

    await this.syncOrganizationBadge(
      repaired,
    );

    return repaired;
  }

  private async repairOwnerMembership(
    membership: MembershipDocument,
    organization: OrganizationDocument,
    ownerId: Types.ObjectId,
  ): Promise<MembershipDocument> {
    const update: Record<
      string,
      unknown
    > = {};

    if (
      membership.status !==
      MembershipStatus.Active
    ) {
      update.status =
        MembershipStatus.Active;
    }

    if (
      membership.role !==
      MemberRole.Administrator
    ) {
      update.role =
        MemberRole.Administrator;
    }

    if (!membership.joinedAt) {
      update.joinedAt =
        new Date();
    }

    if (
      String(membership.userId) !==
      String(ownerId)
    ) {
      throw new ForbiddenException(
        'Owner membership integrity check failed.',
      );
    }

    if (
      Object.keys(update).length === 0
    ) {
      return membership;
    }

    await this.membershipModel.updateOne(
      {
        _id:
          membership._id,

        organizationId:
          organization._id,

        userId:
          ownerId,
      },
      {
        $set:
          update,
      },
    );

    const repaired =
      await this.membershipModel.findById(
        membership._id,
      );

    if (!repaired) {
      throw new NotFoundException(
        'Owner membership could not be restored.',
      );
    }

    return repaired;
  }

  async restoreOwnerMembership(
    organizationId: string,
  ): Promise<MembershipDocument> {
    return this.ensureOwnerMembership(
      organizationId,
    );
  }

  /* ==========================================================================
     MEMBERSHIP LOOKUP
  ========================================================================== */

  async getMembershipOrNull(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument | null> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organization ID',
      );

    const userObjectId =
      this.toObjectId(
        userId,
        'user ID',
      );

    return this.membershipModel.findOne({
      organizationId:
        organizationObjectId,

      userId:
        userObjectId,
    });
  }

  async getMembershipByIdOrNull(
    organizationId: string,
    memberId: string,
  ): Promise<MembershipDocument | null> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organization ID',
      );

    const memberObjectId =
      this.toObjectId(
        memberId,
        'member ID',
      );

    return this.membershipModel.findOne({
      _id:
        memberObjectId,

      organizationId:
        organizationObjectId,
    });
  }

  async getActorMembership(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument | null> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    if (
      String(ownerId) ===
      String(userId)
    ) {
      return this.ensureOwnerMembership(
        organizationId,
      );
    }

    return this.getMembershipOrNull(
      organizationId,
      userId,
    );
  }

  async requireActiveMembership(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument> {
    const membership =
      await this.getActorMembership(
        organizationId,
        userId,
      );

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this organization.',
      );
    }

    if (
      membership.status !==
      MembershipStatus.Active
    ) {
      throw new ForbiddenException(
        'Your organization membership is not active.',
      );
    }

    return membership;
  }

  /* ==========================================================================
     ATTENDANCE ACCESS
  ========================================================================== */

  async requireAttendanceAccess(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument> {
    const membership =
      await this.requireActiveMembership(
        organizationId,
        userId,
      );

    if (
      membership.role ===
      MemberRole.Guest
    ) {
      throw new ForbiddenException(
        'Guest members do not have personal attendance access.',
      );
    }

    return membership;
  }

  /* ==========================================================================
     ROLE / PERMISSION HELPERS
  ========================================================================== */

  private isAdminRole(
    role?: MemberRole | null,
  ): boolean {
    return (
      !!role &&
      ADMIN_MEMBER_ROLES.includes(
        role,
      )
    );
  }

  async isAdmin(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    if (
      String(ownerId) ===
      String(userId)
    ) {
      return true;
    }

    const membership =
      await this.getMembershipOrNull(
        organizationId,
        userId,
      );

    return (
      !!membership &&
      membership.status ===
        MembershipStatus.Active &&
      this.isAdminRole(
        membership.role,
      )
    );
  }

  /* ==========================================================================
     ADMIN DASHBOARD ACCESS
  ========================================================================== */

  async requireAdminDashboardAccess(
    organizationId: string,
    userId: string,
  ): Promise<AdminDashboardAccess> {
    const membership =
      await this.getActorMembership(
        organizationId,
        userId,
      );

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this organization.',
      );
    }

    const isOwner =
      await this.isOwner(
        organizationId,
        userId,
      );

    if (isOwner) {
      return {
        allowed: true,

        isOwner: true,

        isAdmin: true,

        status:
          MembershipStatus.Active,

        role:
          MemberRole.Administrator,

        permissions:
          Object.values(
            ChurchPermission,
          ),
      };
    }

    if (
      membership.status !==
      MembershipStatus.Active
    ) {
      throw new ForbiddenException(
        'Your organization membership is not active.',
      );
    }

    const isAdmin =
      this.isAdminRole(
        membership.role,
      );

    if (!isAdmin) {
      throw new ForbiddenException(
        'Administrator-level access is required.',
      );
    }

    return {
      allowed: true,

      isOwner: false,

      isAdmin: true,

      status:
        membership.status,

      role:
        membership.role,

      permissions:
        Array.isArray(
          membership.permissions,
        )
          ? membership.permissions
          : [],
    };
  }

  /* ==========================================================================
     ADMIN ACCESS
  ========================================================================== */

  async requireAdmin(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument>;

  async requireAdmin(
    actor: ChurchActor | null,
  ): Promise<MembershipDocument>;

  async requireAdmin(
    organizationOrActor:
      | string
      | ChurchActor
      | null,
    userId?: string,
  ): Promise<MembershipDocument> {
    let resolvedOrganizationId: string;
    let resolvedUserId: string;

    if (
      typeof organizationOrActor ===
      'string'
    ) {
      resolvedOrganizationId =
        organizationOrActor;

      if (
        !userId ||
        String(userId).trim() === ''
      ) {
        throw new ForbiddenException(
          'User ID is required.',
        );
      }

      resolvedUserId =
        String(userId);
    } else {
      if (!organizationOrActor) {
        throw new ForbiddenException(
          'You must be a member of this organization to perform administrator actions.',
        );
      }

      resolvedOrganizationId =
        this.getActorOrganizationId(
          organizationOrActor,
        );

      resolvedUserId =
        this.getActorUserId(
          organizationOrActor,
        );
    }

    const organization =
      await this.getOrganization(
        resolvedOrganizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    if (
      String(ownerId) ===
      String(resolvedUserId)
    ) {
      return this.ensureOwnerMembership(
        resolvedOrganizationId,
      );
    }

    const membership =
      await this.requireActiveMembership(
        resolvedOrganizationId,
        resolvedUserId,
      );

    if (
      !this.isAdminRole(
        membership.role,
      )
    ) {
      throw new ForbiddenException(
        'Administrator-level access is required.',
      );
    }

    return membership;
  }

  async requireAdminForUser(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument> {
    return this.requireAdmin(
      organizationId,
      userId,
    );
  }

  /* ==========================================================================
     PERMISSIONS
  ========================================================================== */

  async hasPermission(
    organizationId: string,
    userId: string,
    permission: ChurchPermission,
  ): Promise<boolean> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    if (
      String(ownerId) ===
      String(userId)
    ) {
      return true;
    }

    const membership =
      await this.getMembershipOrNull(
        organizationId,
        userId,
      );

    if (
      !membership ||
      membership.status !==
        MembershipStatus.Active
    ) {
      return false;
    }

    return (
      Array.isArray(
        membership.permissions,
      ) &&
      membership.permissions.includes(
        permission,
      )
    );
  }

  async requirePermission(
    organizationId: string,
    userId: string,
    permission: ChurchPermission,
  ): Promise<MembershipDocument> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    if (
      String(ownerId) ===
      String(userId)
    ) {
      return this.ensureOwnerMembership(
        organizationId,
      );
    }

    const membership =
      await this.requireActiveMembership(
        organizationId,
        userId,
      );

    if (
      !membership.permissions?.includes(
        permission,
      )
    ) {
      throw new ForbiddenException(
        `Permission required: ${permission}.`,
      );
    }

    return membership;
  }

  async requireAnyPermission(
    organizationId: string,
    userId: string,
    permissions: ChurchPermission[],
  ): Promise<MembershipDocument> {
    if (!permissions.length) {
      throw new BadRequestException(
        'At least one permission is required.',
      );
    }

    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    if (
      String(ownerId) ===
      String(userId)
    ) {
      return this.ensureOwnerMembership(
        organizationId,
      );
    }

    const membership =
      await this.requireActiveMembership(
        organizationId,
        userId,
      );

    const granted =
      Array.isArray(
        membership.permissions,
      )
        ? membership.permissions
        : [];

    if (
      !permissions.some(
        (permission) =>
          granted.includes(
            permission,
          ),
      )
    ) {
      throw new ForbiddenException(
        'You do not have the required organization permission.',
      );
    }

    return membership;
  }

  /* ==========================================================================
     PERMISSION SECURITY
  ========================================================================== */

  private readonly dangerousPermissions =
    new Set<ChurchPermission>([
      ChurchPermission.ManagePermissions,
      ChurchPermission.ManageAdministrators,
      ChurchPermission.ArchiveOrganization,
      ChurchPermission.DeleteOrganization,
    ]);

  private validatePermissions(
    permissions: ChurchPermission[],
  ): ChurchPermission[] {
    const validValues =
      new Set(
        Object.values(
          ChurchPermission,
        ),
      );

    const unique = [
      ...new Set(
        permissions ?? [],
      ),
    ];

    for (const permission of unique) {
      if (
        !validValues.has(
          permission,
        )
      ) {
        throw new BadRequestException(
          `Invalid church permission: ${String(permission)}.`,
        );
      }
    }

    return unique;
  }

  private validatePermissionAssignment(
    actorUserId: string,
    target: MembershipDocument,
    permissions: ChurchPermission[],
    organization: OrganizationDocument,
  ): void {
    const recordedOwner =
      (organization as any)
        .createdByUserId;

    const ownerId =
      recordedOwner
        ? String(recordedOwner)
        : '';

    const targetUserId =
      String(target.userId);

    const actorIsOwner =
      ownerId ===
      String(actorUserId);

    if (
      targetUserId ===
      ownerId
    ) {
      throw new ForbiddenException(
        'The organization owner permissions cannot be modified.',
      );
    }

    if (
      targetUserId ===
      String(actorUserId) &&
      !actorIsOwner
    ) {
      throw new ForbiddenException(
        'You cannot modify your own organization permissions.',
      );
    }

    if (
      !actorIsOwner &&
      permissions.some(
        (permission) =>
          this.dangerousPermissions.has(
            permission,
          ),
      )
    ) {
      throw new ForbiddenException(
        'Dangerous organization permissions may only be assigned by the owner.',
      );
    }
  }

  async updateMembershipPermissions(
    organizationId: string,
    memberId: string,
    permissions: ChurchPermission[],
    actorUserId: string,
  ): Promise<MembershipDocument> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    await this.requirePermission(
      organizationId,
      actorUserId,
      ChurchPermission.ManagePermissions,
    );

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const normalized =
      this.validatePermissions(
        permissions,
      );

    this.validatePermissionAssignment(
      actorUserId,
      target,
      normalized,
      organization,
    );

    target.permissions =
      normalized;

    await target.save();

    return target;
  }

  async grantPermission(
    organizationId: string,
    memberId: string,
    permission: ChurchPermission,
    actorUserId: string,
  ): Promise<MembershipDocument> {
    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const current =
      Array.isArray(
        target.permissions,
      )
        ? target.permissions
        : [];

    return this.updateMembershipPermissions(
      organizationId,
      memberId,
      [
        ...current,
        permission,
      ],
      actorUserId,
    );
  }

  async revokePermission(
    organizationId: string,
    memberId: string,
    permission: ChurchPermission,
    actorUserId: string,
  ): Promise<MembershipDocument> {
    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const current =
      Array.isArray(
        target.permissions,
      )
        ? target.permissions
        : [];

    return this.updateMembershipPermissions(
      organizationId,
      memberId,
      current.filter(
        (item) =>
          item !== permission,
      ),
      actorUserId,
    );
  }

  /* ==========================================================================
     PROFILE HELPERS
  ========================================================================== */

  private buildPublicProfile(
    membership: MembershipDocument,
    viewer?: AuthUser | null,
  ) {
    const profile =
      (membership as any).profile ?? {};

    return {
      displayName:
        profile.displayName ??
        viewer?.displayName ??
        null,

      avatarUrl:
        profile.avatarUrl ??
        viewer?.avatarUrl ??
        null,
    };
  }

  /* ==========================================================================
     RESPONSE
  ========================================================================== */

  private async toResponse(
    membership: MembershipDocument,
    viewerUserId?: string,
  ) {
    const organizationId =
      String(
        membership.organizationId,
      );

    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    const memberUserId =
      String(membership.userId);

    const isOwner =
      memberUserId ===
      String(ownerId);

    const isSelf =
      !!viewerUserId &&
      memberUserId ===
      String(viewerUserId);

    let canViewPrivateProfile =
      isOwner ||
      isSelf;

    if (
      viewerUserId &&
      !canViewPrivateProfile
    ) {
      canViewPrivateProfile =
        await this.hasPermission(
          organizationId,
          viewerUserId,
          ChurchPermission.ViewPrivateMemberInfo,
        );
    }

    const response: Record<
      string,
      unknown
    > = {
      id:
        String(
          membership._id,
        ),

      organizationId,

      userId:
        String(
          membership.userId,
        ),

      branchId:
        membership.branchId
          ? String(
              membership.branchId,
            )
          : null,

      status:
        membership.status,

      role:
        membership.role,

      permissions:
        Array.isArray(
          membership.permissions,
        )
          ? membership.permissions
          : [],

      profile:
        this.buildPublicProfile(
          membership,
        ),

      departmentIds:
        Array.isArray(
          membership.departmentIds,
        )
          ? membership.departmentIds.map(
              (id) =>
                String(id),
            )
          : [],

      groupIds:
        Array.isArray(
          membership.groupIds,
        )
          ? membership.groupIds.map(
              (id) =>
                String(id),
            )
          : [],

      joinedAt:
        membership.joinedAt ??
        null,

      isOwner,

      isSelf,

      canViewPrivateProfile,
    };

    if (
      canViewPrivateProfile
    ) {
      const privateProfile =
        (membership as any)
          .privateProfile ?? {};

      response.privateProfile = {
        email:
          privateProfile.email ??
          null,

        phone:
          privateProfile.phone ??
          null,

        address:
          privateProfile.address ??
          null,

        dateOfBirth:
          privateProfile.dateOfBirth ??
          null,

        notes:
          privateProfile.notes ??
          null,
      };
    }

    return response;
  }

  /* ==========================================================================
     LIST
  ========================================================================== */

  async list(
    organizationId: string,
    query: ListMembersQuery = {},
    viewerUserId?: string,
  ): Promise<Paginated<any>> {
    await this.requirePermission(
      organizationId,
      viewerUserId ?? '',
      ChurchPermission.ViewMembers,
    );

    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organization ID',
      );

    const page =
      Math.max(
        1,
        Number(
          query.page ?? 1,
        ),
      );

    const pageSize =
      Math.min(
        100,
        Math.max(
          1,
          Number(
            query.pageSize ?? 20,
          ),
        ),
      );

    const filter: Record<
      string,
      any
    > = {
      organizationId:
        organizationObjectId,
    };

    if (query.status) {
      filter.status =
        query.status;
    }

    if (query.role) {
      filter.role =
        query.role;
    }

    if (query.branchId) {
      filter.branchId =
        this.toObjectId(
          query.branchId,
          'branch ID',
        );
    }

    if (query.departmentId) {
      filter.departmentIds =
        this.toObjectId(
          query.departmentId,
          'department ID',
        );
    }

    if (query.groupId) {
      filter.groupIds =
        this.toObjectId(
          query.groupId,
          'group ID',
        );
    }

    if (
      query.search?.trim()
    ) {
      const search =
        query.search.trim();

      filter.$or = [
        {
          'profile.displayName': {
            $regex:
              search,
            $options:
              'i',
          },
        },
        {
          'privateProfile.email': {
            $regex:
              search,
            $options:
              'i',
          },
        },
      ];
    }

    const skip =
      (page - 1) *
      pageSize;

    const [
      memberships,
      total,
    ] =
      await Promise.all([
        this.membershipModel
          .find(filter)
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(pageSize),

        this.membershipModel.countDocuments(
          filter,
        ),
      ]);

    const items =
      await Promise.all(
        memberships.map(
          (membership) =>
            this.toResponse(
              membership,
              viewerUserId,
            ),
        ),
      );

    return {
      items,
      total,
      page,
      pageSize,
      hasMore:
        skip +
          items.length <
        total,
    };
  }

  /* ==========================================================================
     GET ONE
  ========================================================================== */

  async getById(
    organizationId: string,
    memberId: string,
    viewerUserId?: string,
  ) {
    await this.requirePermission(
      organizationId,
      viewerUserId ?? '',
      ChurchPermission.ViewMembers,
    );

    const membership =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!membership) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    return this.toResponse(
      membership,
      viewerUserId,
    );
  }

  /* ==========================================================================
     MY MEMBERSHIP
  ========================================================================== */

  async getMyMembership(
    organizationId: string,
    userId: string,
  ) {
    const membership =
      await this.getActorMembership(
        organizationId,
        userId,
      );

    if (!membership) {
      return null;
    }

    const response =
      await this.toResponse(
        membership,
        userId,
      );

    const isOwner =
      await this.isOwner(
        organizationId,
        userId,
      );

    return {
      ...response,

      isAdmin:
        isOwner ||
        (
          membership.status ===
            MembershipStatus.Active &&
          this.isAdminRole(
            membership.role,
          )
        ),

      permissions:
        isOwner
          ? Object.values(
              ChurchPermission,
            )
          : (
              Array.isArray(
                membership.permissions,
              )
                ? membership.permissions
                : []
            ),

      canApproveMembers:
        isOwner ||
        (
          membership.status ===
            MembershipStatus.Active &&
          membership.permissions?.includes(
            ChurchPermission.ApproveMember,
          )
        ),
    };
  }

  /* ==========================================================================
     ADD MEMBER
  ========================================================================== */

  async add(
    organizationId: string,
    dto: AddMemberDto,
    actorUserId: string,
  ) {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    await this.requirePermission(
      organizationId,
      actorUserId,
      ChurchPermission.AddMember,
    );

    /*
     * A member can only be provisioned inside a Fockis organization
     * namespace.
     */
    const baseDomain =
      await this.requireOrganizationBaseDomain(
        organization._id,
      );

    if (!dto.userId) {
      throw new BadRequestException(
        'userId is required.',
      );
    }

    const userObjectId =
      this.toObjectId(
        dto.userId,
        'user ID',
      );

    if (
      dto.role &&
      this.isAdminRole(
        dto.role,
      )
    ) {
      throw new ForbiddenException(
        'Administrator-level roles must be assigned through the role management endpoint.',
      );
    }

    const existing =
      await this.membershipModel.findOne({
        organizationId:
          organization._id,

        userId:
          userObjectId,
      });

    if (existing) {
      throw new ConflictException(
        'This user is already a member of the organization.',
      );
    }

    /*
     * Validate that the organization namespace can produce a member domain.
     *
     * The generated member domain is currently logical and is not stored on
     * Membership unless the Membership schema explicitly supports it.
     */
    this.buildMemberDomain(
      baseDomain,
      String(dto.userId),
    );

    const membership =
      await this.membershipModel.create({
        organizationId:
          organization._id,

        userId:
          userObjectId,

        branchId:
          this.toOptionalObjectId(
            dto.branchId,
            'branch ID',
          ),

        status:
          MembershipStatus.Active,

        role:
          dto.role ??
          MemberRole.Member,

        permissions: [],

        joinedAt:
          new Date(),
      });

    await this.syncOrganizationBadge(
      membership,
    );

    return this.toResponse(
      membership,
      actorUserId,
    );
  }

  /* ==========================================================================
     UPDATE PROFILE
  ========================================================================== */

  async update(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberDto,
    actorUserId: string,
  ) {
    const actor =
      await this.getActorMembership(
        organizationId,
        actorUserId,
      );

    if (!actor) {
      throw new ForbiddenException(
        'You are not a member of this organization.',
      );
    }

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    const actorIsOwner =
      String(ownerId) ===
      String(actorUserId);

    const targetIsOwner =
      String(target.userId) ===
      String(ownerId);

    const targetIsSelf =
      String(target.userId) ===
      String(actorUserId);

    if (
      targetIsOwner &&
      !actorIsOwner
    ) {
      throw new ForbiddenException(
        'The organization owner membership cannot be modified.',
      );
    }

    if (
      !targetIsSelf &&
      !actorIsOwner
    ) {
      await this.requirePermission(
        organizationId,
        actorUserId,
        ChurchPermission.UpdateMember,
      );
    }

    const update: Record<
      string,
      unknown
    > = {};

    if (
      dto.profile !==
      undefined
    ) {
      update.profile =
        dto.profile;
    }

    if (
      dto.privateProfile !==
      undefined
    ) {
      if (
        !targetIsSelf &&
        !actorIsOwner
      ) {
        await this.requirePermission(
          organizationId,
          actorUserId,
          ChurchPermission.UpdateMember,
        );
      }

      update.privateProfile =
        dto.privateProfile;
    }

    if (
      dto.branchId !==
      undefined
    ) {
      if (
        !targetIsSelf &&
        !actorIsOwner
      ) {
        await this.requirePermission(
          organizationId,
          actorUserId,
          ChurchPermission.UpdateMember,
        );
      }

      update.branchId =
        this.toOptionalObjectId(
          dto.branchId,
          'branch ID',
        ) ?? null;
    }

    if (
      Object.keys(update).length === 0
    ) {
      return this.toResponse(
        target,
        actorUserId,
      );
    }

    Object.assign(
      target,
      update,
    );

    await target.save();

    if (
      target.status ===
      MembershipStatus.Active
    ) {
      await this.syncOrganizationBadge(
        target,
      );
    }

    return this.toResponse(
      target,
      actorUserId,
    );
  }

  /* ==========================================================================
     ACCEPT
  ========================================================================== */

  async acceptMembership(
    organizationId: string,
    memberId: string,
    actorUserId: string,
  ) {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    await this.requirePermission(
      organizationId,
      actorUserId,
      ChurchPermission.ApproveMember,
    );

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const targetIsOwner =
      String(target.userId) ===
      String(ownerId);

    if (targetIsOwner) {
      target.status =
        MembershipStatus.Active;

      target.role =
        MemberRole.Administrator;

      if (!target.joinedAt) {
        target.joinedAt =
          new Date();
      }

      await target.save();

      await this.syncOrganizationBadge(
        target,
      );

      return this.toResponse(
        target,
        actorUserId,
      );
    }

    if (
      target.status !==
      MembershipStatus.Pending
    ) {
      throw new BadRequestException(
        'Only pending membership requests can be accepted.',
      );
    }

    target.status =
      MembershipStatus.Active;

    if (!target.joinedAt) {
      target.joinedAt =
        new Date();
    }

    await target.save();

    await this.syncOrganizationBadge(
      target,
    );

    return this.toResponse(
      target,
      actorUserId,
    );
  }

  /* ==========================================================================
     ENABLE
  ========================================================================== */

  async enableMember(
    organizationId: string,
    memberId: string,
    actorUserId: string,
  ) {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const targetIsOwner =
      String(target.userId) ===
      String(ownerId);

    if (targetIsOwner) {
      target.status =
        MembershipStatus.Active;

      target.role =
        MemberRole.Administrator;

      if (!target.joinedAt) {
        target.joinedAt =
          new Date();
      }

      await target.save();

      await this.syncOrganizationBadge(
        target,
      );

      return this.toResponse(
        target,
        actorUserId,
      );
    }

    await this.requirePermission(
      organizationId,
      actorUserId,
      ChurchPermission.UpdateMember,
    );

    if (
      target.status ===
      MembershipStatus.Archived
    ) {
      throw new BadRequestException(
        'Archived members cannot be enabled. Restore or create a new membership instead.',
      );
    }

    if (
      target.status ===
      MembershipStatus.Active
    ) {
      await this.syncOrganizationBadge(
        target,
      );

      return this.toResponse(
        target,
        actorUserId,
      );
    }

    target.status =
      MembershipStatus.Active;

    if (!target.joinedAt) {
      target.joinedAt =
        new Date();
    }

    await target.save();

    await this.syncOrganizationBadge(
      target,
    );

    return this.toResponse(
      target,
      actorUserId,
    );
  }

  /* ==========================================================================
     DISABLE
  ========================================================================== */

  async disableMember(
    organizationId: string,
    memberId: string,
    actorUserId: string,
  ) {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const targetIsOwner =
      String(target.userId) ===
      String(ownerId);

    if (targetIsOwner) {
      throw new ForbiddenException(
        'The organization owner cannot be disabled.',
      );
    }

    await this.requirePermission(
      organizationId,
      actorUserId,
      ChurchPermission.UpdateMember,
    );

    if (
      target.status ===
      MembershipStatus.Archived
    ) {
      throw new BadRequestException(
        'Archived members cannot be disabled.',
      );
    }

    if (
      target.status ===
      MembershipStatus.Inactive
    ) {
      await this.deactivateOrganizationBadge(
        target,
      );

      return this.toResponse(
        target,
        actorUserId,
      );
    }

    if (
      target.status ===
        MembershipStatus.Active &&
      this.isAdminRole(
        target.role,
      )
    ) {
      const adminCount =
        await this.countActiveAdministrators(
          organizationId,
        );

      if (
        adminCount <= 1
      ) {
        throw new ForbiddenException(
          'The final Administrator-level member cannot be disabled.',
        );
      }
    }

    target.status =
      MembershipStatus.Inactive;

    await target.save();

    await this.deactivateOrganizationBadge(
      target,
    );

    return this.toResponse(
      target,
      actorUserId,
    );
  }

  /* ==========================================================================
     REJECT
  ========================================================================== */

  async rejectMembership(
    organizationId: string,
    memberId: string,
    actorUserId: string,
  ) {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    await this.requirePermission(
      organizationId,
      actorUserId,
      ChurchPermission.RejectMember,
    );

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const targetIsOwner =
      String(target.userId) ===
      String(ownerId);

    if (targetIsOwner) {
      throw new ForbiddenException(
        'The organization owner cannot be rejected.',
      );
    }

    if (
      target.status !==
      MembershipStatus.Pending
    ) {
      throw new BadRequestException(
        'Only pending membership requests can be rejected.',
      );
    }

    target.status =
      MembershipStatus.Archived;

    await target.save();

    return this.toResponse(
      target,
      actorUserId,
    );
  }

  /* ==========================================================================
     STATUS
  ========================================================================== */

  async updateStatus(
    organizationId: string,
    memberId: string,
    status: MembershipStatus,
    actorUserId: string,
  ) {
    if (
      !Object.values(
        MembershipStatus,
      ).includes(status)
    ) {
      throw new BadRequestException(
        'Invalid membership status.',
      );
    }

    if (
      status ===
      MembershipStatus.Active
    ) {
      return this.enableMember(
        organizationId,
        memberId,
        actorUserId,
      );
    }

    if (
      status ===
      MembershipStatus.Inactive
    ) {
      return this.disableMember(
        organizationId,
        memberId,
        actorUserId,
      );
    }

    if (
      status ===
      MembershipStatus.Archived
    ) {
      const organization =
        await this.getOrganization(
          organizationId,
        );

      const ownerId =
        await this.getOrganizationCreatorId(
          organization,
        );

      const target =
        await this.getMembershipByIdOrNull(
          organizationId,
          memberId,
        );

      if (!target) {
        throw new NotFoundException(
          'Member not found.',
        );
      }

      if (
        String(target.userId) ===
        String(ownerId)
      ) {
        throw new ForbiddenException(
          'The organization owner cannot be archived.',
        );
      }

      await this.requirePermission(
        organizationId,
        actorUserId,
        ChurchPermission.UpdateMember,
      );

      target.status =
        MembershipStatus.Archived;

      await target.save();

      await this.deactivateOrganizationBadge(
        target,
      );

      return this.toResponse(
        target,
        actorUserId,
      );
    }

    throw new BadRequestException(
      'Pending status can only be established through a membership request.',
    );
  }

  /* ==========================================================================
     ROLE
  ========================================================================== */

  async updateRole(
    organizationId: string,
    memberId: string,
    role: MemberRole,
    actorUserId: string,
  ) {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const targetIsOwner =
      String(target.userId) ===
      String(ownerId);

    if (
      targetIsOwner &&
      role !==
        MemberRole.Administrator
    ) {
      throw new ForbiddenException(
        'The organization owner must remain an Administrator.',
      );
    }

    const targetCurrentlyAdmin =
      this.isAdminRole(
        target.role,
      );

    const requestedAdmin =
      this.isAdminRole(
        role,
      );

    if (
      targetCurrentlyAdmin ||
      requestedAdmin
    ) {
      await this.requirePermission(
        organizationId,
        actorUserId,
        ChurchPermission.ManageAdministrators,
      );
    } else {
      await this.requirePermission(
        organizationId,
        actorUserId,
        ChurchPermission.UpdateMember,
      );
    }

    if (
      String(target.userId) ===
        String(actorUserId) &&
      requestedAdmin &&
      String(ownerId) !==
        String(actorUserId)
    ) {
      throw new ForbiddenException(
        'You cannot promote yourself to an administrator.',
      );
    }

    if (
      targetCurrentlyAdmin &&
      !requestedAdmin
    ) {
      const adminCount =
        await this.countActiveAdministrators(
          organizationId,
        );

      if (
        adminCount <= 1
      ) {
        throw new ForbiddenException(
          'The organization must retain at least one active Administrator-level member.',
        );
      }
    }

    target.role =
      role;

    await target.save();

    if (
      target.status ===
      MembershipStatus.Active
    ) {
      await this.syncOrganizationBadge(
        target,
      );
    }

    return this.toResponse(
      target,
      actorUserId,
    );
  }

  /* ==========================================================================
     REMOVE / LEAVE
  ========================================================================== */

  async remove(
    organizationId: string,
    memberId: string,
    actorUserId: string,
  ): Promise<void> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    const target =
      await this.getMembershipByIdOrNull(
        organizationId,
        memberId,
      );

    if (!target) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    const targetUserId =
      String(target.userId);

    const actorIsOwner =
      String(ownerId) ===
      String(actorUserId);

    const targetIsOwner =
      targetUserId ===
      String(ownerId);

    const isSelf =
      targetUserId ===
      String(actorUserId);

    if (targetIsOwner) {
      throw new ForbiddenException(
        'The organization owner cannot leave or be removed.',
      );
    }

    if (isSelf) {
      if (
        target.status ===
          MembershipStatus.Active &&
        this.isAdminRole(
          target.role,
        )
      ) {
        const adminCount =
          await this.countActiveAdministrators(
            organizationId,
          );

        if (
          adminCount <= 1
        ) {
          throw new ForbiddenException(
            'The final Administrator-level member cannot leave the organization.',
          );
        }
      }

      await this.deactivateOrganizationBadge(
        target,
      );

      await this.membershipModel.deleteOne({
        _id:
          target._id,

        organizationId:
          organization._id,
      });

      return;
    }

    if (!actorIsOwner) {
      await this.requirePermission(
        organizationId,
        actorUserId,
        ChurchPermission.RemoveMember,
      );
    }

    if (
      target.status ===
        MembershipStatus.Active &&
      this.isAdminRole(
        target.role,
      )
    ) {
      const adminCount =
        await this.countActiveAdministrators(
          organizationId,
        );

      if (
        adminCount <= 1
      ) {
        throw new ForbiddenException(
          'The final Administrator-level member cannot be removed.',
        );
      }
    }

    await this.deactivateOrganizationBadge(
      target,
    );

    await this.membershipModel.deleteOne({
      _id:
        target._id,

      organizationId:
        organization._id,
    });
  }

  /* ==========================================================================
     OWNER CREATION
  ========================================================================== */

  async createOwnerMembership(
    organizationId: string,
    userId: string,
  ): Promise<MembershipDocument> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const recordedOwner =
      await this.getOrganizationCreatorId(
        organization,
      );

    if (
      String(recordedOwner) !==
      String(userId)
    ) {
      throw new ForbiddenException(
        'Only the recorded organization creator can become the owner.',
      );
    }

    return this.ensureOwnerMembership(
      organizationId,
    );
  }

  /* ==========================================================================
     JOIN REQUEST
  ========================================================================== */

  async createJoinRequest(
    organizationId: string,
    requester: AuthUser,
    _autoApprove?: boolean,
  ): Promise<MembershipDocument> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const existing =
      await this.getMembershipOrNull(
        organizationId,
        requester.id,
      );

    if (existing) {
      throw new ConflictException(
        'You already have a membership or membership request for this organization.',
      );
    }

    const settings =
      (organization as any).settings ??
      {};

    const autoApprove =
      Boolean(
        settings.autoApproveMembers ??
        settings.autoApproveMemberships ??
        settings.membershipAutoApproval ??
        false,
      );

    const membership =
      await this.membershipModel.create({
        organizationId:
          organization._id,

        userId:
          this.toObjectId(
            requester.id,
            'user ID',
          ),

        status:
          autoApprove
            ? MembershipStatus.Active
            : MembershipStatus.Pending,

        role:
          MemberRole.Member,

        permissions: [],

        profile: {
          displayName:
            requester.displayName ??
            undefined,

          avatarUrl:
            requester.avatarUrl ??
            undefined,
        },

        privateProfile: {
          email:
            requester.email ??
            undefined,
        },

        joinedAt:
          autoApprove
            ? new Date()
            : undefined,
      });

    if (
      membership.status ===
      MembershipStatus.Active
    ) {
      await this.syncOrganizationBadge(
        membership,
      );
    }

    return membership;
  }

  /* ==========================================================================
     INTERNAL DELETE
  ========================================================================== */

  async deleteMembership(
    organizationId: string,
    userId: string,
    actorUserId?: string,
  ): Promise<void> {
    if (!actorUserId) {
      throw new ForbiddenException(
        'An authorized actor is required to delete a membership.',
      );
    }

    const organization =
      await this.getOrganization(
        organizationId,
      );

    const ownerId =
      await this.getOrganizationCreatorId(
        organization,
      );

    if (
      String(userId) ===
      String(ownerId)
    ) {
      throw new ForbiddenException(
        'The organization owner membership cannot be deleted.',
      );
    }

    await this.requirePermission(
      organizationId,
      actorUserId,
      ChurchPermission.RemoveMember,
    );

    const target =
      await this.getMembershipOrNull(
        organizationId,
        userId,
      );

    if (target) {
      await this.deactivateOrganizationBadge(
        target,
      );
    }

    await this.membershipModel.deleteOne({
      organizationId:
        organization._id,

      userId:
        this.toObjectId(
          userId,
          'user ID',
        ),
    });
  }

  /* ==========================================================================
     COUNTS
  ========================================================================== */

  async countActiveAdministrators(
    organizationId: string,
  ): Promise<number> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organization ID',
      );

    return this.membershipModel.countDocuments({
      organizationId:
        organizationObjectId,

      status:
        MembershipStatus.Active,

      role: {
        $in: [
          ...ADMIN_MEMBER_ROLES,
        ],
      },
    });
  }

  async countByStatus(
    organizationId: string,
    status: MembershipStatus,
  ): Promise<number> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organization ID',
      );

    return this.membershipModel.countDocuments({
      organizationId:
        organizationObjectId,

      status,
    });
  }

  /* ==========================================================================
     ORGANIZATION CLEANUP
  ========================================================================== */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organization ID',
      );

    await this.membershipModel.deleteMany({
      organizationId:
        organizationObjectId,
    });

    await this.organizationBadgeService.deleteAllForOrganization(
      organizationId,
    );
  }

  /* ==========================================================================
     ORGANIZATIONS FOR USER
  ========================================================================== */

  async listOrganizationIdsForUser(
    userId: string,
  ): Promise<string[]> {
    const userObjectId =
      this.toObjectId(
        userId,
        'user ID',
      );

    const memberships =
      await this.membershipModel
        .find({
          userId:
            userObjectId,

          status:
            MembershipStatus.Active,
        })
        .select({
          organizationId: 1,
        })
        .lean();

    return memberships.map(
      (membership) =>
        String(
          membership.organizationId,
        ),
    );
  }

  /* ==========================================================================
     DEPARTMENT MEMBERSHIP
  ========================================================================== */

  async adjustDepartmentMembership(
    organizationId: string,
    memberId: string,
    departmentId: string,
    add: boolean,
    actorUserId: string,
  ): Promise<any>;

  async adjustDepartmentMembership(
    membershipId: string,
    departmentId: string,
    add: boolean,
  ): Promise<any>;

  async adjustDepartmentMembership(
    first: string,
    second: string,
    third: string | boolean,
    fourth?: boolean,
    fifth?: string,
  ) {
    /*
     * MODERN ADMINISTRATIVE FORM
     */
    if (
      typeof third === 'string' &&
      typeof fourth === 'boolean' &&
      typeof fifth === 'string'
    ) {
      const organizationId =
        first;

      const memberId =
        second;

      const departmentId =
        third;

      const add =
        fourth;

      const actorUserId =
        fifth;

      await this.requirePermission(
        organizationId,
        actorUserId,
        ChurchPermission.ManageDepartments,
      );

      const member =
        await this.getMembershipByIdOrNull(
          organizationId,
          memberId,
        );

      if (!member) {
        throw new NotFoundException(
          'Member not found.',
        );
      }

      const organizationObjectId =
        this.toObjectId(
          organizationId,
          'organization ID',
        );

      const departmentObjectId =
        this.toObjectId(
          departmentId,
          'department ID',
        );

      const department =
        await this.departmentModel.findOne({
          _id:
            departmentObjectId,

          organizationId:
            organizationObjectId,
        });

      if (!department) {
        throw new NotFoundException(
          'Department not found in this organization.',
        );
      }

      if (
        add &&
        (department as any).isArchived === true
      ) {
        throw new ForbiddenException(
          'Archived departments cannot accept new members.',
        );
      }

      const departmentIds =
        Array.isArray(
          member.departmentIds,
        )
          ? member.departmentIds.map(
              (id) =>
                String(id),
            )
          : [];

      if (add) {
        if (
          !departmentIds.includes(
            String(
              departmentObjectId,
            ),
          )
        ) {
          departmentIds.push(
            String(
              departmentObjectId,
            ),
          );
        }
      } else {
        const filtered =
          departmentIds.filter(
            (id) =>
              id !==
              String(
                departmentObjectId,
              ),
          );

        departmentIds.length = 0;

        departmentIds.push(
          ...filtered,
        );
      }

      member.departmentIds =
        departmentIds.map(
          (id) =>
            new Types.ObjectId(id),
        );

      await member.save();

      return this.toResponse(
        member,
        actorUserId,
      );
    }

    /*
     * LEGACY SELF-SERVICE FORM
     */
    if (
      typeof third === 'boolean'
    ) {
      const membershipId =
        first;

      const departmentId =
        second;

      const add =
        third;

      const membership =
        await this.membershipModel.findById(
          this.toObjectId(
            membershipId,
            'membership ID',
          ),
        );

      if (!membership) {
        throw new NotFoundException(
          'Membership not found.',
        );
      }

      const organizationId =
        String(
          membership.organizationId,
        );

      const actorUserId =
        String(
          membership.userId,
        );

      await this.requireAttendanceAccess(
        organizationId,
        actorUserId,
      );

      const organizationObjectId =
        this.toObjectId(
          organizationId,
          'organization ID',
        );

      const departmentObjectId =
        this.toObjectId(
          departmentId,
          'department ID',
        );

      const department =
        await this.departmentModel.findOne({
          _id:
            departmentObjectId,

          organizationId:
            organizationObjectId,
        });

      if (!department) {
        throw new NotFoundException(
          'Department not found in this organization.',
        );
      }

      if (
        add &&
        (department as any).isArchived === true
      ) {
        throw new ForbiddenException(
          'Archived departments cannot accept new members.',
        );
      }

      const departmentIds =
        Array.isArray(
          membership.departmentIds,
        )
          ? membership.departmentIds.map(
              (id) =>
                String(id),
            )
          : [];

      if (add) {
        if (
          !departmentIds.includes(
            String(
              departmentObjectId,
            ),
          )
        ) {
          departmentIds.push(
            String(
              departmentObjectId,
            ),
          );
        }
      } else {
        const filtered =
          departmentIds.filter(
            (id) =>
              id !==
              String(
                departmentObjectId,
              ),
          );

        departmentIds.length = 0;

        departmentIds.push(
          ...filtered,
        );
      }

      membership.departmentIds =
        departmentIds.map(
          (id) =>
            new Types.ObjectId(id),
        );

      await membership.save();

      return this.toResponse(
        membership,
        actorUserId,
      );
    }

    throw new BadRequestException(
      'Invalid department membership arguments.',
    );
  }

  /* ==========================================================================
     GROUP MEMBERSHIP
  ========================================================================== */

  async adjustGroupMembership(
    organizationId: string,
    memberId: string,
    groupId: string,
    add: boolean,
    actorUserId: string,
  ): Promise<any>;

  async adjustGroupMembership(
    membershipId: string,
    groupId: string,
    add: boolean,
  ): Promise<any>;

  async adjustGroupMembership(
    first: string,
    second: string,
    third: string | boolean,
    fourth?: boolean,
    fifth?: string,
  ) {
    /*
     * MODERN ADMINISTRATIVE FORM
     */
    if (
      typeof third === 'string' &&
      typeof fourth === 'boolean' &&
      typeof fifth === 'string'
    ) {
      const organizationId =
        first;

      const memberId =
        second;

      const groupId =
        third;

      const add =
        fourth;

      const actorUserId =
        fifth;

      await this.requirePermission(
        organizationId,
        actorUserId,
        ChurchPermission.ManageGroups,
      );

      const member =
        await this.getMembershipByIdOrNull(
          organizationId,
          memberId,
        );

      if (!member) {
        throw new NotFoundException(
          'Member not found.',
        );
      }

      const organizationObjectId =
        this.toObjectId(
          organizationId,
          'organization ID',
        );

      const groupObjectId =
        this.toObjectId(
          groupId,
          'group ID',
        );

      const group =
        await this.groupModel.findOne({
          _id:
            groupObjectId,

          organizationId:
            organizationObjectId,
        });

      if (!group) {
        throw new NotFoundException(
          'Group not found in this organization.',
        );
      }

      if (
        add &&
        (group as any).isArchived === true
      ) {
        throw new ForbiddenException(
          'Archived groups cannot accept new members.',
        );
      }

      const groupIds =
        Array.isArray(
          member.groupIds,
        )
          ? member.groupIds.map(
              (id) =>
                String(id),
            )
          : [];

      if (add) {
        if (
          !groupIds.includes(
            String(groupObjectId),
          )
        ) {
          groupIds.push(
            String(groupObjectId),
          );
        }
      } else {
        const filtered =
          groupIds.filter(
            (id) =>
              id !==
              String(groupObjectId),
          );

        groupIds.length = 0;

        groupIds.push(
          ...filtered,
        );
      }

      member.groupIds =
        groupIds.map(
          (id) =>
            new Types.ObjectId(id),
        );

      await member.save();

      return this.toResponse(
        member,
        actorUserId,
      );
    }

    /*
     * LEGACY SELF-SERVICE FORM
     */
    if (
      typeof third === 'boolean'
    ) {
      const membershipId =
        first;

      const groupId =
        second;

      const add =
        third;

      const membership =
        await this.membershipModel.findById(
          this.toObjectId(
            membershipId,
            'membership ID',
          ),
        );

      if (!membership) {
        throw new NotFoundException(
          'Membership not found.',
        );
      }

      const organizationId =
        String(
          membership.organizationId,
        );

      const actorUserId =
        String(
          membership.userId,
        );

      await this.requireAttendanceAccess(
        organizationId,
        actorUserId,
      );

      const organizationObjectId =
        this.toObjectId(
          organizationId,
          'organization ID',
        );

      const groupObjectId =
        this.toObjectId(
          groupId,
          'group ID',
        );

      const group =
        await this.groupModel.findOne({
          _id:
            groupObjectId,

          organizationId:
            organizationObjectId,
        });

      if (!group) {
        throw new NotFoundException(
          'Group not found in this organization.',
        );
      }

      if (
        add &&
        (group as any).isArchived === true
      ) {
        throw new ForbiddenException(
          'Archived groups cannot accept new members.',
        );
      }

      const groupIds =
        Array.isArray(
          membership.groupIds,
        )
          ? membership.groupIds.map(
              (id) =>
                String(id),
            )
          : [];

      if (add) {
        if (
          !groupIds.includes(
            String(groupObjectId),
          )
        ) {
          groupIds.push(
            String(groupObjectId),
          );
        }
      } else {
        const filtered =
          groupIds.filter(
            (id) =>
              id !==
              String(groupObjectId),
          );

        groupIds.length = 0;

        groupIds.push(
          ...filtered,
        );
      }

      membership.groupIds =
        groupIds.map(
          (id) =>
            new Types.ObjectId(id),
        );

      await membership.save();

      return this.toResponse(
        membership,
        actorUserId,
      );
    }

    throw new BadRequestException(
      'Invalid group membership arguments.',
    );
  }
}