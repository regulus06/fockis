import { FOCKIS_API_URL } from "../../../config/fockisConfig";

/* ============================================================================
   FOCKIS VIDEO ADS API

   Frontend API client for:

   GET  /marketing/video-ads/next
   POST /marketing/video-ads/event

   The backend MarketingService returns the raw video-ad campaign data.
   This client normalizes that response into the VideoOverlayAd contract
   used by VideoOverlayAd.tsx.
============================================================================ */

const API_URL =
  (
    import.meta.env.VITE_API_URL ||
    FOCKIS_API_URL
  ).replace(/\/+$/, "");

/* ============================================================================
   AUTH
============================================================================ */

function getToken(): string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const keys = [
    "token",
    "access_token",
    "accessToken",
    "jwt",
  ];

  for (const key of keys) {
    const value =
      window.localStorage.getItem(
        key,
      );

    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

/* ============================================================================
   FRONTEND VIDEO AD TYPE
============================================================================ */

export interface VideoOverlayAd {
  id: string;

  name: string;

  type: "VIDEO";

  headline: string;

  description?: string | null;

  mediaUrl: string | null;

  thumbnailUrl?: string | null;

  destinationType: string;

  destinationUrl?: string | null;

  callToAction?: string | null;

  placement: string;
}

/* ============================================================================
   BACKEND RESPONSE TYPE
============================================================================ */

interface BackendVideoAd {
  id?: string;

  campaignId?: string;

  videoId?: string | null;

  campaignName?: string | null;

  name?: string | null;

  objective?: string | null;

  status?: string | null;

  headline?: string | null;

  description?: string | null;

  destinationUrl?: string | null;

  destinationType?: string | null;

  callToAction?: string | null;

  imageUrl?: string | null;

  videoUrl?: string | null;

  mediaUrl?: string | null;

  thumbnailUrl?: string | null;

  placement?: string | null;

  type?: string | null;
}

interface BackendVideoAdResponse {
  available?: boolean;

  ad?: BackendVideoAd | null;
}

/* ============================================================================
   MEDIA URL NORMALIZATION
============================================================================ */

function normalizeMediaUrl(
  value:
    | string
    | null
    | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const clean =
    value.trim();

  if (
    !clean ||
    clean === "undefined" ||
    clean === "null"
  ) {
    return null;
  }

  if (
    clean.startsWith(
      "http://",
    ) ||
    clean.startsWith(
      "https://",
    ) ||
    clean.startsWith(
      "blob:",
    ) ||
    clean.startsWith(
      "data:",
    )
  ) {
    return clean;
  }

  if (
    clean.startsWith(
      "/uploads/",
    ) ||
    clean.startsWith(
      "/media/",
    )
  ) {
    return `${API_URL}${clean}`;
  }

  if (
    clean.startsWith(
      "uploads/",
    ) ||
    clean.startsWith(
      "media/",
    )
  ) {
    return `${API_URL}/${clean}`;
  }

  return `${API_URL}/uploads/${clean}`;
}

/* ============================================================================
   NORMALIZE BACKEND AD
============================================================================ */

function normalizeVideoAd(
  raw: BackendVideoAd,
): VideoOverlayAd | null {
  const id =
    raw.id ||
    raw.campaignId;

  if (!id) {
    console.warn(
      "[Fockis Video Ads] Backend video ad has no ID.",
      raw,
    );

    return null;
  }

  const mediaUrl =
    normalizeMediaUrl(
      raw.mediaUrl ||
        raw.videoUrl ||
        raw.imageUrl,
    );

  /*
   * VideoOverlayAd requires media.
   */
  if (!mediaUrl) {
    console.warn(
      "[Fockis Video Ads] Video ad has no media URL.",
      raw,
    );

    return null;
  }

  const headline =
    raw.headline?.trim() ||
    "Sponsored";

  return {
    id,

    name:
      raw.name ||
      raw.campaignName ||
      "Sponsored",

    type:
      "VIDEO",

    headline,

    description:
      raw.description ??
      null,

    mediaUrl,

    thumbnailUrl:
      normalizeMediaUrl(
        raw.thumbnailUrl,
      ),

    destinationType:
      raw.destinationType ||
      "URL",

    destinationUrl:
      raw.destinationUrl ??
      null,

    callToAction:
      raw.callToAction ||
      "Learn More",

    placement:
      raw.placement ||
      "VIDEO_OVERLAY",
  };
}

/* ============================================================================
   GET NEXT VIDEO AD
============================================================================ */

export async function getNextVideoAd(
  videoId?: string,
): Promise<VideoOverlayAd | null> {
  const token =
    getToken();

  const query =
    videoId?.trim()
      ? `?videoId=${encodeURIComponent(
          videoId.trim(),
        )}`
      : "";

  const response =
    await fetch(
      `${API_URL}/marketing/video-ads/next${query}`,
      {
        method: "GET",

        headers: {
          Accept:
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
    throw new Error(
      `Failed to load video advertisement (${response.status}).`,
    );
  }

  const data =
    (await response.json()) as
      BackendVideoAdResponse;

  if (
    data?.available === false ||
    !data?.ad
  ) {
    return null;
  }

  return normalizeVideoAd(
    data.ad,
  );
}

/* ============================================================================
   TRACK VIDEO AD EVENT
============================================================================ */

export async function trackVideoAdEvent(
  adId: string,
  event:
    | "IMPRESSION"
    | "CLICK"
    | "CLOSE"
    | "SKIP",
  videoId?: string,
): Promise<void> {
  const token =
    getToken();

  if (!adId?.trim()) {
    return;
  }

  try {
    const response =
      await fetch(
        `${API_URL}/marketing/video-ads/event`,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body: JSON.stringify({
            adId:
              adId.trim(),

            event,

            videoId:
              videoId?.trim() ||
              undefined,
          }),
        },
      );

    if (!response.ok) {
      console.warn(
        `[Fockis Video Ads] Failed to track ${event} event (${response.status}).`,
      );
    }
  } catch (error) {
    /*
     * Tracking failures should NOT break video playback.
     */
    console.warn(
      `[Fockis Video Ads] Failed to track ${event} event:`,
      error,
    );
  }
}