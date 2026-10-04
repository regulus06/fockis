import type {
  ABTest,
  AnalyticsOverview,
  CampaignReport,
  DashboardSummary,
  DateRange,
} from "../types/fockis-mail.types";

import { call } from "./httpClient";
import { ENDPOINTS } from "./endpoints";

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

export function rangeToDays(range: DateRange): number {
  switch (range.preset) {
    case "today":
      return 1;

    case "7d":
      return 7;

    case "30d":
      return 30;

    case "90d":
      return 90;

    case "custom": {
      if (!range.from || !range.to) {
        return 30;
      }

      const from = new Date(range.from).getTime();
      const to = new Date(range.to).getTime();

      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return 30;
      }

      const days =
        Math.round(
          (to - from) / 86400000,
        ) + 1;

      return Math.min(
        Math.max(days, 1),
        365,
      );
    }

    default:
      return 30;
  }
}

function rangeQuery(range: DateRange) {
  return {
    range: range.preset,
    from: range.from,
    to: range.to,
  };
}

/* -------------------------------------------------------------------------- */
/* Fallbacks                                                                  */
/*                                                                            */
/* These fallbacks intentionally do NOT contain demo/mock data.               */
/* If the backend is unavailable, the request fails instead of displaying     */
/* fake Mailchimp values.                                                     */
/* -------------------------------------------------------------------------- */

function backendRequired<T>(): T {
  throw new Error(
    "Fockis Mail analytics backend is unavailable.",
  );
}

/* -------------------------------------------------------------------------- */
/* Analytics API                                                              */
/* -------------------------------------------------------------------------- */

export const analyticsApi = {
  /**
   * Dashboard analytics.
   *
   * Backend:
   * GET /fockis-mail/analytics
   */
  dashboard: (
    range: DateRange,
  ) =>
    call<DashboardSummary>(
      () =>
        backendRequired<DashboardSummary>(),
      ENDPOINTS.dashboard,
      {
        query: rangeQuery(range),
      },
    ),

  /**
   * Analytics overview.
   *
   * Backend:
   * GET /fockis-mail/analytics
   */
  overview: (
    range: DateRange,
  ) =>
    call<AnalyticsOverview>(
      () =>
        backendRequired<AnalyticsOverview>(),
      ENDPOINTS.analytics,
      {
        query: rangeQuery(range),
      },
    ),

  /**
   * Detailed campaign analytics.
   *
   * Backend:
   * GET /fockis-mail/analytics/campaigns/:id
   */
  report: (
    campaignId: string,
  ) =>
    call<CampaignReport>(
      () =>
        backendRequired<CampaignReport>(),
      ENDPOINTS.campaignReport(
        campaignId,
      ),
    ),

  /**
   * List A/B tests.
   *
   * Backend:
   * GET /fockis-mail/analytics/ab-tests
   */
  abTests: () =>
    call<ABTest[]>(
      () =>
        backendRequired<ABTest[]>(),
      ENDPOINTS.abTests,
    ),

  /**
   * Create A/B test.
   *
   * Backend:
   * POST /fockis-mail/analytics/ab-tests
   */
  createAbTest: (
    test: Omit<
      ABTest,
      "id" | "status" | "businessId"
    >,
  ) =>
    call<ABTest>(
      () =>
        backendRequired<ABTest>(),
      ENDPOINTS.abTests,
      {
        method: "POST",
        body: test,
      },
    ),

  /**
   * Update A/B test.
   *
   * Backend:
   * PATCH /fockis-mail/analytics/ab-tests/:id
   */
  updateAbTest: (
    id: string,
    test: Partial<ABTest>,
  ) =>
    call<ABTest>(
      () =>
        backendRequired<ABTest>(),
      ENDPOINTS.abTest(id),
      {
        method: "PATCH",
        body: test,
      },
    ),

  /**
   * Delete A/B test.
   *
   * Backend:
   * DELETE /fockis-mail/analytics/ab-tests/:id
   */
  deleteAbTest: (
    id: string,
  ) =>
    call<{ success: boolean }>(
      () =>
        backendRequired<{
          success: boolean;
        }>(),
      ENDPOINTS.abTest(id),
      {
        method: "DELETE",
      },
    ),
};