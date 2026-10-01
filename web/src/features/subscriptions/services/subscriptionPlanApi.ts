import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  Subscription,
  ChangePlanPayload,
  CreateCheckoutPayload,
  CheckoutResponse,
  SubscriptionPlan,
  SubscriptionPlanConfig,
} from "../types/subscriptionTypes";

/* ============================================================
   FOCKIS SUBSCRIPTION API
============================================================ */

const API_URL = FOCKIS_API_URL;

/* ============================================================
   TOKEN
============================================================ */

function getToken(): string | null {
  return localStorage.getItem("token");
}

/* ============================================================
   REQUEST
============================================================ */

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...(options.headers ?? {}),
      },
    },
  );

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const responseData = data as
      | {
          message?: string | string[];
          error?: string;
        }
      | null;

    const message =
      responseData?.message ??
      responseData?.error ??
      "Subscription request failed.";

    throw new Error(
      Array.isArray(message)
        ? message.join(", ")
        : message,
    );
  }

  return data as T;
}

/* ============================================================
   GET CURRENT SUBSCRIPTION
============================================================ */

export async function getCurrentSubscription(): Promise<Subscription> {
  return request<Subscription>(
    "/subscriptions/current",
  );
}

/* ============================================================
   GET SUBSCRIPTION
============================================================ */

export async function getSubscription(): Promise<Subscription> {
  return request<Subscription>(
    "/subscriptions",
  );
}

/* ============================================================
   GET SUBSCRIPTION PLANS
============================================================ */

/*
 * IMPORTANT:
 *
 * This is the customer-facing plan endpoint.
 *
 * The SubscriptionPlansPage uses this instead of
 * hardcoded prices.
 */

export async function getSubscriptionPlans(
  includeInactive = false,
): Promise<SubscriptionPlanConfig[]> {
  return request<SubscriptionPlanConfig[]>(
    `/subscription-plans?includeInactive=${includeInactive}`,
  );
}

/* ============================================================
   GET ONE PLAN
============================================================ */

export async function getSubscriptionPlan(
  plan: SubscriptionPlan,
): Promise<SubscriptionPlanConfig> {
  return request<SubscriptionPlanConfig>(
    `/subscription-plans/${plan}`,
  );
}

/* ============================================================
   CREATE STRIPE CHECKOUT
============================================================ */

export async function createCheckout(
  payload: CreateCheckoutPayload,
): Promise<CheckoutResponse> {
  return request<CheckoutResponse>(
    "/subscriptions/checkout",
    {
      method: "POST",

      body: JSON.stringify(payload),
    },
  );
}

/* ============================================================
   UPGRADE SUBSCRIPTION
============================================================ */

export async function upgradeSubscription(
  payload: ChangePlanPayload,
): Promise<Subscription> {
  return request<Subscription>(
    "/subscriptions/upgrade",
    {
      method: "POST",

      body: JSON.stringify(payload),
    },
  );
}

/* ============================================================
   CANCEL
============================================================ */

export async function cancelSubscription(): Promise<Subscription> {
  return request<Subscription>(
    "/subscriptions/cancel",
    {
      method: "POST",
    },
  );
}

/* ============================================================
   RESUME
============================================================ */

export async function resumeSubscription(): Promise<Subscription> {
  return request<Subscription>(
    "/subscriptions/resume",
    {
      method: "POST",
    },
  );
}

/* ============================================================
   RESET TO BASIC
============================================================ */

export async function resetToBasic(): Promise<Subscription> {
  return request<Subscription>(
    "/subscriptions/reset-to-basic",
    {
      method: "POST",
    },
  );
}