import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  listingsApi,
} from '../services/listingsApi';

import type {
  CreateListingInput,
  ListingSearchParams,
  ListingType,
  TravelListing,
} from '../types';

/**
 * ============================================================================
 * FOCKIS TRAVEL — USE LISTINGS
 * ============================================================================
 */

export function useListings(
  params: ListingSearchParams = {},
  autoLoad = true,
) {
  const [listings, setListings] =
    useState<TravelListing[]>([]);

  const [loading, setLoading] =
    useState(autoLoad);

  const [error, setError] =
    useState<string | null>(null);

  const search = useCallback(
    async (
      searchParams: ListingSearchParams = params,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await listingsApi.search(
            searchParams,
          );

        setListings(
          Array.isArray(result)
            ? result
            : [],
        );

        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load listings.';

        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [params],
  );

  const getByType = useCallback(
    async (
      type: ListingType,
      searchParams: Omit<
        ListingSearchParams,
        'type'
      > = {},
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await listingsApi.getByType(
            type,
            searchParams,
          );

        setListings(
          Array.isArray(result)
            ? result
            : [],
        );

        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load listings.';

        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createListing = useCallback(
    async (
      data: CreateListingInput,
    ) => {
      setError(null);

      try {
        const listing =
          await listingsApi.create(data);

        setListings((current) => [
          listing,
          ...current,
        ]);

        return listing;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create listing.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const updateListing = useCallback(
    async (
      id: string,
      data: Partial<CreateListingInput>,
    ) => {
      setError(null);

      try {
        const updated =
          await listingsApi.update(
            id,
            data,
          );

        setListings((current) =>
          current.map((listing) => {
            const listingId =
              listing._id || listing.id;

            return listingId === id
              ? updated
              : listing;
          }),
        );

        return updated;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to update listing.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const removeListing = useCallback(
    async (id: string) => {
      setError(null);

      try {
        await listingsApi.remove(id);

        setListings((current) =>
          current.filter(
            (listing) =>
              listing._id !== id &&
              listing.id !== id,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to delete listing.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const refresh = useCallback(
    () => search(params),
    [params, search],
  );

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  return {
    listings,
    loading,
    error,

    search,
    refresh,
    getByType,

    createListing,
    updateListing,
    removeListing,
  };
}

export default useListings;