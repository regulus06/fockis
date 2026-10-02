import { Link } from 'react-router-dom';

import { CategoryGrid as CategoryGridComponent } from '../categories/CategoryGrid';
import { useCategories } from '../../hooks/useCategories';
import { ShopLoading } from '../common/ShopLoading';

export function CategoryGrid() {
const {
categories,
loading,
error,
} = useCategories();

return ( <section id="categories"> <div className="wrap"> <div className="section-head"> <div> <div className="sec-label"> <span className="num">02</span>
CATEGORIES </div>

```
        <h2>Shop by category</h2>
      </div>

      <Link
        to="/shop/categories"
        className="section-link"
      >
        View all categories →
      </Link>
    </div>

    {loading ? (
      <ShopLoading rows={2} />
    ) : error ? (
      <div className="shop-empty-state">
        <h3>Categories are unavailable</h3>
        <p>
          We could not load the marketplace categories right now.
          Please try again shortly.
        </p>
      </div>
    ) : categories.length === 0 ? (
      <div className="shop-empty-state">
        <h3>No categories available</h3>
        <p>
          Categories will appear here when they are available in the
          Fockis Shop marketplace.
        </p>
      </div>
    ) : (
      <CategoryGridComponent categories={categories} />
    )}
  </div>
</section>

);
}
