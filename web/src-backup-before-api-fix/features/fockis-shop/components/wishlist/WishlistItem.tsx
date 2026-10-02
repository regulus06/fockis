import type { Product } from '../../types/product.types';
import { ProductCard } from '../products/ProductCard';

export function WishlistItem({ product }: { product: Product }) {
  return <ProductCard product={product} />;
}
