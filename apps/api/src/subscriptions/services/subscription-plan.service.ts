import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
} from "mongoose";

import {
  SubscriptionPlan,
} from "../schemas/subscription.schema";

import {
  SubscriptionPlanConfig,
  SubscriptionPlanDocument,
} from "../schemas/subscription-plan.schema";

import {
  UpdateSubscriptionPlanDto,
} from "../dto/update-subscription-plan.dto";

/* ============================================================
   SUBSCRIPTION PLAN SERVICE

   Responsibilities:

   - Retrieve subscription plans
   - Retrieve active plans
   - Update subscription pricing
   - Update Stripe Price IDs
   - Initialize default plans
   - Preserve existing Stripe configuration
============================================================ */

@Injectable()
export class SubscriptionPlanService {

  constructor(
    @InjectModel(
      SubscriptionPlanConfig.name,
    )
    private readonly planModel:
      Model<SubscriptionPlanDocument>,
  ) {}

  /* ============================================================
     GET ALL PLANS
  ============================================================ */

  async findAll(
    includeInactive = false,
  ): Promise<SubscriptionPlanDocument[]> {

    const filter =
      includeInactive
        ? {}
        : {
            active: true,
          };

    return this.planModel
      .find(filter)
      .sort({
        displayOrder: 1,
      })
      .exec();
  }

  /* ============================================================
     GET PLAN
  ============================================================ */

  async findByPlan(
    plan: SubscriptionPlan,
  ): Promise<SubscriptionPlanDocument> {

    const subscriptionPlan =
      await this.planModel
        .findOne({
          plan,
        })
        .exec();

    if (!subscriptionPlan) {
      throw new NotFoundException(
        `Subscription plan ${plan} was not found.`,
      );
    }

    return subscriptionPlan;
  }

  /* ============================================================
     GET ACTIVE PLAN
  ============================================================ */

  async findActivePlan(
    plan: SubscriptionPlan,
  ): Promise<SubscriptionPlanDocument> {

    const subscriptionPlan =
      await this.planModel
        .findOne({
          plan,
          active: true,
        })
        .exec();

    if (!subscriptionPlan) {
      throw new NotFoundException(
        `Subscription plan ${plan} is not available.`,
      );
    }

    return subscriptionPlan;
  }

  /* ============================================================
     UPDATE PLAN

     Supports:

     - Display information
     - Monthly pricing
     - Yearly pricing
     - Features
     - Active state
     - Popular state
     - Display order
     - Stripe monthly Price ID
     - Stripe yearly Price ID
  ============================================================ */

