import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Stores a user's follow relationship with a producer.
 */
@Schema({ timestamps: true })
export class ProducerFollow {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  followerId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;
}

export type ProducerFollowDocument = ProducerFollow & Document;

export const ProducerFollowSchema =
  SchemaFactory.createForClass(ProducerFollow);

ProducerFollowSchema.index(
  { followerId: 1, producerId: 1 },
  { unique: true },
);