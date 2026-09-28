/* ============================================================================
   FOCKIS SUBSCRIPTION TYPES
============================================================================ */

/* ============================================================================
   SUBSCRIPTION PLAN
============================================================================ */

export type SubscriptionPlan =
  | "BASIC"
  | "BRONZE"
  | "SILVER"
  | "GOLDEN"
  | "DIAMOND";


/* ============================================================================
   BILLING INTERVAL
============================================================================ */

export type BillingInterval =
  | "MONTHLY"
  | "YEARLY";


/* ============================================================================
   SUBSCRIPTION STATUS
============================================================================ */

export type SubscriptionStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED";


/* ============================================================================
   SUBSCRIPTION FEATURE
============================================================================ */

export interface SubscriptionFeature {
  name: string;

  included: boolean;

  description?: string;
}


/* ============================================================================
   SUBSCRIPTION PLAN CONFIGURATION
============================================================================ */

export interface SubscriptionPlanConfig {
  _id?: string;

  plan: SubscriptionPlan;

  name: string;

  description: string;

  monthlyPrice: number;

  yearlyPrice: number;

  currency: string;

  features: SubscriptionFeature[];

  active: boolean;

  popular: boolean;

  displayOrder: number;

  /*
   * Frontend subscription level.
   *
   * BASIC   = 1
   * BRONZE  = 2
   * SILVER  = 3
   * GOLDEN  = 4
   * DIAMOND = 5
   */
  rank: number;

  stripeMonthlyPriceId?: string;

  stripeYearlyPriceId?: string;

  priceUpdatedAt?: string;

  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================================
   UPDATE SUBSCRIPTION PLAN PAYLOAD
============================================================================ */

export interface UpdateSubscriptionPlanPayload {
  name?: string;

  description?: string;

  monthlyPrice?: number;

  yearlyPrice?: number;

  currency?: string;

  features?: SubscriptionFeature[];

  active?: boolean;

  popular?: boolean;

  displayOrder?: number;

  stripeMonthlyPriceId?: string;

  stripeYearlyPriceId?: string;
}


/* ============================================================================
   SUBSCRIPTION
============================================================================ */

export interface Subscription {
  _id?: string;

  userId: string;

  plan: SubscriptionPlan;

  status: SubscriptionStatus;

  billingInterval?: BillingInterval;

  price: number;

  currency?: string;

  stripeCustomerId?: string;

  stripeSubscriptionId?: string;

  stripePriceId?: string;

  currentPeriodStart?: string;

  currentPeriodEnd?: string;

  trialStart?: string;

  trialEnd?: string;

  trialEndsAt?: string;

  canceledAt?: string;

  cancelAtPeriodEnd: boolean;

  lastPaymentFailedAt?: string;

  paymentFailureCount: number;

  lastSyncedAt?: string;

  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================================
   CREATE CHECKOUT PAYLOAD
============================================================================ */

export interface CreateCheckoutPayload {
  plan:
    | "BRONZE"
    | "SILVER"
    | "GOLDEN"
    | "DIAMOND";

  billingInterval: BillingInterval;
}


/* ============================================================================
   CHECKOUT RESPONSE
============================================================================ */

export interface CheckoutResponse {
  checkoutUrl?: string;

  sessionId?: string;

  message?: string;

  subscription?: Subscription;
}


/* ============================================================================
   CHANGE PLAN PAYLOAD
============================================================================ */

export interface ChangePlanPayload {
  plan: SubscriptionPlan;

