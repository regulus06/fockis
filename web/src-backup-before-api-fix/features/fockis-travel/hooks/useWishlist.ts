import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  wishlistApi,
} from '../services/wishlistApi';

import type {
  AddWishlistInput,
  WishlistItem,
} from '../types';

/**
 * ============================================================================
 * FOCKIS TRAVEL — USE WISHLIST
 * ============================================================================
 */

export function useWishlist(
  autoLoad = true,
) {
  const [wishlist, setWishlist] =
    useState<WishlistItem[]>([]);

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
          await wishlistApi.list();

        setWishlist(
          Array.isArray(result)
            ? result
            : [],
        );

        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load wishlist.';

        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const add = useCallback(
    async (
      listingId: string,
      note?: string,
    ) => {
      setError(null);

      try {
        const item =
          await wishlistApi.add(
            listingId,
            note,
          );

        setWishlist((current) => {
          const exists =
            current.some(
              (entry) =>
                entry.listingId ===
                listingId,
            );

          if (exists) {
            return current;
          }

          return [
            item,
            ...current,
          ];
        });

        return item;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to add wishlist item.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const addItem = useCallback(
    async (
      data: AddWishlistInput,
    ) => {
      return add(
        data.listingId,
        data.note,
      );
    },
    [add],
  );

  const remove = useCallback(
    async (
      listingId: string,
    ) => {
      setError(null);

      try {
        await wishlistApi.remove(
          listingId,
        );

        setWishlist((current) =>
          current.filter(
            (item) =>
              item.listingId !==
              listingId &&
              item._id !== listingId &&
              item.id !== listingId,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to remove wishlist item.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const toggle = useCallback(
    async (
      listingId: string,
      note?: string,
    ) => {
      const saved =
        wishlist.some(
          (item) =>
            item.listingId ===
            listingId,
        );

      setError(null);

      try {
        if (saved) {
          await wishlistApi.remove(
            listingId,
          );

          setWishlist((current) =>
            current.filter(
              (item) =>
                item.listingId !==
                listingId,
            ),
          );

          return null;
        }

        const item =
          await wishlistApi.add(
            listingId,
            note,
          );

        setWishlist((current) => [
          item,
          ...current,
        ]);

        return item;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to update wishlist.';

        setError(message);
        throw err;
      }
    },
    [wishlist],
  );

  const isSaved = useCallback(
    (listingId: string) =>
      wishlist.some(
        (item) =>
          item.listingId ===
          listingId,
      ),
    [wishlist],
  );

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  return {
    wishlist,
    loading,
    error,

    refresh,

    add,
    addItem,
    remove,
    toggle,
    isSaved,
  };
}

export default useWishlist;