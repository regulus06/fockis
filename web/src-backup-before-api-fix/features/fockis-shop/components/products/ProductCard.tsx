import { Link } from 'react-router-dom';
import type { Product } from '../../types/product.types';
import { Badge } from '../common/Badge';
import { discountPercent, effectivePrice } from '../../utils/pricing';
import { stockLabel } from '../../utils/product';
import { shippingBadges } from '../../utils/shipping';
import { formatPrice } from '../../utils/currency';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';

export function ProductCard({ product }: { product: Product }) {
  const { has, toggle } = useWishlist();
  const { addItem } = useCart();
  const discount = discountPercent(product);
  const saved = has(product.id);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productEmoji: product.emoji,
      storeId: product.storeId,
      storeSlug: product.storeSlug,
      storeName: product.storeName,
      unitPrice: effectivePrice(product),
      maxQuantity: product.stockQuantity,
    });
  }

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
  }

  return (
    <Link to={`/shop/product/${product.slug}`} className="product-card" style={{ display: 'block' }}>
      <div className="thumb">
        {discount > 0 && <span className="discount-flag">-{discount}%</span>}
        {product.emoji ?? '📦'}
        <button className="fav" aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} type="button" onClick={handleToggleWishlist}>
          {saved ? '♥' : '♡'}
        </button>
      </div>
      <div className="body">
        {product.badge && (
          <div className="badge-row">
            <Badge variant={product.badge} />
          </div>
        )}
        <div className="store-line">🏪 {product.storeName} {product.storeCountryFlag ?? ''}</div>
        <h4>{product.name}</h4>
        <div className="price-line">
          <span className="price-now mono">{formatPrice(effectivePrice(product))}</span>
          {discount > 0 && <span className="price-old mono">{formatPrice(product.price)}</span>}
        </div>
        <div className="stock-row" style={product.stockStatus === 'low_stock' ? { color: 'var(--red)' } : undefined}>
          {stockLabel(product.stockStatus)}
        </div>
        <div className="ship-badges">
          {shippingBadges(product.shipping).slice(0, 2).map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <button className="add-btn" type="button" onClick={handleAddToCart} disabled={product.stockStatus === 'out_of_stock'}>
          {product.stockStatus === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  );
}
