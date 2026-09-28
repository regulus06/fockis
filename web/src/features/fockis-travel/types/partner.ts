/**
 * ============================================================================
 * FOCKIS TRAVEL — PARTNER TYPES
 * ============================================================================
 *
 * Shared domain types for Fockis Travel partners.
 *
 * This file provides one stable public type location for:
 * - Partner profiles
 * - Partner creation/update
 * - Partner search
 * - Partner services
 * - Partner media
 * - Partner booking settings
 *
 * The canonical API types live in:
 * services/partnersApi.ts
 * ============================================================================
 */

import type {
  Partner,
  PartnerStatus,
  PartnerContact,
  PartnerAddress,
  PartnerBusinessHours,
  PartnerService,
  PartnerDocumentInfo,
  PartnerSocialLinks,
  SavePartnerInput,
  UpdateProfileInput,
  AddServiceInput,
  MediaInput,
  BookingSettingsInput,
} from '../services/partnersApi';

/* ============================================================================
   PUBLIC PARTNER TYPE
============================================================================ */

/**
 * Frontend-compatible Travel partner type.
 *
 * Kept as an alias so existing Travel components can use:
 *
 *   TravelPartner
 *
 * without duplicating the Partner domain model.
 */
export type TravelPartner = Partner;

/* ============================================================================
   PARTNER INPUT TYPES
============================================================================ */

/**
 * Create partner input.
 *
 * SavePartnerInput is the canonical API input used for creating/saving
 * a partner profile.
 */
export type CreatePartnerInput = SavePartnerInput;

/**
 * Update partner input.
 *
 * UpdateProfileInput represents profile/business updates.
 */
export type UpdatePartnerInput = UpdateProfileInput;

/* ============================================================================
   PARTNER SEARCH
============================================================================ */

/**
 * Search/filter parameters for Travel partners.
 *
 * This is intentionally frontend-friendly and does not force the backend
 * to use one particular search implementation.
 */
export interface PartnerSearchParams {
  query?: string;
  search?: string;

  category?: string;
  service?: string;

  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;

  status?: PartnerStatus | string;

  verified?: boolean;
  active?: boolean;

  limit?: number;
  skip?: number;
  page?: number;

  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  [key: string]: unknown;
}

/* ============================================================================
   RE-EXPORT CANONICAL PARTNER TYPES
============================================================================ */

export type {
  Partner,
  PartnerStatus,
  PartnerContact,
  PartnerAddress,
  PartnerBusinessHours,
  PartnerService,
  PartnerDocumentInfo,
  PartnerSocialLinks,

  SavePartnerInput,
  UpdateProfileInput,
  AddServiceInput,
  MediaInput,
  BookingSettingsInput,
};