/**
 * membership.schema.ts
 * -----------------------------------------------------------------------------
 * Mongoose schema for a Member (a user's membership record within one
 * organization).
 *
 * Mirrors:
 *
 *   web/src/features/church/types/church.types.ts
 *
 * DOMAIN MODEL
 * -----------------------------------------------------------------------------
 *
 * Organization:
 *
 *   springfieldchurch.fockis.com
 *
 * Member:
 *
 *   john.springfieldchurch.fockis.com
 *
 * The member domain is stored as the complete Fockis member address.
 *
 * IMPORTANT:
 *
 * The domain must belong to the organization:
 *
 *   Organization:
 *     springfieldchurch.fockis.com
 *
 *   Valid member:
 *     john.springfieldchurch.fockis.com
 *
 *   Invalid member:
 *     john.otherchurch.fockis.com
 *
 * DOMAIN VALIDATION
 * -----------------------------------------------------------------------------
 *
 * DTO validation handles the incoming request format.
 *
 * MembersService is responsible for enforcing the relationship between:
 *
 *   membership.domain
 *
 * and:
 *
 *   organization.domain
 *
 * The schema stores the normalized lowercase value.
 *
 * OWNERSHIP / PERMISSIONS
 * -----------------------------------------------------------------------------
 *
 * Organization.createdByUserId remains the permanent source of truth for
 * organization ownership.
 *
 * The organization owner:
 *
 *   - is always an Administrator
 *   - always has full access
 *   - does not depend on permissions[]
 *   - cannot be removed
 *   - cannot be demoted
 *   - cannot be deactivated
 *
 * Administrators:
 *
 *   - have role = MemberRole.Administrator
 *   - can receive individual permissions
 *   - permissions are stored in permissions[]
 *
 * Normal members:
 *
 *   - normally have permissions = []
 *   - do not receive administrator permissions
 *
 * IMPORTANT
 * -----------------------------------------------------------------------------
 *
 * Permissions are enforced by backend services.
 *
 * The frontend may use permissions[] to show/hide buttons and navigation,
 * but frontend checks are NOT considered security boundaries.
 *
 * The backend must always verify the required permission before performing
 * protected operations.
 *
 * INTEGRATION NOTE
 * -----------------------------------------------------------------------------
 *
 * This feature does not include a Users module, so the member's public-facing
 * name/avatar are denormalized snapshots taken at add-time:
 *
 *   profile.displayName
 *   profile.avatarUrl
 *
 * rather than a live join against a Users collection.
 * ---------------------------------------------------------------------------
 */

import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';

import { MembershipStatus } from '../../enums/membership-status.enum';
import { MemberRole } from '../../enums/member-role.enum';
import { ChurchPermission } from '../../enums/permission.enum';

export type MembershipDocument =
  Membership & Document;

/* ============================================================================
   PUBLIC PROFILE
============================================================================ */

@Schema({
  _id: false,
})
export class MemberPublicProfile {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  displayName!: string;

  @Prop({
    type: String,
    default: null,
  })
  avatarUrl?: string | null;
}

export const MemberPublicProfileSchema =
  SchemaFactory.createForClass(
    MemberPublicProfile,
  );

/* ============================================================================
   ADDRESS
============================================================================ */

@Schema({
  _id: false,
})
export class MemberAddress {
  @Prop({
    type: String,
  })
  line1?: string;

  @Prop({
    type: String,
  })
  line2?: string;

  @Prop({
    type: String,
  })
  city?: string;

  @Prop({
    type: String,
  })
  state?: string;

  @Prop({
    type: String,
  })
  postalCode?: string;

  @Prop({
    type: String,
  })
  country?: string;
}

export const MemberAddressSchema =
  SchemaFactory.createForClass(
    MemberAddress,
  );

/* ============================================================================
   PRIVATE PROFILE
============================================================================ */

@Schema({
  _id: false,
})
export class MemberPrivateProfile {
  @Prop({
    type: String,
  })
  email?: string;

  @Prop({
    type: String,
  })
  phone?: string;

  @Prop({
    type: MemberAddressSchema,
  })
  address?: MemberAddress;

  @Prop({
    type: String,
  })
  dateOfBirth?: string;

  @Prop({
    type: String,
  })
  notes?: string;
}

export const MemberPrivateProfileSchema =
  SchemaFactory.createForClass(
    MemberPrivateProfile,
  );

/* ============================================================================
   MEMBERSHIP
============================================================================ */

