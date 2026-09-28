import { travelApi, unwrapApiData } from './travelApi';

/**
 * ============================================================================
 * FOCKIS TRAVEL — PRICE ALERTS API
 * ============================================================================
 *
 * Backend:
 *   /travel/price-alerts
 *
 * Operations:
 *   GET    /travel/price-alerts
 *   POST   /travel/price-alerts
 *   DELETE /travel/price-alerts/:id
 *
 * Supports both:
 *
 *   Direct response:
 *     PriceAlert
 *     PriceAlert[]
 *
 *   Wrapped response:
 *     { data: PriceAlert }
 *     { data: PriceAlert[] }
 * ============================================================================
 */

export interface PriceAlert {
  _id?: string;
  id?: string;

  listingId?: string;

  targetPrice?: number;
  price?: number;

  currency?: string;

  active?: boolean;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

export interface CreatePriceAlertInput {
  listingId: string;

  targetPrice?: number;

  currency?: string;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * RESPONSE TYPES
 * ============================================================================
 */

type PriceAlertResponse =
  | PriceAlert
  | {
      data: PriceAlert;
    };

type PriceAlertListResponse =
  | PriceAlert[]
  | {
      data: PriceAlert[];
    };

/**
 * ============================================================================
 * TYPE GUARDS
 * ============================================================================
 */

function isWrappedPriceAlert(
  value: unknown,
): value is { data: PriceAlert } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    typeof (value as { data?: unknown }).data ===
      'object' &&
    (value as { data?: unknown }).data !== null &&
    !Array.isArray(
      (value as { data?: unknown }).data,
    )
  );
}

function isWrappedPriceAlertList(
  value: unknown,
): value is { data: PriceAlert[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    Array.isArray(
      (value as { data?: unknown }).data,
    )
  );
}

/**
 * ============================================================================
 * UNWRAP HELPERS
 * ============================================================================
 */

function unwrapPriceAlert(
  response: unknown,
): PriceAlert {
  if (isWrappedPriceAlert(response)) {
    return response.data;
  }

  return response as PriceAlert;
}

function unwrapPriceAlertList(
  response: unknown,
): PriceAlert[] {
  if (isWrappedPriceAlertList(response)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response as PriceAlert[];
  }

  return [];
}

/**
 * ============================================================================
 * API
 * ============================================================================
 */

export const priceAlertsApi = {
  /**
   * ==========================================================================
   * LIST MY PRICE ALERTS
   * ==========================================================================
   *
   * GET /travel/price-alerts
   */
  async list(): Promise<PriceAlert[]> {
    const response =
      await travelApi.get<PriceAlertListResponse>(
        '/travel/price-alerts',
      );

    return unwrapPriceAlertList(response);
  },

  /**
   * ==========================================================================
   * CREATE PRICE ALERT
   * ==========================================================================
   *
   * POST /travel/price-alerts
   */
  async create(
    data: CreatePriceAlertInput,
  ): Promise<PriceAlert> {
    const response =
      await travelApi.post<PriceAlertResponse>(
        '/travel/price-alerts',
        data,
      );

    return unwrapPriceAlert(response);
  },

  /**
   * ==========================================================================
   * DELETE PRICE ALERT
   * ==========================================================================
   *
   * DELETE /travel/price-alerts/:id
   */
  async remove(
    id: string,
  ): Promise<unknown> {
    const response =
      await travelApi.delete<unknown>(
        `/travel/price-alerts/${encodeURIComponent(id)}`,
      );

    return unwrapApiData(response);
  },
};

export default priceAlertsApi;