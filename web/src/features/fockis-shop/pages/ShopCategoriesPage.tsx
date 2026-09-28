import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { CategoryGrid } from '../components/categories/CategoryGrid';
import { ShopLoading } from '../components/common/ShopLoading';
import { useCategories } from '../hooks/useCategories';

export default function ShopCategoriesPage() {
  const { categories, loading } = useCategories();

  return (
    <div className="shop-page-root">
      <ShopHeader />
      <div className="wrap" style={{ paddingTop: 32 }}>
        <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: 'Categories' }]} />
      </div>
      <section>
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="sec-label"><span className="num">01</span>CATEGORIES</div>
              <h1>Shop by category</h1>
            </div>
          </div>
          {loading ? <ShopLoading rows={3} /> : <CategoryGrid categories={categories} />}
        </div>
      </section>
      <ShopFooter />
    </div>
  );
}
