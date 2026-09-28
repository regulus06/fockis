// ============================================================================
// features/admin/travel/api/travelPartnerAdminApi.ts
//
// HTTP client for the Travel admin module. Talks to the same admin gateway
// used by the rest of features/admin (see features/admin/api/adminApi.ts) so
// auth headers / base URL / error handling stay consistent with the rest of
// the admin app.
// ============================================================================

import type {
  AdminTravelBooking,
  AdminTravelListing,
  AdminTravelPartner,
  PaginatedResult,
  TravelAdminStats,
  TravelBookingFilters,
  TravelListingFilters,
  TravelListingStatus,
  TravelPartnerApplication,
  TravelPartnerApplicationFilters,
  TravelPartnerApplicationStatus,
  TravelPartnerFilters,
  TravelPartnerStatus,
} from "../types/travelAdmin.types";

// -----------------------------------------------------------------------------
// API BASE URL
// -----------------------------------------------------------------------------
//
// This file is compiled by the NestJS/TypeScript backend build, where
// `import.meta` is not available with the current module configuration.
//
// The frontend uses the same-origin /api gateway.
// -----------------------------------------------------------------------------

const API_BASE = "/api";

// -----------------------------------------------------------------------------
// AUTH
// -----------------------------------------------------------------------------

function getAdminToken(): string | null {
  return (
    localStorage.getItem("admin_token") ??
    sessionStorage.getItem("admin_token")
  );
}

// -----------------------------------------------------------------------------
// REQUEST TYPES
// -----------------------------------------------------------------------------

type RequestOptions = RequestInit & {
  params?: Record<string, unknown>;
};

// -----------------------------------------------------------------------------
// REQUEST WRAPPER
// -----------------------------------------------------------------------------

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    params,
    headers,
    ...rest
  } = options;

  let url = `${API_BASE}${path}`;

  if (params) {
    const query =
      new URLSearchParams();

    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return;
        }

        query.set(
          key,
          String(value),
        );
      },
    );

    const queryString =
      query.toString();

    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token =
    getAdminToken();

  const response =
    await fetch(url, {
      ...rest,

      headers: {
        "Content-Type":
          "application/json",

        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),

        ...headers,
      },
    });

  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}`;

    try {
      const body =
        await response.json();

      message =
        body?.message ??
        message;
    } catch {
      // Response wasn't JSON.
      // Keep the default error message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// TRAVEL PARTNER ADMIN API
// ============================================================================

export const travelPartnerAdminApi = {
  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  hasAuthToken(): boolean {
    return Boolean(
      getAdminToken(),
    );
  },

  // --------------------------------------------------------------------------
  // Dashboard
  // --------------------------------------------------------------------------

  getStats(): Promise<TravelAdminStats> {
    return request<TravelAdminStats>(
      "/admin/travel/stats",
    );
  },

  // --------------------------------------------------------------------------
  // Partner Applications
  // --------------------------------------------------------------------------

  getPartnerApplications(
    filters: TravelPartnerApplicationFilters = {},
  ): Promise<
    PaginatedResult<TravelPartnerApplication>
  > {
    return request<
      PaginatedResult<TravelPartnerApplication>
    >(
      "/admin/travel/partner-applications",
      {
        params: {
          ...filters,
        },
      },
    );
  },

  getPartnerApplication(
    id: string,
  ): Promise<TravelPartnerApplication> {
    return request<TravelPartnerApplication>(
      `/admin/travel/partner-applications/${encodeURIComponent(id)}`,
    );
  },

  updatePartnerApplicationStatus(
    id: string,
    status: TravelPartnerApplicationStatus,
    payload: {
      notes?: string;
      rejectionReason?: string;
    } = {},
  ): Promise<TravelPartnerApplication> {
    return request<TravelPartnerApplication>(
      `/admin/travel/partner-applications/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",

        body: JSON.stringify({
          status,
          ...payload,
        }),
      },
    );
  },

  requestMoreInfo(
    id: string,
    message: string,
  ): Promise<TravelPartnerApplication> {
    return request<TravelPartnerApplication>(
      `/admin/travel/partner-applications/${encodeURIComponent(id)}/request-info`,
      {
        method: "POST",

        body: JSON.stringify({
          message,
        }),
      },
    );
  },

  // --------------------------------------------------------------------------
  // Partners
  // --------------------------------------------------------------------------

  getPartners(
    filters: TravelPartnerFilters = {},
  ): Promise<
    PaginatedResult<AdminTravelPartner>
  > {
    return request<
      PaginatedResult<AdminTravelPartner>
    >(
      "/admin/travel/partners",
      {
        params: {
          ...filters,
        },
      },
    );
  },

  getPartner(
    id: string,
  ): Promise<AdminTravelPartner> {
    return request<AdminTravelPartner>(
      `/admin/travel/partners/${encodeURIComponent(id)}`,
    );
  },

  updatePartnerStatus(
    id: string,
    status: TravelPartnerStatus,
    reason?: string,
  ): Promise<AdminTravelPartner> {
    return request<AdminTravelPartner>(
      `/admin/travel/partners/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",

        body: JSON.stringify({
          status,
          reason,
        }),
      },
    );
  },

  getPartnerListings(
    id: string,
  ): Promise<
    PaginatedResult<AdminTravelListing>
  > {
    return request<
      PaginatedResult<AdminTravelListing>
    >(
      `/admin/travel/partners/${encodeURIComponent(id)}/listings`,
    );
  },

  getPartnerBookings(
    id: string,
  ): Promise<
    PaginatedResult<AdminTravelBooking>
  > {
    return request<
      PaginatedResult<AdminTravelBooking>
    >(
      `/admin/travel/partners/${encodeURIComponent(id)}/bookings`,
    );
  },

  // --------------------------------------------------------------------------
  // Listings
  // --------------------------------------------------------------------------

  getListings(
    filters: TravelListingFilters = {},
  ): Promise<
    PaginatedResult<AdminTravelListing>
  > {
    return request<
      PaginatedResult<AdminTravelListing>
    >(
      "/admin/travel/listings",
      {
        params: {
          ...filters,
        },
      },
    );
  },

  getListing(
    id: string,
  ): Promise<AdminTravelListing> {
    return request<AdminTravelListing>(
      `/admin/travel/listings/${encodeURIComponent(id)}`,
    );
  },

  updateListingStatus(
    id: string,
    status: TravelListingStatus,
    reason?: string,
  ): Promise<AdminTravelListing> {
    return request<AdminTravelListing>(
      `/admin/travel/listings/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",

        body: JSON.stringify({
          status,
          reason,
        }),
      },
    );
  },

  deleteListing(
    id: string,
  ): Promise<void> {
    return request<void>(
      `/admin/travel/listings/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  },

  // --------------------------------------------------------------------------
  // Bookings
  // --------------------------------------------------------------------------

  getBookings(
    filters: TravelBookingFilters = {},
  ): Promise<
    PaginatedResult<AdminTravelBooking>
  > {
    return request<
      PaginatedResult<AdminTravelBooking>
    >(
      "/admin/travel/bookings",
      {
        params: {
          ...filters,
        },
      },
    );
  },
};