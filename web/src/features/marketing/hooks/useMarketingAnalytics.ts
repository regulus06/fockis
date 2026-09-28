import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAnalyticsOverview,
  getCampaignAnalytics,
} from "../services/marketingAnalyticsApi";

import type {
  AnalyticsOverview,
  CampaignAnalytics,
} from "../types/marketingTypes";

export function useMarketingAnalytics(
  campaignId?: string,
) {
  const [
    overview,
    setOverview,
  ] =
    useState<AnalyticsOverview | null>(
      null,
    );

  const [
    campaign,
    setCampaign,
  ] =
    useState<CampaignAnalytics | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const load =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        if (campaignId) {
          const result =
            await getCampaignAnalytics(
              campaignId,
            );

          setCampaign(result);
        } else {
          const result =
            await getAnalyticsOverview();

          setOverview(result);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load analytics.",
        );
      } finally {
        setLoading(false);
      }
    }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    overview,
    campaign,
    loading,
    error,
    reload: load,
  };
}