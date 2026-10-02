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

const DEFAULT_API_BASE_URL = "http://localhost:3000";

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    DEFAULT_API_BASE_URL,
).replace(/\/+$/, "");

type RequestParams = Record<string, unknown>;

export interface TravelAdminUser {
  _id?: string;
  id?: string;
  fockisId?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profilePicture?: string;
  avatar?: string;
  role?: string;
  roles?: string[];
  accountType?: string;
  status?: string;
  country?: string;
  countryCode?: string;
  isActive?: boolean;
  isVerified?: boolean;
  verified?: boolean;
  isPremium?: boolean;
  premium?: boolean;
  fockisIdAccess?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastSeen?: string;
}

export type TravelUserFilters = RequestParams & {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
  accountType?: string;
  country?: string;
};

export interface TravelUsersResult {
  users?: TravelAdminUser[];
  data?: TravelAdminUser[];
  items?: TravelAdminUser[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function getAdminToken(): string | null {
  const tokenKeys = [
    "admin_token",
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "authToken",
    "fockis_token",
  ];

  for (const key of tokenKeys) {
    const localToken = localStorage.getItem(key);

    if (localToken) {
      return localToken
        .replace(/^Bearer\s+/i, "")
        .trim();
    }

    const sessionToken = sessionStorage.getItem(key);

    if (sessionToken) {
      return sessionToken
        .replace(/^Bearer\s+/i, "")
        .trim();
    }
  }

  return null;
}

function buildUrl(
  path: string,
  params?: RequestParams,
): string {
  const url = `${API_BASE_URL}${path}`;

  if (!params) {
    return url;
  }

  const query = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      query.set(key, String(value));
    },
  );

  const queryString = query.toString();

  return queryString
    ? `${url}?${queryString}`
    : url;
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType =
    response.headers.get("content-type") ?? "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    return (await response.json()) as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function getErrorMessage(
  response: Response,
  body: unknown,
): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body
  ) {
    const message = (
      body as { message?: unknown }
    ).message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  if (
    body &&
    typeof body === "object" &&
    "error" in body
  ) {
    const error = (
      body as { error?: unknown }
    ).error;

    if (
      typeof error === "string" &&
      error.trim()
    ) {
      return error;
    }
  }

  switch (response.status) {
    case 400:
      return "The request was invalid.";

    case 401:
      return "Your session has expired. Please sign in again.";

    case 403:
      return "You do not have permission to manage Travel.";

    case 404:
      return "The requested Travel resource was not found.";

    case 500:
      return "The Travel server encountered an error.";

    default:
      return `Request failed with status ${response.status}.`;
  }
}

function unwrapResponse<T>(
  body: unknown,
): T {
  if (
    body &&
    typeof body === "object" &&
    "data" in body
  ) {
    return (
      body as { data: T }
    ).data;
  }

  return body as T;
}

async function request<T>(
  path: string,
  options: RequestInit & {
    params?: RequestParams;
  } = {},
): Promise<T> {
  const {
    params,
    headers,
    ...requestOptions
  } = options;

  const url = buildUrl(
    path,
    params,
  );

  const token = getAdminToken();

  const response = await fetch(
    url,
    {
      ...requestOptions,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...headers,
      },
    },
  );

  if (!response.ok) {
    let body: unknown = null;

    try {
      body = await response.json();
    } catch {
      body = null;
    }

    throw new Error(
      getErrorMessage(
        response,
        body,
      ),
    );
  }

  const body =
    await parseResponse<unknown>(
      response,
    );

  return unwrapResponse<T>(
    body,
  );
}

