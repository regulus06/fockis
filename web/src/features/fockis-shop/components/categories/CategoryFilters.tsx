import type { ProductListFilters, ProductSortOption } from '../../types/product.types';

interface CategoryFiltersProps {
  filters: ProductListFilters;
  onChange: (filters: ProductListFilters) => void;
}

const SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export function CategoryFilters({ filters, onChange }: CategoryFiltersProps) {
  return (
    <div className="category-filters">
      <div className="category-filters-row">
        <label className="mono">Sort by</label>
        <select
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
        <label className="mono">Price</label>
        <input
          type="number"
          placeholder="Min"
          value={filters.minPrice ?? ''}
          onChange={(e) => onChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        />
        <span>–</span>
        <input
          type="number"
          placeholder="Max"
          value={filters.maxPrice ?? ''}
          onChange={(e) => onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        />
      </div>

      <label className="category-filters-checkbox">
        <input
          type="checkbox"
          checked={filters.inStockOnly ?? false}
          onChange={(e) => onChange({ ...filters, inStockOnly: e.target.checked, page: 1 })}
        />
        In stock only
      </label>

      <label className="category-filters-checkbox">
        <input
          type="checkbox"
          checked={(filters.minRating ?? 0) >= 4}
          onChange={(e) => onChange({ ...filters, minRating: e.target.checked ? 4 : undefined, page: 1 })}
        />
        4★ &amp; up
      </label>
    </div>
  );
}
