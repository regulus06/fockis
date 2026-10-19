import { Link } from 'react-router-dom';
import type { Category } from '../../types/category.types';
import { resolveProductImageUrl } from '../../utils/productImage';

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link to={`/shop/category/${category.slug}`} className="cat-tile">
      <div className="ic">
        {category.imageUrl ? (
          <img src={resolveProductImageUrl(category.imageUrl)} alt="" loading="lazy" />
        ) : (
          <span aria-hidden="true">{category.icon}</span>
        )}
      </div>
      <div className="t">{category.name}</div>
      {typeof category.productCount === 'number' && category.productCount > 0 && (
        <div className="n">{category.productCount.toLocaleString()} items</div>
      )}
    </Link>
  );
}
