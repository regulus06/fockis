import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { JourneyStatus } from '../enums/fockis-mail.enums';

export type JourneyDocument = HydratedDocument<Journey>;

@Schema({
  timestamps: true,
  collection: 'fockis_mail_journeys',
})
export class Journey {
  @Prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200,
  })
  name: string;

  @Prop({
    enum: JourneyStatus,
    default: JourneyStatus.DRAFT,
    index: true,
  })
  status: JourneyStatus;

  @Prop({
    type: [Object],
    default: [],
  })
  nodes: Record<string, any>[];

  @Prop({
    type: [Object],
    default: [],
  })
  edges: Record<string, any>[];

  /**
   * Number of contacts currently enrolled in this journey.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  participants: number;

  @Prop({
    required: true,
    index: true,
    type: Types.ObjectId,
  })
  ownerId: Types.ObjectId;

  @Prop({
    required: true,
    index: true,
    trim: true,
  })
  workspaceId: string;

  /**
   * Automatically managed by Mongoose because timestamps are enabled.
   * Explicit declarations keep the TypeScript document type aware of them.
   */
  createdAt: Date;

  updatedAt: Date;
}

export const JourneySchema = SchemaFactory.createForClass(Journey);

JourneySchema.index({
  ownerId: 1,
  workspaceId: 1,
  createdAt: -1,
});

JourneySchema.index({
  ownerId: 1,
  workspaceId: 1,
  status: 1,
});