export const travelPartnerAdminApi = {
  hasAuthToken(): boolean {
    return Boolean(
      getAdminToken(),
    );
  },

  getBaseUrl(): string {
    return API_BASE_URL;
  },

  // --------------------------------------------------------------------
  // Dashboard
  // --------------------------------------------------------------------

  getStats(): Promise<TravelAdminStats> {
    return request<TravelAdminStats>(
      "/admin/travel/stats",
    );
  },

  // --------------------------------------------------------------------
  // Users
  // --------------------------------------------------------------------

  getUsers(
    filters: TravelUserFilters = {},
  ): Promise<TravelUsersResult> {
    return request<TravelUsersResult>(
      "/admin/travel/users",
      {
        params: filters,
      },
    );
  },

  getUser(
    id: string,
  ): Promise<TravelAdminUser> {
    return request<TravelAdminUser>(
      `/admin/travel/users/${encodeURIComponent(
        id,
      )}`,
    );
  },

  updateUserStatus(
    id: string,
    status: string,
  ): Promise<TravelAdminUser> {
    return request<TravelAdminUser>(
      `/admin/travel/users/${encodeURIComponent(
        id,
      )}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      },
    );
  },

  updateUserVerification(
    id: string,
    verified: boolean,
  ): Promise<TravelAdminUser> {
    return request<TravelAdminUser>(
      `/admin/travel/users/${encodeURIComponent(
        id,
      )}/verification`,
      {
        method: "PATCH",
        body: JSON.stringify({
          verified,
        }),
      },
    );
  },

  updateUserRole(
    id: string,
    role: string,
  ): Promise<TravelAdminUser> {
    return request<TravelAdminUser>(
      `/admin/travel/users/${encodeURIComponent(
        id,
      )}/role`,
      {
        method: "PATCH",
        body: JSON.stringify({
          role,
        }),
      },
    );
  },

  updateUserAccountType(
    id: string,
    accountType: string,
  ): Promise<TravelAdminUser> {
    return request<TravelAdminUser>(
      `/admin/travel/users/${encodeURIComponent(
        id,
      )}/account-type`,
      {
        method: "PATCH",
        body: JSON.stringify({
          accountType,
        }),
      },
    );
  },

  updateUserFockisIdAccess(
    id: string,
    access: boolean,
  ): Promise<TravelAdminUser> {
    return request<TravelAdminUser>(
      `/admin/travel/users/${encodeURIComponent(
        id,
      )}/fockis-id-access`,
      {
        method: "PATCH",
        body: JSON.stringify({
          access,
        }),
      },
    );
  },

  updateUserPremium(
    id: string,
    premium: boolean,
  ): Promise<TravelAdminUser> {
    return request<TravelAdminUser>(
      `/admin/travel/users/${encodeURIComponent(
        id,
      )}/premium`,
      {
        method: "PATCH",
        body: JSON.stringify({
          premium,
        }),
      },
    );
  },

  // --------------------------------------------------------------------
  // Partner applications
  // --------------------------------------------------------------------

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
        params: filters,
      },
    );
  },

  getPartnerApplication(
    id: string,
  ): Promise<TravelPartnerApplication> {
    return request<TravelPartnerApplication>(
      `/admin/travel/partner-applications/${encodeURIComponent(
        id,
      )}`,
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
      `/admin/travel/partner-applications/${encodeURIComponent(
        id,
      )}/status`,
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
      `/admin/travel/partner-applications/${encodeURIComponent(
        id,
      )}/request-info`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
        }),
      },
    );
  },

  // --------------------------------------------------------------------
  // Partners
  // --------------------------------------------------------------------

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
        params: filters,
      },
    );
  },

  getPartner(
    id: string,
  ): Promise<AdminTravelPartner> {
    return request<AdminTravelPartner>(
      `/admin/travel/partners/${encodeURIComponent(
        id,
      )}`,
    );
  },

  updatePartnerStatus(
    id: string,
    status: TravelPartnerStatus,
    reason?: string,
  ): Promise<AdminTravelPartner> {
    return request<AdminTravelPartner>(
      `/admin/travel/partners/${encodeURIComponent(
        id,
      )}/status`,
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
      `/admin/travel/partners/${encodeURIComponent(
        id,
      )}/listings`,
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
      `/admin/travel/partners/${encodeURIComponent(
        id,
      )}/bookings`,
    );
  },

  // --------------------------------------------------------------------
  // Listings
  // --------------------------------------------------------------------

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
        params: filters,
      },
    );
  },

  getListing(
    id: string,
  ): Promise<AdminTravelListing> {
    return request<AdminTravelListing>(
      `/admin/travel/listings/${encodeURIComponent(
        id,
      )}`,
    );
  },

  updateListingStatus(
    id: string,
    status: TravelListingStatus,
    reason?: string,
  ): Promise<AdminTravelListing> {
    return request<AdminTravelListing>(
      `/admin/travel/listings/${encodeURIComponent(
        id,
      )}/status`,
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
      `/admin/travel/listings/${encodeURIComponent(
        id,
      )}`,
      {
        method: "DELETE",
      },
    );
  },

  // --------------------------------------------------------------------
  // Bookings
  // --------------------------------------------------------------------

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
        params: filters,
      },
    );
  },
};