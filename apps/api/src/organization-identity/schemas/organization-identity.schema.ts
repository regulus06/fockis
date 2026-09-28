import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

// ============================================================================
// DOCUMENT TYPE
// ============================================================================

export type OrganizationIdentityDocument =
  OrganizationIdentity & Document;

// ============================================================================
// IDENTITY STATUS
// ============================================================================

export enum OrganizationIdentityStatus {
  Active = "active",
  Invited = "invited",
  Suspended = "suspended",
  Disabled = "disabled",
}

// ============================================================================
// MANAGED USER ROLE
// ============================================================================

export enum ManagedUserRole {
  Owner = "owner",
  Admin = "admin",
  Manager = "manager",
  Staff = "staff",
  Teacher = "teacher",
  Student = "student",
  Member = "member",
  Custom = "custom",
}

// ============================================================================
// ORGANIZATION IDENTITY
// ============================================================================

@Schema({
  timestamps: true,
  collection: "organization_identities",
})
export class OrganizationIdentity {
  // ==========================================================================
  // ORGANIZATION
  // ==========================================================================

  @Prop({
    type: Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  // ==========================================================================
  // REAL FOCKIS USER
  // ==========================================================================

  /**
   * The real Fockis User record.
   *
   * One organization identity belongs to one real Fockis user.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  // ==========================================================================
  // FIRST NAME
  // ==========================================================================

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  firstName!: string;

  // ==========================================================================
  // LAST NAME
  // ==========================================================================

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  lastName!: string;

  // ==========================================================================
  // USERNAME
  // ==========================================================================

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  })
  username!: string;

  // ==========================================================================
  // ORGANIZATION EMAIL
  // ==========================================================================

  /**
   * The email used by the organization identity.
   *
   * Normally:
   *
   * username@domain.fockis.com
   */
  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  organizationEmail!: string;

  // ==========================================================================
  // RECOVERY EMAIL
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
    lowercase: true,
    trim: true,
  })
  recoveryEmail?: string | null;

  // ==========================================================================
  // ROLE
  // ==========================================================================

  @Prop({
    type: String,
    enum: Object.values(
      ManagedUserRole,
    ),
    default:
      ManagedUserRole.Member,
    index: true,
  })
  role!: ManagedUserRole;

  // ==========================================================================
  // CUSTOM ROLE
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  customRole?: string | null;

  // ==========================================================================
  // DEPARTMENT
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  department?: string | null;

  // ==========================================================================
  // FOCKIS DOMAIN ID
  // ==========================================================================

  /**
   * The OrganizationDomain assigned to this identity.
   *
   * IMPORTANT:
   *
   * One organization identity can have at most one domain.
   *
   * The compound unique index below enforces:
   *
   * organizationId + userId + domainId
   *
   * and the sparse domain index prevents duplicate domain assignment
   * within an organization.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "OrganizationDomain",
    default: null,
    index: true,
  })
  domainId?: Types.ObjectId | null;

  // ==========================================================================
  // DOMAIN STRING
  // ==========================================================================

  /**
   * Cached domain name.
   *
   * Example:
   *
   * john.fockis.com
   */
  @Prop({
    type: String,
    default: null,
    lowercase: true,
    trim: true,
  })
  domain?: string | null;

  // ==========================================================================
  // STATUS
  // ==========================================================================

  @Prop({
    type: String,
    enum: Object.values(
      OrganizationIdentityStatus,
    ),
    default:
      OrganizationIdentityStatus.Invited,
    index: true,
  })
  status!: OrganizationIdentityStatus;

  // ==========================================================================
  // EMAIL VERIFIED
  // ==========================================================================

  @Prop({
    type: Boolean,
    default: false,
  })
  emailVerified!: boolean;

  // ==========================================================================
  // TWO FACTOR AUTHENTICATION
  // ==========================================================================

  @Prop({
    type: Boolean,
    default: false,
  })
  twoFactorEnabled!: boolean;

  // ==========================================================================
  // PASSWORD CHANGE
  // ==========================================================================

  @Prop({
    type: Boolean,
    default: true,
  })
  requirePasswordChange!: boolean;

  // ==========================================================================
  // LAST LOGIN
  // ==========================================================================

  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt?: Date | null;

  // ==========================================================================
  // TIMESTAMPS
  // ==========================================================================

  createdAt?: Date;

  updatedAt?: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

export const OrganizationIdentitySchema =
  SchemaFactory.createForClass(
    OrganizationIdentity,
  );

// ============================================================================
// USER CAN ONLY HAVE ONE ORGANIZATION IDENTITY
// ============================================================================
//
// Prevents:
//
// organization A + user X
// organization A + user X
//
// while still allowing:
//
// organization A + user X
// organization B + user X
//
// ============================================================================

OrganizationIdentitySchema.index(
  {
    organizationId: 1,
    userId: 1,
  },
  {
    unique: true,
    name:
      "unique_identity_per_user_per_organization",
  },
);

// ============================================================================
// ORGANIZATION EMAIL
// ============================================================================
//
// Prevents two identities in the same organization from having the same
// organization email address.
//
// ============================================================================

OrganizationIdentitySchema.index(
  {
    organizationId: 1,
    organizationEmail: 1,
  },
  {
    unique: true,
    name:
      "unique_organization_email_per_organization",
  },
);

// ============================================================================
// ONE DOMAIN PER IDENTITY
// ============================================================================
//
// This is intentionally SPARSE.
//
// If domainId is null/missing, multiple identities are allowed to have no
// domain.
//
// Once a real domainId exists:
//
// organizationId + domainId
//
// must be unique.
//
// Example:
//
// Organization A
//   john.fockis.com -> John       ✅
//   john.fockis.com -> Sarah      ❌
//
// Organization B
//   john.fockis.com -> Michael    ❌
//
// The global one-domain-per-user/member rule is additionally enforced by the
// OrganizationDomain schema and OrganizationIdentityService.
//
// ============================================================================

OrganizationIdentitySchema.index(
  {
    organizationId: 1,
    domainId: 1,
  },
  {
    unique: true,
    sparse: true,
    name:
      "unique_domain_per_organization_identity",
  },
);