import { travelApi } from './travelApi';

/**
 * ============================================================================
 * FOCKIS TRAVEL — TRIPS API
 * ============================================================================
 *
 * Backend:
 * apps/api/src/fockis-travel-backend/travel-src/trips/
 *
 * Endpoints:
 * GET    /travel/trips
 * GET    /travel/trips/:id
 * POST   /travel/trips
 * PATCH  /travel/trips/:id
 * DELETE /travel/trips/:id
 *
 * The model intentionally remains flexible so the frontend can preserve
 * the complete trip-planning data represented by Fockis Travel.
 * ============================================================================
 */

/* ============================================================================
   TRIP ITEM
============================================================================ */

export interface TravelTripItem {
  id?: string;
  listingId?: string;
  bookingId?: string;

  type?: string;
  category?: string;

  name?: string;
  title?: string;
  description?: string;

  startDate?: string;
  endDate?: string;

  startTime?: string;
  endTime?: string;

  location?: string;
  address?: string;
  city?: string;
  country?: string;

  price?: number;
  currency?: string;

  quantity?: number;

  notes?: string;

  metadata?: Record<string, unknown>;

  [key: string]: unknown;
}

/* ============================================================================
   MAIN TRIP MODEL
============================================================================ */

export interface TravelTrip {
  _id?: string;
  id?: string;

  userId?: string;

  name: string;
  title?: string;

  description?: string;

  destination?: string;
  country?: string;
  city?: string;

  startDate?: string;
  endDate?: string;

  status?: string;

  items?: TravelTripItem[];

  listings?: TravelTripItem[];

  bookings?: TravelTripItem[];

  activities?: TravelTripItem[];

  travelers?: number;

  adults?: number;
  children?: number;
  infants?: number;

  budget?: number;
  total?: number;

  currency?: string;

  coverImage?: string;
  image?: string;
  images?: string[];

  notes?: string;

  isPublic?: boolean;
  public?: boolean;

  metadata?: Record<string, unknown>;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

/* ============================================================================
   CREATE INPUT
============================================================================ */

export interface CreateTripInput {
  name: string;

  title?: string;
  description?: string;

  destination?: string;
  country?: string;
  city?: string;

  startDate?: string;
  endDate?: string;

  status?: string;

  items?: TravelTripItem[];

  listings?: TravelTripItem[];

  bookings?: TravelTripItem[];

  activities?: TravelTripItem[];

  travelers?: number;

  adults?: number;
  children?: number;
  infants?: number;

  budget?: number;
  total?: number;

  currency?: string;

  coverImage?: string;
  image?: string;
  images?: string[];

  notes?: string;

  isPublic?: boolean;
  public?: boolean;

  metadata?: Record<string, unknown>;

  [key: string]: unknown;
}

/* ============================================================================
   UPDATE INPUT
============================================================================ */

export type UpdateTripInput = Partial<CreateTripInput>;

/* ============================================================================
   SEARCH PARAMETERS
============================================================================ */

export interface TripSearchParams {
  status?: string;

  destination?: string;
  country?: string;
  city?: string;

  startDate?: string;
  endDate?: string;

  search?: string;
  q?: string;

