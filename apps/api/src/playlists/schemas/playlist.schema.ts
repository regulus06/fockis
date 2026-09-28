import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Track, TrackSchema } from './track.schema';

import {
  ACCESS_TYPES,
  CONTENT_TYPES,
  MEDIA_KINDS,
  PLAYLIST_STATUSES,
  VISIBILITY_TYPES,
  type AccessType,
  type ContentType,
  type MediaKind,
  type PlaylistStatus,
  type Visibility,
} from '../constants/playlist.constants';

/**
 * ASSUMPTION:
 * `creatorId` references the existing User model.
 *
 * This schema does not redefine the User schema.
 */
@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Playlist {
  @Prop({
    required: true,
    trim: true,
    maxlength: 140,
  })
  title!: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  slug!: string;

  @Prop({
    required: true,
    maxlength: 2000,
  })
  description!: string;

  @Prop({
    required: true,
  })
  coverImageUrl!: string;

  @Prop()
  bannerImageUrl?: string;

  @Prop({
    required: true,
    enum: CONTENT_TYPES,
    index: true,
  })
  contentType!: ContentType;

  @Prop({
    required: true,
    enum: MEDIA_KINDS,
  })
  mediaKind!: MediaKind;

  @Prop({
    trim: true,
    index: true,
  })
  genre?: string;

  @Prop({
    type: [String],
    default: [],
    index: true,
  })
  tags!: string[];

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  creatorId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ACCESS_TYPES,
    default: 'free',
    index: true,
  })
  access!: AccessType;

  @Prop({
    min: 0,
  })
  price?: number;

  @Prop({
    default: 'USD',
  })
  currency!: string;

  @Prop({
    required: true,
    enum: VISIBILITY_TYPES,
    default: 'public',
    index: true,
  })
  visibility!: Visibility;

  @Prop({
    required: true,
    enum: PLAYLIST_STATUSES,
    default: 'draft',
    index: true,
  })
  status!: PlaylistStatus;

  @Prop({
    default: false,
    index: true,
  })
  isFeatured!: boolean;

  @Prop({
    default: true,
  })
  allowComments!: boolean;

  @Prop({
    default: true,
  })
  allowSharing!: boolean;

  @Prop({
    required: true,
  })
  releaseDate!: Date;

  @Prop({
    type: [TrackSchema],
    default: [],
  })
  tracks!: Track[];

  @Prop({
    default: 0,
    index: true,
  })
  playCount!: number;

  @Prop({
    default: 0,
  })
  followerCount!: number;

  @Prop({
    default: 0,
  })
  favoriteCount!: number;

  @Prop({
    min: 0,
    max: 5,
  })
  rating?: number;
}

export type PlaylistDocument = Playlist & Document;

export const PlaylistSchema =
  SchemaFactory.createForClass(Playlist);

// --------------------------------------------------
// Virtuals
// --------------------------------------------------

PlaylistSchema.virtual('trackCount').get(
  function (this: PlaylistDocument) {
    return this.tracks?.length ?? 0;
  },
);

PlaylistSchema.virtual('totalDurationSeconds').get(
  function (this: PlaylistDocument) {
    return (this.tracks ?? []).reduce(
      (sum, track) =>
        sum + (track.durationSeconds ?? 0),
      0,
    );
  },
);

// --------------------------------------------------
// Indexes
// --------------------------------------------------

// Full-text search.
PlaylistSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
});

// Browse/filter.
PlaylistSchema.index({
  status: 1,
  visibility: 1,
  isFeatured: 1,
  playCount: -1,
});

PlaylistSchema.index({
  status: 1,
  visibility: 1,
  access: 1,
  createdAt: -1,
});

PlaylistSchema.index({
  creatorId: 1,
  status: 1,
});