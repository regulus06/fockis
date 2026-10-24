
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { FockisStripeService } from '../../payments/services/stripe.service';

import {
  BillingInterval,
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../schemas/subscription.schema';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly stripeService: FockisStripeService,
  ) {}

  // ------------------------------------------------------------
  // CREATE BASIC SUBSCRIPTION
  // ------------------------------------------------------------

  async createBasicSubscription(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const existing = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (existing) {
      return existing;
    }

    return new this.subscriptionModel({
      userId: new Types.ObjectId(userId),
      plan: SubscriptionPlan.BASIC,
      status: SubscriptionStatus.ACTIVE,
      price: 0,
      currency: 'USD',
      cancelAtPeriodEnd: false,
      paymentFailureCount: 0,
      lastSyncedAt: new Date(),
    }).save();
  }

  // ------------------------------------------------------------
  // GET SUBSCRIPTION
  // ------------------------------------------------------------

  async getSubscription(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const subscription = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    return subscription ?? this.createBasicSubscription(userId);
  }

  async getCurrentSubscription(
    userId: string,
  ): Promise<SubscriptionDocument> {
    return this.getSubscription(userId);
  }

  async findById(
    subscriptionId: string,
  ): Promise<SubscriptionDocument> {
    if (
      !subscriptionId ||
      !Types.ObjectId.isValid(subscriptionId)
    ) {
      throw new BadRequestException('Invalid subscription ID.');
    }

    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }

    return subscription;
  }

  // ------------------------------------------------------------
  // PLAN AND ACCESS CHECKS
  // ------------------------------------------------------------

  async getPlan(userId: string): Promise<SubscriptionPlan> {
    const subscription = await this.getSubscription(userId);

    if (!this.hasActiveStatus(subscription.status)) {
      return SubscriptionPlan.BASIC;
    }

    return subscription.plan;
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    return this.hasActiveStatus(subscription.status);
  }

  async hasPlan(
    userId: string,
    requiredPlan: SubscriptionPlan,
  ): Promise<boolean> {
    const currentPlan = await this.getPlan(userId);

    return (
      this.getPlanRank(currentPlan) >=
      this.getPlanRank(requiredPlan)
    );
  }

  async requirePlan(
    userId: string,
    requiredPlan: SubscriptionPlan,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.getSubscription(userId);

    if (!this.hasAccessToPlan(subscription, requiredPlan)) {
      throw new BadRequestException({
        code: 'UPGRADE_REQUIRED',
        message: `This feature requires the ${requiredPlan} account.`,
        requiredPlan,
        currentPlan: subscription.plan,
      });
    }

    return subscription;
  }

  // ------------------------------------------------------------
  // UPGRADE SUBSCRIPTION RECORD
  //
  // This updates the local record. Paid checkout and price
  // changes must still be handled by the Stripe billing flow.
  // ------------------------------------------------------------

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
      throw new BadRequestException('Subscription plan is required.');
    }

    const requestedPlan = body.plan;

    if (requestedPlan === SubscriptionPlan.BASIC) {
      throw new BadRequestException(
        'BASIC is the free account. Use reset-to-basic to return to it.',
      );
    }

    if (!this.isValidPlan(requestedPlan)) {
      throw new BadRequestException('Invalid subscription plan.');
    }

    const subscription = await this.getSubscription(userId);

    if (
      this.getPlanRank(requestedPlan) <
      this.getPlanRank(subscription.plan)
    ) {
      throw new BadRequestException({
        code: 'DOWNGRADE_NOT_ALLOWED',
        message:
          'Use the appropriate billing flow to downgrade an account.',
        currentPlan: subscription.plan,
        requestedPlan,
      });
    }

    subscription.plan = requestedPlan;
    subscription.status = SubscriptionStatus.ACTIVE;

    if (body.billingInterval) {
      subscription.billingInterval = body.billingInterval;
    }

    if (body.price !== undefined) {
      const numericPrice = Number(body.price);

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        throw new BadRequestException('Invalid subscription price.');
      }

      subscription.price = numericPrice;
    }

    if (body.currency) {
      const currency = body.currency.trim().toUpperCase();

      if (!/^[A-Z]{3}$/.test(currency)) {
        throw new BadRequestException('Invalid subscription currency.');
      }

      subscription.currency = currency;
    }

    if (body.stripeCustomerId) {
      subscription.stripeCustomerId = body.stripeCustomerId;
    }

    if (body.stripeSubscriptionId) {
      subscription.stripeSubscriptionId = body.stripeSubscriptionId;
    }

    if (body.stripePriceId) {
      subscription.stripePriceId = body.stripePriceId;
    }

    if (body.trialStart !== undefined) {
      const trialStart = new Date(body.trialStart);

      if (Number.isNaN(trialStart.getTime())) {
        throw new BadRequestException('Invalid trial start date.');
      }

      subscription.trialStart = trialStart;
    }

    if (body.trialEnd !== undefined) {
      const trialEnd = new Date(body.trialEnd);

      if (Number.isNaN(trialEnd.getTime())) {
        throw new BadRequestException('Invalid trial end date.');
      }

      subscription.trialEnd = trialEnd;
      subscription.trialEndsAt = trialEnd;
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = undefined;
    subscription.lastSyncedAt = new Date();

    return subscription.save();
  }

  // ------------------------------------------------------------
  // CANCEL SUBSCRIPTION
  //
  // Stripe remains the billing authority. Cancellation is
  // scheduled at the end of the current billing period.
  // ------------------------------------------------------------

  async cancel(
    userId: string,
  ): Promise<SubscriptionDocument> {
    return this.cancelAtPeriodEnd(userId);
  }

  async cancelAtPeriodEnd(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const subscription = await this.getSubscription(userId);

    if (subscription.plan === SubscriptionPlan.BASIC) {
      throw new BadRequestException(
        'BASIC accounts do not have a paid subscription to cancel.',
      );
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException(
        'No Stripe subscription is linked to this account. Cannot cancel billing automatically.',
      );
    }

    try {
      const stripeSubscription =
        await this.stripeService.client.subscriptions.update(
          subscription.stripeSubscriptionId,
          { cancel_at_period_end: true },
        );

      subscription.cancelAtPeriodEnd =
        stripeSubscription.cancel_at_period_end;

      subscription.canceledAt = stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : new Date();

      subscription.lastSyncedAt = new Date();

      return await subscription.save();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Stripe could not schedule subscription cancellation. Your subscription record was not changed.',
      );
    }
  }

  // ------------------------------------------------------------
  // RESUME SUBSCRIPTION
  //
  // Only a subscription that Stripe still considers resumable
  // can have its scheduled end-of-period cancellation removed.
  // ------------------------------------------------------------

  async resume(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const subscription = await this.getSubscription(userId);

    if (subscription.plan === SubscriptionPlan.BASIC) {
      throw new BadRequestException(
        'BASIC accounts do not need to be resumed.',
      );
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException(
        'No Stripe subscription is linked to this account. A new checkout may be required.',
      );
    }

    if (!subscription.cancelAtPeriodEnd) {
      return subscription;
    }

    try {
      const stripeSubscription =
        await this.stripeService.client.subscriptions.update(
          subscription.stripeSubscriptionId,
          { cancel_at_period_end: false },
        );

      subscription.cancelAtPeriodEnd =
        stripeSubscription.cancel_at_period_end;

      subscription.canceledAt = stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : undefined;

      subscription.lastSyncedAt = new Date();

      return await subscription.save();
    } catch {
      throw new InternalServerErrorException(
        'Stripe could not resume this subscription. Your subscription record was not changed.',
      );
    }
  }

  // ------------------------------------------------------------
  // UPDATE SUBSCRIPTION FROM STRIPE WEBHOOKS
  // ------------------------------------------------------------

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
    this.validateUserId(params.userId);

    if (!this.isValidPlan(params.plan)) {
      throw new BadRequestException('Invalid subscription plan.');
    }

    const userObjectId = new Types.ObjectId(params.userId);

    const update: Partial<Subscription> = {
      plan: params.plan,
      status: params.status,
      billingInterval: params.billingInterval,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripePriceId: params.stripePriceId,
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
      canceledAt: params.canceledAt,
      trialStart: params.trialStart,
      trialEnd: params.trialEnd,
      price: params.price,
      currency: params.currency,
      lastPaymentFailedAt: params.lastPaymentFailedAt,
      paymentFailureCount: params.paymentFailureCount,
      lastSyncedAt: new Date(),
    };

    if (params.trialEnd) {
      update.trialEndsAt = params.trialEnd;
    }

    Object.keys(update).forEach((key) => {
      const typedKey = key as keyof typeof update;

      if (update[typedKey] === undefined) {
        delete update[typedKey];
      }
    });

    const subscription = await this.subscriptionModel
      .findOneAndUpdate(
        { userId: userObjectId },
        {
          $set: update,
          $setOnInsert: {
            userId: userObjectId,
            paymentFailureCount: 0,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    if (!subscription) {
      throw new InternalServerErrorException(
        'Unable to update subscription from Stripe.',
      );
    }

    return subscription;
  }

  // ------------------------------------------------------------
  // PAYMENT FAILURE HANDLING
  // ------------------------------------------------------------

  async markPaymentFailure(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const subscription = await this.getSubscription(userId);

    subscription.status = SubscriptionStatus.PAST_DUE;
    subscription.lastPaymentFailedAt = new Date();
    subscription.paymentFailureCount =
      (subscription.paymentFailureCount ?? 0) + 1;
    subscription.lastSyncedAt = new Date();

    return subscription.save();
  }

  async clearPaymentFailure(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const subscription = await this.getSubscription(userId);

    subscription.paymentFailureCount = 0;
    subscription.lastPaymentFailedAt = undefined;
    subscription.lastSyncedAt = new Date();

    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      subscription.status = SubscriptionStatus.ACTIVE;
    }

    return subscription.save();
  }

  // ------------------------------------------------------------
  // RESET TO BASIC
  // ------------------------------------------------------------

  async resetToBasic(
    userId: string,
  ): Promise<SubscriptionDocument> {
    this.validateUserId(userId);

    const subscription = await this.getSubscription(userId);

    // Do not silently discard a Stripe subscription ID while
    // Stripe may still be charging the customer.
    if (
      subscription.stripeSubscriptionId &&
      subscription.status !== SubscriptionStatus.CANCELED &&
      subscription.status !== SubscriptionStatus.EXPIRED
    ) {
      throw new BadRequestException(
        'Cancel the linked Stripe subscription first. The account will remain paid until its billing period ends.',
      );
    }

    subscription.plan = SubscriptionPlan.BASIC;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.price = 0;
    subscription.currency = 'USD';
    subscription.billingInterval = undefined;
    subscription.stripeSubscriptionId = undefined;
    subscription.stripePriceId = undefined;
    subscription.currentPeriodStart = undefined;
    subscription.currentPeriodEnd = undefined;
    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = undefined;
    subscription.trialStart = undefined;
    subscription.trialEnd = undefined;
    subscription.trialEndsAt = undefined;
    subscription.lastSyncedAt = new Date();

    return subscription.save();
  }

  // ------------------------------------------------------------
  // INTERNAL HELPERS
  // ------------------------------------------------------------

  private getPlanRank(plan: SubscriptionPlan): number {
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

  private hasActiveStatus(status: SubscriptionStatus): boolean {
    return (
      status === SubscriptionStatus.ACTIVE ||
      status === SubscriptionStatus.TRIALING
    );
  }

  private hasAccessToPlan(
    subscription: SubscriptionDocument,
    requiredPlan: SubscriptionPlan,
  ): boolean {
    if (!this.hasActiveStatus(subscription.status)) {
      return requiredPlan === SubscriptionPlan.BASIC;
    }

    return (
      this.getPlanRank(subscription.plan) >=
      this.getPlanRank(requiredPlan)
    );
  }

  private isValidPlan(plan: SubscriptionPlan): boolean {
    return (
      plan === SubscriptionPlan.BASIC ||
      plan === SubscriptionPlan.BRONZE ||
      plan === SubscriptionPlan.SILVER ||
      plan === SubscriptionPlan.GOLDEN ||
      plan === SubscriptionPlan.DIAMOND
    );
  }

  private validateUserId(userId: string): void {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID.');
    }
  }
}
