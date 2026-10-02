import { travelApi } from './travelApi';

/**
 * ============================================================================
 * FOCKIS TRAVEL — LISTINGS API
 * ============================================================================
 *
 * Backend:
 *   /travel/listings
 *
 * Operations:
 *   GET    /travel/listings
 *   GET    /travel/listings/:id
 *   POST   /travel/listings
 *   PATCH  /travel/listings/:id
 *   DELETE /travel/listings/:id
 *
 * Listing-specific information that does not belong to the common listing
 * fields can be stored in `metadata`.
 * ============================================================================
 */

export type ListingType =
  | 'stay'
  | 'rental'
  | 'meeting'
  | 'event'
  | 'restaurant'
  | 'car'
  | 'flight'
  | 'transfer'
  | 'experience'
  | 'attraction'
  | 'thing';

export interface TravelListing {
  _id?: string;
  id?: string;

  name: string;
  type: ListingType;
  description: string;

  country: string;
  city: string;
  address?: string;

  latitude?: number;
  longitude?: number;

  images?: string[];
  amenities?: string[];
  tags?: string[];

  rating?: number;
  reviewCount?: number;

  currency: string;
  price: number;
  priceUnit?: string;

  active?: boolean;
  partnerId?: string;

  metadata?: Record<string, unknown>;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * SEARCH PARAMETERS
 * ============================================================================
 */

export interface ListingSearchParams {
  type?: ListingType;

  country?: string;
  city?: string;

  search?: string;
  q?: string;

  minPrice?: number;
  maxPrice?: number;

  active?: boolean;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * CREATE LISTING
 * ============================================================================
 */

export interface CreateListingInput {
  name: string;
  type: ListingType;
  description: string;

  country: string;
  city: string;

  address?: string;

  latitude?: number;
  longitude?: number;

  images?: string[];
  amenities?: string[];
  tags?: string[];

  currency: string;
  price: number;
  priceUnit?: string;

