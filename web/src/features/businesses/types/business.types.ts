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
   * Normalized frontend ID.
   *
   * NestJS converts:
   *
   * business._id
   *
   * into:
   *
   * id
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

  /*
   * Branding.
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
   * Publishing/status.
   *
   * Examples:
   *
   * DRAFT
   * PENDING_REVIEW
   * ACTIVE
   */
  status: string;

  /*
   * Feed/spotlight configuration.
   */

  /*
   * Whether this business has been published
   * to the public Fockis Feed.
   *
   * Set via:
   *
   * POST /businesses/:id/publish
   * DELETE /businesses/:id/publish
   */
  feedEnabled: boolean;

  spotlightEnabled: boolean;

  spotlightPriority: number;

  /*
   * Analytics.
   */
  views: number;

  websiteClicks: number;

  /*
   * Verification.
   */
  verified: boolean;

  /*
   * Frontend compatibility.
   */
  isVerified?: boolean;

  /*
   * Public business deals.
   */
  deals: BusinessDeal[];

  /*
   * Mongoose timestamps.
   */
  createdAt: string;

  updatedAt: string;
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

export interface BusinessCoverUploadResponse {
  success: boolean;

  business: {
    id: string;

    _id?: string;

    coverImageUrl?: string;

    coverImageSource?: BusinessImageSource;
  };
}


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
  | "REJECTED"
  | "SUSPENDED";