@Schema({
  timestamps: true,
  collection: 'church_members',
})
export class Membership {
  /* --------------------------------------------------------------------------
     ORGANIZATION
  -------------------------------------------------------------------------- */

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /* --------------------------------------------------------------------------
     MEMBER FOCKIS DOMAIN
  -------------------------------------------------------------------------- */

  /**
   * Complete Fockis member domain.
   *
   * Example:
   *
   *   john.springfieldchurch.fockis.com
   *
   * The organization itself owns:
   *
   *   springfieldchurch.fockis.com
   *
   * Therefore the member domain must be a subdomain of the organization's
   * Fockis domain.
   *
   * MembersService performs the authoritative relationship validation.
   */
  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  domain!: string;

  /* --------------------------------------------------------------------------
     USER
  -------------------------------------------------------------------------- */

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /* --------------------------------------------------------------------------
     BRANCH
  -------------------------------------------------------------------------- */

  @Prop({
    type: Types.ObjectId,
    ref: 'Branch',
    default: null,
  })
  branchId?: Types.ObjectId | null;

  /* --------------------------------------------------------------------------
     MEMBERSHIP STATUS
  -------------------------------------------------------------------------- */

  @Prop({
    type: String,
    enum: MembershipStatus,
    default: MembershipStatus.Pending,
    index: true,
  })
  status!: MembershipStatus;

  /* --------------------------------------------------------------------------
     ROLE
  -------------------------------------------------------------------------- */

  @Prop({
    type: String,
    enum: MemberRole,
    default: MemberRole.Member,
    index: true,
  })
  role!: MemberRole;

  /* --------------------------------------------------------------------------
     PERMISSIONS
  -------------------------------------------------------------------------- */

  /**
   * Individual organization permissions granted to this member.
   *
   * IMPORTANT:
   *
   * This is primarily used for administrators.
   *
   * Example:
   *
   * permissions: [
   *   ChurchPermission.ViewMembers,
   *   ChurchPermission.AddMember,
   *   ChurchPermission.ApproveMember,
   *   ChurchPermission.ManageGroups,
   * ]
   *
   * The permanent organization owner does NOT depend on this array.
   *
   * Owner authorization is determined from:
   *
   *   Organization.createdByUserId
   *
   * and therefore the owner always has full access.
   */
  @Prop({
    type: [String],
    enum: ChurchPermission,
    default: [],
    index: false,
  })
  permissions!: ChurchPermission[];

  /* --------------------------------------------------------------------------
     PUBLIC PROFILE
  -------------------------------------------------------------------------- */

  @Prop({
    type: MemberPublicProfileSchema,
    required: true,
  })
  profile!: MemberPublicProfile;

  /* --------------------------------------------------------------------------
     PRIVATE PROFILE
  -------------------------------------------------------------------------- */

  @Prop({
    type: MemberPrivateProfileSchema,
    default: {},
  })
  privateProfile?: MemberPrivateProfile;

  /* --------------------------------------------------------------------------
     DEPARTMENTS
  -------------------------------------------------------------------------- */

  /**
   * Denormalized department affiliations.
   */
  @Prop({
    type: [Types.ObjectId],
    ref: 'Department',
    default: [],
  })
  departmentIds!: Types.ObjectId[];

  /* --------------------------------------------------------------------------
     GROUPS
  -------------------------------------------------------------------------- */

  /**
   * Denormalized group affiliations.
   */
  @Prop({
    type: [Types.ObjectId],
    ref: 'ChurchGroup',
    default: [],
  })
  groupIds!: Types.ObjectId[];

  /* --------------------------------------------------------------------------
     JOINED
  -------------------------------------------------------------------------- */

  @Prop({
    type: Date,
    default: () => new Date(),
  })
  joinedAt!: Date;

  /* --------------------------------------------------------------------------
     TIMESTAMPS
  -------------------------------------------------------------------------- */

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
   SCHEMA
============================================================================ */

export const MembershipSchema =
  SchemaFactory.createForClass(
    Membership,
  );

/* ============================================================================
   INDEXES
============================================================================ */

/**
 * One membership per user per organization.
 */
MembershipSchema.index(
  {
    organizationId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

/**
 * Organization + member domain lookup.
 *
 * Useful for:
 *
 *   - resolving a Fockis member domain
 *   - checking member-domain ownership
 *   - organization member lookup
 */
MembershipSchema.index({
  organizationId: 1,
  domain: 1,
});

/**
 * Optional index for finding administrators with specific permissions.
 *
 * This is useful later if you need queries such as:
 *
 *   "Find all administrators who can manage events."
 *
 * MongoDB can query the permissions array using this index.
 */
MembershipSchema.index({
  organizationId: 1,
  role: 1,
  permissions: 1,
});