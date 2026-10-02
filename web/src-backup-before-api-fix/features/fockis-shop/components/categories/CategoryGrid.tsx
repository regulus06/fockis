import type { Category } from '../../types/category.types';
import { CategoryCard } from './CategoryCard';

type CategoryGridProps = {
  categories?: Category[];
};

export function CategoryGrid({ categories = [] }: CategoryGridProps) {
  return (
    <div className="cat-grid">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
        />
      ))}
    </div>
  );
}