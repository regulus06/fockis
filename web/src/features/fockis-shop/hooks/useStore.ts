import { useEffect, useState } from "react";

import type { Store } from "../types/store.types";
import { getStoreBySlug } from "../services/storeApi";

interface UseStoreResult {
  store: Store | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

export function useStore(
  slug: string | undefined,
): UseStoreResult {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // No slug means there is no store to load.
    if (!slug) {
      setStore(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setStore(null);

    getStoreBySlug(slug)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setStore(result);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setStore(null);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load store",
        );
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const notFound =
    !loading &&
    !error &&
    store === null;

  return {
    store,
    loading,
    error,
    notFound,
  };
}