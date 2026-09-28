/**
 * ============================================================================
 * FOCKIS TRAVEL — BOOKING TYPES
 * ============================================================================
 *
 * Shared booking types for pages, components, hooks, and services.
 *
 * The canonical API definition currently lives in:
 *   services/bookingsApi.ts
 *
 * Re-exporting here prevents duplicate TypeScript models.
 * ============================================================================
 */

export type {
  TravelBooking,
  CreateBookingInput,
} from '../services/bookingsApi';