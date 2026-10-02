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
   USE FEED ADS

   Loads eligible FEED advertisements from the marketing delivery endpoint.

   The backend remains responsible for deciding whether an advertisement is
   eligible for delivery.

   The frontend is responsible for:
   - caching the returned ads for this feed session
   - selecting an ad for each feed slot
   - preventing the same campaign from appearing consecutively
   - deduplicating event tracking
============================================================================ */

export function useFeedAds() {
  const [ads, setAds] = useState<DeliveredFeedAd[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionIdRef = useRef<string>(
    `sess_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`,
  );

  const trackedRef =
    useRef<Set<string>>(new Set());

  const lastCampaignIdRef =
    useRef<string | null>(null);

  /* ==========================================================================
     LOAD FEED ADS

     Request advertisements once when the feed mounts.
  ========================================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadFeedAds() {
      setLoading(true);

      try {
        console.log(
          "[FOCKIS FEED ADS] Loading FEED advertisements...",
        );

        const result = await getFeedAds(
          "FEED",
          AD_CONFIG.maxAdsPerSession,
        );

        if (cancelled) {
          return;
        }

        const safeAds = Array.isArray(result)
          ? result.filter(Boolean)
          : [];

        console.log(
          "[FOCKIS FEED ADS] Delivery response:",
          {
            requestedPlacement: "FEED",
            requestedLimit:
              AD_CONFIG.maxAdsPerSession,
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

    void loadFeedAds();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================================
     GET AD FOR SLOT

     Selects an advertisement from the delivered pool.

     We avoid consecutive advertisements from the same campaign whenever
     multiple campaigns are available.
  ========================================================================== */

  const getAdForSlot = useCallback(
    (
      slotIndex: number,
    ): DeliveredFeedAd | null => {
      if (ads.length === 0) {
        console.debug(
          "[FOCKIS FEED ADS] No delivered ads available for slot:",
          slotIndex,
        );

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

      /*
       * If there is more than one ad, avoid selecting the same campaign
       * consecutively.
       */
      while (
        ads.length > 1 &&
        candidate.campaignId ===
          lastCampaignIdRef.current &&
        attempts < ads.length
      ) {
        attempts += 1;

        candidate =
          ads[
            (safeSlotIndex + attempts) %
              ads.length
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
          campaignId:
            candidate.campaignId,
          placement:
            candidate.placement,
          headline:
            candidate.headline,
        },
      );

      return candidate;
    },
    [ads],
  );

  /* ==========================================================================
     TRACK EVENT

     Deduplicated per mounted feed session.

     An individual ad/event combination is only sent once.
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

      trackedRef.current.add(key);

      console.log(
        "[FOCKIS FEED ADS] Tracking event:",
        {
          adId: ad.id,
          campaignId:
            ad.campaignId,
          type,
          placement:
            ad.placement,
          sessionId:
            sessionIdRef.current,
        },
      );

      void trackAdEvent({
        adId: ad.id,
        campaignId: ad.campaignId,
        type,
        placement: ad.placement,
        sessionId:
          sessionIdRef.current,
      }).catch((error) => {
        console.error(
          "[FOCKIS FEED ADS] Event tracking error:",
          error,
        );
      });
    },
    [],
  );

  return {
    ads,
    loading,
    getAdForSlot,
    track,
  };
}