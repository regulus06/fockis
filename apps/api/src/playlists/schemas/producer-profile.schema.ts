import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  PRODUCER_CATEGORIES,
  type ProducerCategory,
} from '../constants/playlist.constants';

/**
 * Producer profile for users who publish playlists/content.
 *
 * This is a one-to-one extension of the existing User model.
 */
@Schema({ timestamps: true })
export class ProducerProfile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: PRODUCER_CATEGORIES,
  })
  category!: ProducerCategory;

  @Prop({
    default: false,
  })
  verified!: boolean;

  @Prop({
    maxlength: 500,
  })
  bio?: string;

  @Prop({
    default: 0,
  })
  followerCount!: number;

  @Prop({
    default: 0,
  })
  releaseCount!: number;
}

export type ProducerProfileDocument = ProducerProfile & Document;

export const ProducerProfileSchema =
  SchemaFactory.createForClass(ProducerProfile);