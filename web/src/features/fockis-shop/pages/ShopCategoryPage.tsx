import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { CategoryHeader } from '../components/categories/CategoryHeader';
import { CategoryFilters } from '../components/categories/CategoryFilters';
import { CategorySidebar } from '../components/categories/CategorySidebar';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductGridSkeleton } from '../components/products/ProductGridSkeleton';
import { ShopError } from '../components/common/ShopError';
import { ShopPagination } from '../components/common/ShopPagination';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { applyClientFilters } from '../utils/productFilters';
import type { Category } from '../types/category.types';
import type { ProductListFilters } from '../types/product.types';

function fallbackCategory(slug: string): Category {
  const name = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return { id: slug, slug, name: name || 'Category', icon: '🛍️' };
}

export default function ShopCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { categories, loading: categoriesLoading } = useCategories();
  const [filters, setFilters] = useState<ProductListFilters>({ categorySlug: slug, page: 1, pageSize: 24 });

  useEffect(() => {
    if (!slug) return;
    setFilters((prev) => ({ ...prev, categorySlug: slug, page: 1 }));
  }, [slug]);

  const category = useMemo<Category | null>(() => {
    if (!slug) return null;
    return categories.find((c) => c.slug === slug) ?? (categoriesLoading ? null : fallbackCategory(slug));
  }, [categories, categoriesLoading, slug]);

  const { data, loading, error } = useProducts(filters, { enabled: Boolean(slug) });
  const items = useMemo(() => applyClientFilters(data?.items ?? [], filters), [data, filters]);

  if (!slug) return null;

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />
      <main className="fk-container fk-page">
        {category ? (
          <CategoryHeader category={category} resultCount={data?.total} />
        ) : (
          <div className="category-page-header" aria-hidden="true">
            <div className="fk-skel fk-skel--line fk-skel--short" />
            <div className="fk-skel fk-skel--title" />
          </div>
        )}

        <div className="category-page-layout category-page-layout-with-sidebar">
          <CategorySidebar categories={categories} />
          <div className="category-page-results">
            <CategoryFilters filters={filters} onChange={setFilters} />
            {loading && <ProductGridSkeleton />}
            {!loading && error && <ShopError message={error} />}
            {!loading && !error && data && (
              <>
                <ProductGrid products={items} emptyMessage="No products in this category yet. Check back soon." />
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
