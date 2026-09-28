import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";
import {
  Document,
  Types,
} from "mongoose";

export type OrganizationDomainDocument =
  OrganizationDomain & Document;

/**
 * ============================================================================
 * DOMAIN VERIFICATION STATUS
 * ============================================================================
 */

export enum OrganizationDomainStatus {
  Pending = "pending",
  Verified = "verified",
  Rejected = "rejected",
}

/**
 * ============================================================================
 * DOMAIN TYPE
 * ============================================================================
 *
 * organization
 *   The organization's primary/base Fockis domain.
 *
 * member
 *   A domain belonging to an individual organization member.
 *
 * Example:
 *
 *   springfieldchurch.fockis.com
 *             │
 *             ├── john.springfieldchurch.fockis.com
 *             ├── mary.springfieldchurch.fockis.com
 *             └── david.springfieldchurch.fockis.com
 */

export enum OrganizationDomainType {
  Organization = "organization",
  Member = "member",
}

/**
 * ============================================================================
 * ORGANIZATION DOMAIN
 * ============================================================================
 */

@Schema({
  timestamps: true,
  collection: "organization_domains",
})
export class OrganizationDomain {
  /**
   * ==========================================================================
   * ORGANIZATION
   * ==========================================================================
   *
   * Organization that owns this domain.
   */

  @Prop({
    type: Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /**
   * ==========================================================================
   * DOMAIN TYPE
   * ==========================================================================
   *
   * organization:
   *   Base domain belonging to the organization.
   *
   * member:
   *   Domain belonging to an individual member.
   */

  @Prop({
    type: String,
    enum: Object.values(OrganizationDomainType),
    required: true,
    default: OrganizationDomainType.Member,
    index: true,
  })
  domainType!: OrganizationDomainType;

  /**
   * ==========================================================================
   * PARENT DOMAIN
   * ==========================================================================
   *
   * Member domains point to the organization's base domain.
   *
   * Example:
   *
   *   Base:
   *   springfieldchurch.fockis.com
   *
   *   Member:
   *   john.springfieldchurch.fockis.com
   *
   * The member's parentDomainId points to the base domain record.
   *
   * Organization domains have:
   *
   *   parentDomainId = null
   */

  @Prop({
    type: Types.ObjectId,
    ref: "OrganizationDomain",
    default: null,
    index: true,
  })
  parentDomainId?: Types.ObjectId | null;

  /**
   * ==========================================================================
   * DOMAIN
   * ==========================================================================
   *
   * Fockis controls the fockis.com namespace.
   *
   * Valid:
   *
   *   fockis.com
   *   church.fockis.com
   *   springfieldchurch.fockis.com
   *   john.springfieldchurch.fockis.com
   *   john.company.fockis.com
   *
   * Invalid:
   *
   *   gmail.com
   *   example.com
   *   fockis-example.com
   *   fockis.com.evil.com
   */

  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
    index: true,

    /**
     * Every label:
     *
     *   - starts with alphanumeric
     *   - may contain letters, numbers and hyphens
     *   - ends with alphanumeric
     *
     * The final namespace must be fockis.com.
     */
    match:
      /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+fockis\.com$/i,
  })
  domain!: string;

  /**
   * ==========================================================================
   * ASSIGNED USER
   * ==========================================================================
   *
   * Member/user that owns this domain.
   *
   * Organization base domains normally have no assigned user.
   *
   * Member domains normally have the member's user ID.
   */

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
    sparse: true,
  })
  assignedUserId?: Types.ObjectId | null;

  /**
   * ==========================================================================
   * ASSIGNED MEMBERSHIP
   * ==========================================================================
   *
   * Direct relationship to the organization membership.
   *
   * One membership can own only one domain.
   */

  @Prop({
    type: Types.ObjectId,
    ref: "Membership",
    default: null,
    index: true,
    sparse: true,
  })
  assignedMembershipId?: Types.ObjectId | null;

  /**
   * ==========================================================================
   * STATUS
   * ==========================================================================
   */

  @Prop({
    type: String,
    enum: Object.values(OrganizationDomainStatus),
    default: OrganizationDomainStatus.Pending,
    index: true,
  })
  status!: OrganizationDomainStatus;

  /**
   * ==========================================================================
   * DNS VERIFICATION HOST
   * ==========================================================================
   */

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  verificationHost?: string | null;

  /**
   * ==========================================================================
   * DNS VERIFICATION VALUE
   * ==========================================================================
   */

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  verificationValue?: string | null;

  /**
   * ==========================================================================
   * VERIFIED AT
   * ==========================================================================
   */

  @Prop({
    type: Date,
    default: null,
  })
  verifiedAt?: Date | null;

  /**
   * ==========================================================================
   * TIMESTAMPS
   * ==========================================================================
   */

  createdAt?: Date;

  updatedAt?: Date;
}

