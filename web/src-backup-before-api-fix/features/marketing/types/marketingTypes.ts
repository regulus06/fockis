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
   CAMPAIGN PLACEMENT

   IMPORTANT:
   These values must match the NestJS backend DTO exactly.
============================================================================ */

export type CampaignPlacement =
  | "FEED"
  | "FEED_RAIL"
  | "STORY"
  | "MARKETPLACE_BANNER"
  | "PRODUCT"
  | "STORE"
  | "REAL_ESTATE"
  | "PROFILE";


/* ============================================================================
   AD PLACEMENT

   Advertisement delivery supports all campaign placements plus the
   special video-end placement.
============================================================================ */

export type AdPlacement =
  | CampaignPlacement
  | "FEED_VIDEO_END";


/* ============================================================================
   AD EVENT TYPES
============================================================================ */

export type AdEventType =
  | "IMPRESSION"
  | "CLICK"
  | "VIEW"
  | "CONVERSION"
  | "LIKE"
  | "SHARE"
  | "SAVE";


/* ============================================================================
   CONVERSION TYPES
============================================================================ */

export type ConversionType =
  | "PURCHASE"
  | "SIGNUP"
  | "LEAD"
  | "INSTALL"
  | "OTHER";


/* ============================================================================
   CAMPAIGN OBJECTIVES
============================================================================ */

export type CampaignObjective =
  | "AWARENESS"
  | "TRAFFIC"
  | "ENGAGEMENT"
  | "CONVERSIONS"
  | "APP_INSTALLS";


/* ============================================================================
   ADVERTISEMENT TYPES
============================================================================ */

export type AdvertisementType =
  | "IMAGE"
  | "VIDEO"
  | "CAROUSEL";


/* ============================================================================
   ADVERTISEMENT DESTINATION TYPES
============================================================================ */

export type AdvertisementDestinationType =
  | "APP"
  | "PRODUCT"
  | "STORE"
  | "WEBSITE"
  | "PROFILE"
  | "POST";


/* ============================================================================
   TARGETING
============================================================================ */

export interface Targeting {
  ageMin?: number;

  ageMax?: number;

  genders?: string[];

  countries?: string[];

  states?: string[];

  cities?: string[];

  interests?: string[];

  categories?: string[];

  behaviors?: string[];

  devices?: string[];

  operatingSystems?: string[];

  [key: string]: unknown;
}


/* ============================================================================
   TARGETING DTO
============================================================================ */

export interface TargetingDto {
  ageMin?: number;

  ageMax?: number;

  genders?: string[];

  countries?: string[];

  states?: string[];

  cities?: string[];

  interests?: string[];

  categories?: string[];

  behaviors?: string[];

  devices?: string[];

  operatingSystems?: string[];
}


/* ============================================================================
   CAMPAIGN
============================================================================ */

export interface Campaign {
  _id?: string;

  id?: string;

  name: string;

  description?: string;

  status?: CampaignStatus;

  isActive?: boolean;

  objective?: CampaignObjective | string;


  /* ==========================================================================
     CAMPAIGN PLACEMENTS
  ========================================================================== */

  placements?: CampaignPlacement[];


  /* ==========================================================================
     APP INSTALLATION CAMPAIGN
  ========================================================================== */

  appName?: string;

  appStoreUrl?: string;

  googlePlayUrl?: string;


  /* ==========================================================================
     BUDGET
  ========================================================================== */

  budget?: number;

  dailyBudget?: number;

  totalBudget?: number;

  spent?: number;

  spend?: number;


  /* ==========================================================================
     SCHEDULE
  ========================================================================== */

  startDate?: string;

  endDate?: string;


  /* ==========================================================================
     ANALYTICS
  ========================================================================== */

  impressions?: number;

  clicks?: number;

  conversions?: number;

  revenue?: number;

  ctr?: number;

  conversionRate?: number;

  roi?: number;


  /* ==========================================================================
     TARGETING
  ========================================================================== */

  targeting?: Targeting;


  /* ==========================================================================
     TIMESTAMPS
  ========================================================================== */

  createdAt?: string;

  updatedAt?: string;


