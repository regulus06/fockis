import { useEffect, useState } from "react";

import type { Product } from "../types/product.types";

import {
  getProductById,
  getProductBySlug,
} from "../services/productApi";

/**
 * Product links use the slug. getProductBySlug only searches the first page
 * of products, so when the slug is not found we also try the value as a
 * product ID (cards fall back to the ID when a product has no slug).
 */
async function loadProduct(slugOrId: string): Promise<Product | null> {
  const bySlug = await getProductBySlug(slugOrId);
  if (bySlug) return bySlug;

  if (/^[a-f0-9]{24}$/i.test(slugOrId)) {
    return getProductById(slugOrId);
  }

  return null;
}

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

    loadProduct(slug)
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