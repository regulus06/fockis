import type { DateRange } from "../types/fockis-mail.types";
import { analyticsApi } from "../services/analyticsApi";
import { useAsync } from "./useAsync";

export function useDashboard(range: DateRange) {
  return useAsync(
    () => analyticsApi.dashboard(range),
    [range.preset, range.from, range.to],
  );
}

export function useAnalyticsOverview(range: DateRange) {
  return useAsync(
    () => analyticsApi.overview(range),
    [range.preset, range.from, range.to],
  );
}

export function useCampaignReport(
  campaignId: string | undefined,
) {
  return useAsync(
    () =>
      campaignId
        ? analyticsApi.report(campaignId)
        : Promise.reject(
            new Error(
              "Pick a sent campaign to see its report.",
            ),
          ),
    [campaignId],
  );
}