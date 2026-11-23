import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({
  timestamps: true,
  collection: 'payments',
})
export class Payment {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  id!: string;

  /** The Fockis account that paid. Null for a guest payment (see payerEmail). */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  })
  // Typed non-null for existing code; it is null only for guest payments
  // (payerEmail set), which only guest-aware code creates and reads.
  userId!: Types.ObjectId;

  /** Guest payments only: where the receipt goes (no Fockis account). */
  @Prop({
    type: String,
    default: null,
    lowercase: true,
    trim: true,
    maxlength: 254,
  })
  payerEmail!: string | null;

  /** Guest payments only: the name the payer typed. */
  @Prop({
    type: String,
    default: null,
    trim: true,
    maxlength: 120,
  })
  payerName!: string | null;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  purpose!: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  referenceId!: string;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  baseAmount!: number;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
  })
  baseCurrency!: string;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  chargedAmount!: number;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
  })
  chargedCurrency!: string;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
  })
  country!: string;

  @Prop({
    type: Number,
    required: true,
    default: 1,
  })
  exchangeRate!: number;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  status!: string;

  @Prop({
    type: String,
    default: null,
    index: true,
  })
  stripePaymentIntentId!: string | null;

  @Prop({
    type: String,
    default: null,
  })
  idempotencyKey!: string | null;

  @Prop({
    type: String,
    default: null,
  })
  failureMessage!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  paidAt!: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  refundedAt!: Date | null;

  /** Set when the payer's receipt was sent (PaymentReceiptService). */
  @Prop({
    type: Date,
    default: null,
  })
  receiptSentAt!: Date | null;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  refundedAmount!: number;

  @Prop({
    type: Object,
    default: {},
  })
  metadata!: Record<string, string>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({
  userId: 1,
  idempotencyKey: 1,
});

PaymentSchema.index({
  stripePaymentIntentId: 1,
});

PaymentSchema.index({
  purpose: 1,
  referenceId: 1,
});