import { useState } from 'react';
import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { CategoryFilters } from '../components/categories/CategoryFilters';
import { CategorySidebar } from '../components/categories/CategorySidebar';
import { ProductGrid } from '../components/products/ProductGrid';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopError } from '../components/common/ShopError';
import { ShopPagination } from '../components/common/ShopPagination';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import type { ProductListFilters } from '../types/product.types';

export default function ShopProductsPage() {
  const [filters, setFilters] = useState<ProductListFilters>({ page: 1, pageSize: 20 });
  const { data, loading, error } = useProducts(filters);
  const { categories } = useCategories();

  return (
    <div className="shop-page-root">
      <ShopHeader />
      <div className="wrap" style={{ paddingTop: 32 }}>
        <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: 'All Products' }]} />
      </div>
      <section className="tight">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h1>All products</h1>
              {data && <p>{data.total.toLocaleString()} products</p>}
            </div>
          </div>
          <div className="category-page-layout category-page-layout-with-sidebar">
            <CategorySidebar categories={categories} />
            <div>
              <CategoryFilters filters={filters} onChange={setFilters} />
              <div className="category-page-results">
                {loading && <ShopLoading label="Loading products…" rows={4} />}
                {error && <ShopError message={error} />}
                {data && (
                  <>
                    <ProductGrid products={data.items} />
                    <ShopPagination page={data.page} totalPages={data.totalPages} onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <ShopFooter />
    </div>
  );
}
