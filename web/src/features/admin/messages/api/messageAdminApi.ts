import { FOCKIS_API_URL } from "../../../../config/fockisConfig";

import type {
  AttachmentSettings,
  CallSettings,
  FockisIdPricing,
  FockisIdSettings,
  MessageAdminStats,
  MessageAdminUser,
  MessageReport,
  MessageSettings,
} from '../types/messageAdmin.types';

// ============================================================================
// API BASE URL
// ============================================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

// ============================================================================
// AUTHENTICATION
// ============================================================================

function getToken(): string | null {
  return (
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('jwt')
  );
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

interface PaginatedUsersResponse {
  users: MessageAdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface PaginatedReportsResponse {
  reports: MessageReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// REQUEST
// ============================================================================

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
    },
  );

  const contentType =
    response.headers.get('content-type') || '';

  const body =
    contentType.includes('application/json')
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}`;

    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body
    ) {
      const serverMessage = (
        body as {
          message?: unknown;
        }
      ).message;

      if (Array.isArray(serverMessage)) {
        message = serverMessage
          .map(String)
          .join(', ');
      } else if (
        serverMessage !== undefined
      ) {
        message = String(serverMessage);
      }
    } else if (
      typeof body === 'string' &&
      body.trim()
    ) {
      message = body;
    }

    throw new Error(message);
  }

  return body as T;
}

// ============================================================================
// MESSAGE ADMIN API
// ============================================================================

export const messageAdminApi = {
  // ==========================================================================
  // DASHBOARD STATISTICS
  // ==========================================================================

  getStats(): Promise<MessageAdminStats> {
    return request<MessageAdminStats>(
      '/admin/messages/stats',
    );
  },

  // ==========================================================================
  // USERS
  // ==========================================================================

  async getUsers(
    options?: {
      page?: number;
      limit?: number;
      search?: string;
    },
  ): Promise<MessageAdminUser[]> {
    const params = new URLSearchParams();

    if (options?.page !== undefined) {
      params.set(
        'page',
        String(options.page),
      );
    }

    if (options?.limit !== undefined) {
      params.set(
        'limit',
        String(options.limit),
      );
    }

    if (
      options?.search &&
      options.search.trim()
    ) {
      params.set(
        'search',
        options.search.trim(),
      );
    }

    const query = params.toString();

    const response =
      await request<PaginatedUsersResponse>(
        `/admin/messages/users${
          query ? `?${query}` : ''
        }`,
      );

    return response.users;
  },

  // ==========================================================================
  // FOCKIS ID
  // ==========================================================================

  /**
   * Returns the Fockis ID pricing configured by the administrator.
   *
   * The price is NEVER generated or hard-coded by this client.
   *
   * Possible values:
   *   - number: configured price
   *   - null: no price has been configured
   */
  getFockisIdPricing(): Promise<FockisIdPricing> {
    return request<FockisIdPricing>(
      '/admin/messages/fockis-id/pricing',
    );
  },

  /**
   * Updates the Fockis ID pricing stored by the backend.
   *
   * The backend/database is the source of truth.
   */
  updateFockisIdPricing(
    data: FockisIdPricing,
  ): Promise<FockisIdPricing> {
    return request<FockisIdPricing>(
      '/admin/messages/fockis-id/pricing',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  },

  /**
   * Returns the complete Fockis ID configuration.
   */
  getFockisIdSettings(): Promise<FockisIdSettings> {
    return request<FockisIdSettings>(
      '/admin/messages/fockis-id',
    );
  },

  /**
   * Updates the Fockis ID configuration.
   */
  updateFockisIdSettings(
    data: FockisIdSettings,
  ): Promise<FockisIdSettings> {
    return request<FockisIdSettings>(
      '/admin/messages/fockis-id/settings',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  },

  // ==========================================================================
  // MESSAGE SETTINGS
  // ==========================================================================

  getMessageSettings(): Promise<MessageSettings> {
    return request<MessageSettings>(
      '/admin/messages/settings',
    );
  },

  updateMessageSettings(
    data: MessageSettings,
  ): Promise<MessageSettings> {
    return request<MessageSettings>(
      '/admin/messages/settings',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  },

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  async getReports(
    options?: {
      page?: number;
      limit?: number;
      status?: string;
    },
  ): Promise<MessageReport[]> {
    const params = new URLSearchParams();

    if (options?.page !== undefined) {
      params.set(
        'page',
        String(options.page),
      );
    }

    if (options?.limit !== undefined) {
      params.set(
        'limit',
        String(options.limit),
      );
    }

    if (
      options?.status &&
      options.status.trim()
    ) {
      params.set(
        'status',
        options.status.trim(),
      );
    }

    const query = params.toString();

    const response =
      await request<PaginatedReportsResponse>(
        `/admin/messages/reports${
          query ? `?${query}` : ''
        }`,
      );

    return response.reports;
  },

  updateReportStatus(
    reportId: string,
    status: MessageReport['status'],
  ): Promise<MessageReport> {
    return request<MessageReport>(
      `/admin/messages/reports/${encodeURIComponent(
        reportId,
      )}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
        }),
      },
    );
  },

  // ==========================================================================
  // CALL SETTINGS
  //
  // These require corresponding backend routes.
  // ==========================================================================

  getCallSettings(): Promise<CallSettings> {
    return request<CallSettings>(
      '/admin/messages/call-settings',
    );
  },

  updateCallSettings(
    data: CallSettings,
  ): Promise<CallSettings> {
    return request<CallSettings>(
      '/admin/messages/call-settings',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );
  },

  // ==========================================================================
  // ATTACHMENT SETTINGS
  //
  // These require corresponding backend routes.
  // ==========================================================================

  getAttachmentSettings(): Promise<AttachmentSettings> {
    return request<AttachmentSettings>(
      '/admin/messages/attachment-settings',
    );
  },

  updateAttachmentSettings(
    data: AttachmentSettings,
  ): Promise<AttachmentSettings> {
    return request<AttachmentSettings>(
      '/admin/messages/attachment-settings',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );
  },
};

export default messageAdminApi;