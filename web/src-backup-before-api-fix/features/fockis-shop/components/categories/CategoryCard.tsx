import { Link } from 'react-router-dom';
import type { Category } from '../../types/category.types';

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link to={`/shop/category/${category.slug}`} className="cat-tile">
      <div className="ic">{category.icon}</div>
      <div className="t">{category.name}</div>
    </Link>
  );
}
