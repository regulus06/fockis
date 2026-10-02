import type { Category } from '../types/category.types';

// TODO(backend): replace with GET /api/shop/categories
export const CATEGORIES: Category[] = [
  { id: 'cat_fashion', slug: 'fashion', name: 'Fashion', icon: '👗', productCount: 184000 },
  { id: 'cat_electronics', slug: 'electronics', name: 'Electronics', icon: '🔌', productCount: 96000 },
  { id: 'cat_tools-construction', slug: 'tools-construction', name: 'Tools & Construction', icon: '🔧', productCount: 41000 },
  { id: 'cat_home', slug: 'home', name: 'Home', icon: '🏠', productCount: 152000 },
  { id: 'cat_beauty', slug: 'beauty', name: 'Beauty', icon: '💄', productCount: 73000 },
  { id: 'cat_food-grocery', slug: 'food-grocery', name: 'Food & Grocery', icon: '🥫', productCount: 28000 },
  { id: 'cat_art-handmade', slug: 'art-handmade', name: 'Art & Handmade', icon: '🎨', productCount: 19500 },
  { id: 'cat_jewelry', slug: 'jewelry', name: 'Jewelry', icon: '💍', productCount: 22400 },
  { id: 'cat_automotive', slug: 'automotive', name: 'Automotive', icon: '🚗', productCount: 15800 },
  { id: 'cat_sports', slug: 'sports', name: 'Sports', icon: '⚽', productCount: 34200 },
  { id: 'cat_kids', slug: 'kids', name: 'Kids', icon: '🧸', productCount: 27600 },
  { id: 'cat_books', slug: 'books', name: 'Books', icon: '📚', productCount: 61200 },
];

export function findCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
