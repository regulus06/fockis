import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ required: true })
  targetId!: string;

  @Prop({ required: true, enum: ['post', 'wave', 'reel', 'story'] })
  targetType!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ default: '' })
  username!: string;

  @Prop({ default: '' })
  userPhoto!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({
    type: String,
    default: null,
  })
  parentCommentId?: string | null;

  @Prop({ default: 0 })
  likes!: number;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);