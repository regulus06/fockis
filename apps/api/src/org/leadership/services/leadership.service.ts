/**
 * leadership.service.ts
 * -----------------------------------------------------------------------------
 * Production-ready church leadership business logic.
 *
 * Responsibilities:
 * - List organization leadership
 * - Assign an existing organization member to leadership
 * - Update leadership records
 * - Remove leadership records
 * - Automatically assign the organization creator as Owner
 * - Remove all leadership records when an organization is deleted
 *
 * IMPORTANT:
 * - Leadership identity is sourced from the existing Membership record.
 * - Organization creators are automatically repaired as administrators by
 *   MembersService.getMyMembership().
 * - displayName is always normalized before persistence.
 * - All externally supplied MongoDB IDs are validated.
 * - Duplicate leadership assignments are prevented.
 * - Only ACTIVE organization members can be assigned to leadership.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Leadership,
  LeadershipDocument,
  LeadershipRole,
} from '../schemas/leadership.schema';

import { AssignLeaderDto } from '../dto/assign-leader.dto';
import { UpdateLeaderDto } from '../dto/update-leader.dto';

import {
  MembersService,
  type AuthUser,
} from '../../members/services/members.service';

import { MembershipStatus } from '../../enums/membership-status.enum';

/* ============================================================================
   HELPERS
============================================================================ */

/**
 * Safely converts a string to MongoDB ObjectId.
 *
 * Invalid IDs become controlled HTTP 400 errors instead of BSON/Mongoose
 * CastErrors that would otherwise become HTTP 500 responses.
 */
function toObjectId(
  value: string,
  fieldName: string,
): Types.ObjectId {
  if (
    !value ||
    !Types.ObjectId.isValid(value)
  ) {
    throw new BadRequestException(
      `${fieldName} must be a valid identifier.`,
    );
  }

  return new Types.ObjectId(value);
}

/**
 * Ensures leadership displayName is always a valid non-empty string.
 *
 * AuthUser.displayName may be nullable/optional in the authentication layer,
 * but the Leadership schema requires a string.
 */
function normalizeDisplayName(
  displayName:
    | string
    | null
    | undefined,
  email?: string | null,
): string {
  const name =
    typeof displayName === 'string'
      ? displayName.trim()
      : '';

  if (name) {
    return name;
  }

  const fallbackEmail =
    typeof email === 'string'
      ? email.trim()
      : '';

  if (fallbackEmail) {
    return fallbackEmail;
  }

  return 'Church Member';
}

/* ============================================================================
   RESPONSE
============================================================================ */

