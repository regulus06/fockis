/**
 * organization.schema.ts
 * -----------------------------------------------------------------------------
 * Organization MongoDB schema for the Fockis Church / Organization feature.
 *
 * The creator of an organization is stored in `createdByUserId`.
 *
 * Every organization owns a permanent Fockis domain namespace:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 *   springfieldchurch.fockis.net
 *   springfieldchurch.fockis.edu
 *   springfieldchurch.fockis.church
 *   springfieldchurch.fockis.co
 *   springfieldchurch.fockis.io
 *
 * The complete normalized domain is stored in MongoDB.
 *
 * Example:
 *
 *   domain = "springfieldchurch.fockis.com"
 *
 * Member/user domains may later be derived from this namespace:
 *
 *   john.springfieldchurch.fockis.com
 *
 * The organization schema stores ONLY the organization's root Fockis domain.
 *
 * Organization cover media:
 *
 *   bannerUrl
 *   bannerMediaType
 *   bannerMediaSource
 *
 * The actual uploaded media file is NOT stored inside MongoDB.
 * MongoDB stores only the URL/path and media metadata.
 *
 * Supported cover media:
 *
 *   image
 *   video
 *
 * Supported sources:
 *
 *   upload
 *   url
 *
 * Leadership and Branches are stored in their own collections and are joined
 * into the organization response by OrganizationsService.
 * ----------------------------------------------------------------------------- */

import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';

import {
  OrganizationType,
} from '../../enums/organization-type.enum';

import {
  OrganizationStatus,
} from '../../enums/organization-status.enum';

/* ============================================================================
 * TYPES
 * ========================================================================== */

/**
 * Organization cover media type.
 */
export type OrganizationBannerMediaType =
  | 'image'
  | 'video';

/**
 * Organization cover media source.
 */
export type OrganizationBannerMediaSource =
  | 'upload'
  | 'url';

/**
 * Supported Fockis organization domain suffixes.
 *
 * The organization domain MUST end with one of these suffixes.
 */
export const FOCKIS_ORGANIZATION_DOMAIN_SUFFIXES = [
  '.fockis.com',
  '.fockis.org',
  '.fockis.net',
  '.fockis.edu',
  '.fockis.church',
  '.fockis.co',
  '.fockis.io',
] as const;

export type FockisOrganizationDomainSuffix =
  (typeof FOCKIS_ORGANIZATION_DOMAIN_SUFFIXES)[number];

/**
 * Mongoose document type.
 */
export type OrganizationDocument =
  Organization & Document;

/* ============================================================================
 * SOCIAL LINKS
 * ========================================================================== */

@Schema({
  _id: false,
})
export class OrganizationSocialLinks {
  @Prop({
    type: String,
  })
  facebook?: string;

  @Prop({
    type: String,
  })
  instagram?: string;

  @Prop({
    type: String,
  })
  youtube?: string;

  @Prop({
    type: String,
  })
  x?: string;

  @Prop({
    type: String,
  })
  tiktok?: string;
}

export const OrganizationSocialLinksSchema =
  SchemaFactory.createForClass(
    OrganizationSocialLinks,
  );

/* ============================================================================
 * CONTACT
 * ========================================================================== */

@Schema({
  _id: false,
})
export class OrganizationContact {
  @Prop({
    type: String,
  })
  email?: string;

  @Prop({
    type: String,
  })
  phone?: string;

  @Prop({
    type: String,
  })
  website?: string;

  @Prop({
    type: OrganizationSocialLinksSchema,
    default: undefined,
  })
  socialLinks?: OrganizationSocialLinks;
}

export const OrganizationContactSchema =
  SchemaFactory.createForClass(
    OrganizationContact,
  );

/* ============================================================================
 * SETTINGS
 * ========================================================================== */

@Schema({
  _id: false,
})
export class OrganizationSettings {
  @Prop({
    type: Boolean,
    default: true,
  })
  isDiscoverable!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  requireApproval!: boolean;
}

export const OrganizationSettingsSchema =
  SchemaFactory.createForClass(
    OrganizationSettings,
  );

/* ============================================================================
 * ORGANIZATION
 * ========================================================================== */

@Schema({
  timestamps: true,
  collection: 'church_organizations',
})
export class Organization {
  /* --------------------------------------------------------------------------
   * BASIC INFORMATION
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  slug!: string;

  /**
   * Permanent Fockis organization namespace.
   *
   * Examples:
   *
   *   springfieldchurch.fockis.com
   *   springfieldchurch.fockis.org
   *   springfieldchurch.fockis.net
   *   springfieldchurch.fockis.edu
   *   springfieldchurch.fockis.church
   *   springfieldchurch.fockis.co
   *   springfieldchurch.fockis.io
   *
   * The complete domain is stored here.
   *
   * The domain must be normalized to lowercase before being saved.
   *
   * The controller/service must validate:
   *
   *   - domain is present
   *   - domain is not a bare Fockis suffix
   *   - organization prefix exists
   *   - suffix is supported
   *   - prefix contains valid domain characters
   *
   * MongoDB uniqueness prevents two organizations from owning the same
   * Fockis namespace.
   */
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  domain!: string;

