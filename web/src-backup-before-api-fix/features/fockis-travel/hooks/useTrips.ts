import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  tripsApi,
} from '../services/tripsApi';

import type {
  CreateTripInput,
  TravelTrip,
  TravelTripItem,
  TripSearchParams,
  UpdateTripInput,
} from '../types';

/**
 * ============================================================================
 * FOCKIS TRAVEL — USE TRIPS
 * ============================================================================
 */

export function useTrips(
  params: TripSearchParams = {},
  autoLoad = true,
) {
  const [trips, setTrips] =
    useState<TravelTrip[]>([]);

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
          await tripsApi.list(params);

        setTrips(
          Array.isArray(result)
            ? result
            : [],
        );

        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load trips.';

        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [params],
  );

  const createTrip = useCallback(
    async (
      data: CreateTripInput,
    ) => {
      setError(null);

      try {
        const trip =
          await tripsApi.create(data);

        setTrips((current) => [
          trip,
          ...current,
        ]);

        return trip;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create trip.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const updateTrip = useCallback(
    async (
      id: string,
      data: UpdateTripInput,
    ) => {
      setError(null);

      try {
        const updated =
          await tripsApi.update(
            id,
            data,
          );

        setTrips((current) =>
          current.map((trip) =>
            (trip._id || trip.id) === id
              ? updated
              : trip,
          ),
        );

        return updated;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to update trip.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      setError(null);

      try {
        await tripsApi.remove(id);

        setTrips((current) =>
          current.filter(
            (trip) =>
              trip._id !== id &&
              trip.id !== id,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to delete trip.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const addItem = useCallback(
    async (
      id: string,
      item: TravelTripItem,
    ) => {
      setError(null);

      try {
        const updated =
          await tripsApi.addItem(
            id,
            item,
          );

        setTrips((current) =>
          current.map((trip) =>
            (trip._id || trip.id) === id
              ? updated
              : trip,
          ),
        );

        return updated;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to add trip item.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const removeItem = useCallback(
    async (
      id: string,
      itemId: string,
    ) => {
      setError(null);

      try {
        const updated =
          await tripsApi.removeItem(
            id,
            itemId,
          );

        setTrips((current) =>
          current.map((trip) =>
            (trip._id || trip.id) === id
              ? updated
              : trip,
          ),
        );

        return updated;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to remove trip item.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const duplicateTrip = useCallback(
    async (
      id: string,
      overrides: Partial<CreateTripInput> = {},
    ) => {
      setError(null);

      try {
        const duplicate =
          await tripsApi.duplicate(
            id,
            overrides,
          );

        setTrips((current) => [
          duplicate,
          ...current,
        ]);

        return duplicate;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to duplicate trip.';

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
    trips,
    loading,
    error,

    refresh,

    createTrip,
    updateTrip,
    deleteTrip,

    addItem,
    removeItem,
    duplicateTrip,
  };
}

export default useTrips;