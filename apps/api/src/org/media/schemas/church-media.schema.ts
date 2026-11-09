/**
 * church-media.schema.ts
 * -----------------------------------------------------------------------------
 * Mongoose schema for the Church Documents & Media library.
 *
 * Mirrors the Church frontend/media service contract:
 *
 * - mediaType
 * - title
 * - description
 * - thumbnailUrl
 * - fileUrl
 * - durationSeconds
 * - speaker
 * - publishedAt
 * - tags
 *
 * IMPORTANT:
 * Nullable properties explicitly declare their Mongoose `type`.
 * This prevents NestJS/Mongoose CannotDetermineTypeError exceptions when
 * TypeScript uses unions such as `string | null` or `number | null`.
 * -----------------------------------------------------------------------------
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

/* ============================================================================
 * MEDIA TYPE
 * ========================================================================== */

export enum ChurchMediaType {
  Photo = 'photo',
  Video = 'video',
  Audio = 'audio',
  Document = 'document',
}

/* ============================================================================
 * VISIBILITY
 * ========================================================================== */

export enum ChurchMediaVisibility {
  Public = 'public',
  Members = 'members',
  Private = 'private',
}

/* ============================================================================
 * DOCUMENT TYPE
 * ========================================================================== */

export type ChurchMediaDocument =
  ChurchMedia & Document;

/* ============================================================================
 * CHURCH MEDIA
 * ========================================================================== */

@Schema({
  timestamps: true,
  collection: 'church_media',
})
export class ChurchMedia {
  /* --------------------------------------------------------------------------
   * ORGANIZATION
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /* --------------------------------------------------------------------------
   * BRANCH
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true,
  })
  branchId?: Types.ObjectId | null;

  /* --------------------------------------------------------------------------
   * TITLE
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title!: string;

  /* --------------------------------------------------------------------------
   * DESCRIPTION
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
  })
  description?: string | null;

  /* --------------------------------------------------------------------------
   * MEDIA TYPE
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    enum: ChurchMediaType,
    required: true,
    index: true,
  })
  mediaType!: ChurchMediaType;

  /* --------------------------------------------------------------------------
   * VISIBILITY
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    enum: ChurchMediaVisibility,
    default: ChurchMediaVisibility.Members,
    index: true,
  })
  visibility!: ChurchMediaVisibility;

  /* --------------------------------------------------------------------------
   * FILE URL
   *
   * This is intentionally `fileUrl` because the existing
   * church-media.service.ts and CreateMediaDto use `fileUrl`.
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    required: true,
  })
  fileUrl!: string;

  /* --------------------------------------------------------------------------
   * THUMBNAIL URL
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
  })
  thumbnailUrl?: string | null;

  /* --------------------------------------------------------------------------
   * DURATION
   *
   * Duration is stored in seconds.
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Number,
    default: null,
  })
  durationSeconds?: number | null;

  /* --------------------------------------------------------------------------
   * SPEAKER
   *
   * Used for sermons, teachings, worship recordings, etc.
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
  })
  speaker?: string | null;

  /* --------------------------------------------------------------------------
   * MIME TYPE
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
  })
  mimeType?: string | null;

  /* --------------------------------------------------------------------------
   * FILE NAME
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
  })
  fileName?: string | null;

  /* --------------------------------------------------------------------------
   * FILE SIZE
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Number,
    default: null,
  })
  fileSize?: number | null;

  /* --------------------------------------------------------------------------
   * CATEGORY
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
    index: true,
  })
  category?: string | null;

  /* --------------------------------------------------------------------------
   * TAGS
   * ------------------------------------------------------------------------ */

  @Prop({
    type: [String],
    default: [],
  })
  tags!: string[];

  /* --------------------------------------------------------------------------
   * FEATURED
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  featured!: boolean;

  /* --------------------------------------------------------------------------
   * DISPLAY ORDER
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Number,
    default: 0,
  })
  order!: number;

  /* --------------------------------------------------------------------------
   * PUBLISHED AT
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Date,
    default: null,
    index: true,
  })
  publishedAt?: Date | null;

  /* --------------------------------------------------------------------------
   * UPLOADED BY USER
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  uploadedByUserId!: Types.ObjectId;

  /* --------------------------------------------------------------------------
   * UPLOADED BY MEMBERSHIP
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Types.ObjectId,
    ref: 'Membership',
    default: null,
  })
  uploadedByMembershipId?: Types.ObjectId | null;

  /* --------------------------------------------------------------------------
   * CREATED / UPDATED
   * ------------------------------------------------------------------------ */

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
 * SCHEMA
 * ========================================================================== */

export const ChurchMediaSchema =
  SchemaFactory.createForClass(
    ChurchMedia,
  );

/* ============================================================================
 * INDEXES
 * ========================================================================== */

/**
 * Organization media listing.
 */
ChurchMediaSchema.index({
  organizationId: 1,
  createdAt: -1,
});

/**
 * Organization + media type.
 */
ChurchMediaSchema.index({
  organizationId: 1,
  mediaType: 1,
  createdAt: -1,
});

/**
 * Organization + visibility.
 */
ChurchMediaSchema.index({
  organizationId: 1,
  visibility: 1,
  createdAt: -1,
});

/**
 * Organization + featured media.
 */
ChurchMediaSchema.index({
  organizationId: 1,
  featured: 1,
  order: 1,
});

/**
 * Organization + branch.
 */
ChurchMediaSchema.index({
  organizationId: 1,
  branchId: 1,
  createdAt: -1,
});

/**
 * Text search.
 */
ChurchMediaSchema.index({
  title: 'text',
  description: 'text',
  speaker: 'text',
  category: 'text',
});