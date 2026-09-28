import { formatPrice } from '../../utils/currency';

interface PriceProps {
  price: number;
  salePrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export function Price({ price, salePrice, size = 'md' }: PriceProps) {
  const hasDiscount = salePrice != null && salePrice < price;
  const now = hasDiscount ? salePrice! : price;

  return (
    <div className="price-line" style={size === 'lg' ? { fontSize: 20 } : undefined}>
      <span className="price-now mono">{formatPrice(now)}</span>
      {hasDiscount && <span className="price-old mono">{formatPrice(price)}</span>}
    </div>
  );
}
