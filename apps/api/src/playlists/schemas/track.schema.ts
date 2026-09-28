import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Embedded track inside a Playlist.
 *
 * This is an embedded subdocument, not a separate MongoDB collection.
 */
@Schema({
  _id: true,
})
export class Track {
  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  title!: string;

  @Prop({
    trim: true,
    maxlength: 200,
  })
  artist?: string;

  @Prop({
    trim: true,
    maxlength: 200,
  })
  album?: string;

  @Prop()
  audioUrl?: string;

  @Prop()
  videoUrl?: string;

  @Prop()
  coverImageUrl?: string;

  @Prop({
    min: 0,
  })
  durationSeconds?: number;

  @Prop({
    default: 0,
  })
  trackNumber!: number;

  @Prop({
    trim: true,
  })
  genre?: string;

  @Prop({
    type: [String],
    default: [],
  })
  tags!: string[];

  @Prop({
    default: false,
  })
  explicit!: boolean;
}

export type TrackDocument = Track & Document;

export const TrackSchema = SchemaFactory.createForClass(Track);