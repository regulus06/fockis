import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { CategoryFilters } from '../components/categories/CategoryFilters';
import { CategorySidebar } from '../components/categories/CategorySidebar';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductGridSkeleton } from '../components/products/ProductGridSkeleton';
import { ShopError } from '../components/common/ShopError';
import { ShopPagination } from '../components/common/ShopPagination';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { applyClientFilters } from '../utils/productFilters';
import type { ProductListFilters, ProductSortOption } from '../types/product.types';

const SORTS: ProductSortOption[] = ['relevance', 'price_asc', 'price_desc', 'newest', 'rating', 'bestselling'];

function readSort(value: string | null): ProductSortOption | undefined {
  return value && (SORTS as string[]).includes(value) ? (value as ProductSortOption) : undefined;
}

export default function ShopProductsPage() {
  const [searchParams] = useSearchParams();
  const sortParam = readSort(searchParams.get('sort'));

  const [filters, setFilters] = useState<ProductListFilters>({ page: 1, pageSize: 24, sort: sortParam });

  useEffect(() => {
    setFilters((prev) => (prev.sort === sortParam ? prev : { ...prev, sort: sortParam, page: 1 }));
  }, [sortParam]);

  const { data, loading, error } = useProducts(filters);
  const { categories } = useCategories();

  const items = useMemo(() => applyClientFilters(data?.items ?? [], filters), [data, filters]);

  const title =
    filters.sort === 'newest' ? 'New arrivals' : filters.sort === 'rating' ? 'Top rated products' : 'All products';

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />
      <main className="fk-container fk-page">
        <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: title }]} />

        <div className="fk-page__head">
          <div>
            <h1>{title}</h1>
            {data && <p>{data.total.toLocaleString()} products</p>}
          </div>
        </div>

        <div className="category-page-layout category-page-layout-with-sidebar">
          <CategorySidebar categories={categories} />
          <div className="category-page-results">
            <CategoryFilters filters={filters} onChange={setFilters} />
            {loading && <ProductGridSkeleton />}
            {!loading && error && <ShopError message={error} />}
            {!loading && !error && data && (
              <>
                <ProductGrid products={items} />
                <ShopPagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={(p) => {
                    setFilters((prev) => ({ ...prev, page: p }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </>
            )}
          </div>
        </div>
      </main>
      <ShopFooter />
    </div>
  );
}