/**
 * ============================================================================
 * SCHEMA
 * ============================================================================
 */

export const OrganizationDomainSchema =
  SchemaFactory.createForClass(
    OrganizationDomain,
  );

/**
 * ============================================================================
 * GLOBAL DOMAIN UNIQUENESS
 * ============================================================================
 *
 * A Fockis domain can exist only once globally.
 *
 * Example:
 *
 *   john.springfieldchurch.fockis.com
 *
 * cannot belong to two organizations.
 */

OrganizationDomainSchema.index(
  {
    domain: 1,
  },
  {
    unique: true,
    name: "unique_fockis_domain",
  },
);

/**
 * ============================================================================
 * ONE USER = ONE DOMAIN
 * ============================================================================
 *
 * A user cannot own multiple organization member domains.
 *
 * sparse=true allows organization/base domains to exist without
 * an assigned user.
 */

OrganizationDomainSchema.index(
  {
    assignedUserId: 1,
  },
  {
    unique: true,
    sparse: true,
    name: "unique_domain_per_user",
  },
);

/**
 * ============================================================================
 * ONE MEMBERSHIP = ONE DOMAIN
 * ============================================================================
 *
 * A membership cannot own multiple domains.
 */

OrganizationDomainSchema.index(
  {
    assignedMembershipId: 1,
  },
  {
    unique: true,
    sparse: true,
    name: "unique_domain_per_membership",
  },
);

/**
 * ============================================================================
 * ORGANIZATION + DOMAIN
 * ============================================================================
 *
 * Fast organization domain lookup.
 *
 * The global domain index remains authoritative.
 */

OrganizationDomainSchema.index(
  {
    organizationId: 1,
    domain: 1,
  },
  {
    unique: true,
    name: "unique_domain_per_organization",
  },
);

/**
 * ============================================================================
 * ORGANIZATION + DOMAIN TYPE
 * ============================================================================
 */

OrganizationDomainSchema.index({
  organizationId: 1,
  domainType: 1,
});

/**
 * ============================================================================
 * ONE ORGANIZATION BASE DOMAIN
 * ============================================================================
 *
 * Each organization can have only ONE:
 *
 *   domainType = "organization"
 *
 * Example:
 *
 *   Springfield Church
 *       │
 *       └── springfieldchurch.fockis.com
 *
 * Member domains use:
 *
 *   domainType = "member"
 */

OrganizationDomainSchema.index(
  {
    organizationId: 1,
    domainType: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      domainType:
        OrganizationDomainType.Organization,
    },
    name: "unique_organization_base_domain",
  },
);

/**
 * ============================================================================
 * PARENT DOMAIN LOOKUP
 * ============================================================================
 *
 * Quickly retrieves all member domains belonging to a base domain.
 */

OrganizationDomainSchema.index({
  parentDomainId: 1,
});

/**
 * ============================================================================
 * ORGANIZATION + PARENT DOMAIN
 * ============================================================================
 */

OrganizationDomainSchema.index({
  organizationId: 1,
  parentDomainId: 1,
});

/**
 * ============================================================================
 * ORGANIZATION + STATUS
 * ============================================================================
 */

OrganizationDomainSchema.index({
  organizationId: 1,
  status: 1,
});

/**
 * ============================================================================
 * ORGANIZATION + DOMAIN TYPE + STATUS
 * ============================================================================
 */

OrganizationDomainSchema.index({
  organizationId: 1,
  domainType: 1,
  status: 1,
});