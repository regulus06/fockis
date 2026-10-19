import { NavLink } from 'react-router-dom';
import type { Category } from '../../types/category.types';

export function CategorySidebar({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return <aside className="category-sidebar category-sidebar--empty" aria-hidden="true" />;

  return (
    <aside className="category-sidebar">
      <h4>Department</h4>
      <nav aria-label="Departments">
        <NavLink to="/shop/products" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
          All products
        </NavLink>
        {categories.map((c) => (
          <NavLink key={c.id} to={`/shop/category/${c.slug}`} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <span aria-hidden="true">{c.icon}</span> {c.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
