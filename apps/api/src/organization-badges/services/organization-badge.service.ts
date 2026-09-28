/**
 * organization-badge.service.ts
 * -----------------------------------------------------------------------------
 * Generic Fockis Organization Badge service.
 *
 * Responsibilities:
 *
 *   - Automatically create a badge for active memberships.
 *   - Update an existing badge instead of creating duplicates.
 *   - Read department/group names from their real models.
 *   - Keep organization/member information synchronized.
 *   - Rebuild badges when needed.
 *   - Deactivate badges when memberships become inactive.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

/* ============================================================================
   BADGE
============================================================================ */

import {
  OrganizationBadge,
  OrganizationBadgeDocument,
} from '../schemas/organization-badge.schema';

/* ============================================================================
   ORGANIZATION
============================================================================ */

import {
  Organization,
  OrganizationDocument,
} from '../../church/organizations/schemas/organization.schema';

/* ============================================================================
   MEMBERSHIP
============================================================================ */

import {
  Membership,
  MembershipDocument,
} from '../../church/members/schemas/membership.schema';

/* ============================================================================
   DEPARTMENT
============================================================================ */

import {
  Department,
  DepartmentDocument,
} from '../../church/departments/schemas/department.schema';

/* ============================================================================
   GROUP
============================================================================ */

import {
  ChurchGroup,
  ChurchGroupDocument,
} from '../../church/groups/schemas/church-group.schema';

/* ============================================================================
   ENUM
============================================================================ */

import { MembershipStatus } from '../../church/enums/membership-status.enum';

@Injectable()
export class OrganizationBadgeService {
  constructor(
    @InjectModel(
      OrganizationBadge.name,
    )
    private readonly badgeModel:
      Model<OrganizationBadgeDocument>,

    @InjectModel(
      Organization.name,
    )
    private readonly organizationModel:
      Model<OrganizationDocument>,

    @InjectModel(
      Membership.name,
    )
    private readonly membershipModel:
      Model<MembershipDocument>,

    @InjectModel(
      Department.name,
    )
    private readonly departmentModel:
      Model<DepartmentDocument>,

    @InjectModel(
      ChurchGroup.name,
    )
    private readonly groupModel:
      Model<ChurchGroupDocument>,
  ) {}

  /* ==========================================================================
     OBJECT ID
     ========================================================================== */

  private toObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (
      !value ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new BadRequestException(
        `${fieldName} is invalid.`,
      );
    }

