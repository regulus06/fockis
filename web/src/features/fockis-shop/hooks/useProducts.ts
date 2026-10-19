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

export interface UseProductsOptions {
  /** When false, no request is made (used for lazy, below-the-fold rails). */
  enabled?: boolean;
}

export function useProducts(
  filters: ProductListFilters = {},
  options: UseProductsOptions = {},
): UseProductsResult {
  const enabled = options.enabled ?? true;

  const [data, setData] = useState<ProductPaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

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
  }, [JSON.stringify(filters), enabled]);

  return {
    data,
    loading,
    error,
  };
}

export default useProducts;