import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BehaviorDocument = Behavior & Document;

export type BehaviorType =
  | 'view'
  | 'like'
  | 'share'
  | 'comment'
  | 'watch_time'
  | 'repost'
  | 'click';

@Schema({ timestamps: true })
export class Behavior {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  contentId!: string;

  @Prop({ required: true })
  contentType!: 'post' | 'wave' | 'reel' | 'story';

  @Prop({ required: true })
  type!: BehaviorType;

  @Prop({ default: 0 })
  watchTime!: number;

  @Prop({ type: Object, default: {} })
  meta!: any;
}

export const BehaviorSchema = SchemaFactory.createForClass(Behavior);