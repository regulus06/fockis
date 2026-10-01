import { FOCKIS_API_URL } from "../../../config/fockisConfig";

/* ============================================================================
   FOCKIS MARKETING BILLING API
============================================================================ */

import type {
  Budget,
} from "../types/marketingTypes";

const API_URL = FOCKIS_API_URL;

function getToken(): string | null {
  return localStorage.getItem("token");
}

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
        "Content-Type":
          "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...(options.headers || {}),
      },
    },
  );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      text ||
        `Billing request failed: ${response.status}`,
    );
  }

  return response.json();
}

export async function getCampaignBudget(
  campaignId: string,
): Promise<Budget> {
  return request<Budget>(
    `/marketing/billing/campaign/${campaignId}`,
  );
}

export async function updateCampaignBudget(
  campaignId: string,
  payload: {
    dailyBudget: number;
    totalBudget: number;
  },
): Promise<Budget> {
  return request<Budget>(
    `/marketing/billing/campaign/${campaignId}`,
    {
      method: "PUT",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}