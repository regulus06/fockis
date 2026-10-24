/* ============================================================================
   FOCKIS ADS — DATA HOOK

   Loads the advertiser's campaigns and creatives from the existing API:
     GET /marketing/campaigns
     GET /marketing/ads
   Creatives are optional: if that request fails the dashboard still shows
   campaigns and reports the creative error separately.
============================================================================ */

import { useCallback, useEffect, useRef, useState } from "react";

import { getCampaigns } from "../services/campaignApi";
import { getAds } from "../services/marketingApi";
import type { Advertisement } from "../types/marketingTypes";

import { normalizeCampaigns, type AdsCampaign } from "./adsModel";

export interface AdsData {
  campaigns: AdsCampaign[];
  rawById: Map<string, Record<string, unknown>>;
  ads: Advertisement[];
  loading: boolean;
  error: string | null;
  adsError: string | null;
  reload: () => Promise<void>;
}

function message(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    /* Nest returns JSON bodies; show their message when present. */
    try {
      const parsed = JSON.parse(error.message) as { message?: unknown };

      if (typeof parsed.message === "string") {
        return parsed.message;
      }

      if (Array.isArray(parsed.message)) {
        return parsed.message.join(" ");
      }
    } catch {
      /* not JSON */
    }

    return error.message;
  }

  return fallback;
}

export { message as adsErrorMessage };

export function useAdsData(): AdsData {
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
  const [rawById, setRawById] = useState(
    () => new Map<string, Record<string, unknown>>(),
  );
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adsError, setAdsError] = useState<string | null>(null);

  /* Ignore responses from superseded loads. */
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;

    setLoading(true);

    const [campaignResult, adsResult] = await Promise.allSettled([
      getCampaigns(),
      getAds(),
    ]);

    if (id !== requestId.current) {
      return;
    }

    if (campaignResult.status === "fulfilled") {
      const list = Array.isArray(campaignResult.value)
        ? campaignResult.value
        : [];

      const normalized = normalizeCampaigns(list);
      const map = new Map<string, Record<string, unknown>>();

      for (const item of list as unknown as Record<string, unknown>[]) {
        const key = item?._id ?? item?.id;

        if (key != null) {
          map.set(String(key), item);
        }
      }

      setCampaigns(normalized);
      setRawById(map);
      setError(null);
    } else {
      setError(message(campaignResult.reason, "Unable to load campaigns."));
    }

    if (adsResult.status === "fulfilled") {
      setAds(Array.isArray(adsResult.value) ? adsResult.value : []);
      setAdsError(null);
    } else {
      setAdsError(message(adsResult.reason, "Unable to load creatives."));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { campaigns, rawById, ads, loading, error, adsError, reload };
}