function toResponse(
  doc: LeadershipDocument,
) {
  return {
    id:
      String(doc._id),

    organizationId:
      String(doc.organizationId),

    user: {
      id:
        String(doc.user.id),

      displayName:
        doc.user.displayName,

      avatarUrl:
        doc.user.avatarUrl ?? null,

      email:
        doc.user.email ?? null,
    },

    role:
      doc.role,

    title:
      doc.title,

    bio:
      doc.bio,

    order:
      doc.order ?? 0,
  };
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class LeadershipService {
  constructor(
    @InjectModel(Leadership.name)
    private readonly leadershipModel: Model<LeadershipDocument>,

    private readonly membersService: MembersService,
  ) {}

  /* ==========================================================================
     ADMIN AUTHORIZATION
  ========================================================================== */

  /**
   * Gets the actor's membership using MembersService.
   *
   * IMPORTANT:
   *
   * getMyMembership() internally calls MembersService.getActorMembership().
   * That means if the actor is the organization creator and their membership
   * is missing or incorrectly configured, MembersService automatically repairs
   * them to:
   *
   *   ACTIVE + ADMINISTRATOR
   *
   * This keeps owner-repair logic centralized inside MembersService.
   */
  private async requireOrganizationAdmin(
    organizationId: string,
    actorUserId: string,
  ) {
    const actor =
      await this.membersService.getMyMembership(
        organizationId,
        actorUserId,
      );

    /**
     * getMyMembership() returns the public response rather than the raw
     * MembershipDocument, so authorization should use the raw membership
     * lookup after owner repair has been triggered.
     *
     * The owner-repair is already performed by getMyMembership().
     */
    const rawMembership =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    /**
     * If the actor is the organization creator, getMyMembership() has already
     * repaired their membership before this lookup.
     */
    if (!rawMembership) {
      throw new NotFoundException(
        'You are not a member of this organization.',
      );
    }

    this.membersService.requireAdmin(
      rawMembership,
    );

    return rawMembership;
  }

  /* ==========================================================================
     LIST
  ========================================================================== */

  async listByOrganization(
    organizationId: string,
  ) {
    const organizationObjectId =
      toObjectId(
        organizationId,
        'organizationId',
      );

    const docs =
      await this.leadershipModel
        .find({
          organizationId:
            organizationObjectId,
        })
        .sort({
          role: 1,
          order: 1,
        })
        .exec();

    return docs.map(
      toResponse,
    );
  }

  /* ==========================================================================
     ASSIGN LEADER
  ========================================================================== */

  async assign(
    organizationId: string,
    dto: AssignLeaderDto,
    actorUserId: string,
  ) {
    /**
     * Owner-aware administrator authorization.
     *
     * This repairs the organization creator's membership if necessary.
     */
    await this.requireOrganizationAdmin(
      organizationId,
      actorUserId,
    );

    /**
     * Find the organization membership being assigned.
     */
    const member =
      await this.membersService.getMembershipByIdOrNull(
        organizationId,
        dto.memberId,
      );

    if (!member) {
      throw new NotFoundException(
        'Member not found.',
      );
    }

    /**
     * Only ACTIVE members can become leaders.
     *
     * IMPORTANT:
     * Use MembershipStatus.Active instead of the raw string "Active".
     * This prevents TypeScript error TS2367.
     */
    if (
      member.status !==
      MembershipStatus.Active
    ) {
      throw new BadRequestException(
        'Only active organization members can be assigned to leadership.',
      );
    }

    /**
     * Prevent duplicate leadership records for the same member.
     */
    const organizationObjectId =
      toObjectId(
        organizationId,
        'organizationId',
      );

    const existing =
      await this.leadershipModel.findOne({
        organizationId:
          organizationObjectId,

        'user.id':
          member.userId,
      });

    if (existing) {
      throw new ConflictException(
        'This member is already part of the leadership team.',
      );
    }

    /**
     * Build a safe display name from the membership profile.
     */
    const displayName =
      normalizeDisplayName(
        member.profile?.displayName,
        member.privateProfile?.email,
      );

    const created =
      await this.leadershipModel.create({
        organizationId:
          organizationObjectId,

        user: {
          id:
            member.userId,

          displayName,

          avatarUrl:
            member.profile?.avatarUrl ??
            null,

          email:
            member.privateProfile?.email ??
            null,
        },

        role:
          dto.role,

        title:
          dto.title,

        bio:
          dto.bio,

        order:
          0,
      });

    return toResponse(
      created,
    );
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  async update(
    organizationId: string,
    leadershipId: string,
    dto: UpdateLeaderDto,
    actorUserId: string,
  ) {
    /**
     * Owner-aware administrator authorization.
     */
    await this.requireOrganizationAdmin(
      organizationId,
      actorUserId,
    );

    const organizationObjectId =
      toObjectId(
        organizationId,
        'organizationId',
      );

    const leadershipObjectId =
      toObjectId(
        leadershipId,
        'leadershipId',
      );

    const doc =
      await this.leadershipModel.findOne({
        _id:
          leadershipObjectId,

        organizationId:
          organizationObjectId,
      });

    if (!doc) {
      throw new NotFoundException(
        'Leadership record not found.',
      );
    }

    if (
      dto.role !== undefined
    ) {
      doc.role =
        dto.role;
    }

    if (
      dto.title !== undefined
    ) {
      doc.title =
        dto.title;
    }

    if (
      dto.bio !== undefined
    ) {
      doc.bio =
        dto.bio;
    }

    if (
      dto.order !== undefined
    ) {
      doc.order =
        dto.order;
    }

    await doc.save();

    return toResponse(
      doc,
    );
  }

  /* ==========================================================================
     REMOVE
  ========================================================================== */

  async remove(
    organizationId: string,
    leadershipId: string,
    actorUserId: string,
  ): Promise<void> {
    /**
     * Owner-aware administrator authorization.
     */
    await this.requireOrganizationAdmin(
      organizationId,
      actorUserId,
    );

    const result =
      await this.leadershipModel.deleteOne({
        _id:
          toObjectId(
            leadershipId,
            'leadershipId',
          ),

        organizationId:
          toObjectId(
            organizationId,
            'organizationId',
          ),
      });

    if (
      result.deletedCount === 0
    ) {
      throw new NotFoundException(
        'Leadership record not found.',
      );
    }
  }

  /* ==========================================================================
     OWNER
  ========================================================================== */

  /**
   * System-initiated assignment used by OrganizationsService when a new
   * organization is created.
   *
   * The creator is immediately made Owner.
   *
   * This bypasses normal administrator authorization because this method
   * runs during organization creation.
   */
  async assignOwner(
    organizationId: string,
    owner: AuthUser,
  ): Promise<void> {
    const organizationObjectId =
      toObjectId(
        organizationId,
        'organizationId',
      );

    const ownerObjectId =
      toObjectId(
        owner.id,
        'userId',
      );

    const displayName =
      normalizeDisplayName(
        owner.displayName,
        owner.email,
      );

    /**
     * Prevent duplicate owner records.
     */
    const existing =
      await this.leadershipModel.findOne({
        organizationId:
          organizationObjectId,

        'user.id':
          ownerObjectId,

        role:
          LeadershipRole.Owner,
      });

    if (existing) {
      return;
    }

    await this.leadershipModel.create({
      organizationId:
        organizationObjectId,

      user: {
        id:
          ownerObjectId,

        displayName,

        avatarUrl:
          owner.avatarUrl ??
          null,

        email:
          owner.email ??
          null,
      },

      role:
        LeadershipRole.Owner,

      order:
        0,
    });
  }

  /* ==========================================================================
     DELETE ORGANIZATION LEADERSHIP
  ========================================================================== */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    await this.leadershipModel.deleteMany({
      organizationId:
        toObjectId(
          organizationId,
          'organizationId',
        ),
    });
  }
}