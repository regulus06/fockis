/* ============================================================================
   FOCKIS BUSINESS TYPES
============================================================================ */

export type BusinessCategory =
  | "AUTOMOTIVE"
  | "RESTAURANT"
  | "REAL_ESTATE"
  | "RETAIL"
  | "BEAUTY"
  | "HEALTH"
  | "FITNESS"
  | "TECHNOLOGY"
  | "PROFESSIONAL_SERVICES"
  | "HOME_SERVICES"
  | "ENTERTAINMENT"
  | "TRAVEL"
  | "EDUCATION"
  | "FINANCE"
  | "OTHER";


/* ============================================================================
   BUSINESS IMAGE SOURCE
============================================================================ */

export type BusinessImageSource =
  | "URL"
  | "UPLOAD";


/* ============================================================================
   BUSINESS CARD DESTINATIONS
============================================================================ */

/*
 * Which destination button is emphasised on business cards.
 * Both buttons are shown whenever both destinations are configured.
 */
export type BusinessPrimaryAction =
  | "WEBSITE"
  | "STORE";


/*
 * Public summary of the connected Fockis Shop store, returned by the
 * businesses API. null when the store is unavailable.
 */
export interface BusinessStoreSummary {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  verified: boolean;
}


/* ============================================================================
   BUSINESS DETAILS
============================================================================ */

export type BusinessSize =
  | "SOLO"
  | "SMALL"
  | "MEDIUM"
  | "LARGE"
  | "ENTERPRISE";


/*
 * day: 0 = Sunday ... 6 = Saturday. Times are "HH:mm" (24h).
 */
export interface BusinessHoursEntry {
  day: number;
  open?: string;
  close?: string;
  closed: boolean;
}


/* ============================================================================
   BUSINESS SOCIAL LINKS
============================================================================ */

export interface BusinessSocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
}


/* ============================================================================
   BUSINESS DEAL
============================================================================ */

export interface BusinessDeal {
  /*
   * Normalized frontend ID.
   */
  id: string;

  /*
   * Raw MongoDB ID.
   */
  _id?: string;

  /*
   * Parent business.
   */
  businessId: string;

  /*
   * Deal information.
   */
  title: string;

  description?: string;

  discount?: string;

  couponCode?: string;

  /*
   * ISO date string from NestJS.
   */
  expiresAt: string;

  /*
   * Backend field.
   */
  active: boolean;

  /*
   * Frontend compatibility.
   */
  isActive?: boolean;

  /*
   * Optional deal image if supported
   * by a future backend version.
   */
  imageUrl?: string;

  /*
   * Analytics.
   */
  clicks?: number;

  /*
   * Mongoose timestamps.
   */
  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================================
   BUSINESS
============================================================================ */

export interface Business {
  /*
   * Normalized frontend ID (business._id).
   */
  id: string;

  /*
   * Raw MongoDB ID.
   */
  _id?: string;

  /*
   * Owner.
   */
  ownerId: string;

  /*
   * Business information.
   */
  name: string;

  description?: string;

  category: BusinessCategory;

  tagline?: string;

  foundedYear?: number;

  businessSize?: BusinessSize;

  /*
   * Branding (absolute, display-ready URLs).
   */
  logoUrl?: string;

  logoSource?: BusinessImageSource;

  coverImageUrl?: string;

  coverImageSource?: BusinessImageSource;

  /*
   * Contact.
   */
  websiteUrl?: string;

  phone?: string;

  email?: string;

  /*
   * Fockis Shop connection and business card destinations.
   */
  storeId?: string;

  store?: BusinessStoreSummary | null;

  primaryAction?: BusinessPrimaryAction;

  /*
   * Address.
   */
  address?: string;

  city?: string;

  state?: string;

  zipCode?: string;

  /*
   * Backwards compatibility.
   */
  postalCode?: string;

  country?: string;

  /*
   * Coordinates.
   */
  latitude?: number;

  longitude?: number;

  /*
   * Opening hours.
   */
  hours?: BusinessHoursEntry[];

  byAppointmentOnly?: boolean;

  timeZone?: string;

  /*
   * Direct social URL compatibility.
   */
  facebookUrl?: string;

  instagramUrl?: string;

  tiktokUrl?: string;

  youtubeUrl?: string;

  linkedinUrl?: string;

  /*
   * Backend socialLinks object.
   */
  socialLinks?: BusinessSocialLinks;

  /*
   * Publishing/status (DRAFT, PENDING_REVIEW, ACTIVE, PAUSED, REJECTED).
   */
  status: string;

  /*
   * Whether this business has been published to the public Fockis Feed.
   *
   * Set via:
   *   POST /businesses/:id/publish
   *   DELETE /businesses/:id/publish
   */
  feedEnabled: boolean;

  spotlightEnabled: boolean;

  spotlightPriority: number;

  /*
   * Analytics.
   */
  views: number;

  websiteClicks: number;

  storeClicks: number;

  /*
   * Verification.
   */
  verified: boolean;

  /*
   * Frontend compatibility.
   */
  isVerified?: boolean;

  /*
   * Business deals. Public endpoints only return active, unexpired deals;
   * the owner endpoint (/businesses/mine) returns all of them.
   */
  deals: BusinessDeal[];

  /*
   * Mongoose timestamps.
   */
  createdAt: string;

  updatedAt: string;
}


/* ============================================================================
   CREATE / UPDATE INPUT

   Values sent to POST /businesses and PATCH /businesses/:id.
   For updates, "" or null clears an optional value.
============================================================================ */

export interface BusinessInput {
  name?: string;
  description?: string;
  category?: BusinessCategory;
  tagline?: string;
  foundedYear?: number | null;
  businessSize?: BusinessSize | "" | null;

  logoUrl?: string;
  coverImageUrl?: string;

  websiteUrl?: string;
  phone?: string;
  email?: string;

  storeId?: string | null;
  primaryAction?: BusinessPrimaryAction | "" | null;

  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;

  hours?: BusinessHoursEntry[];
  byAppointmentOnly?: boolean;
  timeZone?: string;

  socialLinks?: BusinessSocialLinks;

  spotlightEnabled?: boolean;
}


/* ============================================================================
   PUBLIC LIST QUERY
============================================================================ */

export type BusinessSort =
  | "featured"
  | "newest"
  | "name";

export interface BusinessListQuery {
  q?: string;
  category?: BusinessCategory;
  city?: string;
  sort?: BusinessSort;
  page?: number;
  limit?: number;
}


/* ============================================================================
   API RESPONSE TYPES
============================================================================ */

export type BusinessesResponse =
  Business[];


export type BusinessResponse =
  Business;


export type BusinessDealResponse =
  BusinessDeal;


/* ============================================================================
   BUSINESS UPLOAD RESPONSE
============================================================================ */

export interface BusinessImageUploadResponse {
  success: boolean;

  business: {
    id: string;

    logoUrl?: string;

    coverImageUrl?: string;
  };
}

/*
 * Kept for compatibility with existing imports.
 */
export type BusinessCoverUploadResponse =
  BusinessImageUploadResponse;


/* ============================================================================
   DELETE RESPONSE
============================================================================ */

export interface BusinessDeleteResponse {
  success: boolean;
}


/* ============================================================================
   BUSINESS STATUS
============================================================================ */

export type BusinessStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "REJECTED"
  | "SUSPENDED";
