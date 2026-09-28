import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  BillingInterval,
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../schemas/subscription.schema";

/* ============================================================
   SUBSCRIPTIONS SERVICE

   FOCKIS ACCOUNT LEVELS

   BASIC   = $0 / FREE
   BRONZE  = Paid
   SILVER  = Paid
   GOLDEN  = Paid
   DIAMOND = Paid

   Responsibilities:

   - Create BASIC subscriptions
   - Retrieve subscriptions
   - Determine user's current account
   - Check account access
   - Upgrade account
   - Cancel paid account
   - Resume paid account
   - Reset account to BASIC
   - Synchronize Stripe subscription state
   - Handle payment failures
   - Handle trials
============================================================ */

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  /* ============================================================
     CREATE BASIC SUBSCRIPTION

     Every normal Fockis user starts with BASIC.
     BASIC is completely free.
  ============================================================ */

  async createBasicSubscription(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const existing =
      await this.subscriptionModel
        .findOne({
          userId: new Types.ObjectId(userId),
        })
        .exec();

    if (existing) {
      return existing;
    }

    const subscription =
      new this.subscriptionModel({
        userId: new Types.ObjectId(userId),

        plan: SubscriptionPlan.BASIC,

        status: SubscriptionStatus.ACTIVE,

        price: 0,

        currency: "USD",

        cancelAtPeriodEnd: false,

        paymentFailureCount: 0,

        lastSyncedAt: new Date(),
      });

    return subscription.save();
  }

  /* ============================================================
     GET SUBSCRIPTION

     Creates BASIC automatically if the user does not
     have a subscription yet.
  ============================================================ */

  async getSubscription(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const subscription =
      await this.subscriptionModel
        .findOne({
          userId: new Types.ObjectId(userId),
        })
        .exec();

    if (subscription) {
      return subscription;
    }

    return this.createBasicSubscription(userId);
  }

  /* ============================================================
     GET CURRENT SUBSCRIPTION
  ============================================================ */

  async getCurrentSubscription(
    userId: string,
  ): Promise<SubscriptionDocument> {
    return this.getSubscription(userId);
  }

  /* ============================================================
     FIND SUBSCRIPTION BY ID
  ============================================================ */

  async findById(
    subscriptionId: string,
  ): Promise<SubscriptionDocument> {
    if (
      !subscriptionId ||
      !Types.ObjectId.isValid(subscriptionId)
    ) {
      throw new BadRequestException(
        "Invalid subscription ID.",
      );
    }

    const subscription =
      await this.subscriptionModel
        .findById(subscriptionId)
        .exec();

    if (!subscription) {
      throw new NotFoundException(
        "Subscription not found.",
      );
    }

    return subscription;
  }

  /* ============================================================
     GET CURRENT PLAN
  ============================================================ */

  async getPlan(
    userId: string,
  ): Promise<SubscriptionPlan> {
    const subscription =
      await this.getSubscription(userId);

    if (
      !this.hasActiveStatus(
        subscription.status,
      )
    ) {
      return SubscriptionPlan.BASIC;
    }

    return subscription.plan;
  }

  /* ============================================================
     CHECK ACTIVE SUBSCRIPTION
  ============================================================ */

  async hasActiveSubscription(
    userId: string,
  ): Promise<boolean> {
    const subscription =
      await this.getSubscription(userId);

    return this.hasActiveStatus(
      subscription.status,
    );
  }

  /* ============================================================
     CHECK REQUIRED PLAN
  ============================================================ */

  async hasPlan(
    userId: string,
    requiredPlan: SubscriptionPlan,
  ): Promise<boolean> {
    const currentPlan =
      await this.getPlan(userId);

    return (
      this.getPlanRank(currentPlan) >=
      this.getPlanRank(requiredPlan)
    );
  }

  /* ============================================================
     REQUIRE PLAN

     BASIC   -> denied for paid features
     BRONZE  -> depends on required level
     SILVER  -> depends on required level
     GOLDEN  -> depends on required level
     DIAMOND -> highest access
  ============================================================ */

  async requirePlan(
    userId: string,
    requiredPlan: SubscriptionPlan,
  ): Promise<SubscriptionDocument> {
    const subscription =
      await this.getSubscription(userId);

    const hasAccess =
      this.hasAccessToPlan(
        subscription,
        requiredPlan,
      );

    if (!hasAccess) {
      throw new BadRequestException({
        code: "UPGRADE_REQUIRED",

        message:
          `This feature requires the ${requiredPlan} account.`,

        requiredPlan,

        currentPlan:
          subscription.plan,
      });
    }

    return subscription;
  }

  /* ============================================================
     UPGRADE ACCOUNT

     BASIC
        ↓
     BRONZE
        ↓
     SILVER
        ↓
     GOLDEN
        ↓
     DIAMOND
  ============================================================ */

  async upgrade(
    userId: string,
    body: {
      plan?: SubscriptionPlan;

      billingInterval?: BillingInterval;

      price?: number;

      currency?: string;

      stripeCustomerId?: string;

      stripeSubscriptionId?: string;

      stripePriceId?: string;

      trialStart?: Date | string;

      trialEnd?: Date | string;
    },
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    if (!body?.plan) {
      throw new BadRequestException(
        "Subscription plan is required.",
      );
    }

    const requestedPlan =
      body.plan;

    /* ----------------------------------------------------------
       BASIC cannot be purchased through upgrade.
    ---------------------------------------------------------- */

    if (
      requestedPlan ===
      SubscriptionPlan.BASIC
    ) {
      throw new BadRequestException(
        "BASIC is the free account. Use reset-to-basic to return to it.",
      );
    }

    /* ----------------------------------------------------------
       Validate plan.
    ---------------------------------------------------------- */

    if (
      !this.isValidPlan(
        requestedPlan,
      )
    ) {
      throw new BadRequestException(
        "Invalid subscription plan.",
      );
    }

    const subscription =
      await this.getSubscription(userId);

    const currentRank =
      this.getPlanRank(
        subscription.plan,
      );

    const requestedRank =
      this.getPlanRank(
        requestedPlan,
      );

    /* ----------------------------------------------------------
       Do not allow downgrades through upgrade endpoint.
    ---------------------------------------------------------- */

    if (
      requestedRank < currentRank
    ) {
      throw new BadRequestException({
        code: "DOWNGRADE_NOT_ALLOWED",

        message:
          "Use the appropriate billing flow to downgrade an account.",

        currentPlan:
          subscription.plan,

        requestedPlan,
      });
    }

    /* ----------------------------------------------------------
       Update plan.
    ---------------------------------------------------------- */

    subscription.plan =
      requestedPlan;

    subscription.status =
      SubscriptionStatus.ACTIVE;

    /* ----------------------------------------------------------
       Billing interval.
    ---------------------------------------------------------- */

    if (
      body.billingInterval
    ) {
      subscription.billingInterval =
        body.billingInterval;
    }

    /* ----------------------------------------------------------
       Price.
    ---------------------------------------------------------- */

    if (
      body.price !== undefined
    ) {
      const numericPrice =
        Number(body.price);

      if (
        !Number.isFinite(
          numericPrice,
        ) ||
        numericPrice < 0
      ) {
        throw new BadRequestException(
          "Invalid subscription price.",
        );
      }

      subscription.price =
        numericPrice;
    }

    /* ----------------------------------------------------------
       Currency.
    ---------------------------------------------------------- */

    if (
      body.currency
    ) {
      subscription.currency =
        body.currency.toUpperCase();
    }

    /* ----------------------------------------------------------
       Stripe customer.
    ---------------------------------------------------------- */

    if (
      body.stripeCustomerId
    ) {
      subscription.stripeCustomerId =
        body.stripeCustomerId;
    }

    /* ----------------------------------------------------------
       Stripe subscription.
    ---------------------------------------------------------- */

    if (
      body.stripeSubscriptionId
    ) {
      subscription.stripeSubscriptionId =
        body.stripeSubscriptionId;
    }

    /* ----------------------------------------------------------
       Stripe price.
    ---------------------------------------------------------- */

    if (
      body.stripePriceId
    ) {
      subscription.stripePriceId =
        body.stripePriceId;
    }

    /* ----------------------------------------------------------
       Trial.
    ---------------------------------------------------------- */

    if (
      body.trialStart
    ) {
      const trialStart =
        new Date(
          body.trialStart,
        );

      if (
        Number.isNaN(
          trialStart.getTime(),
        )
      ) {
        throw new BadRequestException(
          "Invalid trial start date.",
        );
      }

      subscription.trialStart =
        trialStart;
    }

    if (
      body.trialEnd
    ) {
      const trialEnd =
        new Date(
          body.trialEnd,
        );

      if (
        Number.isNaN(
          trialEnd.getTime(),
        )
      ) {
        throw new BadRequestException(
          "Invalid trial end date.",
        );
      }

      subscription.trialEnd =
        trialEnd;

      subscription.trialEndsAt =
        trialEnd;
    }

    /* ----------------------------------------------------------
       Clear cancellation state.
    ---------------------------------------------------------- */

    subscription.cancelAtPeriodEnd =
      false;

    subscription.canceledAt =
      undefined;

    subscription.lastSyncedAt =
      new Date();

    return subscription.save();
  }

  /* ============================================================
     CANCEL SUBSCRIPTION
  ============================================================ */

  async cancel(
    userId: string,
  ): Promise<SubscriptionDocument> {
    return this.cancelAtPeriodEnd(userId);
  }

  /* ============================================================
     CANCEL AT PERIOD END
  ============================================================ */

  async cancelAtPeriodEnd(
    userId: string,
  ): Promise<SubscriptionDocument> {
    const subscription =
      await this.getSubscription(userId);

    if (
      subscription.plan ===
      SubscriptionPlan.BASIC
    ) {
      throw new BadRequestException(
        "BASIC accounts cannot be canceled.",
      );
    }

    subscription.cancelAtPeriodEnd =
      true;

    subscription.canceledAt =
      new Date();

    subscription.lastSyncedAt =
      new Date();

    return subscription.save();
  }

  /* ============================================================
     RESUME SUBSCRIPTION
  ============================================================ */

  async resume(
    userId: string,
  ): Promise<SubscriptionDocument> {
    const subscription =
      await this.getSubscription(userId);

    if (
      subscription.plan ===
      SubscriptionPlan.BASIC
    ) {
      throw new BadRequestException(
        "BASIC accounts do not need to be resumed.",
      );
    }

    if (
      !subscription.cancelAtPeriodEnd
    ) {
      return subscription;
    }

    subscription.cancelAtPeriodEnd =
      false;

    subscription.canceledAt =
      undefined;

    subscription.status =
      SubscriptionStatus.ACTIVE;

    subscription.lastSyncedAt =
      new Date();

    return subscription.save();
  }

  /* ============================================================
     UPDATE SUBSCRIPTION FROM STRIPE
  ============================================================ */

  async updateFromStripe(params: {
    userId: string;

    plan: SubscriptionPlan;

    status: SubscriptionStatus;

    billingInterval?: BillingInterval;

    stripeCustomerId?: string;

    stripeSubscriptionId?: string;

    stripePriceId?: string;

    currentPeriodStart?: Date;

    currentPeriodEnd?: Date;

    cancelAtPeriodEnd?: boolean;

    canceledAt?: Date;

    trialStart?: Date;

    trialEnd?: Date;

    price?: number;

    currency?: string;

    lastPaymentFailedAt?: Date;

    paymentFailureCount?: number;
  }): Promise<SubscriptionDocument> {
    this.validateUserId(
      params.userId,
    );

    if (
      !this.isValidPlan(
        params.plan,
      )
    ) {
      throw new BadRequestException(
        "Invalid subscription plan.",
      );
    }

    const userObjectId =
      new Types.ObjectId(
        params.userId,
      );

    const update: Partial<Subscription> =
      {
        plan:
          params.plan,

        status:
          params.status,

        billingInterval:
          params.billingInterval,

        stripeCustomerId:
          params.stripeCustomerId,

        stripeSubscriptionId:
          params.stripeSubscriptionId,

        stripePriceId:
          params.stripePriceId,

        currentPeriodStart:
          params.currentPeriodStart,

        currentPeriodEnd:
          params.currentPeriodEnd,

        cancelAtPeriodEnd:
          params.cancelAtPeriodEnd ??
          false,

        canceledAt:
          params.canceledAt,

        trialStart:
          params.trialStart,

        trialEnd:
          params.trialEnd,

        price:
          params.price,

        currency:
          params.currency,

        lastPaymentFailedAt:
          params.lastPaymentFailedAt,

        paymentFailureCount:
          params.paymentFailureCount,

        lastSyncedAt:
          new Date(),
      };

    if (
      params.trialEnd
    ) {
      update.trialEndsAt =
        params.trialEnd;
    }

    Object.keys(update).forEach(
      (key) => {
        const typedKey =
          key as keyof typeof update;

        if (
          update[typedKey] ===
          undefined
        ) {
          delete update[typedKey];
        }
      },
    );

    const subscription =
      await this.subscriptionModel
        .findOneAndUpdate(
          {
            userId:
              userObjectId,
          },
          {
            $set: update,

            $setOnInsert: {
              userId:
                userObjectId,

              paymentFailureCount:
                0,
            },
          },
          {
            new: true,

            upsert: true,

            setDefaultsOnInsert:
              true,
          },
        )
        .exec();

    if (!subscription) {
      throw new BadRequestException(
        "Unable to update subscription.",
      );
    }

    return subscription;
  }

  /* ============================================================
     MARK PAYMENT FAILURE
  ============================================================ */

  async markPaymentFailure(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const subscription =
      await this.getSubscription(userId);

    subscription.status =
      SubscriptionStatus.PAST_DUE;

    subscription.lastPaymentFailedAt =
      new Date();

    subscription.paymentFailureCount =
      (subscription.paymentFailureCount ?? 0) +
      1;

    subscription.lastSyncedAt =
      new Date();

    return subscription.save();
  }

  /* ============================================================
     CLEAR PAYMENT FAILURE
  ============================================================ */

  async clearPaymentFailure(
    userId: string,
  ): Promise<SubscriptionDocument> {
    const subscription =
      await this.getSubscription(userId);

    subscription.paymentFailureCount =
      0;

    subscription.lastPaymentFailedAt =
      undefined;

    subscription.lastSyncedAt =
      new Date();

    if (
      subscription.status ===
      SubscriptionStatus.PAST_DUE
    ) {
      subscription.status =
        SubscriptionStatus.ACTIVE;
    }

    return subscription.save();
  }

  /* ============================================================
     RESET TO BASIC

     Used when a paid account returns to the free account.
  ============================================================ */

  async resetToBasic(
    userId: string,
  ): Promise<SubscriptionDocument> {
    const subscription =
      await this.getSubscription(userId);

    subscription.plan =
      SubscriptionPlan.BASIC;

    subscription.status =
      SubscriptionStatus.ACTIVE;

    subscription.price =
      0;

    subscription.currency =
      "USD";

    subscription.billingInterval =
      undefined;

    subscription.stripeSubscriptionId =
      undefined;

    subscription.stripePriceId =
      undefined;

    subscription.currentPeriodStart =
      undefined;

    subscription.currentPeriodEnd =
      undefined;

    subscription.cancelAtPeriodEnd =
      false;

    subscription.canceledAt =
      undefined;

    subscription.trialStart =
      undefined;

    subscription.trialEnd =
      undefined;

    subscription.trialEndsAt =
      undefined;

    subscription.lastSyncedAt =
      new Date();

    return subscription.save();
  }

  /* ============================================================
     PLAN RANK

     BASIC   = 1
     BRONZE  = 2
     SILVER  = 3
     GOLDEN  = 4
     DIAMOND = 5
  ============================================================ */

  private getPlanRank(
    plan: SubscriptionPlan,
  ): number {
    switch (plan) {
      case SubscriptionPlan.DIAMOND:
        return 5;

      case SubscriptionPlan.GOLDEN:
        return 4;

      case SubscriptionPlan.SILVER:
        return 3;

      case SubscriptionPlan.BRONZE:
        return 2;

      case SubscriptionPlan.BASIC:
      default:
        return 1;
    }
  }

  /* ============================================================
     CHECK ACTIVE STATUS
  ============================================================ */

  private hasActiveStatus(
    status: SubscriptionStatus,
  ): boolean {
    return (
      status ===
        SubscriptionStatus.ACTIVE ||
      status ===
        SubscriptionStatus.TRIALING
    );
  }

  /* ============================================================
     CHECK PLAN ACCESS
  ============================================================ */

  private hasAccessToPlan(
    subscription: SubscriptionDocument,
    requiredPlan: SubscriptionPlan,
  ): boolean {
    if (
      !this.hasActiveStatus(
        subscription.status,
      )
    ) {
      return (
        requiredPlan ===
        SubscriptionPlan.BASIC
      );
    }

    return (
      this.getPlanRank(
        subscription.plan,
      ) >=
      this.getPlanRank(
        requiredPlan,
      )
    );
  }

  /* ============================================================
     VALIDATE PLAN
  ============================================================ */

  private isValidPlan(
    plan: SubscriptionPlan,
  ): boolean {
    return (
      plan === SubscriptionPlan.BASIC ||
      plan === SubscriptionPlan.BRONZE ||
      plan === SubscriptionPlan.SILVER ||
      plan === SubscriptionPlan.GOLDEN ||
      plan === SubscriptionPlan.DIAMOND
    );
  }

  /* ============================================================
     VALIDATE USER ID
  ============================================================ */

  private validateUserId(
    userId: string,
  ): void {
    if (
      !userId ||
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }
  }
}