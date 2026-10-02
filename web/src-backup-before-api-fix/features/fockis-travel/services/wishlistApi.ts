import { travelApi, unwrapApiData } from './travelApi';

/**
 * ============================================================================
 * FOCKIS TRAVEL — WISHLIST API
 * ============================================================================
 *
 * Backend:
 * apps/api/src/fockis-travel-backend/travel-src/wishlist/
 *
 * Endpoints:
 *
 * GET    /travel/wishlist
 * POST   /travel/wishlist/:listingId
 * DELETE /travel/wishlist/:listingId
 *
 * Supports both direct and { data: ... } API responses.
 * ============================================================================
 */

export interface WishlistItem {
  _id?: string;
  id?: string;

  userId?: string;

  listingId?: string;

  /**
   * Some backend responses may include the populated listing.
   */
  listing?: unknown;

  note?: string;

  createdAt?: string;
  updatedAt?: string;

  metadata?: Record<string, unknown>;

  [key: string]: unknown;
}

export interface AddWishlistInput {
  listingId: string;
  note?: string;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * RESPONSE TYPES
 * ============================================================================
 */

type WishlistResponse =
  | WishlistItem
  | {
      data: WishlistItem;
    };

type WishlistListResponse =
  | WishlistItem[]
  | {
      data: WishlistItem[];
    };

/**
 * ============================================================================
 * TYPE GUARDS
 * ============================================================================
 */

function isWrappedWishlistItem(
  value: unknown,
): value is { data: WishlistItem } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('data' in value)
  ) {
    return false;
  }

  const data = (
    value as {
      data?: unknown;
    }
  ).data;

  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data)
  );
}

function isWrappedWishlistList(
  value: unknown,
): value is { data: WishlistItem[] } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('data' in value)
  ) {
    return false;
  }

  return Array.isArray(
    (
      value as {
        data?: unknown;
      }
    ).data,
  );
}

/**
 * ============================================================================
 * UNWRAP HELPERS
 * ============================================================================
 */

function unwrapWishlistItem(
  response: unknown,
): WishlistItem {
  if (isWrappedWishlistItem(response)) {
    return response.data;
  }

  return response as WishlistItem;
}

function unwrapWishlistList(
  response: unknown,
): WishlistItem[] {
  if (isWrappedWishlistList(response)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response as WishlistItem[];
  }

  return [];
}

/**
 * ============================================================================
 * WISHLIST API
 * ============================================================================
 */

export const wishlistApi = {
  /**
   * --------------------------------------------------------------------------
   * LIST WISHLIST
   * --------------------------------------------------------------------------
   *
   * GET /travel/wishlist
   */
  async list(): Promise<WishlistItem[]> {
    const response =
      await travelApi.get<WishlistListResponse>(
        '/travel/wishlist',
      );

    return unwrapWishlistList(response);
  },

  /**
   * Alias used by some wishlist screens.
   */
  async listMine(): Promise<WishlistItem[]> {
    return this.list();
  },

  /**
   * --------------------------------------------------------------------------
   * ADD TO WISHLIST
   * --------------------------------------------------------------------------
   *
   * POST /travel/wishlist/:listingId
   */
  async add(
    listingId: string,
    note?: string,
  ): Promise<WishlistItem> {
    const body =
      note && note.trim()
        ? {
            note: note.trim(),
          }
        : undefined;

    const response =
      await travelApi.post<WishlistResponse>(
        `/travel/wishlist/${encodeURIComponent(listingId)}`,
        body,
      );

    return unwrapWishlistItem(response);
  },

  /**
   * --------------------------------------------------------------------------
   * ADD ITEM
   * --------------------------------------------------------------------------
   *
   * Object-based convenience method.
   */
  async addItem(
    data: AddWishlistInput,
  ): Promise<WishlistItem> {
    return this.add(
      data.listingId,
      data.note,
    );
  },

  /**
   * --------------------------------------------------------------------------
   * REMOVE FROM WISHLIST
   * --------------------------------------------------------------------------
   *
   * DELETE /travel/wishlist/:listingId
   */
  async remove(
    listingId: string,
  ): Promise<unknown> {
    const response =
      await travelApi.delete<unknown>(
        `/travel/wishlist/${encodeURIComponent(listingId)}`,
      );

    return unwrapApiData(response);
  },

  /**
   * Alias used by some screens.
   */
  async removeItem(
    listingId: string,
  ): Promise<unknown> {
    return this.remove(listingId);
  },

  /**
   * --------------------------------------------------------------------------
   * TOGGLE
   * --------------------------------------------------------------------------
   *
   * If currently saved:
   *   remove it
   *
   * If not currently saved:
   *   add it
   *
   * No additional GET request is performed.
   */
  async toggle(
    listingId: string,
    isCurrentlySaved: boolean,
    note?: string,
  ): Promise<WishlistItem | unknown> {
    if (isCurrentlySaved) {
      return this.remove(listingId);
    }

    return this.add(
      listingId,
      note,
    );
  },
};

export default wishlistApi;