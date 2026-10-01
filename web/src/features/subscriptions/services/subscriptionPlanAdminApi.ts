import { FOCKIS_API_URL } from "../../../config/fockisConfig";

/* ============================================================================
   FOCKIS ADMIN SUBSCRIPTION PLAN API
============================================================================ */

import type {
  SubscriptionPlan,
} from "../types/subscriptionTypes";

import type {
  AdminSubscriptionPlan,
  UpdateSubscriptionPlanPayload,
} from "../types/subscriptionPlanAdminTypes";

/* ============================================================================
   API
============================================================================ */

const API_URL = FOCKIS_API_URL;

/* ============================================================================
   TOKEN
============================================================================ */

function getToken(): string | null {
  return localStorage.getItem("token");
}

/* ============================================================================
   REQUEST
============================================================================ */

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
      "Subscription plan request failed.";

    throw new Error(
      Array.isArray(message)
        ? message.join(", ")
        : message,
    );
  }

  return data as T;
}

/* ============================================================================
   GET ALL PLANS
============================================================================ */

export async function getAdminSubscriptionPlans(): Promise<
  AdminSubscriptionPlan[]
> {
  return request<AdminSubscriptionPlan[]>(
    "/admin/subscription-plans",
  );
}

/* ============================================================================
   GET ONE PLAN
============================================================================ */

export async function getAdminSubscriptionPlan(
  plan: SubscriptionPlan,
): Promise<AdminSubscriptionPlan> {
  return request<AdminSubscriptionPlan>(
    `/admin/subscription-plans/${plan}`,
  );
}

/* ============================================================================
   UPDATE PLAN
============================================================================ */

export async function updateAdminSubscriptionPlan(
  plan: SubscriptionPlan,
  payload: UpdateSubscriptionPlanPayload,
): Promise<AdminSubscriptionPlan> {
  return request<AdminSubscriptionPlan>(
    `/admin/subscription-plans/${plan}`,
    {
      method: "PATCH",

      body: JSON.stringify(payload),
    },
  );
}