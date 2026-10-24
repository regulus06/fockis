
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import type { Model } from 'mongoose';
import Stripe from 'stripe';

import { FockisStripeService } from '../../payments/services/stripe.service';

import {
  BillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../schemas/subscription.schema';

import {
  StripeWebhookEvent,
  StripeWebhookEventStatus,
} from '../schemas/stripe-webhook-event.schema';

import { SubscriptionsService } from '../services/subscription.service';

@Controller('subscriptions/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: FockisStripeService,
    private readonly subscriptionsService: SubscriptionsService,

    @InjectModel(StripeWebhookEvent.name)
    private readonly webhookEvents: Model<StripeWebhookEvent>,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    const webhookSecret =
      process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET?.trim() ||
      process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      this.logger.error(
        'Stripe webhook signing secret is not configured.',
      );

      throw new InternalServerErrorException(
        'Stripe webhook is not configured.',
      );
    }

    if (!signature) {
      throw new BadRequestException(
        'Missing Stripe signature header.',
      );
    }

    if (!request.rawBody?.length) {
      throw new BadRequestException(
        'Raw request body is unavailable. Check rawBody configuration in main.ts.',
      );
    }

    let event: Stripe.Event;

    try {
      event = this.stripeService.client.webhooks.constructEvent(
        request.rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.warn(
        `Stripe signature verification failed: ${
          error instanceof Error
            ? error.message
            : 'Unknown error'
        }`,
      );

      throw new BadRequestException(
        'Invalid Stripe webhook signature.',
      );
    }

    // Claim this event. If it has already been processed,
    // acknowledge it without applying its changes again.
    const claimed = await this.claimEvent(event);

    if (!claimed) {
      this.logger.debug(
        `Stripe event ${event.id} was already processed. Skipping.`,
      );

      return { received: true };
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionEvent(
            event.data.object as Stripe.Subscription,
            event.type,
          );
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          );
          break;

        default:
          this.logger.debug(
            `Ignoring unsupported Stripe event: ${event.type}`,
          );
      }

      await this.webhookEvents.updateOne(
        {
          eventId: event.id,
          status: StripeWebhookEventStatus.PROCESSING,
        },
        {
          $set: {
            status: StripeWebhookEventStatus.PROCESSED,
            processedAt: new Date(),
          },
          $unset: {
            lastError: 1,
          },
        },
      );

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Failed to process Stripe event ${event.id} (${event.type}): ${
          error instanceof Error
            ? error.message
            : 'Unknown error'
        }`,
      );

      try {
        await this.webhookEvents.updateOne(
          {
            eventId: event.id,
            status: StripeWebhookEventStatus.PROCESSING,
          },
          {
            $set: {
              status: StripeWebhookEventStatus.FAILED,
              lastError:
                error instanceof Error
                  ? error.message.slice(0, 2000)
                  : 'Unknown processing error',
            },
            $unset: {
              processedAt: 1,
            },
          },
        );
      } catch (trackingError) {
        this.logger.error(
          `Could not record failure for Stripe event ${event.id}: ${
            trackingError instanceof Error
              ? trackingError.message
              : 'Unknown error'
          }`,
        );
      }

      // A non-2xx response allows Stripe to retry the event.
      throw new InternalServerErrorException(
        'Stripe event processing failed.',
      );
    }
  }

  /**
   * Returns false when the event was already processed.
   * Returns true when this request successfully claims the event.
   */
  private async claimEvent(
    event: Stripe.Event,
  ): Promise<boolean> {
    const existing = await this.webhookEvents.findOne({
      eventId: event.id,
    });

    if (
      existing?.status === StripeWebhookEventStatus.PROCESSED
    ) {
      return false;
    }

    if (
      existing?.status === StripeWebhookEventStatus.PROCESSING
    ) {
      const processingStartedAt =
        existing.receivedAt?.getTime() ?? 0;

      const processingIsStale =
        Date.now() - processingStartedAt > 5 * 60 * 1000;

      if (!processingIsStale) {
        throw new InternalServerErrorException(
          'Stripe event is already being processed. Retry later.',
        );
      }
    }

    if (existing) {
      const claimed = await this.webhookEvents.findOneAndUpdate(
        {
          eventId: event.id,
          status: existing.status,
          receivedAt: existing.receivedAt,
        },
        {
          $set: {
            status: StripeWebhookEventStatus.PROCESSING,
            receivedAt: new Date(),
            eventType: event.type,
          },
          $inc: {
            attempts: 1,
          },
          $unset: {
            lastError: 1,
            processedAt: 1,
          },
        },
        {
          new: true,
        },
      );

      if (!claimed) {
        throw new InternalServerErrorException(
          'Stripe event claim conflicted. Retry later.',
        );
      }

      return true;
    }

    try {
      await this.webhookEvents.create({
        eventId: event.id,
        eventType: event.type,
        status: StripeWebhookEventStatus.PROCESSING,
        attempts: 1,
        receivedAt: new Date(),
      });

      return true;
    } catch (error) {
      // A concurrent request may have inserted this event ID.
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new InternalServerErrorException(
          'Stripe event claim conflicted. Retry later.',
        );
      }

      throw error;
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (
      session.mode !== 'subscription' ||
      !session.subscription
    ) {
      return;
    }

    const userId = session.metadata?.userId;

    if (!userId) {
      throw new Error(
        `Checkout session ${session.id} is missing userId metadata.`,
      );
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

    const subscription =
      await this.stripeService.client.subscriptions.retrieve(
        subscriptionId,
      );

    // Make sure the Stripe subscription belongs to the expected user.
    if (subscription.metadata?.userId !== userId) {
      throw new Error(
        `User metadata mismatch for Stripe subscription ${subscription.id}.`,
      );
    }

    await this.syncSubscription(subscription, userId);
  }

  private async handleSubscriptionEvent(
    subscription: Stripe.Subscription,
    eventType: string,
  ): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      this.logger.warn(
        `Ignoring ${eventType} for ${subscription.id}: userId metadata is missing.`,
      );
      return;
    }

    let currentSubscription: Stripe.Subscription;

    try {
      currentSubscription =
        await this.stripeService.client.subscriptions.retrieve(
          subscription.id,
        );
    } catch (error) {
      if (eventType !== 'customer.subscription.deleted') {
        throw error;
      }

      // A deleted subscription might no longer be retrievable.
      currentSubscription = subscription;
    }

    await this.syncSubscription(currentSubscription, userId);
  }

  private async handleInvoicePaid(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = this.extractSubscriptionId(
      invoice as unknown as Record<string, any>,
    );

    if (!subscriptionId) {
      this.logger.debug(
        `Invoice ${invoice.id} has no subscription reference.`,
      );
      return;
    }

    const subscription =
      await this.stripeService.client.subscriptions.retrieve(
        subscriptionId,
      );

    const userId = subscription.metadata?.userId;

    if (!userId) {
      this.logger.warn(
        `Invoice ${invoice.id} has no subscription userId metadata.`,
      );
      return;
    }

    await this.syncSubscription(subscription, userId);
    await this.subscriptionsService.clearPaymentFailure(userId);
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = this.extractSubscriptionId(
      invoice as unknown as Record<string, any>,
    );

    if (!subscriptionId) {
      this.logger.debug(
        `Failed invoice ${invoice.id} has no subscription reference.`,
      );
      return;
    }

    const subscription =
      await this.stripeService.client.subscriptions.retrieve(
        subscriptionId,
      );

    const userId = subscription.metadata?.userId;

    if (!userId) {
      this.logger.warn(
        `Failed invoice ${invoice.id} has no subscription userId metadata.`,
      );
      return;
    }

    await this.syncSubscription(subscription, userId);
    await this.subscriptionsService.markPaymentFailure(userId);
  }

  private extractSubscriptionId(
    invoice: Record<string, any>,
  ): string | undefined {
    const direct = invoice.subscription;

    if (typeof direct === 'string') {
      return direct;
    }

    if (direct && typeof direct.id === 'string') {
      return direct.id;
    }

    const parentSubscription =
      invoice.parent?.subscription_details?.subscription;

    if (typeof parentSubscription === 'string') {
      return parentSubscription;
    }

    if (
      parentSubscription &&
      typeof parentSubscription.id === 'string'
    ) {
      return parentSubscription.id;
    }

    const lines = invoice.lines?.data;

    if (Array.isArray(lines)) {
      for (const line of lines) {
        const nestedSubscription =
          line.parent?.subscription_item_details?.subscription;

        if (typeof nestedSubscription === 'string') {
          return nestedSubscription;
        }

        if (
          nestedSubscription &&
          typeof nestedSubscription.id === 'string'
        ) {
          return nestedSubscription.id;
        }
      }
    }

    return undefined;
  }

  private async syncSubscription(
    stripeSubscription: Stripe.Subscription,
    userId: string,
  ): Promise<void> {
    const metadata = stripeSubscription.metadata ?? {};
    const rawPlan = metadata.plan?.toUpperCase();

    const planMap: Record<string, SubscriptionPlan> = {
      BASIC: SubscriptionPlan.BASIC,
      BRONZE: SubscriptionPlan.BRONZE,
      SILVER: SubscriptionPlan.SILVER,
      GOLDEN: SubscriptionPlan.GOLDEN,
      DIAMOND: SubscriptionPlan.DIAMOND,
    };

    const plan = rawPlan ? planMap[rawPlan] : undefined;

    if (!plan) {
      throw new Error(
        `Stripe subscription ${stripeSubscription.id} has invalid or missing plan metadata.`,
      );
    }

    const item = stripeSubscription.items.data[0];
    const price = item?.price;
    const recurringInterval = price?.recurring?.interval;

    const billingInterval =
      metadata.billingInterval?.toUpperCase() === 'YEARLY' ||
      recurringInterval === 'year'
        ? BillingInterval.YEARLY
        : BillingInterval.MONTHLY;

    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      unpaid: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.PAST_DUE,
      incomplete_expired: SubscriptionStatus.EXPIRED,
      paused: SubscriptionStatus.PAST_DUE,
    };

    const status = statusMap[stripeSubscription.status];

    if (!status) {
      throw new Error(
        `Unsupported Stripe subscription status: ${stripeSubscription.status}`,
      );
    }

    const periodStart = item?.current_period_start;
    const periodEnd = item?.current_period_end;

    await this.subscriptionsService.updateFromStripe({
      userId,
      plan,
      status,
      billingInterval,
      stripeCustomerId:
        typeof stripeSubscription.customer === 'string'
          ? stripeSubscription.customer
          : stripeSubscription.customer.id,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: price?.id,
      currentPeriodStart: periodStart
        ? new Date(periodStart * 1000)
        : undefined,
      currentPeriodEnd: periodEnd
        ? new Date(periodEnd * 1000)
        : undefined,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : undefined,
      trialStart: stripeSubscription.trial_start
        ? new Date(stripeSubscription.trial_start * 1000)
        : undefined,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : undefined,
      price:
        price?.unit_amount != null
          ? price.unit_amount / 100
          : undefined,
      currency: price?.currency?.toUpperCase(),
    });
  }
}