  metadata?: Record<string, unknown>;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * API RESPONSE TYPES
 * ============================================================================
 */

interface WrappedListingResponse {
  data: TravelListing;
}

interface WrappedListingListResponse {
  data: TravelListing[];
}

type ListingResponse =
  | TravelListing
  | WrappedListingResponse;

type ListingListResponse =
  | TravelListing[]
  | WrappedListingListResponse;

/**
 * ============================================================================
 * TYPE GUARDS
 * ============================================================================
 */

function isWrappedListingResponse(
  response: ListingResponse,
): response is WrappedListingResponse {
  if (
    typeof response !== 'object' ||
    response === null ||
    !('data' in response)
  ) {
    return false;
  }

  const data = response.data;

  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data)
  );
}

function isWrappedListingListResponse(
  response: ListingListResponse,
): response is WrappedListingListResponse {
  if (
    typeof response !== 'object' ||
    response === null ||
    !('data' in response)
  ) {
    return false;
  }

  return Array.isArray(response.data);
}

/**
 * ============================================================================
 * RESPONSE UNWRAPPERS
 * ============================================================================
 */

function unwrapListing(
  response: ListingResponse,
): TravelListing {
  if (isWrappedListingResponse(response)) {
    return response.data;
  }

  return response;
}

function unwrapListingList(
  response: ListingListResponse,
): TravelListing[] {
  if (isWrappedListingListResponse(response)) {
    return response.data;
  }

  return response;
}

/**
 * ============================================================================
 * LISTINGS API
 * ============================================================================
 */

export const listingsApi = {
  /**
   * --------------------------------------------------------------------------
   * SEARCH / LIST ALL
   * --------------------------------------------------------------------------
   */
  async search(
    params: ListingSearchParams = {},
  ): Promise<TravelListing[]> {
    const response =
      await travelApi.get<ListingListResponse>(
        '/travel/listings',
        params,
      );

    return unwrapListingList(response);
  },

  /**
   * --------------------------------------------------------------------------
   * GET ONE LISTING
   * --------------------------------------------------------------------------
   */
  async getById(
    id: string,
  ): Promise<TravelListing> {
    const response =
      await travelApi.get<ListingResponse>(
        `/travel/listings/${encodeURIComponent(id)}`,
      );

    return unwrapListing(response);
  },

  /**
   * --------------------------------------------------------------------------
   * GET BY TYPE
   * --------------------------------------------------------------------------
   */
  async getByType(
    type: ListingType,
    params: Omit<
      ListingSearchParams,
      'type'
    > = {},
  ): Promise<TravelListing[]> {
    return listingsApi.search({
      ...params,
      type,
    });
  },

  /**
   * --------------------------------------------------------------------------
   * STAYS
   * --------------------------------------------------------------------------
   */
  async getStays(
    params: Omit<
      ListingSearchParams,
      'type'
    > = {},
  ): Promise<TravelListing[]> {
    return listingsApi.getByType(
      'stay',
      params,
    );
  },

  /**
   * --------------------------------------------------------------------------
   * CARS
   * --------------------------------------------------------------------------
   */
  async getCars(
    params: Omit<
      ListingSearchParams,
      'type'
    > = {},
  ): Promise<TravelListing[]> {
    return listingsApi.getByType(
      'car',
      params,
    );
  },

  /**
   * --------------------------------------------------------------------------
   * RESTAURANTS
   * --------------------------------------------------------------------------
   */
  async getRestaurants(
    params: Omit<
      ListingSearchParams,
      'type'
    > = {},
  ): Promise<TravelListing[]> {
    return listingsApi.getByType(
      'restaurant',
      params,
    );
  },

  /**
   * --------------------------------------------------------------------------
   * EXPERIENCES
   * --------------------------------------------------------------------------
   */
  async getExperiences(
    params: Omit<
      ListingSearchParams,
      'type'
    > = {},
  ): Promise<TravelListing[]> {
    return listingsApi.getByType(
      'experience',
      params,
    );
  },

  /**
   * --------------------------------------------------------------------------
   * TRANSFERS
   * --------------------------------------------------------------------------
   */
  async getTransfers(
    params: Omit<
      ListingSearchParams,
      'type'
    > = {},
  ): Promise<TravelListing[]> {
    return listingsApi.getByType(
      'transfer',
      params,
    );
  },

  /**
   * --------------------------------------------------------------------------
   * MEETING ROOMS
   * --------------------------------------------------------------------------
   */
  async getMeetings(
    params: Omit<
      ListingSearchParams,
      'type'
    > = {},
  ): Promise<TravelListing[]> {
    return listingsApi.getByType(
      'meeting',
      params,
    );
  },

  /**
   * --------------------------------------------------------------------------
   * ATTRACTIONS
   * --------------------------------------------------------------------------
   */
  async getAttractions(
    params: Omit<
      ListingSearchParams,
      'type'
    > = {},
  ): Promise<TravelListing[]> {
    return listingsApi.getByType(
      'attraction',
      params,
    );
  },

  /**
   * --------------------------------------------------------------------------
   * CREATE
   * --------------------------------------------------------------------------
   */
  async create(
    data: CreateListingInput,
  ): Promise<TravelListing> {
    const response =
      await travelApi.post<ListingResponse>(
        '/travel/listings',
        data,
      );

    return unwrapListing(response);
  },

  /**
   * --------------------------------------------------------------------------
   * UPDATE
   * --------------------------------------------------------------------------
   */
  async update(
    id: string,
    data: Partial<CreateListingInput>,
  ): Promise<TravelListing> {
    const response =
      await travelApi.patch<ListingResponse>(
        `/travel/listings/${encodeURIComponent(id)}`,
        data,
      );

    return unwrapListing(response);
  },

  /**
   * --------------------------------------------------------------------------
   * DELETE
   * --------------------------------------------------------------------------
   */
  async remove(
    id: string,
  ): Promise<unknown> {
    return travelApi.delete<unknown>(
      `/travel/listings/${encodeURIComponent(id)}`,
    );
  },
};

export default listingsApi;