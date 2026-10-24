/* ============================================================================
   FOCKIS SUBSCRIPTION PLAN UTILITIES

   One place for the plan logic the UI needs:

   - normalizing backend feature data
   - ordering plans
   - formatting real prices
   - computing a yearly discount ONLY from real backend prices
   - deciding which action a plan card may offer
   - validating Stripe Checkout URLs

   Nothing here invents prices or features.
============================================================================ */

import type {
  BillingInterval,
  Subscription,
  SubscriptionFeature,
  SubscriptionPlan,
  SubscriptionPlanConfig,
  SubscriptionPlanFeatureInput,
  SubscriptionStatus,
} from "../types/subscriptionTypes";

import { SUBSCRIPTION_PLAN_RANK } from "../types/subscriptionTypes";

/* ============================================================================
   FEATURES
============================================================================ */

const PLACEHOLDER_LABELS = new Set([
  "",
  "-",
  "—",
  "–",
  "undefined",
  "null",
  "n/a",
]);

function isUsableLabel(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !PLACEHOLDER_LABELS.has(value.trim().toLowerCase())
  );
}

/**
 * Accepts the backend shape (string[]) and the legacy object shape
 * ({ name, included, description }) and returns clean objects.
 * Empty, dash-only, "undefined" and "null" labels are dropped.
 */
export function normalizeSubscriptionFeatures(
  features: readonly SubscriptionPlanFeatureInput[] | null | undefined,
): SubscriptionFeature[] {
  if (!Array.isArray(features)) return [];

  const result: SubscriptionFeature[] = [];

  for (const item of features) {
    if (typeof item === "string") {
      if (isUsableLabel(item)) {
        result.push({ name: item.trim(), included: true });
      }
      continue;
    }

    if (item && typeof item === "object" && isUsableLabel(item.name)) {
      result.push({
        name: item.name.trim(),
        included: item.included !== false,
        description: isUsableLabel(item.description)
          ? item.description.trim()
          : undefined,
      });
    }
  }

  return result;
}

/* ============================================================================
   RANK / ORDER
============================================================================ */

export function getPlanRank(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PLAN_RANK[plan] ?? 0;
}

/**
 * Active plans, ordered by the backend displayOrder, then by rank.
 */
export function sortActivePlans(
  plans: readonly SubscriptionPlanConfig[],
): SubscriptionPlanConfig[] {
  return plans
    .filter((item) => item && item.active !== false && item.plan in SUBSCRIPTION_PLAN_RANK)
    .slice()
    .sort((a, b) => {
      const orderA = Number.isFinite(a.displayOrder) ? a.displayOrder : getPlanRank(a.plan);
      const orderB = Number.isFinite(b.displayOrder) ? b.displayOrder : getPlanRank(b.plan);
      return orderA - orderB || getPlanRank(a.plan) - getPlanRank(b.plan);
    });
}

/* ============================================================================
   PRICES
============================================================================ */

