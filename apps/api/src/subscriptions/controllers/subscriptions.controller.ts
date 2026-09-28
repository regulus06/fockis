import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
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

/* ============================================================
   AUTHENTICATED REQUEST
============================================================ */

interface AuthenticatedRequest {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
    email?: string;
  };
}

/* ============================================================
   SUBSCRIPTIONS CONTROLLER
============================================================ */

@Controller("subscriptions")
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    /* ----------------------------------------------------------
       USER SUBSCRIPTIONS
    ---------------------------------------------------------- */

    private readonly subscriptionsService: SubscriptionsService,

    /* ----------------------------------------------------------
       SUBSCRIPTION PLAN CONFIGURATION
    ---------------------------------------------------------- */

    @InjectModel(SubscriptionPlanConfig.name)
    private readonly subscriptionPlanModel: Model<SubscriptionPlanDocument>,

    /* ----------------------------------------------------------
       STRIPE
    ---------------------------------------------------------- */

    private readonly stripeService: FockisStripeService,
  ) {}

  /* ============================================================
     CURRENT SUBSCRIPTION

     GET /subscriptions/current
  ============================================================ */

  @Get("current")
  async getCurrent(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.getSubscription(
      this.getUserId(req),
    );
  }

  /* ============================================================
     MY SUBSCRIPTION

     GET /subscriptions
  ============================================================ */

  @Get()
  async getSubscription(@Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.getSubscription(
      this.getUserId(req),
    );
  }

  /* ============================================================
     GET SUBSCRIPTION BY ID

     GET /subscriptions/:id
  ============================================================ */

  @Get(":id")
  async getById(
    @Req() req: AuthenticatedRequest,
    @Param("id") subscriptionId: string,
  ) {
    const userId = this.getUserId(req);

    const subscription =
      await this.subscriptionsService.findById(
        subscriptionId,
      );

    if (
      subscription.userId.toString() !== userId
    ) {
      throw new BadRequestException(
        "Subscription does not belong to the authenticated user.",
      );
    }

    return subscription;
  }

  /* ============================================================
     CREATE STRIPE CHECKOUT

     POST /subscriptions/checkout

     Example:

     {
       "plan": "BRONZE",
       "billingInterval": "MONTHLY"
     }

     Pricing is controlled by SubscriptionPlanConfig.
  ============================================================ */

  @Post("checkout")
  async createCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateCheckoutDto,
  ) {
    const userId = this.getUserId(req);

    /* ----------------------------------------------------------
       VALIDATE REQUEST
    ---------------------------------------------------------- */

    if (!body?.plan) {
      throw new BadRequestException(
        "Subscription plan is required.",
      );
    }

    /* ----------------------------------------------------------
       BASIC IS FREE
    ---------------------------------------------------------- */

    if (
      body.plan === SubscriptionPlan.BASIC
    ) {
      throw new BadRequestException(
        "BASIC is free and does not require checkout.",
      );
    }

    /* ----------------------------------------------------------
       VALIDATE PLAN
    ---------------------------------------------------------- */

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

    /* ----------------------------------------------------------
       VALIDATE BILLING INTERVAL
    ---------------------------------------------------------- */

    if (
      body.billingInterval !==
        BillingInterval.MONTHLY &&
      body.billingInterval !==
        BillingInterval.YEARLY
    ) {
      throw new BadRequestException(
        "Billing interval must be MONTHLY or YEARLY.",
      );
    }

    /* ----------------------------------------------------------
       FIND PLAN CONFIGURATION
    ---------------------------------------------------------- */

    const planConfig =
      await this.subscriptionPlanModel
        .findOne({
          plan: body.plan,
        })
        .exec();

    if (!planConfig) {
      throw new BadRequestException(
        `Subscription plan ${body.plan} was not found.`,
      );
    }

    /* ----------------------------------------------------------
       VERIFY PLAN IS ACTIVE
    ---------------------------------------------------------- */

    if (!planConfig.active) {
      throw new BadRequestException(
        "This subscription plan is not currently available.",
      );
    }

    /* ----------------------------------------------------------
       DETERMINE ADMIN-MANAGED PRICE
    ---------------------------------------------------------- */

    const configuredPrice =
      body.billingInterval ===
      BillingInterval.YEARLY
        ? planConfig.yearlyPrice
        : planConfig.monthlyPrice;

    /* ----------------------------------------------------------
       VALIDATE PRICE
    ---------------------------------------------------------- */

    const numericPrice = Number(
      configuredPrice,
    );

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      throw new BadRequestException(
        `A valid ${String(
          body.billingInterval,
        ).toLowerCase()} price is not configured for ${
          body.plan
        }.`,
      );
    }

    /* ----------------------------------------------------------
       VALIDATE CURRENCY
    ---------------------------------------------------------- */

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

    /* ----------------------------------------------------------
       GET STRIPE PRICE ID
    ---------------------------------------------------------- */

    const stripePriceId =
      body.billingInterval ===
      BillingInterval.YEARLY
        ? planConfig.stripeYearlyPriceId
        : planConfig.stripeMonthlyPriceId;

    /* ----------------------------------------------------------
       CREATE STRIPE CHECKOUT SESSION
    ---------------------------------------------------------- */

    let session: Stripe.Checkout.Session;

    /*
     * If an administrator configured a Stripe Price ID,
     * use that Stripe Price.
     *
     * Otherwise create the Checkout line item from the
     * server-controlled subscription configuration.
     */

    if (stripePriceId) {
      session =
        await this.stripeService.client.checkout.sessions.create(
          {
            mode: "subscription",

            line_items: [
              {
                price: stripePriceId,
                quantity: 1,
              },
            ],

            metadata: {
              userId,
              plan: String(body.plan),
              billingInterval: String(
                body.billingInterval,
              ),
              purpose: "subscription",
            },

            subscription_data: {
              metadata: {
                userId,
                plan: String(body.plan),
                billingInterval: String(
                  body.billingInterval,
                ),
                purpose: "subscription",
              },
            },

            success_url:
              process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL ??
              `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
              process.env.STRIPE_SUBSCRIPTION_CANCEL_URL ??
              `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/subscriptions`,
          },
        );
    } else {
      /*
       * No Stripe Price ID was configured.
       *
       * Create the subscription Checkout item using the
       * administrator-controlled amount and currency.
       *
       * Stripe expects amounts in the smallest currency unit.
       */

      const unitAmount = Math.round(
        numericPrice * 100,
      );

      if (unitAmount <= 0) {
        throw new BadRequestException(
          "Subscription price must be greater than zero.",
        );
      }

      const recurringInterval =
        body.billingInterval ===
        BillingInterval.YEARLY
          ? "year"
          : "month";

      session =
        await this.stripeService.client.checkout.sessions.create(
          {
            mode: "subscription",

            line_items: [
              {
                price_data: {
                  currency,

                  product_data: {
                    name: `Fockis ${String(
                      body.plan,
                    )} Subscription`,
                    description:
                      `${String(
                        body.billingInterval,
                      )} Fockis subscription`,
                  },

                  unit_amount: unitAmount,

                  recurring: {
                    interval:
                      recurringInterval,
                  },
                },

                quantity: 1,
              },
            ],

            metadata: {
              userId,
              plan: String(body.plan),
              billingInterval: String(
                body.billingInterval,
              ),
              purpose: "subscription",
              amount: String(numericPrice),
              currency,
            },

            subscription_data: {
              metadata: {
                userId,
                plan: String(body.plan),
                billingInterval: String(
                  body.billingInterval,
                ),
                purpose: "subscription",
              },
            },

            success_url:
              process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL ??
              `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
              process.env.STRIPE_SUBSCRIPTION_CANCEL_URL ??
              `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/subscriptions`,
          },
        );
    }

    /* ----------------------------------------------------------
       VERIFY SESSION
    ---------------------------------------------------------- */

    if (!session.id) {
      throw new BadRequestException(
        "Stripe did not return a checkout session ID.",
      );
    }

    /* ----------------------------------------------------------
       RETURN CHECKOUT INFORMATION
    ---------------------------------------------------------- */

    return {
      checkoutUrl:
        session.url ?? undefined,

      sessionId:
        session.id,

      message:
        "Stripe checkout session created.",
    };
  }

  /* ============================================================
     UPGRADE ACCOUNT

     POST /subscriptions/upgrade
  ============================================================ */

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

  /* ============================================================
     CANCEL SUBSCRIPTION

     POST /subscriptions/cancel
  ============================================================ */

  @Post("cancel")
  async cancel(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subscriptionsService.cancel(
      this.getUserId(req),
    );
  }

  /* ============================================================
     RESUME SUBSCRIPTION

     POST /subscriptions/resume
  ============================================================ */

  @Post("resume")
  async resume(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subscriptionsService.resume(
      this.getUserId(req),
    );
  }

  /* ============================================================
     RESET TO BASIC

     POST /subscriptions/reset-to-basic
  ============================================================ */

  @Post("reset-to-basic")
  async resetToBasic(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subscriptionsService.resetToBasic(
      this.getUserId(req),
    );
  }

  /* ============================================================
     GET AUTHENTICATED USER ID
  ============================================================ */

  private getUserId(
    req: AuthenticatedRequest,
  ): string {
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