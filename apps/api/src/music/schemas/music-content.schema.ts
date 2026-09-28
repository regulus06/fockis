import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * ============================================================================
 * FOCKIS MUSIC — CONTENT SCHEMA
 * ============================================================================
 *
 * Stores:
 * - songs
 * - singles
 * - albums
 * - EPs
 * - beats
 * - instrumentals
 * - music
 * - audio
 * - tracks
 * - music videos
 * - videos
 * - live performances
 * - interviews
 * - behind-the-scenes
 * - tutorials
 * - exclusive content
 *
 * IMPORTANT:
 * Performance/ranking fields are SERVER CONTROLLED.
 *
 * Clients must NOT be allowed to submit:
 * - playCount
 * - viewCount
 * - favoriteCount
 * - purchaseCount
 * - shareCount
 * - paidListenCount
 * - paidPlayCount
 * - paidViewCount
 * - revenueCents
 * - earningsCents
 * - uniqueListenerCount
 * - followerCount
 * - rankScore
 *
 * Those values must be changed by trusted backend services.
 * ============================================================================
 */

/**
 * ============================================================================
 * CONTENT TYPES
 * ============================================================================
 *
 * These values are accepted by both:
 *
 * CreateMusicDto
 *   @IsEnum(MusicContentType)
 *
 * and Mongoose:
 *   enum: MusicContentType
 *
 * Existing values are preserved.
 */
export enum MusicContentType {
  // --------------------------------------------------------------------------
  // AUDIO / MUSIC
  // --------------------------------------------------------------------------

  SONG = 'song',

  SINGLE = 'single',

  ALBUM = 'album',

  EP = 'ep',

  BEAT = 'beat',

  INSTRUMENTAL = 'instrumental',

  /**
   * Generic music alias.
   */
  MUSIC = 'music',

  /**
   * Generic audio alias.
   */
  AUDIO = 'audio',

  /**
   * Generic track alias.
   */
  TRACK = 'track',

  // --------------------------------------------------------------------------
  // VIDEO
  // --------------------------------------------------------------------------

  MUSIC_VIDEO = 'music_video',

  /**
   * Generic video alias.
   */
  VIDEO = 'video',

  LIVE_PERFORMANCE = 'live_performance',

  INTERVIEW = 'interview',

  BEHIND_THE_SCENES = 'behind_the_scenes',

  TUTORIAL = 'tutorial',

  // --------------------------------------------------------------------------
  // EXCLUSIVE
  // --------------------------------------------------------------------------

  /**
   * Generic exclusive content.
   */
  EXCLUSIVE = 'exclusive',

  /**
   * Existing exclusive-video type.
   *
   * Kept for backwards compatibility.
   */
  EXCLUSIVE_VIDEO = 'exclusive_video',
}

/**
 * ============================================================================
 * MEDIA KIND
 * ============================================================================
 */

export enum MusicMediaKind {
  AUDIO = 'audio',
  VIDEO = 'video',
}

/**
 * ============================================================================
 * ACCESS TYPE
 * ============================================================================
 */

export enum MusicAccessType {
  FREE = 'free',
  PREVIEW_PAID = 'preview_paid',
  PAID = 'paid',
  PREMIUM = 'premium',
  EXCLUSIVE = 'exclusive',
}

/**
 * ============================================================================
 * MUSIC GENRE
 * ============================================================================
 */

export enum MusicGenre {
  HIP_HOP = 'hip_hop',
  RNB = 'rnb',
  AFROBEATS = 'afrobeats',
  AMAPIANO = 'amapiano',
  POP = 'pop',
  ROCK = 'rock',
  ELECTRONIC = 'electronic',
  GOSPEL = 'gospel',
  JAZZ = 'jazz',
  LATIN = 'latin',
  REGGAE = 'reggae',
  OTHER = 'other',
}

/**
 * ============================================================================
 * PUBLISH STATUS
 * ============================================================================
 */

export enum MusicPublishStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  TAKEN_DOWN = 'taken_down',
}

/**
 * ============================================================================
 * MEDIA PROCESSING STATE
 * ============================================================================
 */

export enum MediaProcessingState {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

/**
 * ============================================================================
 * MEDIA PROCESSING STATE VALUES
 * ============================================================================
 */

function MusicProcessingStateValues(): MediaProcessingState[] {
  return Object.values(
    MediaProcessingState,
  );
}

/**
 * ============================================================================
 * MEDIA ASSET
 * ============================================================================
 */

@Schema({
  _id: false,
})
export class MediaAsset {
  @Prop({
    required: true,
    trim: true,
  })
  storageKey!: string;

