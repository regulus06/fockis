import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * ============================================================================
 * MUSIC PAYMENT STATUS
 * ============================================================================
 */

export enum MusicPaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

/**
 * ============================================================================
 * MUSIC PURCHASE
 * ============================================================================
 *
 * Records the intent and payment lifecycle of a single music purchase.
 *
 * A purchase is created before payment with status=pending.
 * It should only become succeeded after the Stripe webhook confirms payment.
 */
@Schema({ timestamps: true })
export class MusicPurchase extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  /**
   * Stripe PaymentIntent ID.
   */
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  stripePaymentIntentId!: string;

  /**
   * Original purchase amount in cents.
   */
  @Prop({
    required: true,
  })
  amountCents!: number;

  /**
   * ISO currency code.
   */
  @Prop({
    required: true,
    default: 'usd',
  })
  currency!: string;

  /**
   * Platform fee in cents.
   * Server-calculated.
   */
  @Prop({
    required: true,
    default: 0,
  })
  platformFeeCents!: number;

  /**
   * Payment processing fee in cents.
   */
  @Prop({
    required: true,
    default: 0,
  })
  processingFeeCents!: number;

  /**
   * Amount remaining for the producer after applicable fees.
   */
  @Prop({
    required: true,
    default: 0,
  })
  netProducerCents!: number;

  /**
   * Current payment lifecycle state.
   */
  @Prop({
    required: true,
    enum: MusicPaymentStatus,
    default: MusicPaymentStatus.PENDING,
    index: true,
  })
  status!: MusicPaymentStatus;

  /**
   * Optional payment failure reason.
   */
  @Prop()
  failureReason?: string;

  /**
   * Timestamp when the purchase was refunded.
   */
  @Prop({
    type: Date,
  })
  refundedAt?: Date;

  /**
   * Automatically managed by @Schema({ timestamps: true }).
   */
  createdAt!: Date;

  /**
   * Automatically managed by @Schema({ timestamps: true }).
   */
  updatedAt!: Date;
}

export const MusicPurchaseSchema =
  SchemaFactory.createForClass(MusicPurchase);

MusicPurchaseSchema.index({
  userId: 1,
  status: 1,
});

MusicPurchaseSchema.index({
  producerId: 1,
  status: 1,
  createdAt: -1,
});

/**
 * ============================================================================
 * MUSIC ENTITLEMENT
 * ============================================================================
 *
 * The entitlement is the source of truth for whether a user can access
 * protected/full music content.
 *
 * It can be created from:
 *
 * 1. A successful purchase
 * 2. A FREE content access grant
 *
 * Controllers should not directly write entitlement records from
 * user-supplied input.
 */
@Schema({ timestamps: true })
export class MusicEntitlement extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  /**
   * Purchase that created this entitlement.
   *
   * FREE access can have no purchaseId.
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'MusicPurchase',
  })
  purchaseId?: Types.ObjectId;

  /**
   * Access level/type.
   *
   * Kept as string here so this schema remains compatible with the
   * existing MusicAccessType definitions used elsewhere in the module.
   */
  @Prop({
    required: true,
  })
  accessType!: string;

  /**
   * Amount paid for this entitlement, in cents.
   */
  @Prop({
    default: 0,
  })
  amountPaidCents!: number;

  /**
   * ISO currency code.
   */
  @Prop({
    default: 'usd',
  })
  currency!: string;

  /**
   * Current entitlement state.
   */
  @Prop({
    required: true,
    default: 'active',
    enum: ['active', 'revoked', 'expired'],
  })
  status!: 'active' | 'revoked' | 'expired';

  /**
   * When access was granted.
   */
  @Prop({
    type: Date,
    required: true,
    default: () => new Date(),
  })
  purchasedAt!: Date;

  /**
   * Expiration date.
   *
   * null = perpetual access.
   *
   * IMPORTANT:
   * `type: Date` is explicitly specified because TypeScript's
   * `Date | null | undefined` union cannot be inferred by NestJS/Mongoose
   * reflection metadata.
   */
  @Prop({
    type: Date,
    default: null,
  })
  expiresAt?: Date | null;

  /**
   * Automatically managed by @Schema({ timestamps: true }).
   */
  createdAt!: Date;

  /**
   * Automatically managed by @Schema({ timestamps: true }).
   */
  updatedAt!: Date;
}

export const MusicEntitlementSchema =
  SchemaFactory.createForClass(MusicEntitlement);

/**
 * A user can have at most one entitlement for a piece of content.
 */
MusicEntitlementSchema.index(
  {
    userId: 1,
    contentId: 1,
  },
  {
    unique: true,
  },
);

/**
 * ============================================================================
 * PRODUCER EARNING
 * ============================================================================
 *
 * Aggregated financial balance for a producer.
 */
@Schema({ timestamps: true })
export class ProducerEarning extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    unique: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  @Prop({
    default: 0,
  })
  grossRevenueCents!: number;

  @Prop({
    default: 0,
  })
  platformFeeCents!: number;

  @Prop({
    default: 0,
  })
  processingFeeCents!: number;

  @Prop({
    default: 0,
  })
  refundedCents!: number;

  @Prop({
    default: 0,
  })
  netRevenueCents!: number;

  @Prop({
    default: 0,
  })
  pendingBalanceCents!: number;

  @Prop({
    default: 0,
  })
  availableBalanceCents!: number;

  @Prop({
    default: 0,
  })
  paidOutCents!: number;

  /**
   * Automatically managed timestamps.
   */
  createdAt!: Date;
  updatedAt!: Date;
}

export const ProducerEarningSchema =
  SchemaFactory.createForClass(ProducerEarning);

/**
 * ============================================================================
 * PRODUCER PAYOUT
 * ============================================================================
 *
 * Represents money being paid out to a producer.
 *
 * The actual payout provider integration remains outside this schema.
 */
@Schema({ timestamps: true })
export class ProducerPayout extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  amountCents!: number;

  @Prop({
    required: true,
    default: 'usd',
  })
  currency!: string;

  @Prop({
    required: true,
    enum: ['pending', 'in_transit', 'paid', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'in_transit' | 'paid' | 'failed';

  /**
   * Reference supplied by the payout provider.
   *
   * Example:
   * Stripe Connect transfer/payout ID.
   */
  @Prop()
  payoutProviderRef?: string;

  /**
   * Payout method.
   *
   * Example:
   * bank_transfer
   * stripe_connect
   * manual
   */
  @Prop()
  method?: string;

  /**
   * Automatically managed timestamps.
   */
  createdAt!: Date;
  updatedAt!: Date;
}

export const ProducerPayoutSchema =
  SchemaFactory.createForClass(ProducerPayout);