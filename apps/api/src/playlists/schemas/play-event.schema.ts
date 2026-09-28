import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';


/**
 * One row per recorded playlist play.
 *
 * Used for:
 * - playCount increments
 * - Recently Played
 * - most-played sorting
 * - future playlist analytics
 */
@Schema({
  timestamps: {
    createdAt: 'playedAt',
    updatedAt: false,
  },
})
export class PlayEvent {
  /**
   * The authenticated user who played the track.
   *
   * Optional so anonymous plays can also be recorded.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    index: true,
  })
  userId?: Types.ObjectId;


  /**
   * Playlist that was played.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Playlist',
    required: true,
    index: true,
  })
  playlistId!: Types.ObjectId;


  /**
   * Track inside the playlist that was played.
   */
  @Prop({
    required: true,
  })
  trackId!: string;


  /**
   * Automatically populated by Mongoose through
   * timestamps.createdAt -> playedAt.
   */
  playedAt!: Date;
}


export type PlayEventDocument =
  PlayEvent & Document;


export const PlayEventSchema =
  SchemaFactory.createForClass(
    PlayEvent,
  );


/**
 * Efficient Recently Played queries:
 *
 * find({ userId })
 *   .sort({ playedAt: -1 })
 */
PlayEventSchema.index({
  userId: 1,
  playedAt: -1,
});