    return new Types.ObjectId(value);
  }

  /* ==========================================================================
     MEMBER NUMBER
     ========================================================================== */

  private buildMemberNumber(
    membership: MembershipDocument,
  ): string {
    /**
     * We do not use a nonexistent membership.memberId field.
     *
     * The actual membership schema identifies the member through:
     *
     *   membership._id
     *
     * The final six characters give us a short human-readable identifier.
     */
    const suffix =
      String(membership._id)
        .slice(-6)
        .toUpperCase();

    return `ORG-${suffix}`;
  }

  /* ==========================================================================
     QR CODE
     ========================================================================== */

  private buildQrCodeValue(
    organizationId: string,
    membershipId: string,
  ): string {
    return [
      'fockis',
      'organization-badge',
      organizationId,
      membershipId,
    ].join(':');
  }

  /* ==========================================================================
     DEPARTMENT NAMES
     ========================================================================== */

  private async getDepartmentNames(
    membership: MembershipDocument,
  ): Promise<string[]> {
    if (
      !membership.departmentIds ||
      membership.departmentIds.length === 0
    ) {
      return [];
    }

    const departments =
      await this.departmentModel
        .find({
          _id: {
            $in:
              membership.departmentIds,
          },

          organizationId:
            membership.organizationId,

          isArchived: {
            $ne: true,
          },
        })
        .select({
          name: 1,
        })
        .lean()
        .exec();

    return departments
      .map(
        (
          department,
        ) => department.name,
      )
      .filter(
        (
          name,
        ): name is string =>
          Boolean(name),
      );
  }

  /* ==========================================================================
     GROUP NAMES
     ========================================================================== */

  private async getGroupNames(
    membership: MembershipDocument,
  ): Promise<string[]> {
    if (
      !membership.groupIds ||
      membership.groupIds.length === 0
    ) {
      return [];
    }

    const groups =
      await this.groupModel
        .find({
          _id: {
            $in:
              membership.groupIds,
          },

          organizationId:
            membership.organizationId,

          isArchived: {
            $ne: true,
          },
        })
        .select({
          name: 1,
        })
        .lean()
        .exec();

    return groups
      .map(
        (
          group,
        ) => group.name,
      )
      .filter(
        (
          name,
        ): name is string =>
          Boolean(name),
      );
  }

  /* ==========================================================================
     RESPONSE
     ========================================================================== */

  private toResponse(
    badge: OrganizationBadgeDocument,
  ) {
    return {
      id:
        String(badge._id),

      organizationId:
        String(
          badge.organizationId,
        ),

      membershipId:
        String(
          badge.membershipId,
        ),

      userId:
        String(
          badge.userId,
        ),

      memberNumber:
        badge.memberNumber,

      displayName:
        badge.displayName,

      avatarUrl:
        badge.avatarUrl ??
        null,

      organizationName:
        badge.organizationName,

      organizationLogoUrl:
        badge.organizationLogoUrl ??
        null,

      organizationType:
        badge.organizationType ??
        null,

      role:
        badge.role,

      status:
        badge.status,

      joinedAt:
        badge.joinedAt ??
        null,

      departmentNames:
        badge.departmentNames ??
        [],

      groupNames:
        badge.groupNames ??
        [],

      qrCodeValue:
        badge.qrCodeValue,

      active:
        badge.active,

      issuedAt:
        badge.issuedAt,

      createdAt:
        badge.createdAt,

      updatedAt:
        badge.updatedAt,
    };
  }

  /* ==========================================================================
     CREATE OR UPDATE
     ========================================================================== */

  async createOrUpdateForMembership(
    membershipId: string,
  ) {
    const membershipObjectId =
      this.toObjectId(
        membershipId,
        'membershipId',
      );

    const membership =
      await this.membershipModel
        .findById(
          membershipObjectId,
        )
        .exec();

    if (!membership) {
      throw new NotFoundException(
        'Membership not found.',
      );
    }

    /**
     * Only active members receive an active badge.
     */
    if (
      membership.status !==
      MembershipStatus.Active
    ) {
      throw new ForbiddenException(
        'An organization badge can only be issued to an active member.',
      );
    }

    const organization =
      await this.organizationModel
        .findById(
          membership.organizationId,
        )
        .exec();

    if (!organization) {
      throw new NotFoundException(
        'Organization not found.',
      );
    }

    const organizationId =
      String(
        organization._id,
      );

    const membershipIdValue =
      String(
        membership._id,
      );

    const displayName =
      membership.profile
        ?.displayName
        ?.trim() ||
      'Organization Member';

    const avatarUrl =
      membership.profile
        ?.avatarUrl ??
      null;

    const memberNumber =
      this.buildMemberNumber(
        membership,
      );

    const [
      departmentNames,
      groupNames,
    ] =
      await Promise.all([
        this.getDepartmentNames(
          membership,
        ),

        this.getGroupNames(
          membership,
        ),
      ]);

    const qrCodeValue =
      this.buildQrCodeValue(
        organizationId,
        membershipIdValue,
      );

    /**
     * IMPORTANT:
     *
     * findOneAndUpdate + upsert makes this operation idempotent.
     *
     * If the badge exists:
     *
     *   UPDATE
     *
     * If it doesn't:
     *
     *   CREATE
     */
    const badge =
      await this.badgeModel
        .findOneAndUpdate(
          {
            membershipId:
              membership._id,
          },

          {
            $set: {
              organizationId:
                organization._id,

              membershipId:
                membership._id,

              userId:
                membership.userId,

              memberNumber,

              displayName,

              avatarUrl,

              organizationName:
                organization.name,

              organizationLogoUrl:
                organization.logoUrl ??
                null,

              organizationType:
                organization.organizationType ??
                null,

              role:
                membership.role,

              status:
                membership.status,

              joinedAt:
                membership.joinedAt ??
                null,

              departmentNames,

              groupNames,

              qrCodeValue,

              active: true,
            },

            $setOnInsert: {
              issuedAt:
                new Date(),
            },
          },

          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();

    if (!badge) {
      throw new Error(
        'Unable to create organization badge.',
      );
    }

    return this.toResponse(
      badge,
    );
  }

  /* ==========================================================================
     GET MY BADGE
     ========================================================================== */

  async getMyBadge(
    organizationId: string,
    userId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const userObjectId =
      this.toObjectId(
        userId,
        'userId',
      );

    const membership =
      await this.membershipModel
        .findOne({
          organizationId:
            organizationObjectId,

          userId:
            userObjectId,
        })
        .exec();

    if (!membership) {
      throw new NotFoundException(
        'Organization membership not found.',
      );
    }

    if (
      membership.status !==
      MembershipStatus.Active
    ) {
      throw new ForbiddenException(
        'You must be an active organization member to view your badge.',
      );
    }

    /**
     * If the badge does not exist for an old member,
     * automatically create it now.
     */
    return this.createOrUpdateForMembership(
      String(
        membership._id,
      ),
    );
  }

  /* ==========================================================================
     GET MEMBER BADGE
     ========================================================================== */

  async getMemberBadge(
    organizationId: string,
    membershipId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const membershipObjectId =
      this.toObjectId(
        membershipId,
        'membershipId',
      );

    const badge =
      await this.badgeModel
        .findOne({
          organizationId:
            organizationObjectId,

          membershipId:
            membershipObjectId,
        })
        .exec();

    if (!badge) {
      return null;
    }

    return this.toResponse(
      badge,
    );
  }

  /* ==========================================================================
     REBUILD
     ========================================================================== */

  async rebuildBadge(
    membershipId: string,
  ) {
    return this.createOrUpdateForMembership(
      membershipId,
    );
  }

  /* ==========================================================================
     DEACTIVATE
     ========================================================================== */

  async deactivateForMembership(
    membershipId: string,
  ) {
    const membershipObjectId =
      this.toObjectId(
        membershipId,
        'membershipId',
      );

    const badge =
      await this.badgeModel
        .findOneAndUpdate(
          {
            membershipId:
              membershipObjectId,
          },

          {
            $set: {
              active: false,
            },
          },

          {
            new: true,
          },
        )
        .exec();

    return badge
      ? this.toResponse(badge)
      : null;
  }

  /* ==========================================================================
     DELETE ORGANIZATION BADGES
     ========================================================================== */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    await this.badgeModel
      .deleteMany({
        organizationId:
          organizationObjectId,
      })
      .exec();
  }
}