  /* ==========================================================================
     BACKEND EXTENSIONS
  ========================================================================== */

  [key: string]: unknown;
}


/* ============================================================================
   ADVERTISEMENT
============================================================================ */

export interface Advertisement {
  _id?: string;

  id?: string;

  campaignId: string;


  /* ==========================================================================
     BASIC AD INFORMATION
  ========================================================================== */

  name?: string;

  title?: string;

  headline?: string;

  description?: string;


  /* ==========================================================================
     MEDIA
  ========================================================================== */

  imageUrl?: string;

  videoUrl?: string;

  mediaUrl?: string;

  thumbnailUrl?: string;

  appIconUrl?: string;


  /* ==========================================================================
     DESTINATION
  ========================================================================== */

  destinationUrl?: string;

  destinationType?: AdvertisementDestinationType;

  callToAction?: string;


  /* ==========================================================================
     PLACEMENTS

     Backend may return a single placement for a delivered ad, while the
     advertisement record itself can support multiple placements.
  ========================================================================== */

  placements?: AdPlacement[];

  placement?: AdPlacement;


  /* ==========================================================================
     AD TYPE
  ========================================================================== */

  type?: AdvertisementType;


  /* ==========================================================================
     STATUS
  ========================================================================== */

  status?: AdvertisementStatus;

  isActive?: boolean;


  /* ==========================================================================
     RANKING
  ========================================================================== */

  rankingScore?: number;

  qualityScore?: number;

  relevanceScore?: number;


  /* ==========================================================================
     TIMESTAMPS
  ========================================================================== */

  createdAt?: string;

  updatedAt?: string;


  /* ==========================================================================
     BACKEND EXTENSIONS
  ========================================================================== */

  [key: string]: unknown;
}


/* ============================================================================
   CREATE CAMPAIGN
============================================================================ */

export interface CreateCampaignPayload {
  name: string;

  description?: string;


  /* ==========================================================================
     OBJECTIVE
  ========================================================================== */

  objective?: CampaignObjective | string;


  /* ==========================================================================
     PLACEMENTS

     Example:

       placements: ["FEED"]

     or:

       placements: [
         "FEED",
         "STORY",
         "MARKETPLACE_BANNER"
       ]
  ========================================================================== */

  placements?: CampaignPlacement[];


  /* ==========================================================================
     APP INSTALLATION DETAILS
  ========================================================================== */

  appName?: string;

  appStoreUrl?: string;

  googlePlayUrl?: string;


  /* ==========================================================================
     BUDGET
  ========================================================================== */

  budget?: number;

  dailyBudget?: number;

  totalBudget?: number;


  /* ==========================================================================
     SCHEDULE
  ========================================================================== */

  startDate?: string;

  endDate?: string;


  /* ==========================================================================
     TARGETING
  ========================================================================== */

  targeting?: TargetingDto;
}


/* ============================================================================
   UPDATE CAMPAIGN
============================================================================ */

export interface UpdateCampaignPayload
  extends Partial<CreateCampaignPayload> {}


/* ============================================================================
   CREATE AD

   IMPORTANT:
   The backend requires:

       placements: ["FEED"]

   NOT:

       placement: "FEED"

============================================================================ */

export interface CreateAdPayload {
  campaignId: string;


  /* ==========================================================================
     BASIC INFORMATION
  ========================================================================== */

  name?: string;

  title?: string;

  headline?: string;

  description?: string;


  /* ==========================================================================
     MEDIA
  ========================================================================== */

  imageUrl?: string;

  videoUrl?: string;

  mediaUrl?: string;

  thumbnailUrl?: string;

  appIconUrl?: string;


  /* ==========================================================================
     DESTINATION
  ========================================================================== */

  destinationUrl?: string;

  destinationType?: AdvertisementDestinationType;

  callToAction?: string;


  /* ==========================================================================
     AD TYPE
  ========================================================================== */

  type?: AdvertisementType;


  /* ==========================================================================
     PLACEMENTS

     THIS IS THE IMPORTANT FIX.

     The backend expects an ARRAY.
  ========================================================================== */

