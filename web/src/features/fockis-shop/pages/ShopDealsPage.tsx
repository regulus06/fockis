import { useMemo, useState } from 'react';

import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductGridSkeleton } from '../components/products/ProductGridSkeleton';
import { ShopError } from '../components/common/ShopError';
import { ShopPagination } from '../components/common/ShopPagination';
import { useProducts } from '../hooks/useProducts';
import { getRealDiscount } from '../utils/productMedia';
import type { ProductListFilters } from '../types/product.types';

type DealSort = 'discount' | 'newest' | 'price_asc';

export default function ShopDealsPage() {
  const [filters, setFilters] = useState<ProductListFilters>({
    page: 1,
    pageSize: 60,
    sort: 'newest',
  });
  const [dealSort, setDealSort] = useState<DealSort>('discount');
  const [minDiscount, setMinDiscount] = useState(0);

  const { data, loading, error } = useProducts(filters);

  // Only products with a real, lower sale price are deals.
  const dealItems = useMemo(() => {
    const deals = (data?.items ?? []).filter((product) => {
      const discount = getRealDiscount(product);
      return discount > 0 && discount >= minDiscount;
    });

    if (dealSort === 'discount') {
      return [...deals].sort((a, b) => getRealDiscount(b) - getRealDiscount(a));
    }
    if (dealSort === 'price_asc') {
      return [...deals].sort((a, b) => Number(a.salePrice ?? a.price) - Number(b.salePrice ?? b.price));
    }
    return deals;
  }, [data, dealSort, minDiscount]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    if (typeof data.totalPages === 'number' && Number.isFinite(data.totalPages) && data.totalPages > 0) {
      return data.totalPages;
    }
    const total = Number(data.total);
    const pageSize = Number(data.pageSize);
    return Number.isFinite(total) && Number.isFinite(pageSize) && pageSize > 0
      ? Math.max(1, Math.ceil(total / pageSize))
      : 1;
  }, [data]);

  const currentPage = data?.page ?? filters.page ?? 1;

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main className="fk-container fk-page">
        <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: "Today's deals" }]} />

        <div className="fk-deals-hero">
          <div>
            <span className="fk-section__eyebrow">Deals</span>
            <h1>Today’s deals</h1>
            <p>Real discounts from sellers across the Fockis marketplace.</p>
          </div>
        </div>

        <div className="fk-pills fk-pills--wrap" role="group" aria-label="Minimum discount">
          {[0, 10, 25, 50].map((value) => (
            <button
              key={value}
              type="button"
              className={minDiscount === value ? 'fk-pill is-active' : 'fk-pill'}
              aria-pressed={minDiscount === value}
              onClick={() => setMinDiscount(value)}
            >
              {value === 0 ? 'All deals' : `${value}% off or more`}
            </button>
          ))}

          <label className="fk-pills__sort">
            <span>Sort</span>
            <select
              className="shop-select"
              value={dealSort}
              onChange={(event) => setDealSort(event.target.value as DealSort)}
            >
              <option value="discount">Biggest discount</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
            </select>
          </label>
        </div>

        {loading && <ProductGridSkeleton />}

        {!loading && error && <ShopError message={error} />}

        {!loading && !error && data && (
          <>
            <ProductGrid
              products={dealItems}
              emptyMessage={
                minDiscount > 0
                  ? `No deals of ${minDiscount}% or more on this page.`
                  : 'No active deals right now — check back soon.'
              }
            />

            {totalPages > 1 && (
              <ShopPagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setFilters((previous) => ({ ...previous, page }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </main>

      <ShopFooter />
    </div>
  );
}