  [key: string]: unknown;
}

/* ============================================================================
   RESPONSE TYPES
============================================================================ */

/**
 * Backend may return either:
 *
 *   T
 *
 * or:
 *
 *   { data: T }
 */
type ApiResponse<T> =
  | T
  | {
      data: T;
    };

/**
 * Explicitly unwrap the backend response.
 *
 * We intentionally do this here instead of relying on unwrapApiData()
 * because the shared helper currently widens the returned type and causes
 * TypeScript union errors in this service.
 */
function unwrap<T>(
  response: ApiResponse<T>,
): T {
  if (
    response !== null &&
    typeof response === 'object' &&
    'data' in response
  ) {
    return (
      response as {
        data: T;
      }
    ).data;
  }

  return response as T;
}

/* ============================================================================
   ID HELPER
============================================================================ */

function getTripId(
  trip: TravelTrip,
): string {
  return trip._id || trip.id || '';
}

/* ============================================================================
   TRIPS API
============================================================================ */

export const tripsApi = {
  /* --------------------------------------------------------------------------
     LIST MY TRIPS
  -------------------------------------------------------------------------- */

  async list(
    params: TripSearchParams = {},
  ): Promise<TravelTrip[]> {
    const response =
      await travelApi.get<
        ApiResponse<TravelTrip[]>
      >(
        '/travel/trips',
        params,
      );

    return unwrap<TravelTrip[]>(
      response,
    );
  },

  /* --------------------------------------------------------------------------
     ALIAS: LIST MINE
  -------------------------------------------------------------------------- */

  async listMine(
    params: TripSearchParams = {},
  ): Promise<TravelTrip[]> {
    return this.list(params);
  },

  /* --------------------------------------------------------------------------
     GET ONE TRIP
  -------------------------------------------------------------------------- */

  async getById(
    id: string,
  ): Promise<TravelTrip> {
    const response =
      await travelApi.get<
        ApiResponse<TravelTrip>
      >(
        `/travel/trips/${encodeURIComponent(id)}`,
      );

    return unwrap<TravelTrip>(
      response,
    );
  },

  /* --------------------------------------------------------------------------
     ALIAS: GET
  -------------------------------------------------------------------------- */

  async get(
    id: string,
  ): Promise<TravelTrip> {
    return this.getById(id);
  },

  /* --------------------------------------------------------------------------
     CREATE TRIP
  -------------------------------------------------------------------------- */

  async create(
    data: CreateTripInput,
  ): Promise<TravelTrip> {
    const response =
      await travelApi.post<
        ApiResponse<TravelTrip>
      >(
        '/travel/trips',
        data,
      );

    return unwrap<TravelTrip>(
      response,
    );
  },

  /* --------------------------------------------------------------------------
     UPDATE TRIP
  -------------------------------------------------------------------------- */

  async update(
    id: string,
    data: UpdateTripInput,
  ): Promise<TravelTrip> {
    const response =
      await travelApi.patch<
        ApiResponse<TravelTrip>
      >(
        `/travel/trips/${encodeURIComponent(id)}`,
        data,
      );

    return unwrap<TravelTrip>(
      response,
    );
  },

  /* --------------------------------------------------------------------------
     DELETE TRIP
  -------------------------------------------------------------------------- */

  async remove(
    id: string,
  ): Promise<unknown> {
    const response =
      await travelApi.delete<unknown>(
        `/travel/trips/${encodeURIComponent(id)}`,
      );

    return response;
  },

  /* --------------------------------------------------------------------------
     ALIAS: DELETE
  -------------------------------------------------------------------------- */

  async delete(
    id: string,
  ): Promise<unknown> {
    return this.remove(id);
  },

  /* --------------------------------------------------------------------------
     UPDATE ITEMS
  -------------------------------------------------------------------------- */

  async updateItems(
    id: string,
    items: TravelTripItem[],
  ): Promise<TravelTrip> {
    return this.update(id, {
      items,
    });
  },

  /* --------------------------------------------------------------------------
     ADD ITEM
  -------------------------------------------------------------------------- */

  async addItem(
    id: string,
    item: TravelTripItem,
  ): Promise<TravelTrip> {
    const trip =
      await this.getById(id);

    const currentItems =
      Array.isArray(trip.items)
        ? trip.items
        : [];

    return this.update(id, {
      items: [
        ...currentItems,
        item,
      ],
    });
  },

  /* --------------------------------------------------------------------------
     REMOVE ITEM
  -------------------------------------------------------------------------- */

  async removeItem(
    id: string,
    itemId: string,
  ): Promise<TravelTrip> {
    const trip =
      await this.getById(id);

    const currentItems =
      Array.isArray(trip.items)
        ? trip.items
        : [];

    const nextItems =
      currentItems.filter(
        (item) =>
          item.id !== itemId &&
          item.listingId !== itemId &&
          item.bookingId !== itemId,
      );

    return this.update(id, {
      items: nextItems,
    });
  },

  /* --------------------------------------------------------------------------
     DUPLICATE TRIP
  -------------------------------------------------------------------------- */

  async duplicate(
    id: string,
    overrides: Partial<CreateTripInput> = {},
  ): Promise<TravelTrip> {
    const original =
      await this.getById(id);

    const {
      _id,
      id: originalId,
      userId,
      createdAt,
      updatedAt,
      ...tripData
    } = original;

    /*
     * These fields belong to the existing database record and must not
     * be copied into the new trip.
     */
    void _id;
    void originalId;
    void userId;
    void createdAt;
    void updatedAt;

    const originalName =
      original.name ||
      original.title ||
      'My Trip';

    return this.create({
      ...tripData,

      name:
        overrides.name ||
        `${originalName} Copy`,

      ...overrides,
    });
  },

  /* --------------------------------------------------------------------------
     GET ID
  -------------------------------------------------------------------------- */

  getId(
    trip: TravelTrip,
  ): string {
    return getTripId(trip);
  },
};

export default tripsApi;