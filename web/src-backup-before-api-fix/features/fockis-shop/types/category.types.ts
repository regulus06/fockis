export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string; // emoji used throughout the existing design
  description?: string;
  parentSlug?: string | null;
  productCount?: number;
  imageUrl?: string;
}

export interface CategoryWithChildren extends Category {
  children: Category[];
}
