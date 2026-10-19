import type { Category } from '../../types/category.types';
import { ShopBreadcrumbs } from '../common/ShopBreadcrumbs';

export function CategoryHeader({ category, resultCount }: { category: Category; resultCount?: number }) {
  return (
    <div className="category-page-header">
      <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: 'Categories', to: '/shop/categories' }, { label: category.name }]} />
      <div className="category-page-header-title">
        <span className="ic" aria-hidden="true">{category.icon}</span>
        <div>
          <h1>{category.name}</h1>
          {category.description && <p className="category-page-header-desc">{category.description}</p>}
          {resultCount != null && <p>{resultCount.toLocaleString()} {resultCount === 1 ? 'product' : 'products'}</p>}
        </div>
      </div>
    </div>
  );
}
