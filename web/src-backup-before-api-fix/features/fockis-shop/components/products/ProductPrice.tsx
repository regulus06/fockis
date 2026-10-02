import type { Product } from '../../types/product.types';
import { Price } from '../common/Price';
import { discountPercent } from '../../utils/pricing';

export function ProductPrice({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' | 'lg' }) {
  const discount = discountPercent(product);
  return (
    <div className="pdp-price-block">
      <Price price={product.price} salePrice={product.salePrice} size={size} />
      {discount > 0 && <span className="deal-pct" style={{ position: 'static', display: 'inline-flex' }}>-{discount}%</span>}
    </div>
  );
}
