import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { CategoryGrid } from '../components/categories/CategoryGrid';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopError } from '../components/common/ShopError';
import { ShopEmptyState } from '../components/common/ShopEmptyState';
import { useCategories } from '../hooks/useCategories';

export default function ShopCategoriesPage() {
  const { categories, loading, error } = useCategories();

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />
      <main className="fk-container fk-page">
        <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: 'Categories' }]} />
        <div className="fk-page__head">
          <div>
            <h1>Shop by category</h1>
            <p>Browse every department on Fockis Shop.</p>
          </div>
        </div>
        {loading ? (
          <ShopLoading label="Loading categories…" rows={3} />
        ) : error ? (
          <ShopError message={error} />
        ) : categories.length === 0 ? (
          <ShopEmptyState icon="🗂️" title="No categories yet" message="Categories will appear here once they are set up." />
        ) : (
          <CategoryGrid categories={categories} />
        )}
      </main>
      <ShopFooter />
    </div>
  );
}
