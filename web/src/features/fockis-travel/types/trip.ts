/**
 * ============================================================================
 * FOCKIS TRAVEL — TRIP TYPES
 * ============================================================================
 *
 * Shared trip-planning models.
 *
 * The TravelTrip model intentionally remains flexible so the frontend can
 * preserve listings, bookings, activities, transportation, destinations,
 * restaurants, experiences, meetings, and other trip information.
 * ============================================================================
 */

export type {
  TravelTrip,
  TravelTripItem,
  CreateTripInput,
  UpdateTripInput,
  TripSearchParams,
} from '../services/tripsApi';