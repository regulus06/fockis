import type { Product } from '../../types/product.types';
import { WishlistItem } from './WishlistItem';
import { EmptyWishlist } from './EmptyWishlist';

export function WishlistGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return <EmptyWishlist />;
  return (
    <div className="product-grid">
      {products.map((p) => (
        <WishlistItem key={p.id} product={p} />
      ))}
    </div>
  );
}
