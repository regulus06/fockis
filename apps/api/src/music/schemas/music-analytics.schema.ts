import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

// ============================================================================
// MUSIC PLAY
// ============================================================================

/**
 * Raw play event logs.
 *
 * Every legitimate playback creates one MusicPlay event.
 *
 * Example:
 *
 * User A plays Song 1 fifteen times:
 *
 *   MusicPlay = 15 records
 *
 * These records are intentionally append-only.
 */
@Schema({ timestamps: true })
export class MusicPlay extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  /**
   * Optional because anonymous preview plays are allowed.
   */
  @Prop({
    type: Types.ObjectId,
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop({
    default: 0,
    min: 0,
  })
  secondsPlayed!: number;

  @Prop({
    default: false,
  })
  completed!: boolean;

  @Prop({
    default: false,
  })
  wasPreview!: boolean;

  /**
   * Automatically populated by Mongoose timestamps.
   */
  createdAt!: Date;
}

export const MusicPlaySchema =
  SchemaFactory.createForClass(MusicPlay);

/**
 * Useful for producer analytics and recent-play queries.
 */
MusicPlaySchema.index({
  producerId: 1,
  createdAt: -1,
});

/**
 * Useful for content analytics.
 */
MusicPlaySchema.index({
  contentId: 1,
  createdAt: -1,
});

/**
 * Useful for per-user playback history.
 */
MusicPlaySchema.index({
  userId: 1,
  contentId: 1,
  createdAt: -1,
});

// ============================================================================
// MUSIC VIEW
// ============================================================================

/**
 * Unique authenticated-user view records.
 *
 * IMPORTANT:
 *
 * This collection is NOT an append-only play log.
 *
 * It represents:
 *
 *     one user + one content = one unique view
 *
 * Therefore if User A plays Song 1 fifteen times:
 *
 *     MusicPlay  = 15 records
 *     MusicView  = 1 record
 *
 * If User B then plays Song 1:
 *
 *     MusicPlay  = 16 records
 *     MusicView  = 2 records
 *
 * Anonymous users can still generate raw view analytics, but because
 * there is no userId, they cannot participate in the authenticated
 * one-user-one-view uniqueness rule.
 */
@Schema({ timestamps: true })
export class MusicView extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  /**
   * Authenticated user associated with the unique view.
   *
   * This is required for the one-user-one-view rule.
   */
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /**
   * Total seconds watched/listened to during the playback
   * that established or updated this user's view record.
   */
  @Prop({
    default: 0,
    min: 0,
  })
  secondsWatched!: number;

  @Prop({
    default: false,
  })
  completed!: boolean;

  @Prop({
    default: false,
  })
  wasPreview!: boolean;

  /**
   * Automatically populated by Mongoose timestamps.
   */
  createdAt!: Date;

  /**
   * Automatically populated by Mongoose timestamps.
   */
  updatedAt!: Date;
}

export const MusicViewSchema =
  SchemaFactory.createForClass(MusicView);

/**
 * CRITICAL:
 *
 * One authenticated user can create only ONE view for a specific
 * music content item.
 *
 * This is what enforces:
 *
 *     User A + Song 1 = 1 view
 *
 * even if User A plays Song 1 twenty times.
 */
MusicViewSchema.index(
  {
    userId: 1,
    contentId: 1,
  },
  {
    unique: true,
    name: "music_view_unique_user_content",
  },
);

/**
 * Producer analytics.
 */
MusicViewSchema.index({
  producerId: 1,
  createdAt: -1,
});

/**
 * Content analytics.
 */
MusicViewSchema.index({
  contentId: 1,
  createdAt: -1,
});

// ============================================================================
// MUSIC FAVORITE
// ============================================================================

@Schema({ timestamps: true })
export class MusicFavorite extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  /**
   * Automatically populated by Mongoose timestamps.
   */
  createdAt!: Date;
}

export const MusicFavoriteSchema =
  SchemaFactory.createForClass(MusicFavorite);

MusicFavoriteSchema.index(
  {
    userId: 1,
    contentId: 1,
  },
  {
    unique: true,
  },
);

// ============================================================================
// MUSIC SHARE
// ============================================================================

@Schema({ timestamps: true })
export class MusicShare extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  /**
   * Optional for anonymous shares.
   */
  @Prop({
    type: Types.ObjectId,
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop()
  channel?: string;

  /**
   * Automatically populated by Mongoose timestamps.
   */
  createdAt!: Date;
}

export const MusicShareSchema =
  SchemaFactory.createForClass(MusicShare);

// ============================================================================
// PRODUCER FOLLOW
// ============================================================================

@Schema({ timestamps: true })
export class ProducerFollow extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  /**
   * Automatically populated by Mongoose timestamps.
   */
  createdAt!: Date;
}

export const ProducerFollowSchema =
  SchemaFactory.createForClass(ProducerFollow);

ProducerFollowSchema.index(
  {
    userId: 1,
    producerId: 1,
  },
  {
    unique: true,
  },
);