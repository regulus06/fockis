import { travelApi } from "./travelApi";

/**
 * ============================================================================
 * FOCKIS TRAVEL — PARTNERS API
 * ============================================================================
 * Business visibility is independent from listing visibility.
 * A partner can be:
 *   - verified
 *   - active
 *   - publicly discoverable
 *   - have 0 listings
 * Listings are published separately.
 * ============================================================================
 */

export type PartnerStatus = "pending" | "verified" | "suspended" | "rejected";

export interface PartnerContact {
  email?: string;
  phone?: string;
  website?: string;
  contactName?: string;
}

export interface PartnerAddress {
  address?: string;
  addressLine2?: string;
  city?: string;

  /** State / province for locations that use states or provinces. */
  state?: string;

  /** Department for countries such as Haiti. */
  department?: string;

  postalCode?: string;
  country?: string;

  latitude?: number;
  longitude?: number;
}

export interface PartnerBusinessHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface PartnerService {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  active?: boolean;
}

export interface PartnerDocumentInfo {
  name?: string;
  url?: string;
  type?: string;
  uploadedAt?: string;
  status?: string;
}

export interface PartnerSocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
}

export interface Partner {
  _id?: string;
  id?: string;
  userId?: string;

  businessName: string;
  category: string;

  categories?: string[];

  description?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;

  contact?: PartnerContact;

  phone?: string;
  website?: string;
  email?: string;

  addressInfo?: PartnerAddress;

  address?: string;
  country?: string;
  city?: string;

  /** State / province. */
  state?: string;

  /** Department. Useful for countries such as Haiti. */
  department?: string;

  postalCode?: string;

  latitude?: number;
  longitude?: number;

  services?: PartnerService[];
  amenities?: string[];
  features?: string[];

  businessHours?: PartnerBusinessHours;

  /** Business gallery images. */
  images?: string[];

  /** Business logo URL. */
  logo?: string;

  /** Business cover image URL. */
  coverImage?: string;

  socialLinks?: PartnerSocialLinks;

  documentList?: PartnerDocumentInfo[];
  documents?: Record<string, unknown>;

  status?: PartnerStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  verifiedAt?: string;

  acceptingBookings?: boolean;
  active?: boolean;
  featured?: boolean;
  instantBooking?: boolean;

  cancellationPolicy?: string;
  bookingPolicy?: string;

  paymentProvider?: string;
  paymentAccountId?: string;
  payoutCurrency?: string;

  /** Number of published listings belonging to this business. */
  listingCount?: number;

  metadata?: Record<string, unknown>;

  createdAt?: string;
  updatedAt?: string;
}

export interface SavePartnerInput {
  businessName: string;
  category: string;

  description?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;

  contact?: PartnerContact;

  phone?: string;
  website?: string;
  email?: string;

  addressInfo?: PartnerAddress;

  address?: string;
  country?: string;
  city?: string;
  state?: string;
  department?: string;
  postalCode?: string;

  latitude?: number;
  longitude?: number;

  services?: PartnerService[];
  amenities?: string[];
  features?: string[];

  businessHours?: PartnerBusinessHours;

  images?: string[];
  logo?: string;
  coverImage?: string;

  socialLinks?: PartnerSocialLinks;

  documentList?: PartnerDocumentInfo[];
  documents?: Record<string, unknown>;

  acceptingBookings?: boolean;
  instantBooking?: boolean;

  cancellationPolicy?: string;
  bookingPolicy?: string;

  payoutCurrency?: string;

  metadata?: Record<string, unknown>;
}

export interface UpdateProfileInput {
  businessName?: string;
  category?: string;
  description?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
}

export interface AddServiceInput {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  active?: boolean;
}

export interface MediaInput {
  logo?: string;
  coverImage?: string;
}

export interface BookingSettingsInput {
  acceptingBookings?: boolean;
  instantBooking?: boolean;
  cancellationPolicy?: string;
  bookingPolicy?: string;
}

/**
 * ============================================================================
 * PARTNERS API
 * ============================================================================
 */

