import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';

// ============================================================================
// DOCUMENT TYPE
// ============================================================================

export type ProducerProfileDocument =
  ProducerProfile & Document;

// ============================================================================
// PRODUCER STATUS
// ============================================================================

export enum ProducerStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

// ============================================================================
// PRODUCER PROFILE
// ============================================================================

@Schema({
  timestamps: true,
})
export class ProducerProfile {
  // ==========================================================================
  // FOCKIS USER
  // ==========================================================================

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  // ==========================================================================
  // PRODUCER PROFILE
  // ==========================================================================

  @Prop({
    required: true,
    trim: true,
    maxlength: 120,
  })
  producerName!: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
    maxlength: 5000,
  })
  bio!: string;

  // ==========================================================================
  // PRODUCER GENRES
  // ==========================================================================
  //
  // A producer can select multiple genres.
  //
  // Example:
  //
  // genres: [
  //   'hip-hop',
  //   'rnb',
  //   'afrobeats',
  //   'trap'
  // ]
  //
  // ==========================================================================

  @Prop({
    type: [String],
    default: [],
  })
  genres!: string[];

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  profileImage!: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  coverImage!: string;

  // ==========================================================================
  // SOCIAL LINKS
  // ==========================================================================

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  website!: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  instagram!: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  youtube!: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  tiktok!: string;

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  spotify!: string;

  // ==========================================================================
  // APPLICATION STATUS
  // ==========================================================================

  @Prop({
    type: String,
    enum: Object.values(ProducerStatus),
    default: ProducerStatus.PENDING,
    index: true,
  })
  status!: ProducerStatus;

  @Prop({
    type: String,
    default: '',
    trim: true,
    maxlength: 2000,
  })
  adminNote!: string;

  // ==========================================================================
  // ADMIN REVIEW
  // ==========================================================================

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  reviewedBy!: Types.ObjectId | null;

  @Prop({
    type: Date,
    default: null,
  })
  reviewedAt!: Date | null;

  // ==========================================================================
  // PRODUCER STATISTICS
  // ==========================================================================

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  followersCount!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  releasesCount!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  totalPlays!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  totalViews!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  totalSales!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  totalRevenueCents!: number;
}

// ============================================================================
// SCHEMA
// ============================================================================

export const ProducerProfileSchema =
  SchemaFactory.createForClass(
    ProducerProfile,
  );

// ============================================================================
// INDEXES
// ============================================================================

// One producer profile per Fockis user.
ProducerProfileSchema.index({
  userId: 1,
});

// Quickly find pending/approved/rejected/suspended applications.
ProducerProfileSchema.index({
  status: 1,
});

// Producer discovery.
ProducerProfileSchema.index({
  producerName: 1,
});

// Admin producer search/filter.
ProducerProfileSchema.index({
  status: 1,
  producerName: 1,
});

// Genre discovery/filtering.
//
// This allows MongoDB queries such as:
//
// { genres: 'hip-hop' }
//
// or:
//
// { genres: { $in: ['hip-hop', 'rnb'] } }
//
// ============================================================================
ProducerProfileSchema.index({
  genres: 1,
});