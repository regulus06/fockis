import { travelApi } from "./travelApi";

/**
 * ============================================================================
 * FOCKIS TRAVEL — BOOKINGS API
 * ============================================================================
 *
 * Customer endpoints:
 * POST   /travel/bookings
 * GET    /travel/bookings
 * GET    /travel/bookings/:id
 * DELETE /travel/bookings/:id
 *
 * Partner/owner endpoints:
 * GET    /travel/partner/bookings
 * GET    /travel/partner/bookings/:id
 * PATCH  /travel/partner/bookings/:id/status
 *
 * Authentication:
 * Requests are authenticated automatically by travelApi.
 * ============================================================================
 */

/**
 * ============================================================================
 * CUSTOMER
 * ============================================================================
 */

export interface TravelBookingCustomer {
  _id?: string;
  id?: string;

  username?: string;

  firstName?: string;
  lastName?: string;

  profilePicture?: string;
  avatar?: string;

  email?: string;
  phone?: string;

  fockisId?: string;

  online?: boolean;
  lastSeen?: string;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * LISTING
 * ============================================================================
 */

export interface TravelBookingListing {
  _id?: string;
  id?: string;

  name?: string;
  title?: string;

  type?: string;
  category?: string;
  categories?: string[];

  description?: string;

  city?: string;
  state?: string;
  country?: string;
  address?: string;
  postalCode?: string;

  images?: string[];

  price?: number;
  priceUnit?: string;
  currency?: string;

  partnerId?: string;

  capacity?: number;
  acceptingBookings?: boolean;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * BOOKING
 * ============================================================================
 */

export interface TravelBooking {
  _id?: string;
  id?: string;

  bookingCode?: string;

  listingId?: string | TravelBookingListing;

  userId?: string | TravelBookingCustomer;

  startAt?: string;
  endAt?: string;

  startDate?: string;
  endDate?: string;

  quantity?: number;
  guests?: number;

  type?: string;

  currency?: string;

  subtotal?: number;
  fees?: number;
  tax?: number;
  total?: number;

  status?: string;
  paymentStatus?: string;

  notes?: string;

  snapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * CREATE BOOKING
 * ============================================================================
 */

export interface CreateBookingInput {
  listingId: string;

  startAt?: string;
  endAt?: string;

  startDate?: string;
  endDate?: string;

  quantity?: number;
  guests?: number;

  notes?: string;

