import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ShopPagination } from '../components/common/ShopPagination';
import { ShopError } from '../components/common/ShopError';

import { ProductGrid } from '../components/products/ProductGrid';
import { ProductGridSkeleton } from '../components/products/ProductGridSkeleton';
import { CategoryFilters } from '../components/categories/CategoryFilters';
import { CategorySidebar } from '../components/categories/CategorySidebar';

import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { applyClientFilters } from '../utils/productFilters';

import type { ProductListFilters } from '../types/product.types';

export default function ShopSearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';

  const [filters, setFilters] = useState<ProductListFilters>({
    query,
    page: 1,
    pageSize: 24,
  });

  useEffect(() => {
    setFilters((previous) => {
      if (previous.query === query && previous.page === 1) {
        return previous;
      }
      return { ...previous, query, page: 1 };
    });
  }, [query]);

  const { data, loading, error } = useProducts(filters);
  const { categories } = useCategories();

  const totalPages = useMemo(() => {
    if (!data || !data.pageSize || data.pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const items = useMemo(() => applyClientFilters(data?.items ?? [], filters), [data, filters]);

  const handlePageChange = (page: number) => {
    setFilters((previous) => ({ ...previous, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main className="fk-container fk-page">
        <ShopBreadcrumbs
          items={[
            { label: 'Shop', to: '/shop' },
            { label: query ? `Search: "${query}"` : 'Search' },
          ]}
        />

        <div className="fk-page__head">
          <div>
            <h1>{query ? <>Results for “{query}”</> : 'All products'}</h1>
            {data && (
              <p>
                {data.total.toLocaleString()} {data.total === 1 ? 'result' : 'results'}
              </p>
            )}
          </div>
        </div>

        <div className="category-page-layout category-page-layout-with-sidebar">
          <CategorySidebar categories={categories} />

          <div className="category-page-results">
            <CategoryFilters filters={filters} onChange={(next) => setFilters({ ...next, page: next.page ?? 1 })} />

            {loading && <ProductGridSkeleton />}

            {!loading && error && <ShopError message={error} />}

            {!loading && !error && data && (
              <>
                <ProductGrid
                  products={items}
                  emptyMessage={
                    query
                      ? `No products matched “${query}”. Try a shorter or different search.`
                      : 'Try searching for something.'
                  }
                />

                {totalPages > 1 && (
                  <ShopPagination page={data.page} totalPages={totalPages} onPageChange={handlePageChange} />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <ShopFooter />
    </div>
  );
}
