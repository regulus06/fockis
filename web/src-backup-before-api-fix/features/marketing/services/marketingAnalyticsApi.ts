

/* ============================================================================
   MARKETING ANALYTICS API
============================================================================ */

import type {
  AnalyticsOverview,
  CampaignAnalytics,
  CampaignSummary,
  MarketingEvent,
} from "../types/marketingTypes";

const API_URL = "http://localhost:3000";

/* ============================================================================
   REQUEST
============================================================================ */

async function request<T>(
  path: string,
): Promise<T> {
  const token =
    localStorage.getItem("token");

  const response = await fetch(
    `${API_URL}${path}`,
    {
      headers: {
        "Content-Type":
          "application/json",

        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),
      },
    },
  );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      text ||
        `Analytics request failed: ${response.status}`,
    );
  }

  return response.json();
}

/* ============================================================================
   OVERVIEW
============================================================================ */

export async function getAnalyticsOverview() {
  return request<AnalyticsOverview>(
    "/marketing/analytics/overview",
  );
}

/* ============================================================================
   CAMPAIGN ANALYTICS
============================================================================ */

export async function getCampaignAnalytics(
  campaignId: string,
) {
  return request<CampaignAnalytics>(
    `/marketing/analytics/campaign/${campaignId}`,
  );
}

/* ============================================================================
   CAMPAIGN SUMMARY
============================================================================ */

export async function getCampaignSummary(
  campaignId: string,
) {
  return request<CampaignSummary>(
    `/marketing/analytics/campaign/${campaignId}/summary`,
  );
}

/* ============================================================================
   CAMPAIGN EVENTS
============================================================================ */

export async function getCampaignEvents(
  campaignId: string,
  startDate?: string,
  endDate?: string,
) {
  const params =
    new URLSearchParams();

  if (startDate) {
    params.set(
      "startDate",
      startDate,
    );
  }

  if (endDate) {
    params.set(
      "endDate",
      endDate,
    );
  }

  const query =
    params.toString();

  return request<MarketingEvent[]>(
    `/marketing/analytics/campaign/${campaignId}/events${
      query ? `?${query}` : ""
    }`,
  );
}

/* ============================================================================
   AD ANALYTICS
============================================================================ */

export async function getAdAnalytics(
  adId: string,
) {
  return request(
    `/marketing/analytics/ad/${adId}`,
  );
}

/* ============================================================================
   MARKETING ANALYTICS API OBJECT
============================================================================ */

export const marketingAnalyticsApi = {
  getAnalyticsOverview,

  getCampaignAnalytics,

  getCampaignSummary,

  getCampaignEvents,

  getAdAnalytics,

  /*
   * Aliases used by pages/components
   * that expect shorter method names.
   */

  getOverview:
    getAnalyticsOverview,

  getCampaign:
    getCampaignAnalytics,

  getSummary:
    getCampaignSummary,

  getEvents:
    getCampaignEvents,

  getAd:
    getAdAnalytics,
};

export default marketingAnalyticsApi;