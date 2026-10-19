import type { Product, ProductListFilters } from "../types/product.types";
import { effectivePrice } from "./pricing";
import { getRealRating } from "./productMedia";

/**
 * The products API currently accepts page, pageSize, search, categoryId and
 * sort only. Price, stock and rating filters are therefore applied in the
 * browser to the page of results that was loaded. Listing pages say so next
 * to the filters so shoppers are not misled.
 */
export function hasClientFilters(filters: ProductListFilters): boolean {
  return (
    filters.minPrice != null ||
    filters.maxPrice != null ||
    Boolean(filters.inStockOnly) ||
    (filters.minRating ?? 0) > 0
  );
}

export function applyClientFilters(
  products: Product[],
  filters: ProductListFilters,
): Product[] {
  if (!hasClientFilters(filters)) return products;

  return products.filter((product) => {
    const price = Number(effectivePrice(product));

    if (filters.minPrice != null && !(price >= filters.minPrice)) return false;
    if (filters.maxPrice != null && !(price <= filters.maxPrice)) return false;

    if (
      filters.inStockOnly &&
      (product.stockStatus === "out_of_stock" || product.stockQuantity <= 0)
    ) {
      return false;
    }

    if ((filters.minRating ?? 0) > 0) {
      const rating = getRealRating(product);
      if (!rating || rating.average < (filters.minRating ?? 0)) return false;
    }

    return true;
  });
}
