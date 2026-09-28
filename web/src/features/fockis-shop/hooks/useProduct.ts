import { useEffect, useState } from "react";

import type { Product } from "../types/product.types";

import { getProductBySlug } from "../services/productApi";

export interface UseProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

export function useProduct(
  slug: string | undefined,
): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      setProduct(null);
      setError(null);
      setLoading(false);
      return;
    }

    setProduct(null);
    setError(null);
    setLoading(true);

    getProductBySlug(slug)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setProduct(result);
      })
      .catch((errorValue: unknown) => {
        if (cancelled) {
          return;
        }

        setProduct(null);

        if (errorValue instanceof Error) {
          setError(errorValue.message);
        } else {
          setError("Failed to load product.");
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
  }, [slug]);

  return {
    product,
    loading,
    error,
    notFound: !loading && !error && product === null,
  };
}

export default useProduct;