import type { Product } from '../../types/product.types';
import { stockLabel } from '../../utils/product';

export function ProductInventory({ product }: { product: Product }) {
  const isLow = product.stockStatus === 'low_stock';
  const isOut = product.stockStatus === 'out_of_stock';

  return (
    <div className="pdp-inventory">
      <span className="stock-row" style={isLow || isOut ? { color: 'var(--red)' } : undefined}>
        {stockLabel(product.stockStatus)}
      </span>
      {isLow && <span className="pdp-inventory-note mono">Only {product.stockQuantity} left</span>}
      <span className="pdp-sku mono">SKU: {product.sku}</span>
    </div>
  );
}
