import type { Product } from '../../types/product.types';
import { shippingBadges, estimatedDeliveryLabel } from '../../utils/shipping';

export function ProductShipping({ product }: { product: Product }) {
  const badges = shippingBadges(product.shipping);
  const eta = estimatedDeliveryLabel(product.shipping);

  return (
    <div className="pdp-shipping">
      <h4>Delivery &amp; pickup</h4>
      <div className="ship-badges" style={{ marginTop: 8 }}>
        {badges.map((b) => (
          <span key={b}>{b}</span>
        ))}
      </div>
      {eta && <div className="pdp-eta mono">Estimated delivery: {eta}</div>}
      {product.shipping.freeDeliveryThreshold != null && (
        <div className="pdp-free-delivery">
          Free delivery on orders over ${product.shipping.freeDeliveryThreshold} from this store.
        </div>
      )}
    </div>
  );
}
