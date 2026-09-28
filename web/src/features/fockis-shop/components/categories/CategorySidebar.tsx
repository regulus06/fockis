import { NavLink } from 'react-router-dom';
import type { Category } from '../../types/category.types';

export function CategorySidebar({ categories }: { categories: Category[] }) {
  return (
    <aside className="category-sidebar">
      <h4>Categories</h4>
      <nav>
        {categories.map((c) => (
          <NavLink key={c.id} to={`/shop/category/${c.slug}`} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <span aria-hidden="true">{c.icon}</span> {c.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
