/* ============================================================================
   FOCKIS ADMIN SUBSCRIPTION PLAN TYPES
============================================================================ */

import type {
  SubscriptionPlan,
} from "./subscriptionTypes";

/* ============================================================================
   PLAN CONFIG
============================================================================ */

export interface AdminSubscriptionPlan {
  _id?: string;

  plan: SubscriptionPlan;

  name: string;

  description: string;

  monthlyPrice: number;

  yearlyPrice: number;

  currency: string;

  features: string[];

  active: boolean;

  popular: boolean;

  displayOrder: number;

  stripeMonthlyPriceId?: string;

  stripeYearlyPriceId?: string;

  priceUpdatedAt?: string;

  createdAt?: string;

  updatedAt?: string;
}

/* ============================================================================
   UPDATE PLAN
============================================================================ */

export interface UpdateSubscriptionPlanPayload {
  name?: string;

  description?: string;

  monthlyPrice?: number;

  yearlyPrice?: number;

  currency?: string;

  features?: string[];

  active?: boolean;

  popular?: boolean;

  displayOrder?: number;

  stripeMonthlyPriceId?: string;

  stripeYearlyPriceId?: string;
}