  @Prop({
    trim: true,
  })
  mimeType?: string;

  @Prop({
    min: 0,
  })
  durationSeconds?: number;

  @Prop({
    default:
      MediaProcessingState.UPLOADING,
    enum:
      MusicProcessingStateValues(),
  })
  processingState!: MediaProcessingState;

  @Prop({
    min: 0,
  })
  sizeBytes?: number;
}

export const MediaAssetSchema =
  SchemaFactory.createForClass(
    MediaAsset,
  );

/**
 * ============================================================================
 * MUSIC CONTENT
 * ============================================================================
 */

@Schema({
  timestamps: true,
})
export class MusicContent extends Document {
  // ==========================================================================
  // OWNERSHIP
  // ==========================================================================

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  // ==========================================================================
  // CONTENT TYPE
  // ==========================================================================

  /**
   * Accepted examples:
   *
   * song
   * single
   * album
   * ep
   * beat
   * instrumental
   * music
   * audio
   * track
   * music_video
   * video
   * live_performance
   * interview
   * behind_the_scenes
   * tutorial
   * exclusive
   * exclusive_video
   */
  @Prop({
    required: true,
    enum: MusicContentType,
    index: true,
  })
  type!: MusicContentType;

  /**
   * Physical media format.
   *
   * audio | video
   */
  @Prop({
    required: true,
    enum: MusicMediaKind,
    index: true,
  })
  mediaKind!: MusicMediaKind;

  // ==========================================================================
  // BASIC INFORMATION
  // ==========================================================================

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  title!: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  slug!: string;

  @Prop({
    maxlength: 5000,
  })
  description?: string;

  // ==========================================================================
  // MEDIA
  // ==========================================================================

  @Prop({
    type: MediaAssetSchema,
  })
  coverImage?: MediaAsset;

  @Prop({
    type: MediaAssetSchema,
  })
  thumbnail?: MediaAsset;

  @Prop({
    type: MediaAssetSchema,
    required: true,
  })
  media!: MediaAsset;

  @Prop({
    type: MediaAssetSchema,
  })
  previewMedia?: MediaAsset;

  // ==========================================================================
  // DISCOVERY
  // ==========================================================================

  @Prop({
    enum: MusicGenre,
    index: true,
  })
  genre?: MusicGenre;

  @Prop({
    type: [String],
    default: [],
    index: true,
  })
  tags!: string[];

  // ==========================================================================
  // DURATION
  // ==========================================================================

  @Prop({
    min: 0,
  })
  durationSeconds?: number;

  // ==========================================================================
  // ACCESS / MONETIZATION
  // ==========================================================================

  @Prop({
    required: true,
    enum: MusicAccessType,
    default: MusicAccessType.FREE,
    index: true,
  })
  accessType!: MusicAccessType;

  @Prop({
    min: 0,
    default: 0,
  })
  priceCents!: number;

  @Prop({
    default: 'usd',
    lowercase: true,
    trim: true,
  })
  currency!: string;

  @Prop({
    default: 30,
    min: 5,
    max: 120,
  })
  previewDurationSeconds!: number;

  // ==========================================================================
  // USER INTERACTION SETTINGS
  // ==========================================================================

  @Prop({
    default: true,
  })
  allowComments!: boolean;

  @Prop({
    default: true,
  })
  allowSharing!: boolean;

  @Prop({
    default: false,
  })
  allowDownloads!: boolean;

  // ==========================================================================
  // PUBLISHING
  // ==========================================================================

  @Prop({
    required: true,
    enum: MusicPublishStatus,
    default: MusicPublishStatus.DRAFT,
    index: true,
  })
  status!: MusicPublishStatus;

  @Prop({
    index: true,
  })
  releaseDate?: Date;

  @Prop({
    default: false,
    index: true,
  })
  isFeatured!: boolean;

  @Prop({
    default: false,
    index: true,
  })
  isExclusive!: boolean;