export const partnersApi = {
  // ==========================================================================
  // CURRENT PARTNER
  // ==========================================================================

  getMine() {
    return travelApi.get<Partner | null>("/travel/partners/me/profile");
  },

  mine() {
    return this.getMine();
  },

  save(data: SavePartnerInput) {
    return travelApi.post<Partner>("/travel/partners/apply", data);
  },

  // ==========================================================================
  // BUSINESS PROFILE
  // ==========================================================================

  updateProfile(data: UpdateProfileInput) {
    return travelApi.patch<Partner>("/travel/partners/me/profile", data);
  },

  // ==========================================================================
  // CONTACT
  // ==========================================================================

  updateContact(data: PartnerContact) {
    return travelApi.patch<Partner>("/travel/partners/me/contact", data);
  },

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  updateLocation(data: PartnerAddress) {
    return travelApi.patch<Partner>("/travel/partners/me/location", data);
  },

  // ==========================================================================
  // BUSINESS HOURS
  // ==========================================================================

  updateHours(data: PartnerBusinessHours) {
    return travelApi.patch<Partner>("/travel/partners/me/hours", data);
  },

  // ==========================================================================
  // SERVICES
  // ==========================================================================

  addService(data: AddServiceInput) {
    return travelApi.post<Partner>("/travel/partners/me/services", data);
  },

  removeService(index: number) {
    return travelApi.delete<Partner>(
      `/travel/partners/me/services/${index}`,
    );
  },

  // ==========================================================================
  // AMENITIES
  // ==========================================================================

  addAmenity(amenity: string) {
    return travelApi.post<Partner>("/travel/partners/me/amenities", {
      amenity,
    });
  },

  removeAmenity(amenity: string) {
    return travelApi.delete<Partner>(
      `/travel/partners/me/amenities/${encodeURIComponent(amenity)}`,
    );
  },

  // ==========================================================================
  // GALLERY IMAGES
  // ==========================================================================

  addImage(url: string) {
    return travelApi.post<Partner>("/travel/partners/me/images", { url });
  },

  removeImage(index: number) {
    return travelApi.delete<Partner>(`/travel/partners/me/images/${index}`);
  },

  // ==========================================================================
  // MEDIA / BRANDING
  // ==========================================================================

  /**
   * Save business branding URLs.
   * The backend endpoint currently expects image URLs rather than
   * binary file uploads.
   */
  updateMedia(data: MediaInput) {
    return travelApi.patch<Partner>("/travel/partners/me/media", data);
  },

  /** Update only the business logo. */
  updateLogo(logo: string) {
    return this.updateMedia({ logo });
  },

  /** Update only the business cover image. */
  updateCoverImage(coverImage: string) {
    return this.updateMedia({ coverImage });
  },

  /** Remove the business logo. */
  removeLogo() {
    return this.updateMedia({ logo: "" });
  },

  /** Remove the business cover image. */
  removeCoverImage() {
    return this.updateMedia({ coverImage: "" });
  },

  // ==========================================================================
  // SOCIAL MEDIA
  // ==========================================================================

  updateSocialLinks(data: PartnerSocialLinks) {
    return travelApi.patch<Partner>(
      "/travel/partners/me/social-links",
      data,
    );
  },

  // ==========================================================================
  // BOOKING SETTINGS
  // ==========================================================================

  updateBookingSettings(data: BookingSettingsInput) {
    return travelApi.patch<Partner>(
      "/travel/partners/me/booking-settings",
      data,
    );
  },

  // ==========================================================================
  // ACTIVE / INACTIVE
  // ==========================================================================

  setActive(active: boolean) {
    return travelApi.patch<Partner>("/travel/partners/me/active", {
      active,
    });
  },

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  submitVerification() {
    return travelApi.post<Partner>(
      "/travel/partners/me/submit-verification",
      {},
    );
  },

  // ==========================================================================
  // PUBLIC BUSINESS DISCOVERY
  // ==========================================================================

  /**
   * Get every publicly discoverable Travel business.
   * A verified + active business is returned even when listingCount === 0.
   */
  listVerified() {
    return travelApi.get<Partner[]>("/travel/partners/verified");
  },

  /** Alias for public business discovery. */
  listPublicBusinesses() {
    return this.listVerified();
  },

  /** Get one public verified Travel business. */
  getById(id: string) {
    return travelApi.get<Partner>(
      `/travel/partners/${encodeURIComponent(id)}`,
    );
  },

  /** Alias used by public business pages. */
  getPublicBusiness(id: string) {
    return this.getById(id);
  },
};

export default partnersApi;