  /**
   * Organization classification.
   *
   * IMPORTANT:
   *
   * Do NOT use:
   *
   *   type: OrganizationType
   *
   * here.
   *
   * If OrganizationType is a TypeScript string enum, Mongoose can interpret
   * enum values such as "church" as schema configuration and throw:
   *
   *   Invalid schema configuration: `church` is not a valid type
   *
   * The correct Mongoose configuration is:
   *
   *   type: String
   *   enum: Object.values(OrganizationType)
   */
  @Prop({
    type: String,
    enum: Object.values(OrganizationType),
    required: true,
    index: true,
  })
  organizationType!: OrganizationType;

  /* --------------------------------------------------------------------------
   * CREATOR / OWNER
   * ------------------------------------------------------------------------ */

  /**
   * The authenticated user who created this organization.
   *
   * This is the permanent owner identity used by MembersService to restore
   * administrator access if the owner's membership is missing or corrupted.
   *
   * There is no separate church login account.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
    default: null,
  })
  createdByUserId?: Types.ObjectId | null;

  /* --------------------------------------------------------------------------
   * BRANDING
   * ------------------------------------------------------------------------ */

  /**
   * Organization logo.
   */
  @Prop({
    type: String,
    default: null,
  })
  logoUrl?: string | null;

  /**
   * Organization cover URL/path.
   *
   * For uploaded media this can contain a backend media URL such as:
   *
   *   /church/organizations/:organizationId/cover/media/:filename
   *
   * For externally hosted media this contains the external HTTPS URL.
   *
   * The actual uploaded file is NOT stored in MongoDB.
   */
  @Prop({
    type: String,
    default: null,
  })
  bannerUrl?: string | null;

  /**
   * Organization cover media type.
   *
   * Supported:
   *
   *   image
   *   video
   */
  @Prop({
    type: String,
    enum: [
      'image',
      'video',
    ],
    default: null,
  })
  bannerMediaType?:
    | OrganizationBannerMediaType
    | null;

  /**
   * Organization cover media source.
   *
   * Supported:
   *
   *   upload
   *   url
   */
  @Prop({
    type: String,
    enum: [
      'upload',
      'url',
    ],
    default: null,
  })
  bannerMediaSource?:
    | OrganizationBannerMediaSource
    | null;

  /* --------------------------------------------------------------------------
   * DESCRIPTION / WEBSITE
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
  })
  description?: string;

  @Prop({
    type: String,
  })
  website?: string;

  /* --------------------------------------------------------------------------
   * CONTACT
   * ------------------------------------------------------------------------ */

  @Prop({
    type: OrganizationContactSchema,
    default: undefined,
  })
  contact?: OrganizationContact;

  /* --------------------------------------------------------------------------
   * STATUS
   * ------------------------------------------------------------------------ */

  /**
   * Organization lifecycle status.
   *
   * Use the actual MongoDB type String and provide the enum values separately.
   *
   * This prevents the same class of Mongoose configuration problem that
   * occurred with OrganizationType.
   */
  @Prop({
    type: String,
    enum: Object.values(OrganizationStatus),
    default: OrganizationStatus.Active,
    index: true,
  })
  status!: OrganizationStatus;

  /* --------------------------------------------------------------------------
   * SETTINGS
   * ------------------------------------------------------------------------ */

  @Prop({
    type: OrganizationSettingsSchema,
    default: () => ({}),
  })
  settings!: OrganizationSettings;

  /* --------------------------------------------------------------------------
   * TIMESTAMPS
   * ------------------------------------------------------------------------ */

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
 * SCHEMA
 * ========================================================================== */

export const OrganizationSchema =
  SchemaFactory.createForClass(
    Organization,
  );

/* ============================================================================
 * INDEXES
 * ========================================================================== */

/**
 * Organization discovery/search.
 */
OrganizationSchema.index({
  name: 'text',
  description: 'text',
});

/**
 * Fast lookup for organization ownership.
 */
OrganizationSchema.index({
  createdByUserId: 1,
});

/**
 * Fast lookup for Fockis organization domains.
 *
 * The `unique: true` property on `domain` already requests a unique index.
 * This explicit index gives the database constraint a stable name.
 */
OrganizationSchema.index(
  {
    domain: 1,
  },
  {
    unique: true,
    name: 'church_organizations_domain_unique',
  },
);