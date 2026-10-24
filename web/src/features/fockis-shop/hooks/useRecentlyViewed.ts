
import { useEffect, useMemo, useState } from "react";

import type { Product } from "../types/product.types";
import { listProducts } from "../services/productApi";
import { useRecentlyViewedStore } from "../store/recentlyViewedStore";

/**
 * Loads recently viewed products from the current product catalogue.
 * Stale IDs are ignored, avoiding repeated 404 requests for deleted products.
 */
export function useRecentlyViewedProducts(options: {
  excludeId?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { excludeId, limit = 12, enabled = true } = options;

  const entries = useRecentlyViewedStore((state) => state.entries);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const ids = useMemo(
    () =>
      entries
        .map((entry) => entry.id)
        .filter((id) => Boolean(id) && id !== excludeId)
        .slice(0, limit),
    [entries, excludeId, limit],
  );

  const key = ids.join("|");

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadRecentlyViewed() {
      setLoading(true);

      try {
        // Fetch current products once instead of making a request for every
        // saved ID. Deleted or outdated IDs are naturally skipped.
        const result = await listProducts({
          page: 1,
          pageSize: 100,
          sort: "newest",
        });

        if (cancelled) return;

        const currentProducts = new Map(
          result.items.map((product) => [product.id, product]),
        );

        const matched = ids
          .map((id) => currentProducts.get(id))
          .filter((product): product is Product => Boolean(product));

        setProducts(matched);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "[Fockis Shop] Could not load recently viewed products:",
            error,
          );
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRecentlyViewed();

    return () => {
      cancelled = true;
    };
    // `key` represents the saved IDs and avoids unnecessary repeat requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const recentCategories = useMemo(() => {
    const seen = new Set<string>();

    for (const entry of entries) {
      if (entry.categorySlug) seen.add(entry.categorySlug);
    }

    return Array.from(seen);
  }, [entries]);

  return {
    products,
    loading,
    hasHistory: products.length > 0,
    recentCategories,
  };
}

export function useRecordProductView(product: Product | null) {
  const record = useRecentlyViewedStore((state) => state.record);

  useEffect(() => {
    if (!product?.id) return;

    record({
      id: product.id,
      slug: product.slug,
      categorySlug: product.categorySlug || undefined,
    });
  }, [product?.id, product?.slug, product?.categorySlug, record]);
}
