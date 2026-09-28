import type {
  AdminUser,
  AdminUserActivity,
  AdminUserActivityResponse,
  AdminUserBooking,
  AdminUserBookingsResponse,
  AdminUserBulkActionPayload,
  AdminUserBulkActionResponse,
  AdminUserListFilters,
  AdminUserListResponse,
  AdminUserMessageSummary,
  AdminUserMessagesResponse,
  AdminUserPayment,
  AdminUserPaymentsResponse,
  AdminUserPermissionUpdatePayload,
  AdminUserPremiumUpdatePayload,
  AdminUserReport,
  AdminUserReportsResponse,
  AdminUserRoleUpdatePayload,
  AdminUserStats,
  AdminUserStatusUpdatePayload,
  AdminUserVerificationUpdatePayload,
} from "./types/adminUsers.types";

const DEFAULT_API_BASE_URL = "http://localhost:3000";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

type QueryValue = string | number | boolean | null | undefined;

type QueryParams = Record<string, QueryValue>;

// Not part of the shared types file — your backend types don't define a
// payload for this endpoint yet. Add `AdminUserFockisIdAccessUpdatePayload`
// to adminUsers.types.ts and import it here once it exists, for the same
// single-source-of-truth reason every other payload type is imported.
type FockisIdAccessUpdatePayload = {
  fockisIdAccessPaid: boolean;
};

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
    const value = localStorage.getItem(key);

    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (Array.isArray(data.message)) {
      const messages = data.message.filter(
        (value): value is string => typeof value === "string",
      );

      if (messages.length > 0) {
        return messages.join(", ");
      }
    }

    if (data.error && typeof data.error === "object") {
      const error = data.error as Record<string, unknown>;

      if (typeof error.message === "string" && error.message.trim()) {
        return error.message;
      }
    }

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  }

  return fallback;
}

function unwrapResponse<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    return payload as T;
  }

  const data = payload as Record<string, unknown>;

  if ("data" in data && data.data !== undefined) {
    return data.data as T;
  }

  return payload as T;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  query?: QueryParams,
): Promise<T> {
  const token = getAdminToken();

  if (!token) {
    throw new Error("You are not authenticated as an administrator.");
  }

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers,
    credentials: "include",
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your administrator session has expired.");
    }

    if (response.status === 403) {
      throw new Error(
        "You do not have permission to perform this administrator action.",
      );
    }

    if (response.status === 404) {
      throw new Error("The requested administrator resource was not found.");
    }

    throw new Error(
      getErrorMessage(payload, `Request failed with status ${response.status}.`),
    );
  }

  return unwrapResponse<T>(payload);
}

function normalizeUsersListResponse(
  response: AdminUserListResponse | AdminUser[],
): Required<Pick<AdminUserListResponse, "items" | "users" | "total" | "page" | "limit">> & {
  skip: number;
} {
  if (Array.isArray(response)) {
    return {
      items: response,
      users: response,
      total: response.length,
      page: 1,
      limit: response.length || 50,
      skip: 0,
    };
  }

  const items = Array.isArray(response.items)
    ? response.items
    : Array.isArray(response.users)
      ? response.users
      : [];

  const users = Array.isArray(response.users) ? response.users : items;

  return {
    items,
    users,
    total: typeof response.total === "number" ? response.total : items.length,
    page: typeof response.page === "number" ? response.page : 1,
    limit: typeof response.limit === "number" ? response.limit : 50,
    skip: typeof response.skip === "number" ? response.skip : 0,
  };
}

