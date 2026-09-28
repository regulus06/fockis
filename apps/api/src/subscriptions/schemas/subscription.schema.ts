import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from "mongoose";

/* ============================================================
   DOCUMENT
============================================================ */

export type SubscriptionDocument =
  HydratedDocument<Subscription>;

/* ============================================================
   ACCOUNT PLAN

   BASIC   = $0 / Free
   BRONZE  = Paid
   SILVER  = Paid
   GOLDEN  = Paid
   DIAMOND = Paid
============================================================ */

export enum SubscriptionPlan {
  BASIC = "BASIC",
  BRONZE = "BRONZE",
  SILVER = "SILVER",
  GOLDEN = "GOLDEN",
  DIAMOND = "DIAMOND",
}

/* ============================================================
   STATUS
============================================================ */

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  TRIALING = "TRIALING",
  PAST_DUE = "PAST_DUE",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED",
}

/* ============================================================
   BILLING INTERVAL
============================================================ */

export enum BillingInterval {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

/* ============================================================
   SUBSCRIPTION
============================================================ */

@Schema({
  timestamps: true,
  collection: "subscriptions",
})
export class Subscription {
  /* ============================================================
     USER
  ============================================================ */

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /* ============================================================
     PLAN
  ============================================================ */

  @Prop({
    required: true,
    enum: SubscriptionPlan,
    default: SubscriptionPlan.BASIC,
    index: true,
  })
  plan!: SubscriptionPlan;

  /* ============================================================
     STATUS
  ============================================================ */

  @Prop({
    required: true,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
    index: true,
  })
  status!: SubscriptionStatus;

  /* ============================================================
     BILLING
  ============================================================ */

  @Prop({
    required: false,
    enum: BillingInterval,
  })
  billingInterval?: BillingInterval;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  price!: number;

  @Prop({
    type: String,
    required: false,
    uppercase: true,
    trim: true,
    default: "USD",
  })
  currency?: string;

  /* ============================================================
     STRIPE
  ============================================================ */

  @Prop({
    type: String,
    required: false,
    index: true,
    trim: true,
  })
  stripeCustomerId?: string;

  @Prop({
    type: String,
    required: false,
    index: true,
    trim: true,
  })
  stripeSubscriptionId?: string;

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  stripePriceId?: string;

  /* ============================================================
     BILLING PERIOD
  ============================================================ */

  @Prop({
    type: Date,
    required: false,
  })
  currentPeriodStart?: Date;

  @Prop({
    type: Date,
    required: false,
  })
  currentPeriodEnd?: Date;

  /* ============================================================
     TRIAL
  ============================================================ */

  @Prop({
    type: Date,
    required: false,
    index: true,
  })
  trialStart?: Date;

  @Prop({
    type: Date,
    required: false,
    index: true,
  })
  trialEnd?: Date;

  /*
   * Compatibility field.
   *
   * trialEnd is the canonical field.
   * trialEndsAt is kept synchronized.
   */

  @Prop({
    type: Date,
    required: false,
  })
  trialEndsAt?: Date;

  /* ============================================================
     CANCELLATION
  ============================================================ */

  @Prop({
    type: Date,
    required: false,
  })
  canceledAt?: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  cancelAtPeriodEnd!: boolean;

  /* ============================================================
     PAYMENT FAILURE
  ============================================================ */

  @Prop({
    type: Date,
    required: false,
    index: true,
  })
  lastPaymentFailedAt?: Date;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  paymentFailureCount!: number;

  /* ============================================================
     STRIPE SYNCHRONIZATION
  ============================================================ */

  @Prop({
    type: Date,
    required: false,
    index: true,
  })
  lastSyncedAt?: Date;
}

/* ============================================================
   SCHEMA
============================================================ */

export const SubscriptionSchema =
  SchemaFactory.createForClass(
    Subscription,
  );

/* ============================================================
   INDEXES
============================================================ */

/*
 * Plan and status lookup.
 */
SubscriptionSchema.index({
  plan: 1,
  status: 1,
});

/*
 * Billing-period processing.
 */
SubscriptionSchema.index({
  currentPeriodEnd: 1,
});

/*
 * Trial expiration processing.
 */
SubscriptionSchema.index({
  trialEnd: 1,
});

/*
 * Payment-failure monitoring.
 */
SubscriptionSchema.index({
  lastPaymentFailedAt: 1,
});

/*
 * Stripe synchronization monitoring.
 */
SubscriptionSchema.index({
  lastSyncedAt: 1,
});

/*
 * Stripe subscription lookup.
 */
SubscriptionSchema.index({
  stripeSubscriptionId: 1,
});

/*
 * Stripe customer lookup.
 */
SubscriptionSchema.index({
  stripeCustomerId: 1,
});