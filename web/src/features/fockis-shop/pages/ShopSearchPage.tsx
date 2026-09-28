import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopSearch } from '../components/common/ShopSearch';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ShopPagination } from '../components/common/ShopPagination';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopError } from '../components/common/ShopError';

import { ProductGrid } from '../components/products/ProductGrid';
import { CategoryFilters } from '../components/categories/CategoryFilters';

import { useProducts } from '../hooks/useProducts';

import type { ProductListFilters } from '../types/product.types';

export default function ShopSearchPage() {
const [searchParams] = useSearchParams();

const query = searchParams.get('q')?.trim() ?? '';

const [filters, setFilters] = useState<ProductListFilters>({
query,
page: 1,
pageSize: 16,
});

useEffect(() => {
setFilters((previous) => {
if (previous.query === query && previous.page === 1) {
return previous;
}

  return {
    ...previous,
    query,
    page: 1,
  };
});

}, [query]);

const { data, loading, error } = useProducts(filters);

const totalPages = useMemo(() => {
if (!data || !data.pageSize || data.pageSize <= 0) {
return 1;
}

return Math.max(
  1,
  Math.ceil(data.total / data.pageSize),
);

}, [data]);

const handleFilterChange = (
nextFilters: ProductListFilters,
) => {
setFilters({
...nextFilters,
page: 1,
});
};

const handlePageChange = (page: number) => {
setFilters((previous) => ({
...previous,
page,
}));
};

return ( <div className="shop-page-root"> <ShopHeader />

```
  <div
    className="wrap"
    style={{
      paddingTop: 32,
    }}
  >
    <ShopBreadcrumbs
      items={[
        {
          label: 'Shop',
          to: '/shop',
        },
        {
          label: query
            ? `Search: "${query}"`
            : 'Search',
        },
      ]}
    />

    <div
      style={{
        maxWidth: 640,
        margin: '18px 0 30px',
      }}
    >
      <ShopSearch
        initialValue={query}
        variant="compact"
      />
    </div>
  </div>

  <section className="tight">
    <div className="wrap">
      <div className="section-head">
        <div>
          <h2>
            {query
              ? `Results for "${query}"`
              : 'All products'}
          </h2>

          {data && (
            <p>
              {data.total.toLocaleString()} products found
            </p>
          )}
        </div>
      </div>

      <div className="category-page-layout">
        <CategoryFilters
          filters={filters}
          onChange={handleFilterChange}
        />

        <div className="category-page-results">
          {loading && (
            <ShopLoading
              label="Searching…"
              rows={4}
            />
          )}

          {error && (
            <ShopError message={error} />
          )}

          {!loading && !error && data && (
            <>
              <ProductGrid
                products={data.items}
                emptyMessage={
                  query
                    ? `No products matched "${query}".`
                    : 'Try searching for something.'
                }
              />

              {totalPages > 1 && (
                <ShopPagination
                  page={data.page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  </section>

  <ShopFooter />
</div>

);
}
