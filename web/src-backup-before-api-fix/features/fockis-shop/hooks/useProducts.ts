import { useEffect, useState } from "react";

import type { ProductListFilters } from "../types/product.types";

import {
  listProducts,
  type ProductPaginatedResult,
} from "../services/productApi";

export interface UseProductsResult {
  data: ProductPaginatedResult | null;
  loading: boolean;
  error: string | null;
}

export function useProducts(
  filters: ProductListFilters = {},
): UseProductsResult {
  const [data, setData] = useState<ProductPaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    listProducts(filters)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setData(result);
      })
      .catch((errorValue: unknown) => {
        if (cancelled) {
          return;
        }

        setData(null);

        if (errorValue instanceof Error) {
          setError(errorValue.message);
        } else {
          setError("Failed to load products.");
        }
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
  }, [JSON.stringify(filters)]);

  return {
    data,
    loading,
    error,
  };
}

export default useProducts;