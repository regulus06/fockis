import type { Product } from '../../types/product.types';
import { ProductCard } from './ProductCard';
import { ShopEmptyState } from '../common/ShopEmptyState';

export function ProductGrid({ products, emptyMessage = 'No products found.' }: { products: Product[]; emptyMessage?: string }) {
  if (products.length === 0) {
    return <ShopEmptyState icon="📦" title="Nothing here yet" message={emptyMessage} />;
  }
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
