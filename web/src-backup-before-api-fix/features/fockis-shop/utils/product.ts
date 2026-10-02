import type { Product, StockStatus } from '../types/product.types';

export function stockLabel(status: StockStatus): string {
  switch (status) {
    case 'in_stock':
      return '✓ In Stock';
    case 'low_stock':
      return 'Low Stock';
    case 'out_of_stock':
      return 'Out of Stock';
    case 'backorder':
      return 'Available on Backorder';
    default:
      return '';
  }
}

export function primaryImageUrl(product: Product): string | undefined {
  return product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url;
}

export function relatedProducts(product: Product, all: Product[], limit = 6): Product[] {
  return all
    .filter((p) => p.id !== product.id && (p.categorySlug === product.categorySlug || p.storeSlug === product.storeSlug))
    .slice(0, limit);
}
