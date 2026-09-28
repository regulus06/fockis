import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type WaveDocument = Wave & Document;

@Schema({ timestamps: true })
export class Wave {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  videoUrl: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  musicUrl?: string;

  @Prop()
  caption?: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  shares: number;

  @Prop({ default: 0 })
  reposts: number;

  @Prop({ default: 0 })
  commentsCount: number;

  // =========================
  // REPOST SUPPORT (FIX)
  // =========================
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  repostTo?: {
    type: 'profile' | 'group' | 'feed';
    groupId?: string;
  } | null;

  @Prop({ type: Types.ObjectId, default: null })
  originalWaveId?: Types.ObjectId;

  @Prop({ default: null })
  repostedBy?: string;

  // =========================
  // QUOTE SUPPORT (FIX)
  // =========================
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  quote?: {
    text: string;
    userId: string;
  } | null;
}

export const WaveSchema = SchemaFactory.createForClass(Wave);