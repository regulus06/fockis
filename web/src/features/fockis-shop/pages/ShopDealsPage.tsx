import { useMemo, useState } from 'react';

import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ProductGrid } from '../components/products/ProductGrid';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopError } from '../components/common/ShopError';
import { ShopPagination } from '../components/common/ShopPagination';
import { useProducts } from '../hooks/useProducts';
import type { ProductListFilters } from '../types/product.types';

export default function ShopDealsPage() {
const [filters, setFilters] = useState<ProductListFilters>({
page: 1,
pageSize: 20,
sort: 'newest',
});

const { data, loading, error } = useProducts(filters);

const dealItems = useMemo(() => {
if (!data?.items) {
return [];
}

return data.items.filter((product) => {
  const price = Number(product.price);

  const salePrice =
    product.salePrice == null
      ? null
      : Number(product.salePrice);

  return (
    Number.isFinite(price) &&
    salePrice != null &&
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < price
  );
});

}, [data]);

const totalPages = useMemo(() => {
if (!data) {
return 1;
}

if (
  typeof data.totalPages === 'number' &&
  Number.isFinite(data.totalPages) &&
  data.totalPages > 0
) {
  return data.totalPages;
}

const total = Number(data.total);
const pageSize = Number(data.pageSize);

if (
  Number.isFinite(total) &&
  Number.isFinite(pageSize) &&
  pageSize > 0
) {
  return Math.max(1, Math.ceil(total / pageSize));
}

return 1;

}, [data]);

const currentPage = data?.page ?? filters.page ?? 1;

return ( <div className="shop-page-root"> <ShopHeader />

  <div className="wrap" style={{ paddingTop: 32 }}>
    <ShopBreadcrumbs
      items={[
        { label: 'Shop', to: '/shop' },
        { label: 'Deals' },
      ]}
    />
  </div>

  <section className="tight">
    <div className="wrap">
      <div className="section-head">
        <div>
          <div className="sec-label">
            <span className="num">01</span>
            DEALS
          </div>

          <h1>Today's deals</h1>

          <p>
            Discounted products from sellers across the marketplace.
          </p>
        </div>
      </div>

      {loading && (
        <ShopLoading
          label="Loading deals…"
          rows={4}
        />
      )}

      {!loading && error && (
        <ShopError message={error} />
      )}

      {!loading && !error && data && (
        <>
          <ProductGrid
            products={dealItems}
            emptyMessage="No active deals right now — check back soon."
          />

          {totalPages > 1 && (
            <ShopPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setFilters((previous) => ({
                  ...previous,
                  page,
                }));
              }}
            />
          )}
        </>
      )}
    </div>
  </section>

  <ShopFooter />
</div>

);
}
