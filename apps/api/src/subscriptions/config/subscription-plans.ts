import {
  BillingInterval,
  SubscriptionPlan,
} from "../schemas/subscription.schema";

/* ============================================================
   FOCKIS SUBSCRIPTION PLAN CONFIGURATION

   ACCOUNT LEVELS

   BASIC   = FREE
   BRONZE  = PAID
   SILVER  = PAID
   GOLDEN  = PAID
   DIAMOND = PAID
============================================================ */

export interface SubscriptionPlanConfig {
  plan: SubscriptionPlan;

  name: string;

  description: string;

  monthlyPrice: number;

  yearlyPrice: number;

  stripeMonthlyPriceId?: string;

  stripeYearlyPriceId?: string;

  rank: number;
}

/* ============================================================
   PLAN CONFIGURATION
============================================================ */

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlan,
  SubscriptionPlanConfig
> = {
  /* ==========================================================
     BASIC
     
     FREE ACCOUNT
  ========================================================== */

  [SubscriptionPlan.BASIC]: {
    plan: SubscriptionPlan.BASIC,

    name: "Basic",

    description:
      "Free Fockis account with basic services.",

    monthlyPrice: 0,

    yearlyPrice: 0,

    rank: 1,
  },

  /* ==========================================================
     BRONZE
  ========================================================== */

  [SubscriptionPlan.BRONZE]: {
    plan: SubscriptionPlan.BRONZE,

    name: "Bronze",

    description:
      "More Fockis services and higher account limits.",

    monthlyPrice: Number(
      process.env.FOCKIS_BRONZE_MONTHLY_PRICE ?? 0,
    ),

    yearlyPrice: Number(
      process.env.FOCKIS_BRONZE_YEARLY_PRICE ?? 0,
    ),

    stripeMonthlyPriceId:
      process.env.STRIPE_BRONZE_MONTHLY_PRICE_ID,

    stripeYearlyPriceId:
      process.env.STRIPE_BRONZE_YEARLY_PRICE_ID,

    rank: 2,
  },

  /* ==========================================================
     SILVER
  ========================================================== */

  [SubscriptionPlan.SILVER]: {
    plan: SubscriptionPlan.SILVER,

    name: "Silver",

    description:
      "Expanded Fockis services for growing users.",

    monthlyPrice: Number(
      process.env.FOCKIS_SILVER_MONTHLY_PRICE ?? 0,
    ),

    yearlyPrice: Number(
      process.env.FOCKIS_SILVER_YEARLY_PRICE ?? 0,
    ),

    stripeMonthlyPriceId:
      process.env.STRIPE_SILVER_MONTHLY_PRICE_ID,

    stripeYearlyPriceId:
      process.env.STRIPE_SILVER_YEARLY_PRICE_ID,

    rank: 3,
  },

  /* ==========================================================
     GOLDEN
  ========================================================== */

  [SubscriptionPlan.GOLDEN]: {
    plan: SubscriptionPlan.GOLDEN,

    name: "Golden",

    description:
      "Advanced Fockis services and premium capabilities.",

    monthlyPrice: Number(
      process.env.FOCKIS_GOLDEN_MONTHLY_PRICE ?? 0,
    ),

    yearlyPrice: Number(
      process.env.FOCKIS_GOLDEN_YEARLY_PRICE ?? 0,
    ),

    stripeMonthlyPriceId:
      process.env.STRIPE_GOLDEN_MONTHLY_PRICE_ID,

    stripeYearlyPriceId:
      process.env.STRIPE_GOLDEN_YEARLY_PRICE_ID,

    rank: 4,
  },

  /* ==========================================================
     DIAMOND
  ========================================================== */

  [SubscriptionPlan.DIAMOND]: {
    plan: SubscriptionPlan.DIAMOND,

    name: "Diamond",

    description:
      "The highest Fockis account level with maximum services.",

    monthlyPrice: Number(
      process.env.FOCKIS_DIAMOND_MONTHLY_PRICE ?? 0,
    ),

    yearlyPrice: Number(
      process.env.FOCKIS_DIAMOND_YEARLY_PRICE ?? 0,
    ),

    stripeMonthlyPriceId:
      process.env.STRIPE_DIAMOND_MONTHLY_PRICE_ID,

    stripeYearlyPriceId:
      process.env.STRIPE_DIAMOND_YEARLY_PRICE_ID,

    rank: 5,
  },
};

/* ============================================================
   GET PLAN CONFIG
============================================================ */

export function getSubscriptionPlanConfig(
  plan: SubscriptionPlan,
): SubscriptionPlanConfig {
  return SUBSCRIPTION_PLANS[plan];
}

/* ============================================================
   GET STRIPE PRICE
============================================================ */

export function getStripePriceId(
  plan: SubscriptionPlan,
  interval: BillingInterval,
): string | undefined {
  const config =
    getSubscriptionPlanConfig(plan);

  if (
    interval ===
    BillingInterval.YEARLY
  ) {
    return config.stripeYearlyPriceId;
  }

  return config.stripeMonthlyPriceId;
}