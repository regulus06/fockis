import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getCampaigns,
} from "../services/campaignApi";

import type {
  Campaign,
} from "../types/marketingTypes";

export function useCampaigns() {
  const [
    campaigns,
    setCampaigns,
  ] = useState<Campaign[]>([]);

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

        const data =
          await getCampaigns();

        setCampaigns(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load campaigns.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    campaigns,
    loading,
    error,
    reload: load,
  };
}