/* ============================================================================
   FOCKIS MARKETING TYPES
============================================================================ */


/* ============================================================================
   CAMPAIGN STATUS
============================================================================ */

export type CampaignStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";


/* ============================================================================
   ADVERTISEMENT STATUS
============================================================================ */

export type AdvertisementStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "REJECTED"
  | "COMPLETED";


/* ============================================================================
   CAMPAIGN OBJECTIVE
============================================================================ */

export type CampaignObjective =
  | "APP_INSTALL"
  | "PRODUCT_SALES"
  | "WEBSITE_TRAFFIC"
  | "ENGAGEMENT"
  | "BRAND_AWARENESS";


/* ============================================================================
   CAMPAIGN AD FORMAT
============================================================================ */

export type CampaignAdFormat =
  | "VIDEO"
  | "IMAGE"
  | "CAROUSEL";


/* ============================================================================
   CAMPAIGN PLACEMENT
============================================================================ */

export type CampaignPlacement =
  | "FEED"
  | "FEED_RAIL"
  | "STORY"
  | "MARKETPLACE_BANNER"
  | "PRODUCT"
  | "STORE"
  | "REAL_ESTATE"
  | "PROFILE"
  | "FEED_VIDEO_END";


/* ============================================================================
   ADVERTISEMENT PLACEMENT
============================================================================ */

export type AdvertisementPlacement =
  | "FEED"
  | "FEED_RAIL"
  | "STORY"
  | "MARKETPLACE_BANNER"
  | "PRODUCT"
  | "STORE"
  | "REAL_ESTATE"
  | "PROFILE"
  | "FEED_VIDEO_END";


/* ============================================================================
   DESTINATION
============================================================================ */

export type AdvertisementDestination =
  | "APP"
  | "PRODUCT"
  | "STORE"
  | "WEBSITE"
  | "PROFILE"
  | "POST";


/* ============================================================================
   ADVERTISEMENT TYPE
============================================================================ */

export type AdvertisementType =
  | "IMAGE"
  | "VIDEO"
  | "CAROUSEL";


/* ============================================================================
   DELIVERY USER
============================================================================ */

export interface MarketingDeliveryUser {
  id: string;

  age?: number;
  gender?: string;

  country?: string;
  state?: string;
  city?: string;

  interests?: string[];
  categories?: string[];
  behaviors?: string[];

  device?: string;
  operatingSystem?: string;
}


/* ============================================================================
   DELIVERED FEED AD
============================================================================ */

export interface DeliveredFeedAd {
  id: string;

  campaignId: string;

  name: string;

  type: AdvertisementType;

  headline: string;

  description?: string;

  mediaUrl?: string;

  thumbnailUrl?: string;

  appIconUrl?: string;

  destinationType: AdvertisementDestination;

  destinationUrl?: string;

  destinationId?: string;

  placements: AdvertisementPlacement[];

  callToAction?: string;

  advertiserId?: string;

  rankingScore?: number;

  qualityScore?: number;

  relevanceScore?: number;

  deliveryScore?: number;

  /* ============================================================
     SCHEDULE INFORMATION
  ============================================================ */

  campaignStartDate?: string;

  campaignEndDate?: string;

  adStartDate?: string;

  adEndDate?: string;

  isExpired?: boolean;
}