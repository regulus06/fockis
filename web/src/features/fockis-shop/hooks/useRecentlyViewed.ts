import { useEffect, useMemo, useState } from "react";

import type { Product } from "../types/product.types";
import { getProductById } from "../services/productApi";
import { useRecentlyViewedStore } from "../store/recentlyViewedStore";

/**
 * Loads the products this shopper viewed recently, live from the API.
 * Products that no longer exist are skipped silently.
 */
export function useRecentlyViewedProducts(options: {
  excludeId?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { excludeId, limit = 12, enabled = true } = options;
  const entries = useRecentlyViewedStore((state) => state.entries);

  const ids = useMemo(
    () =>
      entries
        .map((entry) => entry.id)
        .filter((id) => id && id !== excludeId)
        .slice(0, limit),
    [entries, excludeId, limit],
  );

  const key = ids.join("|");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.allSettled(ids.map((id) => getProductById(id)))
      .then((results) => {
        if (cancelled) return;

        setProducts(
          results
            .map((result) =>
              result.status === "fulfilled" ? result.value : null,
            )
            .filter((product): product is Product => Boolean(product)),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  /** Categories the shopper has been browsing, most recent first. */
  const recentCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (entry.categorySlug) seen.add(entry.categorySlug);
    }
    return Array.from(seen);
  }, [entries]);

  return { products, loading, hasHistory: ids.length > 0, recentCategories };
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
