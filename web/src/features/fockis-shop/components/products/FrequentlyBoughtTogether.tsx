import type { Product } from '../../types/product.types';
import { useCart } from '../../hooks/useCart';
import { effectivePrice } from '../../utils/pricing';
import { formatPrice } from '../../utils/currency';

interface FrequentlyBoughtTogetherProps {
  mainProduct: Product;
  addOnProducts: Product[];
}

export function FrequentlyBoughtTogether({ mainProduct, addOnProducts }: FrequentlyBoughtTogetherProps) {
  const { addItem } = useCart();
  if (addOnProducts.length === 0) return null;

  const allProducts = [mainProduct, ...addOnProducts];
  const total = allProducts.reduce((sum, p) => sum + effectivePrice(p), 0);

  function handleAddAll() {
    for (const p of allProducts) {
      addItem({
        productId: p.id,
        productSlug: p.slug,
        productName: p.name,
        productEmoji: p.emoji,
        storeId: p.storeId,
        storeSlug: p.storeSlug,
        storeName: p.storeName,
        unitPrice: effectivePrice(p),
        maxQuantity: p.stockQuantity,
      });
    }
  }

  return (
    <section className="pdp-fbt">
      <h2 style={{ fontSize: 22 }}>Frequently bought together</h2>
      <div className="bundle-card">
        <div className="bundle-items">
          {allProducts.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="bundle-thumb">{p.emoji ?? '📦'}</div>
                <div style={{ fontSize: 12, marginTop: 6, maxWidth: 90 }}>{p.name}</div>
                <div className="mono" style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{formatPrice(effectivePrice(p))}</div>
              </div>
              {i < allProducts.length - 1 && <span className="bundle-plus">+</span>}
            </div>
          ))}
        </div>
        <div className="bundle-summary">
          <div className="bundle-total">
            {formatPrice(total)} <span>total for all {allProducts.length} items</span>
          </div>
          <button type="button" className="btn btn-navy" onClick={handleAddAll}>
            Add all to cart
          </button>
        </div>
      </div>
    </section>
  );
}