const adminUsersApi = {
  async getStats(): Promise<AdminUserStats> {
    return request<AdminUserStats>("/admin/users/stats");
  },

  async getUsers(filters: AdminUserListFilters = {}) {
    const response = await request<AdminUserListResponse | AdminUser[]>(
      "/admin/users",
      {},
      {
        search: filters.search,
        status: filters.status,
        role: filters.role,
        accountType: filters.accountType,
        verified: filters.verified,
        locked: filters.locked,
        premium: filters.premium,
        sellerApproved: filters.sellerApproved,
        fockisIdAccessPaid: filters.fockisIdAccessPaid,
        countryCode: filters.countryCode,
        online: filters.online,
        createdFrom: filters.createdFrom,
        createdTo: filters.createdTo,
        lastActiveFrom: filters.lastActiveFrom,
        lastActiveTo: filters.lastActiveTo,
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
      },
    );

    return normalizeUsersListResponse(response);
  },

  async getUser(id: string): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${encodeURIComponent(id)}`);
  },

  async getUserBookings(
    id: string,
    filters: {
      status?: string;
      type?: string;
      search?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<AdminUserBooking[]> {
    const response = await request<AdminUserBookingsResponse | AdminUserBooking[]>(
      `/admin/users/${encodeURIComponent(id)}/bookings`,
      {},
      filters,
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.items ?? response.bookings ?? [];
  },

  async getUserPayments(
    id: string,
    filters: {
      status?: string;
      type?: string;
      search?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<AdminUserPayment[]> {
    const response = await request<AdminUserPaymentsResponse | AdminUserPayment[]>(
      `/admin/users/${encodeURIComponent(id)}/payments`,
      {},
      filters,
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.items ?? response.payments ?? [];
  },

  async getUserReports(
    id: string,
    filters: {
      status?: string;
      type?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<AdminUserReport[]> {
    const response = await request<AdminUserReportsResponse | AdminUserReport[]>(
      `/admin/users/${encodeURIComponent(id)}/reports`,
      {},
      filters,
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.items ?? response.reports ?? [];
  },

  async getUserMessages(
    id: string,
    filters: {
      search?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<AdminUserMessageSummary[]> {
    const response = await request<AdminUserMessagesResponse | AdminUserMessageSummary[]>(
      `/admin/users/${encodeURIComponent(id)}/messages`,
      {},
      filters,
    );

    if (Array.isArray(response)) {
      return response;
    }

    // AdminUserMessagesResponse's alternate field is "conversations", not
    // "messages" — this used to silently return [] against a real backend.
    return response.items ?? response.conversations ?? [];
  },

  async getUserActivity(
    id: string,
    filters: {
      type?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<AdminUserActivity[]> {
    const response = await request<AdminUserActivityResponse | AdminUserActivity[]>(
      `/admin/users/${encodeURIComponent(id)}/activity`,
      {},
      filters,
    );

    if (Array.isArray(response)) {
      return response;
    }

    // AdminUserActivityResponse's alternate field is "activities" (plural).
    return response.items ?? response.activities ?? [];
  },

  async updateStatus(id: string, data: AdminUserStatusUpdatePayload): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async updateRole(id: string, data: AdminUserRoleUpdatePayload): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${encodeURIComponent(id)}/role`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async updatePermissions(
    id: string,
    data: AdminUserPermissionUpdatePayload,
  ): Promise<AdminUser> {
    return request<AdminUser>(
      `/admin/users/${encodeURIComponent(id)}/permissions`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },

  async updateVerification(
    id: string,
    data: AdminUserVerificationUpdatePayload,
  ): Promise<AdminUser> {
    return request<AdminUser>(
      `/admin/users/${encodeURIComponent(id)}/verification`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },

  async updateFockisIdAccess(
    id: string,
    data: FockisIdAccessUpdatePayload,
  ): Promise<AdminUser> {
    return request<AdminUser>(
      `/admin/users/${encodeURIComponent(id)}/fockis-id-access`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },

  async updatePremium(id: string, data: AdminUserPremiumUpdatePayload): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${encodeURIComponent(id)}/premium`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async lockUser(id: string, reason?: string): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${encodeURIComponent(id)}/lock`, {
      method: "POST",
      body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
    });
  },

  async unlockUser(id: string): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${encodeURIComponent(id)}/unlock`, {
      method: "POST",
    });
  },

  async forcePasswordChange(id: string): Promise<AdminUser> {
    return request<AdminUser>(
      `/admin/users/${encodeURIComponent(id)}/force-password-change`,
      { method: "POST" },
    );
  },

  async resetPassword(
    id: string,
  ): Promise<{ success: boolean; message?: string }> {
    return request<{ success: boolean; message?: string }>(
      `/admin/users/${encodeURIComponent(id)}/reset-password`,
      { method: "POST" },
    );
  },

  async bulkAction(data: AdminUserBulkActionPayload): Promise<AdminUserBulkActionResponse> {
    return request<AdminUserBulkActionResponse>("/admin/users/bulk-action", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async exportUsers(filters: AdminUserListFilters = {}): Promise<Blob> {
    const token = getAdminToken();

    if (!token) {
      throw new Error("You are not authenticated as an administrator.");
    }

    const response = await fetch(
      buildUrl("/admin/users/export", {
        search: filters.search,
        status: filters.status,
        role: filters.role,
        accountType: filters.accountType,
        verified: filters.verified,
        locked: filters.locked,
        premium: filters.premium,
        sellerApproved: filters.sellerApproved,
        fockisIdAccessPaid: filters.fockisIdAccessPaid,
        countryCode: filters.countryCode,
        online: filters.online,
        createdFrom: filters.createdFrom,
        createdTo: filters.createdTo,
        lastActiveFrom: filters.lastActiveFrom,
        lastActiveTo: filters.lastActiveTo,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
      }),
      {
        method: "GET",
        headers: {
          Accept: "text/csv, application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      },
    );

    if (!response.ok) {
      const payload = await parseResponse(response);

      throw new Error(
        getErrorMessage(
          payload,
          `User export failed with status ${response.status}.`,
        ),
      );
    }

    return response.blob();
  },
};

export { getAdminToken };

export default adminUsersApi;