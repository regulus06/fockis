import { useEffect, useState } from "react";

import {
listStores,
type StoreListResult,
} from "../services/storeApi";

import type { StoreListFilters } from "../types/store.types";

interface UseStoresResult {
data: StoreListResult | null;
loading: boolean;
error: string | null;
}

export function useStores(
filters: StoreListFilters = {},
): UseStoresResult {
const [data, setData] =
useState<StoreListResult | null>(null);

const [loading, setLoading] =
useState(true);

const [error, setError] =
useState<string | null>(null);

useEffect(() => {
let cancelled = false;

setLoading(true);
setError(null);
setData(null);

listStores(filters)
  .then((result) => {
    if (cancelled) {
      return;
    }

    setData(result);
  })
  .catch((err) => {
    if (cancelled) {
      return;
    }

    setData(null);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to load stores",
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

}, [
filters.categorySlug,
filters.countryCode,
filters.query,
filters.location,
filters.minRating,
filters.verifiedOnly,
filters.sort,
filters.page,
filters.pageSize,
]);

return {
data,
loading,
error,
};
}
