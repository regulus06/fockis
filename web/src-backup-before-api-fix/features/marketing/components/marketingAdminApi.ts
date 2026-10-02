/* ============================================================================
   MARKETING ADMIN API

   Wraps MarketingAdminController (apps/api/src/marketing/controllers/
   admin-marketing.controller.ts). Admin-only campaign moderation:
   list pending campaigns, approve, reject.
============================================================================ */

import type { Campaign } from "../types/marketingTypes";

const API_URL = "http://localhost:3000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      text || `Request failed: ${response.status}`,
    );
  }

  return response.json();
}

/* ============================================================================
   PENDING CAMPAIGNS
============================================================================ */

export async function getPendingCampaigns() {
  return request<Campaign[]>(
    "/admin/marketing/campaigns/pending",
  );
}

/* ============================================================================
   APPROVE / REJECT
============================================================================ */

export async function approveCampaign(campaignId: string) {
  return request<Campaign>(
    `/admin/marketing/campaigns/${campaignId}/approve`,
    { method: "POST" },
  );
}

export async function rejectCampaign(campaignId: string) {
  return request<Campaign>(
    `/admin/marketing/campaigns/${campaignId}/reject`,
    { method: "POST" },
  );
}