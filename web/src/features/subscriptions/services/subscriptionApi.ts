import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  Subscription,
  ChangePlanPayload,
  CreateCheckoutPayload,
  CheckoutResponse,
  SubscriptionPlanConfig,
} from "../types/subscriptionTypes";

/* ============================================================
   FOCKIS SUBSCRIPTION API
============================================================ */

const API_URL =
  FOCKIS_API_URL;

/* ============================================================
   TOKEN
============================================================ */

function getToken(): string | null {
  return localStorage.getItem(
    "token",
  );
}

/* ============================================================
   REQUEST
============================================================ */

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {

  const token =
    getToken();

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),

          ...(options.headers ?? {}),
        },
      },
    );

  let data: unknown = null;

  try {

    data =
      await response.json();

  } catch {

    data = null;

  }

  if (!response.ok) {

    const responseData =
      data as
        | {
            message?: string | string[];
            error?: string;
            statusCode?: number;
          }
        | null;

    const message =
      responseData?.message ??
      responseData?.error ??
      `Subscription request failed with status ${response.status}.`;

    /* ----------------------------------------------------------
       DETAILED ERROR LOG
    ---------------------------------------------------------- */

    console.error(
      "[Subscription API ERROR]",
      JSON.stringify(
        {
          endpoint,
          status:
            response.status,
          statusText:
            response.statusText,
          response:
            data,
        },
        null,
        2,
      ),
    );

    throw new Error(
      Array.isArray(message)
        ? message.join(", ")
        : message,
    );
  }

  return data as T;
}

/* ============================================================
   GET SUBSCRIPTION PLANS

   GET /subscription-plans
============================================================ */

export async function
getSubscriptionPlans(
  includeInactive = false,
): Promise<SubscriptionPlanConfig[]> {

  return request<SubscriptionPlanConfig[]>(
    `/subscription-plans?includeInactive=${includeInactive}`,
  );
}

/* ============================================================
   GET ONE SUBSCRIPTION PLAN

   GET /subscription-plans/:plan
============================================================ */

export async function
getSubscriptionPlan(
  plan:
    SubscriptionPlanConfig["plan"],
): Promise<SubscriptionPlanConfig> {

  return request<SubscriptionPlanConfig>(
    `/subscription-plans/${plan}`,
  );
}

/* ============================================================
   GET CURRENT SUBSCRIPTION

   GET /subscriptions/current
============================================================ */

export async function
getCurrentSubscription(): Promise<Subscription> {

  return request<Subscription>(
    "/subscriptions/current",
  );
}

/* ============================================================
   GET SUBSCRIPTION

   GET /subscriptions
============================================================ */

export async function
getSubscription(): Promise<Subscription> {

  return request<Subscription>(
    "/subscriptions",
  );
}

/* ============================================================
   CREATE STRIPE CHECKOUT

   POST /subscriptions/checkout

   Frontend sends ONLY:

   {
     plan,
     billingInterval
   }

   Backend determines:

   - Stripe Price ID
   - Active status
   - Stripe configuration

   Do NOT send stripePriceId from the frontend.
============================================================ */

export async function
createCheckout(
  payload:
    CreateCheckoutPayload,
): Promise<CheckoutResponse> {

  /* ----------------------------------------------------------
     RAW PAYLOAD
  ---------------------------------------------------------- */

  console.log(
    "[Subscription Checkout] RAW PAYLOAD:",
    JSON.stringify(
      payload,
      null,
      2,
    ),
  );

  /* ----------------------------------------------------------
     VALIDATE PAYLOAD
  ---------------------------------------------------------- */

  if (!payload) {

    throw new Error(
      "Checkout payload is missing.",
    );
  }

  if (!payload.plan) {

    throw new Error(
      "Subscription plan is required.",
    );
  }

  if (!payload.billingInterval) {

    throw new Error(
      "Billing interval is required.",
    );
  }

  /* ----------------------------------------------------------
     CREATE CLEAN BACKEND PAYLOAD
  ---------------------------------------------------------- */

  const checkoutPayload = {
    plan:
      payload.plan,

    billingInterval:
      payload.billingInterval,
  };

  /* ----------------------------------------------------------
     LOG EXACT PAYLOAD BEING SENT
  ---------------------------------------------------------- */

  console.log(
    "[Subscription Checkout] SENDING PAYLOAD:",
    JSON.stringify(
      checkoutPayload,
      null,
      2,
    ),
  );

  /* ----------------------------------------------------------
     CREATE STRIPE CHECKOUT SESSION
  ---------------------------------------------------------- */

  try {

    const result =
      await request<CheckoutResponse>(
        "/subscriptions/checkout",
        {
          method:
            "POST",

          body:
            JSON.stringify(
              checkoutPayload,
            ),
        },
      );

    /* --------------------------------------------------------
       SUCCESS
    -------------------------------------------------------- */

    console.log(
      "[Subscription Checkout] SUCCESS:",
      JSON.stringify(
        result,
        null,
        2,
      ),
    );

    return result;

  } catch (error) {

    /* --------------------------------------------------------
       CHECKOUT ERROR
    -------------------------------------------------------- */

    console.error(
      "[Subscription Checkout] FAILED:",
      error instanceof Error
        ? error.message
        : error,
    );

    throw error;
  }
}

/* ============================================================
   UPGRADE SUBSCRIPTION

   POST /subscriptions/upgrade
============================================================ */

export async function
upgradeSubscription(
  payload:
    ChangePlanPayload,
): Promise<Subscription> {

  return request<Subscription>(
    "/subscriptions/upgrade",
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}

/* ============================================================
   CANCEL SUBSCRIPTION

   POST /subscriptions/cancel
============================================================ */

export async function
cancelSubscription(): Promise<Subscription> {

  return request<Subscription>(
    "/subscriptions/cancel",
    {
      method:
        "POST",
    },
  );
}

/* ============================================================
   RESUME SUBSCRIPTION

   POST /subscriptions/resume
============================================================ */

export async function
resumeSubscription(): Promise<Subscription> {

  return request<Subscription>(
    "/subscriptions/resume",
    {
      method:
        "POST",
    },
  );
}

/* ============================================================
   RESET TO BASIC

   POST /subscriptions/reset-to-basic
============================================================ */

export async function
resetToBasic(): Promise<Subscription> {

  return request<Subscription>(
    "/subscriptions/reset-to-basic",
    {
      method:
        "POST",
    },
  );
}