
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StripeWebhookEventDocument =
  HydratedDocument<StripeWebhookEvent>;

export enum StripeWebhookEventStatus {
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

@Schema({
  timestamps: true,
  collection: 'stripe_webhook_events',
})
export class StripeWebhookEvent {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  eventId!: string;

  @Prop({
    type: String,
    required: true,
  })
  eventType!: string;

  @Prop({
    type: String,
    enum: StripeWebhookEventStatus,
    default: StripeWebhookEventStatus.PROCESSING,
    required: true,
    index: true,
  })
  status!: StripeWebhookEventStatus;

  @Prop({
    type: Number,
    default: 1,
    min: 1,
  })
  attempts!: number;

  @Prop({
    type: Date,
    default: Date.now,
  })
  receivedAt!: Date;

  @Prop({
    type: Date,
    required: false,
  })
  processedAt?: Date;

  @Prop({
    type: String,
    required: false,
  })
  lastError?: string;
}

export const StripeWebhookEventSchema =
  SchemaFactory.createForClass(StripeWebhookEvent);