  // ==========================================================================
  // ALBUM / TRACK RELATIONSHIPS
  // ==========================================================================

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'MusicContent',
      },
    ],
    default: [],
  })
  trackIds?: Types.ObjectId[];

  @Prop({
    type: Types.ObjectId,
    ref: 'MusicContent',
    index: true,
  })
  albumId?: Types.ObjectId;

  // ==========================================================================
  // BASIC ENGAGEMENT COUNTERS
  // ==========================================================================
  //
  // SERVER CONTROLLED.
  //
  // These must never be accepted directly from CreateMusicDto
  // or UpdateMusicDto.
  //

  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  playCount!: number;

  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  viewCount!: number;

  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  favoriteCount!: number;

  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  purchaseCount!: number;

  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  shareCount!: number;

  // ==========================================================================
  // PAID PERFORMANCE
  // ==========================================================================
  //
  // These values distinguish legitimate full-content engagement
  // from previews.
  //

  /**
   * Number of legitimate full-content listens.
   */
  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  paidListenCount!: number;

  /**
   * Number of full-content plays after entitlement verification.
   *
   * In the analytics system, a paid play is a completed
   * full-content playback event.
   */
  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  paidPlayCount!: number;

  /**
   * Number of full-content video views after entitlement verification.
   */
  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  paidViewCount!: number;

  // ==========================================================================
  // REVENUE
  // ==========================================================================

  /**
   * Gross successful purchase revenue.
   *
   * Example:
   *
   * $4.99 = 499 cents
   */
  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  revenueCents!: number;

  /**
   * Net producer earnings after platform/processing fees.
   */
  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  earningsCents!: number;

  // ==========================================================================
  // AUDIENCE
  // ==========================================================================

  /**
   * Number of distinct users who legitimately listened.
   *
   * Materialized server-side value.
   *
   * Raw MusicPlay events remain the source of truth.
   */
  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  uniqueListenerCount!: number;

  /**
   * Number of followers of the producer at the time
   * ranking was calculated.
   */
  @Prop({
    default: 0,
    min: 0,
    index: true,
  })
  followerCount!: number;

  // ==========================================================================
  // RANKING
  // ==========================================================================

  /**
   * Server-calculated ranking score.
   *
   * Used by:
   * - Trending
   * - Home ranking
   * - Discovery
   * - Music charts
   */
  @Prop({
    default: 0,
    index: true,
  })
  rankScore!: number;

  // ==========================================================================
  // TIMESTAMPS
  // ==========================================================================

  createdAt!: Date;

  updatedAt!: Date;
}

/**
 * ============================================================================
 * SCHEMA
 * ============================================================================
 */

export const MusicContentSchema =
  SchemaFactory.createForClass(
    MusicContent,
  );

/**
 * ============================================================================
 * SEARCH INDEX
 * ============================================================================
 */

MusicContentSchema.index({
  title: 'text',
  tags: 'text',
  description: 'text',
});

/**
 * ============================================================================
 * DISCOVERY INDEXES
 * ============================================================================
 */

MusicContentSchema.index({
  status: 1,
  releaseDate: -1,
});

MusicContentSchema.index({
  producerId: 1,
  status: 1,
});

MusicContentSchema.index({
  accessType: 1,
  status: 1,
});

MusicContentSchema.index({
  mediaKind: 1,
  status: 1,
  rankScore: -1,
});

/**
 * ============================================================================
 * CHART INDEXES
 * ============================================================================
 */

MusicContentSchema.index({
  status: 1,
  paidListenCount: -1,
});

MusicContentSchema.index({
  status: 1,
  paidPlayCount: -1,
});

MusicContentSchema.index({
  status: 1,
  paidViewCount: -1,
});

MusicContentSchema.index({
  status: 1,
  revenueCents: -1,
});

MusicContentSchema.index({
  status: 1,
  earningsCents: -1,
});

MusicContentSchema.index({
  status: 1,
  uniqueListenerCount: -1,
});

MusicContentSchema.index({
  status: 1,
  followerCount: -1,
});

MusicContentSchema.index({
  status: 1,
  rankScore: -1,
});

/**
 * ============================================================================
 * PERFORMANCE INDEXES
 * ============================================================================
 */

MusicContentSchema.index({
  status: 1,
  playCount: -1,
});

MusicContentSchema.index({
  status: 1,
  viewCount: -1,
});

MusicContentSchema.index({
  status: 1,
  purchaseCount: -1,
});

MusicContentSchema.index({
  status: 1,
  favoriteCount: -1,
});

MusicContentSchema.index({
  status: 1,
  shareCount: -1,
});

/**
 * ============================================================================
 * PRODUCER + CONTENT TYPE INDEX
 * ============================================================================
 */

MusicContentSchema.index({
  producerId: 1,
  type: 1,
  status: 1,
});

/**
 * ============================================================================
 * MEDIA PROCESSING INDEX
 * ============================================================================
 */

MusicContentSchema.index({
  'media.processingState': 1,
  status: 1,
});