  async update(
    plan: SubscriptionPlan,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlanDocument> {

    const subscriptionPlan =
      await this.findByPlan(plan);

    const priceChanged =
      dto.monthlyPrice !== undefined &&
      dto.monthlyPrice !==
        subscriptionPlan.monthlyPrice;

    const yearlyPriceChanged =
      dto.yearlyPrice !== undefined &&
      dto.yearlyPrice !==
        subscriptionPlan.yearlyPrice;

    /* ----------------------------------------------------------
       BASIC MUST REMAIN FREE
    ---------------------------------------------------------- */

    if (
      plan === SubscriptionPlan.BASIC
    ) {

      if (
        dto.monthlyPrice !== undefined &&
        dto.monthlyPrice !== 0
      ) {
        throw new BadRequestException(
          "BASIC monthly price must be 0.",
        );
      }

      if (
        dto.yearlyPrice !== undefined &&
        dto.yearlyPrice !== 0
      ) {
        throw new BadRequestException(
          "BASIC yearly price must be 0.",
        );
      }

      /*
       * BASIC does not need Stripe Price IDs.
       */
    }

    /* ----------------------------------------------------------
       DISPLAY NAME
    ---------------------------------------------------------- */

    if (
      dto.name !== undefined
    ) {
      subscriptionPlan.name =
        dto.name.trim();
    }

    /* ----------------------------------------------------------
       DESCRIPTION
    ---------------------------------------------------------- */

    if (
      dto.description !== undefined
    ) {
      subscriptionPlan.description =
        dto.description.trim();
    }

    /* ----------------------------------------------------------
       MONTHLY PRICE
    ---------------------------------------------------------- */

    if (
      dto.monthlyPrice !== undefined
    ) {
      subscriptionPlan.monthlyPrice =
        dto.monthlyPrice;
    }

    /* ----------------------------------------------------------
       YEARLY PRICE
    ---------------------------------------------------------- */

    if (
      dto.yearlyPrice !== undefined
    ) {
      subscriptionPlan.yearlyPrice =
        dto.yearlyPrice;
    }

    /* ----------------------------------------------------------
       CURRENCY
    ---------------------------------------------------------- */

    if (
      dto.currency !== undefined
    ) {
      subscriptionPlan.currency =
        dto.currency.toUpperCase();
    }

    /* ----------------------------------------------------------
       FEATURES
    ---------------------------------------------------------- */

    if (
      dto.features !== undefined
    ) {
      subscriptionPlan.features =
        dto.features;
    }

    /* ----------------------------------------------------------
       ACTIVE
    ---------------------------------------------------------- */

    if (
      dto.active !== undefined
    ) {
      subscriptionPlan.active =
        dto.active;
    }

    /* ----------------------------------------------------------
       POPULAR
    ---------------------------------------------------------- */

    if (
      dto.popular !== undefined
    ) {
      subscriptionPlan.popular =
        dto.popular;
    }

    /* ----------------------------------------------------------
       DISPLAY ORDER
    ---------------------------------------------------------- */

    if (
      dto.displayOrder !== undefined
    ) {
      subscriptionPlan.displayOrder =
        dto.displayOrder;
    }

    /* ----------------------------------------------------------
       STRIPE MONTHLY PRICE ID

       Example:

       price_1ABC123...

       This must be the Stripe Price ID,
       NOT the Product ID.
    ---------------------------------------------------------- */

    if (
      dto.stripeMonthlyPriceId !== undefined
    ) {

      const stripeMonthlyPriceId =
        dto.stripeMonthlyPriceId
          ?.trim();

      subscriptionPlan.stripeMonthlyPriceId =
        stripeMonthlyPriceId ||
        undefined;
    }

    /* ----------------------------------------------------------
       STRIPE YEARLY PRICE ID

       Example:

       price_1ABC123...

       This must be the Stripe Price ID,
       NOT the Product ID.
    ---------------------------------------------------------- */

    if (
      dto.stripeYearlyPriceId !== undefined
    ) {

      const stripeYearlyPriceId =
        dto.stripeYearlyPriceId
          ?.trim();

      subscriptionPlan.stripeYearlyPriceId =
        stripeYearlyPriceId ||
        undefined;
    }

    /* ----------------------------------------------------------
       TRACK PRICE CHANGES
    ---------------------------------------------------------- */

    if (
      priceChanged ||
      yearlyPriceChanged
    ) {
      subscriptionPlan.priceUpdatedAt =
        new Date();
    }

    return subscriptionPlan.save();
  }

  /* ============================================================
     INITIALIZE DEFAULT PLANS

     IMPORTANT:

     Do NOT overwrite existing documents.

     This means Stripe Price IDs already stored in
     MongoDB will be preserved when the application
     starts again.

     Stripe Price IDs are intentionally NOT hardcoded
     here because they come from your Stripe account.
  ============================================================ */

  async initializeDefaults(): Promise<void> {

    const defaults = [

      /* --------------------------------------------------------
         BASIC
      -------------------------------------------------------- */

      {
        plan:
          SubscriptionPlan.BASIC,

        name:
          "Basic",

        description:
          "Free Fockis account.",

        monthlyPrice:
          0,

        yearlyPrice:
          0,

        currency:
          "USD",

        features: [
          "Basic Fockis access",
        ],

        active:
          true,

        popular:
          false,

        displayOrder:
          1,
      },

      /* --------------------------------------------------------
         BRONZE
      -------------------------------------------------------- */

      {
        plan:
          SubscriptionPlan.BRONZE,

        name:
          "Bronze",

        description:
          "Essential tools for growing Fockis users.",

        monthlyPrice:
          9.99,

        yearlyPrice:
          99.99,

        currency:
          "USD",

        features: [
          "Expanded account limits",
          "Enhanced marketplace access",
        ],

        active:
          true,

        popular:
          false,

        displayOrder:
          2,
      },

      /* --------------------------------------------------------
         SILVER
      -------------------------------------------------------- */

      {
        plan:
          SubscriptionPlan.SILVER,

        name:
          "Silver",

        description:
          "Expanded Fockis services.",

        monthlyPrice:
          19.99,

        yearlyPrice:
          199.99,

        currency:
          "USD",

        features: [
          "Higher account limits",
          "Advanced marketplace tools",
          "Additional Fockis features",
        ],

        active:
          true,

        popular:
          true,

        displayOrder:
          3,
      },

      /* --------------------------------------------------------
         GOLDEN
      -------------------------------------------------------- */

      {
        plan:
          SubscriptionPlan.GOLDEN,

        name:
          "Golden",

        description:
          "Premium Fockis experience.",

        monthlyPrice:
          39.99,

        yearlyPrice:
          399.99,

        currency:
          "USD",

        features: [
          "Premium account limits",
          "Advanced tools",
          "Priority features",
        ],

        active:
          true,

        popular:
          false,

        displayOrder:
          4,
      },

      /* --------------------------------------------------------
         DIAMOND
      -------------------------------------------------------- */

      {
        plan:
          SubscriptionPlan.DIAMOND,

        name:
          "Diamond",

        description:
          "The highest Fockis account level.",

        monthlyPrice:
          79.99,

        yearlyPrice:
          799.99,

        currency:
          "USD",

        features: [
          "Maximum account limits",
          "All premium tools",
          "Highest Fockis access",
        ],

        active:
          true,

        popular:
          false,

        displayOrder:
          5,
      },
    ];

    /* ----------------------------------------------------------
       CREATE ONLY MISSING PLANS

       Existing plans are untouched.

       This is critical because existing Stripe Price IDs
       must never be erased when NestJS starts.
    ---------------------------------------------------------- */

    for (
      const plan of defaults
    ) {

      await this.planModel
        .updateOne(
          {
            plan:
              plan.plan,
          },
          {
            $setOnInsert:
              plan,
          },
          {
            upsert:
              true,
          },
        )
        .exec();
    }
  }
}