// ============================================================================
// features/admin/travel/types/travelAdmin.types.ts
//
// Shared types for the Fockis Travel admin module. These mirror the public
// Travel feature's domain model (see features/fockis-travel/types) but add
// the extra moderation / operational fields that only admins need to see.
// ============================================================================

export type TravelListingType =
  | "stay"
  | "rental"
  | "meeting"
  | "event"
  | "restaurant"
  | "car"
  | "flight"
  | "transfer"
  | "experience"
  | "attraction"
  | "thing";

export type TravelListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "suspended"
  | "archived"
  | "rejected";

export type TravelPartnerApplicationStatus =
  | "pending"
  | "under_review"
  | "more_info_requested"
  | "approved"
  | "rejected";

export type TravelPartnerStatus =
  | "active"
  | "suspended"
  | "deactivated"
  | "pending";

export type TravelBookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "refunded"
  | "disputed";

// ----------------------------------------------------------------------------
// Partner applications (businesses applying to become Fockis Travel partners)
// ----------------------------------------------------------------------------

/**
 * A business can offer more than one Fockis Travel service (see the public
 * "Manage your partner application" form: Hotels & Stays, Restaurants, Car
 * Rental, Experiences, Meeting Spaces, Transportation, Events, Vacation
 * Rentals). `primaryCategory` drives the main listing; `services` is the
 * full multi-select set submitted with the application.
 */
export interface TravelPartnerApplication {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;

  primaryCategory: TravelListingType | string;
  services: (TravelListingType | string)[];

  message?: string;
  documents?: TravelPartnerDocument[];

  status: TravelPartnerApplicationStatus;

  /** Ordered checklist shown to the applicant and mirrored for admins. */
  verificationStage: "submitted" | "under_review" | "verified";

  submittedAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
}

export interface TravelPartnerDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

// ----------------------------------------------------------------------------
// Partners (approved businesses)
// ----------------------------------------------------------------------------

export interface AdminTravelPartner {
  id: string;
  businessName: string;
  categories: TravelListingType[];
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  logo?: string;
  status: TravelPartnerStatus;
  verified: boolean;
  acceptingBookings: boolean;
  listingCount: number;
  activeListingCount: number;
  totalBookings: number;
  totalRevenue?: number;
  rating?: number;
  createdAt: string;
  suspendedAt?: string;
  suspendedReason?: string;
}

// ----------------------------------------------------------------------------
// Listings (admin / moderation view)
// ----------------------------------------------------------------------------

export interface AdminTravelListing {
  id: string;
  name: string;
  type: TravelListingType;
  status: TravelListingStatus;
  partnerId: string;
  partnerName: string;
  city?: string;
  country?: string;
  price?: number;
  currency?: string;
  priceUnit?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  bookingCount?: number;
  flagged?: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// ----------------------------------------------------------------------------
// Bookings (cross-partner view)
// ----------------------------------------------------------------------------

export interface AdminTravelBooking {
  id: string;
  listingId: string;
  listingName: string;
  listingType: TravelListingType;
  partnerId: string;
  partnerName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: TravelBookingStatus;
  amount: number;
  currency: string;
  checkIn?: string;
  checkOut?: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Dashboard stats
// ----------------------------------------------------------------------------

export interface TravelAdminStats {
  totalPartners: number;
  activePartners: number;
  pendingApplications: number;
  totalListings: number;
  publishedListings: number;
  pendingReviewListings: number;
  flaggedListings: number;
  totalBookingsThisMonth: number;
  revenueThisMonth: number;
  currency: string;
}

// ----------------------------------------------------------------------------
// Filters / pagination
// ----------------------------------------------------------------------------

export interface TravelPartnerApplicationFilters {
  status?: TravelPartnerApplicationStatus | "all";
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TravelPartnerFilters {
  status?: TravelPartnerStatus | "all";
  category?: TravelListingType | "all";
  search?: string;
  page?: number;
  limit?: number;
}

export interface TravelListingFilters {
  status?: TravelListingStatus | "all";
  type?: TravelListingType | "all";
  partnerId?: string;
  flaggedOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TravelBookingFilters {
  status?: TravelBookingStatus | "all";
  partnerId?: string;
  listingType?: TravelListingType | "all";
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
