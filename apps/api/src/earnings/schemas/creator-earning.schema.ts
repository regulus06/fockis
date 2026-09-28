import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

export type CreatorEarningDocument =
  CreatorEarning & Document;

/**
 * ============================================================================
 * CREATOR EARNING
 * ============================================================================
 *
 * One earnings account belongs to one creator/user.
 *
 * The same CreatorEarning document stores the creator's
 * Stripe Connect account ID.
 *
 * ============================================================================
 */

@Schema({
  timestamps: true,
})
export class CreatorEarning {
  /**
   * Creator/User who owns this earnings account.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  })
  creatorId!: Types.ObjectId;

  /**
   * Coins earned from gifts.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  coinsReceived!: number;

  /**
   * Total gross cash value generated.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  grossEarnings!: number;

  /**
   * Money currently waiting for settlement.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  pendingBalance!: number;

  /**
   * Money available for withdrawal.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  availableBalance!: number;

  /**
   * Total amount withdrawn.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  totalWithdrawn!: number;

  /**
   * Lifetime creator earnings.
   */
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  lifetimeEarnings!: number;

  /**
   * Stripe Connect account.
   *
   * IMPORTANT:
   * One creator should keep the same Stripe Connect
   * account instead of creating a new one each time.
   */
  @Prop({
    type: String,
    default: null,
  })
  stripeAccountId?: string | null;

  /**
   * Whether Stripe onboarding has been completed.
   */
  @Prop({
    type: Boolean,
    default: false,
  })
  stripeOnboardingComplete!: boolean;

  /**
   * Whether Stripe payouts are enabled.
   */
  @Prop({
    type: Boolean,
    default: false,
  })
  payoutsEnabled!: boolean;

  /**
   * Currency used for creator earnings.
   */
  @Prop({
    type: String,
    default: "usd",
  })
  currency!: string;

  /**
   * Creator payout schedule.
   */
  @Prop({
    type: String,
    enum: [
      "manual",
      "daily",
      "weekly",
      "monthly",
    ],
    default: "manual",
  })
  payoutSchedule!:
    | "manual"
    | "daily"
    | "weekly"
    | "monthly";

  /**
   * ==========================================================================
   * STRIPE ACCOUNT CREATION LOCK
   * ==========================================================================
   *
   * Used to prevent two simultaneous API requests from creating
   * two Stripe Connect accounts for the same creator.
   *
   * These fields are temporary coordination state.
   */

  @Prop({
    type: String,
    default: null,
  })
  stripeCreationLock?: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  stripeCreationLockExpiresAt?: Date | null;
}

export const CreatorEarningSchema =
  SchemaFactory.createForClass(
    CreatorEarning,
  );