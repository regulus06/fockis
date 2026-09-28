import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { CategoryHeader } from '../components/categories/CategoryHeader';
import { CategoryFilters } from '../components/categories/CategoryFilters';
import { ProductGrid } from '../components/products/ProductGrid';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopError } from '../components/common/ShopError';
import { ShopPagination } from '../components/common/ShopPagination';
import { useProducts } from '../hooks/useProducts';
import { getCategoryBySlug } from '../services/categoryApi';
import type { Category } from '../types/category.types';
import type { ProductListFilters } from '../types/product.types';

export default function ShopCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [filters, setFilters] = useState<ProductListFilters>({ categorySlug: slug, page: 1, pageSize: 16 });

  useEffect(() => {
    if (!slug) return;
    setFilters((prev) => ({ ...prev, categorySlug: slug, page: 1 }));
    getCategoryBySlug(slug).then(setCategory);
  }, [slug]);

  const { data, loading, error } = useProducts(filters);

  if (!slug) return null;

  return (
    <div className="shop-page-root">
      <ShopHeader />
      <div className="wrap" style={{ paddingTop: 32 }}>
        {category ? <CategoryHeader category={category} resultCount={data?.total} /> : <ShopLoading rows={1} />}
      </div>

      <section className="tight">
        <div className="wrap">
          <div className="category-page-layout">
            <CategoryFilters filters={filters} onChange={setFilters} />
            <div className="category-page-results">
              {loading && <ShopLoading label="Loading products…" rows={4} />}
              {error && <ShopError message={error} />}
              {data && (
                <>
                  <ProductGrid products={data.items} emptyMessage="No products in this category yet." />
                  <ShopPagination page={data.page} totalPages={data.totalPages} onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))} />
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