  billingInterval?: BillingInterval;
}


/* ============================================================================
   SUBSCRIPTION PLAN RANK
============================================================================ */

export const SUBSCRIPTION_PLAN_RANK: Record<
  SubscriptionPlan,
  number
> = {
  BASIC: 1,

  BRONZE: 2,

  SILVER: 3,

  GOLDEN: 4,

  DIAMOND: 5,
};


/* ============================================================================
   DEFAULT FRONTEND PLAN CONFIGURATION
============================================================================ */

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlan,
  SubscriptionPlanConfig
> = {

  /* --------------------------------------------------------------------------
     BASIC
  -------------------------------------------------------------------------- */

  BASIC: {
    plan: "BASIC",

    name: "Basic",

    description:
      "Free Fockis account with essential services.",

    monthlyPrice: 0,

    yearlyPrice: 0,

    currency: "USD",

    active: true,

    popular: false,

    displayOrder: 1,

    rank: 1,

    features: [
      {
        name: "Fockis Feed",
        included: true,
      },

      {
        name: "Create posts",
        included: true,
      },

      {
        name: "Friends and groups",
        included: true,
      },

      {
        name: "Marketplace browsing",
        included: true,
      },

      {
        name: "Basic profile",
        included: true,
      },

      {
        name: "Premium account features",
        included: false,
      },
    ],
  },


  /* --------------------------------------------------------------------------
     BRONZE
  -------------------------------------------------------------------------- */

  BRONZE: {
    plan: "BRONZE",

    name: "Bronze",

    description:
      "More Fockis services and higher account limits.",

    monthlyPrice: 9.99,

    yearlyPrice: 99.99,

    currency: "USD",

    active: true,

    popular: false,

    displayOrder: 2,

    rank: 2,

    features: [
      {
        name: "Everything in Basic",
        included: true,
      },

      {
        name: "Higher account limits",
        included: true,
      },

      {
        name: "Enhanced profile features",
        included: true,
      },

      {
        name: "Additional Fockis services",
        included: true,
      },

      {
        name: "Advanced analytics",
        included: false,
      },
    ],
  },


  /* --------------------------------------------------------------------------
     SILVER
  -------------------------------------------------------------------------- */

  SILVER: {
    plan: "SILVER",

    name: "Silver",

    description:
      "Expanded Fockis services for growing users.",

    monthlyPrice: 19.99,

    yearlyPrice: 199.99,

    currency: "USD",

    active: true,

    popular: true,

    displayOrder: 3,

    rank: 3,

    features: [
      {
        name: "Everything in Bronze",
        included: true,
      },

      {
        name: "Expanded account limits",
        included: true,
      },

      {
        name: "Advanced profile tools",
        included: true,
      },

      {
        name: "Advanced marketplace tools",
        included: true,
      },

      {
        name: "Advanced analytics",
        included: true,
      },
    ],
  },


  /* --------------------------------------------------------------------------
     GOLDEN
  -------------------------------------------------------------------------- */

  GOLDEN: {
    plan: "GOLDEN",

    name: "Golden",

    description:
      "Advanced Fockis services and premium capabilities.",

    monthlyPrice: 39.99,

    yearlyPrice: 399.99,

    currency: "USD",

    active: true,

    popular: false,

    displayOrder: 4,

    rank: 4,

    features: [
      {
        name: "Everything in Silver",
        included: true,
      },

      {
        name: "Premium account capabilities",
        included: true,
      },

      {
        name: "Advanced marketing tools",
        included: true,
      },

      {
        name: "Premium analytics",
        included: true,
      },

      {
        name: "Priority features",
        included: true,
      },
    ],
  },


  /* --------------------------------------------------------------------------
     DIAMOND
  -------------------------------------------------------------------------- */

  DIAMOND: {
    plan: "DIAMOND",

    name: "Diamond",

    description:
      "The highest Fockis account level with maximum services.",

    monthlyPrice: 79.99,

    yearlyPrice: 799.99,

    currency: "USD",

    active: true,

    popular: false,

    displayOrder: 5,

    rank: 5,

    features: [
      {
        name: "Everything in Golden",
        included: true,
      },

      {
        name: "Maximum account limits",
        included: true,
      },

      {
        name: "Maximum premium capabilities",
        included: true,
      },

      {
        name: "Advanced marketing",
        included: true,
      },

      {
        name: "Maximum analytics",
        included: true,
      },

      {
        name: "Highest Fockis account level",
        included: true,
      },
    ],
  },
};


/* ============================================================================
   PLAN ORDER
============================================================================ */

export const SUBSCRIPTION_PLAN_ORDER: SubscriptionPlan[] = [
  "BASIC",

  "BRONZE",

  "SILVER",

  "GOLDEN",

  "DIAMOND",
];


/* ============================================================================
   GET PLAN CONFIGURATION
============================================================================ */

export function getSubscriptionPlanConfig(
  plan: SubscriptionPlan,
): SubscriptionPlanConfig {
  return SUBSCRIPTION_PLANS[plan];
}


/* ============================================================================
   GET PLAN RANK
============================================================================ */

export function getSubscriptionPlanRank(
  plan: SubscriptionPlan,
): number {
  return SUBSCRIPTION_PLAN_RANK[plan];
}


/* ============================================================================
   CHECK PLAN ACCESS
============================================================================ */

export function hasSubscriptionPlanAccess(
  currentPlan: SubscriptionPlan,
  requiredPlan: SubscriptionPlan,
): boolean {
  return (
    getSubscriptionPlanRank(currentPlan) >=
    getSubscriptionPlanRank(requiredPlan)
  );
}


/* ============================================================================
   CHECK PAID PLAN
============================================================================ */

export function isPaidSubscriptionPlan(
  plan: SubscriptionPlan,
): boolean {
  return plan !== "BASIC";
}


/* ============================================================================
   FORMAT PRICE
============================================================================ */

export function formatSubscriptionPrice(
  price: number,
  currency = "USD",
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",

      currency,

      minimumFractionDigits: 0,

      maximumFractionDigits: 2,
    },
  ).format(price);
}


/* ============================================================================
   GET BILLING PRICE
============================================================================ */

export function getSubscriptionPrice(
  config: SubscriptionPlanConfig,
  billingInterval: BillingInterval,
): number {
  return billingInterval === "YEARLY"
    ? config.yearlyPrice
    : config.monthlyPrice;
}