export function getPlanPrice(
  config: Pick<SubscriptionPlanConfig, "monthlyPrice" | "yearlyPrice">,
  interval: BillingInterval,
): number | null {
  const raw = interval === "YEARLY" ? config.yearlyPrice : config.monthlyPrice;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function formatMoney(amount: number, currency = "USD"): string {
  const code = (currency || "USD").toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

/**
 * Whole-percent yearly saving, derived from the plan's own monthly and
 * yearly prices. Returns null when the yearly price is not actually
 * cheaper than 12 monthly payments, or when either price is missing.
 * Rounded DOWN so the UI never overstates the saving.
 */
export function getYearlySavingsPercent(
  config: Pick<SubscriptionPlanConfig, "monthlyPrice" | "yearlyPrice">,
): number | null {
  const monthly = Number(config.monthlyPrice);
  const yearly = Number(config.yearlyPrice);

  if (!(monthly > 0) || !(yearly > 0)) return null;

  const fullYear = monthly * 12;
  if (yearly >= fullYear) return null;

  const percent = Math.floor(((fullYear - yearly) / fullYear) * 100);
  return percent >= 1 ? percent : null;
}

/** Largest real yearly saving across the given plans, or null. */
export function getMaxYearlySavingsPercent(
  plans: readonly SubscriptionPlanConfig[],
): number | null {
  let best: number | null = null;

  for (const plan of plans) {
    const value = getYearlySavingsPercent(plan);
    if (value !== null && (best === null || value > best)) best = value;
  }

  return best;
}

/* ============================================================================
   LABELS
============================================================================ */

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  BASIC: "Basic",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLDEN: "Golden",
  DIAMOND: "Diamond",
};

export function getPlanLabel(
  plan: SubscriptionPlan | string | undefined,
  plans?: readonly SubscriptionPlanConfig[],
): string {
  if (!plan) return "Unknown";
  const configured = plans?.find((item) => item.plan === plan)?.name;
  if (isUsableLabel(configured)) return configured.trim();
  return PLAN_LABELS[plan as SubscriptionPlan] ?? plan;
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  TRIALING: "Free trial",
  PAST_DUE: "Payment required",
  CANCELED: "Canceled",
  EXPIRED: "Expired",
};

export function getStatusLabel(status: string | undefined): string {
  if (!status) return "Unknown";
  return STATUS_LABELS[status as SubscriptionStatus] ?? status.replace(/_/g, " ").toLowerCase();
}

export function getIntervalLabel(interval: BillingInterval | undefined): string | null {
  if (interval === "MONTHLY") return "Monthly";
  if (interval === "YEARLY") return "Yearly";
  return null;
}

export function formatSubscriptionDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ============================================================================
   SUBSCRIPTION STATE
============================================================================ */

export function isEndedStatus(status: SubscriptionStatus | undefined): boolean {
  return status === "CANCELED" || status === "EXPIRED";
}

/**
 * True when the user currently holds a paid account plan that is still
 * linked to billing (active, trialing, or past due). Such users must not
 * start a second Stripe Checkout — that would create a second recurring
 * subscription.
 */
export function hasLivePaidSubscription(subscription: Subscription | null | undefined): boolean {
  if (!subscription) return false;
  if (subscription.plan === "BASIC") return false;
  return !isEndedStatus(subscription.status);
}

/* ============================================================================
   PLAN CARD ACTION

   Supported transitions with the current backend:

   - BASIC (or an ended paid plan) → any paid plan: Stripe Checkout.
   - Paid → another paid plan: NOT supported online. The backend has no
     proration / plan-change endpoint, POST /subscriptions/checkout would
     open a second subscription, and POST /subscriptions/upgrade changes
     the plan without collecting payment. The card sends these users to
     subscription management instead.
   - Paid → BASIC: done by cancelling, from subscription management.
============================================================================ */

export type PlanCardActionKind =
  | "current"
  | "checkout"
  | "manage"
  | "included"
  | "unavailable"
  | "unknown";

export interface PlanCardAction {
  kind: PlanCardActionKind;
  label: string;
  disabled: boolean;
  hint?: string;
}

export function getPlanCardAction(params: {
  config: SubscriptionPlanConfig;
  interval: BillingInterval;
  subscription: Subscription | null;
  subscriptionKnown: boolean;
}): PlanCardAction {
  const { config, interval, subscription, subscriptionKnown } = params;
  const name = isUsableLabel(config.name) ? config.name.trim() : PLAN_LABELS[config.plan];
  const isBasicCard = config.plan === "BASIC";

  // We could not confirm the user's current plan: never start checkout.
  if (!subscriptionKnown) {
    return {
      kind: "unknown",
      label: isBasicCard ? "Free plan" : `Choose ${name}`,
      disabled: true,
      hint: "We need to confirm your current plan before checkout.",
    };
  }

  const currentPlan: SubscriptionPlan = subscription?.plan ?? "BASIC";
  const ended = isEndedStatus(subscription?.status);
  const livePaid = hasLivePaidSubscription(subscription);

  if (isBasicCard) {
    if (currentPlan === "BASIC" || ended) {
      return { kind: "current", label: "Your current plan", disabled: true };
    }
    return {
      kind: "included",
      label: "Manage subscription",
      disabled: false,
      hint: "Basic features are included in every paid plan.",
    };
  }

  if (livePaid && currentPlan === config.plan) {
    return { kind: "current", label: "Your current plan", disabled: true };
  }

  if (livePaid) {
    const higher = getPlanRank(config.plan) > getPlanRank(currentPlan);
    return {
      kind: "manage",
      label: "Manage plan",
      disabled: false,
      hint: higher
        ? "Plan changes for an existing membership are handled from your subscription."
        : "Lower tier than your current plan.",
    };
  }

  const price = getPlanPrice(config, interval);
  if (price === null || price <= 0) {
    return {
      kind: "unavailable",
      label: "Unavailable",
      disabled: true,
      hint: `No ${interval === "YEARLY" ? "yearly" : "monthly"} price is configured yet.`,
    };
  }

  return { kind: "checkout", label: `Upgrade to ${name}`, disabled: false };
}

/* ============================================================================
   STRIPE CHECKOUT URL
============================================================================ */

/**
 * Throws unless the URL is an https Stripe Checkout URL.
 */
export function assertStripeCheckoutUrl(value: string | undefined): URL {
  if (!value) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("The checkout URL returned by the server is invalid.");
  }

  const host = url.hostname;
  const isStripe = host === "checkout.stripe.com" || host.endsWith(".checkout.stripe.com");

  if (url.protocol !== "https:" || !isStripe) {
    throw new Error("The checkout URL is not a recognized secure Stripe Checkout URL.");
  }

  return url;
}