  metadata?: Record<string, unknown>;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * OWNER BOOKING STATUS
 * ============================================================================
 */

export type OwnerBookingStatus =
  | "confirmed"
  | "cancelled"
  | "completed";

/**
 * ============================================================================
 * API RESPONSE TYPES
 * ============================================================================
 */

type ApiResponse<T> =
  | T
  | {
      data: T;
    };

/**
 * ============================================================================
 * RESPONSE UNWRAPPER
 * ============================================================================
 */

function unwrapResponse<T>(
  response: ApiResponse<T>,
): T {
  if (
    response !== null &&
    typeof response === "object" &&
    "data" in response
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
}

/**
 * ============================================================================
 * BOOKING ID
 * ============================================================================
 */

export function getBookingId(
  booking: TravelBooking,
): string {
  if (booking._id) {
    return String(booking._id);
  }

  if (booking.id) {
    return String(booking.id);
  }

  return "";
}

/**
 * ============================================================================
 * LISTING ID
 * ============================================================================
 */

export function getListingId(
  booking: TravelBooking,
): string {
  if (
    typeof booking.listingId === "string"
  ) {
    return booking.listingId;
  }

  if (
    booking.listingId &&
    typeof booking.listingId === "object"
  ) {
    if (booking.listingId._id) {
      return String(booking.listingId._id);
    }

    if (booking.listingId.id) {
      return String(booking.listingId.id);
    }
  }

  return "";
}

/**
 * ============================================================================
 * CUSTOMER ID
 * ============================================================================
 */

export function getCustomerId(
  booking: TravelBooking,
): string {
  if (
    typeof booking.userId === "string"
  ) {
    return booking.userId;
  }

  if (
    booking.userId &&
    typeof booking.userId === "object"
  ) {
    if (booking.userId._id) {
      return String(booking.userId._id);
    }

    if (booking.userId.id) {
      return String(booking.userId.id);
    }
  }

  return "";
}

/**
 * ============================================================================
 * BOOKINGS API
 * ============================================================================
 */

export const bookingsApi = {
  /**
   * CREATE BOOKING
   *
   * POST /travel/bookings
   */
  async create(
    data: CreateBookingInput,
  ): Promise<TravelBooking> {
    const payload: Record<string, unknown> = {
      ...data,
    };

    /*
     * The backend uses startAt/endAt.
     *
     * Keep startDate/endDate supported for existing
     * frontend forms, but normalize them before sending.
     */
    if (
      !payload.startAt &&
      payload.startDate
    ) {
      payload.startAt = payload.startDate;
    }

    if (
      !payload.endAt &&
      payload.endDate
    ) {
      payload.endAt = payload.endDate;
    }

    delete payload.startDate;
    delete payload.endDate;

    const response =
      await travelApi.post<
        ApiResponse<TravelBooking>
      >(
        "/travel/bookings",
        payload,
      );

    return unwrapResponse(response);
  },

  /**
   * LIST CURRENT USER BOOKINGS
   *
   * GET /travel/bookings
   */
  async listMine(): Promise<TravelBooking[]> {
    const response =
      await travelApi.get<
        ApiResponse<TravelBooking[]>
      >(
        "/travel/bookings",
      );

    return unwrapResponse(response);
  },

  /**
   * GET CURRENT USER BOOKING
   *
   * GET /travel/bookings/:id
   */
  async getById(
    id: string,
  ): Promise<TravelBooking> {
    const cleanId = String(id).trim();

    if (!cleanId) {
      throw new Error(
        "Reservation ID is missing.",
      );
    }

    const response =
      await travelApi.get<
        ApiResponse<TravelBooking>
      >(
        `/travel/bookings/${encodeURIComponent(
          cleanId,
        )}`,
      );

    return unwrapResponse(response);
  },

  /**
   * CANCEL CURRENT USER BOOKING
   *
   * DELETE /travel/bookings/:id
   */
  async cancel(
    id: string,
  ): Promise<TravelBooking> {
    const cleanId = String(id).trim();

    if (!cleanId) {
      throw new Error(
        "Reservation ID is missing.",
      );
    }

    const response =
      await travelApi.delete<
        ApiResponse<TravelBooking>
      >(
        `/travel/bookings/${encodeURIComponent(
          cleanId,
        )}`,
      );

    return unwrapResponse(response);
  },

  /**
   * ==========================================================================
   * PARTNER / OWNER BOOKINGS
   * ==========================================================================
   */

  /**
   * LIST BOOKINGS FOR THE CURRENT PARTNER
   *
   * GET /travel/partner/bookings
   */
  async listOwner(): Promise<TravelBooking[]> {
    const response =
      await travelApi.get<
        ApiResponse<TravelBooking[]>
      >(
        "/travel/partner/bookings",
      );

    return unwrapResponse(response);
  },

  /**
   * Alias used by partner-management pages.
   */
  async listOwnerBookings(): Promise<TravelBooking[]> {
    return bookingsApi.listOwner();
  },

  /**
   * GET ONE PARTNER BOOKING
   *
   * GET /travel/partner/bookings/:id
   */
  async getOwnerById(
    id: string,
  ): Promise<TravelBooking> {
    const cleanId = String(id).trim();

    if (!cleanId) {
      throw new Error(
        "Reservation ID is missing.",
      );
    }

    const response =
      await travelApi.get<
        ApiResponse<TravelBooking>
      >(
        `/travel/partner/bookings/${encodeURIComponent(
          cleanId,
        )}`,
      );

    return unwrapResponse(response);
  },

  /**
   * Alias used by partner reservation pages.
   */
  async getOwnerBooking(
    id: string,
  ): Promise<TravelBooking> {
    return bookingsApi.getOwnerById(id);
  },

  /**
   * UPDATE PARTNER BOOKING STATUS
   *
   * PATCH /travel/partner/bookings/:id/status
   */
  async updateOwnerStatus(
    id: string,
    status: OwnerBookingStatus,
  ): Promise<TravelBooking> {
    const cleanId = String(id).trim();

    if (!cleanId) {
      throw new Error(
        "Reservation ID is missing.",
      );
    }

    const response =
      await travelApi.patch<
        ApiResponse<TravelBooking>
      >(
        `/travel/partner/bookings/${encodeURIComponent(
          cleanId,
        )}/status`,
        {
          status,
        },
      );

    return unwrapResponse(response);
  },

  /**
   * Alias used by management pages.
   */
  async updateOwnerBookingStatus(
    id: string,
    status: OwnerBookingStatus,
  ): Promise<TravelBooking> {
    return bookingsApi.updateOwnerStatus(
      id,
      status,
    );
  },

  /**
   * CONFIRM PARTNER BOOKING
   */
  async confirmOwnerBooking(
    id: string,
  ): Promise<TravelBooking> {
    return bookingsApi.updateOwnerStatus(
      id,
      "confirmed",
    );
  },

  /**
   * CANCEL PARTNER BOOKING
   */
  async cancelOwnerBooking(
    id: string,
  ): Promise<TravelBooking> {
    return bookingsApi.updateOwnerStatus(
      id,
      "cancelled",
    );
  },

  /**
   * COMPLETE PARTNER BOOKING
   */
  async completeOwnerBooking(
    id: string,
  ): Promise<TravelBooking> {
    return bookingsApi.updateOwnerStatus(
      id,
      "completed",
    );
  },
};

export default bookingsApi;