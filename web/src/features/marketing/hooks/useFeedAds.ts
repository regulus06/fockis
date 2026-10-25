import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getFeedAds,
  trackAdEvent,
} from "../services/marketingApi";

import type {
  DeliveredFeedAd,
  FeedAdEventType,
} from "../types/marketingTypes";

import { AD_CONFIG } from "../utils/adFrequency";

/* ============================================================================
CONFIGURATION
============================================================================ */

const FEED_ADS_CACHE_TTL = 30_000;

/* ============================================================================
SHARED AD CACHE

Shares requests between mounted feed components and briefly caches results.

The backend remains responsible for advertisement eligibility.
============================================================================ */

interface FeedAdsCacheEntry {
  ads: DeliveredFeedAd[];
  cachedAt: number;
  limit: number;
}

let feedAdsCache: FeedAdsCacheEntry | null = null;

let feedAdsRequest:
  | {
      limit: number;
      promise: Promise<DeliveredFeedAd[]>;
    }
  | null = null;

/**
 * Clear the cached ads after a relevant campaign or delivery change.
 */
export function invalidateFeedAdsCache(): void {
  feedAdsCache = null;
}

/**
 * Fetch eligible advertisements, sharing concurrent requests.
 */
async function loadFeedAds(
  limit: number,
): Promise<DeliveredFeedAd[]> {
  const now = Date.now();

  if (
    feedAdsCache &&
    feedAdsCache.limit === limit &&
    now - feedAdsCache.cachedAt < FEED_ADS_CACHE_TTL
  ) {
    return feedAdsCache.ads;
  }

  if (
    feedAdsRequest &&
    feedAdsRequest.limit === limit
  ) {
    return feedAdsRequest.promise;
  }

  const promise = getFeedAds("FEED", limit)
    .then((result) => {
      const safeAds = Array.isArray(result)
        ? result.filter(
            (ad): ad is DeliveredFeedAd => Boolean(ad),
          )
        : [];

      feedAdsCache = {
        ads: safeAds,
        cachedAt: Date.now(),
        limit,
      };

      return safeAds;
    })
    .finally(() => {
      if (feedAdsRequest?.promise === promise) {
        feedAdsRequest = null;
      }
    });

  feedAdsRequest = {
    limit,
    promise,
  };

  return promise;
}

/* ============================================================================
HOOK
============================================================================ */

export function useFeedAds() {
  const [ads, setAds] = useState<DeliveredFeedAd[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionIdRef = useRef<string>(
    `sess_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`,
  );

  const trackedRef = useRef<Set<string>>(new Set());

  const lastCampaignIdRef = useRef<string | null>(null);

  /* ==========================================================================
  LOAD FEED ADS
  ========================================================================== */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        console.log(
          "[FOCKIS FEED ADS] Loading FEED advertisements...",
        );

        const safeAds = await loadFeedAds(
          AD_CONFIG.maxAdsPerSession,
        );

        if (cancelled) {
          return;
        }

        console.log(
          "[FOCKIS FEED ADS] Delivery response:",
          {
            requestedPlacement: "FEED",
            requestedLimit: AD_CONFIG.maxAdsPerSession,
            returnedAds: safeAds.length,
            ads: safeAds,
          },
        );

        setAds(safeAds);
      } catch (error) {
        console.error(
          "[FOCKIS FEED ADS] Load error:",
          error,
        );

        if (!cancelled) {
          setAds([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================================
  SELECT AN ADVERTISEMENT FOR A FEED SLOT
  ========================================================================== */

  const getAdForSlot = useCallback(
    (slotIndex: number): DeliveredFeedAd | null => {
      if (ads.length === 0) {
        return null;
      }

      const safeSlotIndex = Math.max(
        0,
        Math.floor(Number(slotIndex) || 0),
      );

      let candidate =
        ads[safeSlotIndex % ads.length];

      if (!candidate) {
        return null;
      }

      let attempts = 0;

      while (
        ads.length > 1 &&
        candidate.campaignId ===
          lastCampaignIdRef.current &&
        attempts < ads.length
      ) {
        attempts += 1;

        candidate =
          ads[
            (safeSlotIndex + attempts) % ads.length
          ];
      }

      if (!candidate) {
        return null;
      }

      lastCampaignIdRef.current =
        candidate.campaignId;

      console.log(
        "[FOCKIS FEED ADS] Ad selected:",
        {
          slotIndex: safeSlotIndex,
          adId: candidate.id,
          campaignId: candidate.campaignId,
          placement: candidate.placement,
          headline: candidate.headline,
        },
      );

      return candidate;
    },
    [ads],
  );

  /* ==========================================================================
  TRACK AD EVENTS
  ========================================================================== */

  const track = useCallback(
    (
      ad: DeliveredFeedAd,
      type: FeedAdEventType,
    ) => {
      if (!ad?.id || !ad?.campaignId) {
        console.warn(
          "[FOCKIS FEED ADS] Cannot track event because ad data is incomplete:",
          ad,
        );

        return;
      }

      const key = `${ad.id}:${type}`;

      if (trackedRef.current.has(key)) {
        return;
      }

      // Prevent duplicate simultaneous requests for this event in this hook.
      trackedRef.current.add(key);

      console.log(
        "[FOCKIS FEED ADS] Tracking event:",
        {
          adId: ad.id,
          campaignId: ad.campaignId,
          type,
          placement: ad.placement,
          sessionId: sessionIdRef.current,
        },
      );

      void trackAdEvent({
        adId: ad.id,
        campaignId: ad.campaignId,
        type,
        placement: ad.placement,
        sessionId: sessionIdRef.current,
      }).catch((error) => {
        // Allow a later attempt if the request failed.
        trackedRef.current.delete(key);

        console.error(
          "[FOCKIS FEED ADS] Event tracking error:",
          error,
        );
      });
    },
    [],
  );

  /* ==========================================================================
  RETURN
  ========================================================================== */

  return {
    ads,
    loading,
    getAdForSlot,
    track,
  };
}

export default useFeedAds;