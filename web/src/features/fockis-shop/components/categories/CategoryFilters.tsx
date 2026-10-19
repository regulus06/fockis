import type { ProductListFilters, ProductSortOption } from '../../types/product.types';
import { hasClientFilters } from '../../utils/productFilters';

interface CategoryFiltersProps {
  filters: ProductListFilters;
  onChange: (filters: ProductListFilters) => void;
}

const SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: 'relevance', label: 'Featured' },
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'rating', label: 'Avg. customer review' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function CategoryFilters({ filters, onChange }: CategoryFiltersProps) {
  const active = hasClientFilters(filters);

  return (
    <div className="category-filters" aria-label="Sort and filter">
      <div className="category-filters-row">
        <label htmlFor="fk-sort">Sort by</label>
        <select
          id="fk-sort"
          value={filters.sort ?? 'relevance'}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as ProductSortOption, page: 1 })}
          className="shop-select"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="category-filters-row">
        <label htmlFor="fk-min-price">Price</label>
        <input
          id="fk-min-price"
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="$ Min"
          value={filters.minPrice ?? ''}
          onChange={(e) => onChange({ ...filters, minPrice: toNumber(e.target.value), page: filters.page })}
        />
        <span aria-hidden="true">–</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="$ Max"
          aria-label="Maximum price"
          value={filters.maxPrice ?? ''}
          onChange={(e) => onChange({ ...filters, maxPrice: toNumber(e.target.value), page: filters.page })}
        />
      </div>

      <label className="category-filters-checkbox">
        <input
          type="checkbox"
          checked={filters.inStockOnly ?? false}
          onChange={(e) => onChange({ ...filters, inStockOnly: e.target.checked || undefined, page: filters.page })}
        />
        In stock only
      </label>

      <label className="category-filters-checkbox">
        <input
          type="checkbox"
          checked={(filters.minRating ?? 0) >= 4}
          onChange={(e) => onChange({ ...filters, minRating: e.target.checked ? 4 : undefined, page: filters.page })}
        />
        4★ &amp; up
      </label>

      {active && (
        <p className="category-filters-note">
          Price, stock and rating filters apply to the products on this page.{' '}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                minPrice: undefined,
                maxPrice: undefined,
                inStockOnly: undefined,
                minRating: undefined,
              })
            }
          >
            Clear filters
          </button>
        </p>
      )}
    </div>
  );
}
