import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  bookingsApi,
} from '../services/bookingsApi';

import type {
  CreateBookingInput,
  TravelBooking,
} from '../types';

/**
 * ============================================================================
 * FOCKIS TRAVEL — USE BOOKINGS
 * ============================================================================
 */

export function useBookings(
  autoLoad = true,
) {
  const [bookings, setBookings] = useState<
    TravelBooking[]
  >([]);

  const [loading, setLoading] =
    useState(autoLoad);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await bookingsApi.listMine();

        setBookings(
          Array.isArray(result)
            ? result
            : [],
        );

        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load bookings.';

        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createBooking = useCallback(
    async (
      data: CreateBookingInput,
    ) => {
      setError(null);

      try {
        const booking =
          await bookingsApi.create(data);

        setBookings((current) => [
          booking,
          ...current,
        ]);

        return booking;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create booking.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const cancelBooking = useCallback(
    async (id: string) => {
      setError(null);

      try {
        await bookingsApi.cancel(id);

        setBookings((current) =>
          current.filter(
            (booking) =>
              booking._id !== id &&
              booking.id !== id,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to cancel booking.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  return {
    bookings,
    loading,
    error,
    refresh,
    createBooking,
    cancelBooking,
  };
}

export default useBookings;