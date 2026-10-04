import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ABTestDocument = HydratedDocument<ABTest>;

@Schema({ _id: false })
export class ABVariant {
  @Prop({
    required: true,
    enum: ['A', 'B'],
  })
  key: 'A' | 'B';

  @Prop({
    required: true,
    trim: true,
  })
  label: string;

  @Prop({
    required: true,
    trim: true,
  })
  value: string;

  @Prop({
    default: 0,
    min: 0,
  })
  recipients: number;

  @Prop({
    default: 0,
    min: 0,
  })
  openRate: number;

  @Prop({
    default: 0,
    min: 0,
  })
  clickRate: number;

  @Prop({
    default: 0,
    min: 0,
  })
  conversionRate: number;

  @Prop({
    default: 0,
    min: 0,
  })
  revenue: number;
}

export const ABVariantSchema = SchemaFactory.createForClass(ABVariant);

@Schema({
  timestamps: true,
  collection: 'fockis_mail_ab_tests',
})
export class ABTest {
  @Prop({
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    required: true,
    enum: ['subject', 'from_name', 'send_time', 'content'],
  })
  variable: 'subject' | 'from_name' | 'send_time' | 'content';

  @Prop({
    required: true,
    enum: ['draft', 'running', 'completed'],
    default: 'draft',
  })
  status: 'draft' | 'running' | 'completed';

  @Prop({
    required: true,
    min: 1,
    max: 100,
    default: 50,
  })
  testSizePct: number;

  @Prop({
    required: true,
    enum: [
      'open_rate',
      'click_rate',
      'conversion_rate',
      'revenue',
    ],
  })
  winnerMetric:
    | 'open_rate'
    | 'click_rate'
    | 'conversion_rate'
    | 'revenue';

  @Prop({
    type: [ABVariantSchema],
    required: true,
    validate: {
      validator: (value: unknown[]) =>
        Array.isArray(value) &&
        value.length === 2 &&
        value.some((item: any) => item?.key === 'A') &&
        value.some((item: any) => item?.key === 'B'),
      message: 'An A/B test must contain exactly Variant A and Variant B.',
    },
  })
  variants: ABVariant[];

  @Prop({
    enum: ['A', 'B'],
    required: false,
  })
  declaredWinner?: 'A' | 'B';

  @Prop({
    required: false,
  })
  startedAt?: Date;

  @Prop({
    required: true,
    index: true,
  })
  ownerId: Types.ObjectId;

  @Prop({
    required: true,
    index: true,
  })
  workspaceId: string;
}

export const ABTestSchema = SchemaFactory.createForClass(ABTest);

ABTestSchema.index({
  ownerId: 1,
  workspaceId: 1,
  createdAt: -1,
});