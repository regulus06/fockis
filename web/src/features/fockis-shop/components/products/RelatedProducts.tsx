import type { Product } from '../../types/product.types';
import { ProductRail } from './ProductRail';

export function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return <ProductRail products={products} ariaLabel="Related products" />;
}