  placements?: AdPlacement[];
}


/* ============================================================================
   UPDATE AD
============================================================================ */

export interface UpdateAdPayload
  extends Partial<CreateAdPayload> {}


/* ============================================================================
   UPDATE BUDGET PAYLOAD
============================================================================ */

export interface UpdateBudgetPayload {
  budget?: number;

  dailyBudget?: number;

  totalBudget?: number;
}


/* ============================================================================
   BUDGET
============================================================================ */

export interface Budget {
  campaignId?: string;

  dailyBudget: number;

  totalBudget: number;

  budget?: number;

  spent?: number;

  spend?: number;

  remaining?: number;

  currency?: string;

  createdAt?: string;

  updatedAt?: string;

  [key: string]: unknown;
}


/* ============================================================================
   ANALYTICS OVERVIEW
============================================================================ */

export interface AnalyticsOverview {
  impressions: number;

  clicks: number;

  conversions: number;

  spend: number;

  revenue: number;

  ctr: number;

  conversionRate: number;

  roi: number;

  [key: string]: unknown;
}


/* ============================================================================
   CAMPAIGN ANALYTICS
============================================================================ */

export interface CampaignAnalytics
  extends AnalyticsOverview {
  campaignId?: string;

  campaignName?: string;
}


/* ============================================================================
   CAMPAIGN SUMMARY
============================================================================ */

export interface CampaignSummary {
  campaignId?: string;

  campaignName?: string;

  impressions: number;

  clicks: number;

  conversions: number;

  spend: number;

  revenue: number;

  ctr: number;

  conversionRate: number;

  roi: number;

  [key: string]: unknown;
}


/* ============================================================================
   MARKETING DASHBOARD
============================================================================ */

export interface MarketingDashboardData {
  analytics: AnalyticsOverview;

  campaigns: Campaign[];

  ads: Advertisement[];
}


/* ============================================================================
   MARKETING EVENT
============================================================================ */

export interface MarketingEvent {
  _id?: string;

  id?: string;

  adId?: string;

  campaignId?: string;

  userId?: string;

  type?: AdEventType;

  sessionId?: string;

  placement?: string;

  source?: string;

  deviceType?: string;

  country?: string;

  state?: string;

  city?: string;

  cost?: number;

  revenue?: number;

  createdAt?: string;
}


/* ============================================================================
   CAMPAIGN ANALYTICS RESPONSE
============================================================================ */

export interface CampaignAnalyticsResponse {
  analytics?: CampaignAnalytics;

  summary?: CampaignSummary;

  events?: MarketingEvent[];

  [key: string]: unknown;
}


/* ============================================================================
   EXTENDED AD PLACEMENT
============================================================================ */

export type ExtendedAdPlacement =
  | AdPlacement;


/* ============================================================================
   FEED AD DELIVERY
============================================================================ */

export interface DeliveredFeedAd {
  id: string;

  campaignId: string;


  /* ==========================================================================
     DELIVERY
  ========================================================================== */

  type: AdvertisementType;

  placement: ExtendedAdPlacement;

  destinationType: AdvertisementDestinationType;


  /* ==========================================================================
     CONTENT
  ========================================================================== */

  headline: string;

  description?: string;


  /* ==========================================================================
     MEDIA
  ========================================================================== */

  mediaUrl?: string;

  thumbnailUrl?: string;

  appIconUrl?: string;


  /* ==========================================================================
     DESTINATION
  ========================================================================== */

  destinationUrl?: string;

  callToAction?: string;


  /* ==========================================================================
     ADVERTISER
  ========================================================================== */

  advertiser: {
    id: string;

    name: string;

    avatar?: string;
  };


  /* ==========================================================================
     APP INSTALLATION
  ========================================================================== */

  appName?: string;

  appStoreUrl?: string;

  googlePlayUrl?: string;
}


/* ============================================================================
   FEED AD EVENT TYPES
============================================================================ */

export type FeedAdEventType =
  | "IMPRESSION"
  | "CLICK"
  | "VIDEO_VIEW"
  | "VIDEO_COMPLETE";


/* ============================================================================
   END
============================================================================ */