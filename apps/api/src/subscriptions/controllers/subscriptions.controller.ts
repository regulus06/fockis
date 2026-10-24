
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import Stripe from "stripe";

import { SubscriptionsService } from "../services/subscription.service";
import { FockisStripeService } from "../../payments/services/stripe.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { ChangePlanDto } from "../dto/change-plan.dto";
import { CreateCheckoutDto } from "../dto/create-checkout.dto";

import {
  BillingInterval,
  SubscriptionPlan,
} from "../schemas/subscription.schema";

import {
  SubscriptionPlanConfig,
  SubscriptionPlanDocument,
} from "../schemas/subscription-plan.schema";

interface AuthenticatedRequest {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
    email?: string;
  };
}

@Controller("subscriptions")
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,

    @InjectModel(SubscriptionPlanConfig.name)
    private readonly subscriptionPlanModel: Model<SubscriptionPlanDocument>,

    private readonly stripeService: FockisStripeService,
  ) {}

  /**
   * GET /subscriptions/current
   * Get the authenticated user's current subscription.
   */
  @Get("current")
  async getCurrent(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.getSubscription(
      this.getUserId(req),
    );
  }

  /**
   * GET /subscriptions
   * Get the authenticated user's subscription.
   */
  @Get()
  async getSubscription(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.getSubscription(
      this.getUserId(req),
    );
  }

  /**
   * GET /subscriptions/:id
   * Get a subscription only if it belongs to the authenticated user.
   */
  @Get(":id")
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param("id") subscriptionId: string,
  ) {
    const userId = this.getUserId(req);

    const subscription =
      await this.subscriptionsService.findById(subscriptionId);

    if (subscription.userId.toString() !== userId) {
      throw new BadRequestException(
        "Subscription does not belong to the authenticated user.",
      );
    }

    return subscription;
  }

  /**
   * POST /subscriptions/checkout
   *
   * Body:
   * {
   *   "plan": "BRONZE",
   *   "billingInterval": "MONTHLY"
   * }
   *
   * Stripe Checkout creates a recurring subscription.
   * The plan price is controlled by the server-side plan configuration.
   */
  @Post("checkout")
  async createCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateCheckoutDto,
  ) {
    const userId = this.getUserId(req);

    if (!body?.plan) {
      throw new BadRequestException(
        "Subscription plan is required.",
      );
    }

    if (body.plan === SubscriptionPlan.BASIC) {
      throw new BadRequestException(
        "BASIC is free and does not require checkout.",
      );
    }

    const validPlans: SubscriptionPlan[] = [
      SubscriptionPlan.BRONZE,
      SubscriptionPlan.SILVER,
      SubscriptionPlan.GOLDEN,
      SubscriptionPlan.DIAMOND,
    ];

    if (!validPlans.includes(body.plan)) {
      throw new BadRequestException(
        "Invalid subscription plan.",
      );
    }

    if (
      body.billingInterval !== BillingInterval.MONTHLY &&
      body.billingInterval !== BillingInterval.YEARLY
    ) {
      throw new BadRequestException(
        "Billing interval must be MONTHLY or YEARLY.",
      );
    }

    const planConfig = await this.subscriptionPlanModel
      .findOne({ plan: body.plan })
      .exec();

    if (!planConfig) {
      throw new BadRequestException(
        `Subscription plan ${body.plan} was not found.`,
      );
    }

    if (!planConfig.active) {
      throw new BadRequestException(
        "This subscription plan is not currently available.",
      );
    }

    const configuredPrice =
      body.billingInterval === BillingInterval.YEARLY
        ? planConfig.yearlyPrice
        : planConfig.monthlyPrice;

    const numericPrice = Number(configuredPrice);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      throw new BadRequestException(
        `A valid ${body.billingInterval.toLowerCase()} price is not configured for ${body.plan}.`,
      );
    }

    const currency = String(
      planConfig.currency ?? "USD",
    )
      .trim()
      .toLowerCase();

    if (!/^[a-z]{3}$/.test(currency)) {
      throw new BadRequestException(
        "Invalid subscription currency configuration.",
      );
    }

    const stripePriceId =
      body.billingInterval === BillingInterval.YEARLY
        ? planConfig.stripeYearlyPriceId
        : planConfig.stripeMonthlyPriceId;

    const frontendUrl = (
      process.env.FRONTEND_URL ??
      "http://localhost:5173"
    ).replace(/\/+$/, "");

    const successUrl =
      process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL ??
      `${frontendUrl}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      process.env.STRIPE_SUBSCRIPTION_CANCEL_URL ??
      `${frontendUrl}/subscriptions`;

    const metadata = {
      userId,
      plan: String(body.plan),
      billingInterval: String(body.billingInterval),
      purpose: "subscription",
    };

    let session: Stripe.Checkout.Session;

    if (stripePriceId) {
      // Prefer the Stripe Price configured by the administrator.
      session =
        await this.stripeService.client.checkout.sessions.create({
          mode: "subscription",
          line_items: [
            {
              price: stripePriceId,
              quantity: 1,
            },
          ],
          metadata,
          subscription_data: {
            metadata,
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
    } else {
      // Use the server-configured amount if no Stripe Price ID exists.
      const unitAmount = Math.round(numericPrice * 100);

      if (unitAmount <= 0) {
        throw new BadRequestException(
          "Subscription price must be greater than zero.",
        );
      }

      const recurringInterval =
        body.billingInterval === BillingInterval.YEARLY
          ? "year"
          : "month";

      session =
        await this.stripeService.client.checkout.sessions.create({
          mode: "subscription",
          line_items: [
            {
              price_data: {
                currency,
                product_data: {
                  name: `Fockis ${String(body.plan)} Subscription`,
                  description: `${String(body.billingInterval)} Fockis subscription`,
                },
                unit_amount: unitAmount,
                recurring: {
                  interval: recurringInterval,
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            ...metadata,
            amount: String(numericPrice),
            currency,
          },
          subscription_data: {
            metadata,
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
    }

    if (!session.id || !session.url) {
      throw new BadRequestException(
        "Stripe did not return a valid checkout URL.",
      );
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      message: "Stripe checkout session created.",
    };
  }

  /**
   * POST /subscriptions/upgrade
   *
   * Note: the service's upgrade method must not be used to grant a
   * paid plan without verifying payment or synchronizing the Stripe
   * subscription. Use /checkout for a new paid subscription.
   */
  @Post("upgrade")
  async upgrade(
    @Req() req: AuthenticatedRequest,
    @Body() body: ChangePlanDto,
  ) {
    return this.subscriptionsService.upgrade(
      this.getUserId(req),
      body,
    );
  }

  /**
   * POST /subscriptions/cancel
   * Requests cancellation at the end of the current billing period.
   */
  @Post("cancel")
  async cancel(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.cancel(
      this.getUserId(req),
    );
  }

  /**
   * POST /subscriptions/resume
   * Resumes a subscription scheduled to cancel at period end.
   */
  @Post("resume")
  async resume(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.resume(
      this.getUserId(req),
    );
  }

  /**
   * POST /subscriptions/reset-to-basic
   * Resets the local account subscription to BASIC when permitted
   * by the service.
   */
  @Post("reset-to-basic")
  async resetToBasic(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.resetToBasic(
      this.getUserId(req),
    );
  }

  private getUserId(req: AuthenticatedRequest): string {
    const userId =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId ??
      req.user?.sub;

    if (!userId) {
      throw new BadRequestException(
        "Authenticated user ID not found.",
      );
    }

    return userId.toString();
  }
}
