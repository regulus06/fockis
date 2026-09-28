import type { Product } from '../../types/product.types';
import { ProductRail } from './ProductRail';

export function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="pdp-related">
      <div className="reco-header">
        <div>
          <h2 style={{ fontSize: 22 }}>You might also like</h2>
        </div>
      </div>
      <ProductRail products={products} ariaLabel="Related products" />
    </section>
  );
}
