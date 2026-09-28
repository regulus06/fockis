import type { Store } from '../../types/store.types';
import { storeShippingBadges } from '../../utils/store';

export function StoreShipping({ store }: { store: Store }) {
  return (
    <div className="store-page-shipping">
      <h3>Shipping from this store</h3>
      <div className="ship-badges" style={{ marginTop: 8 }}>
        {storeShippingBadges(store).map((b) => (
          <span key={b}>{b}</span>
        ))}
      </div>
      {store.shipping.freeDeliveryThreshold != null && (
        <div className="pdp-free-delivery">
          Free delivery on orders over ${store.shipping.freeDeliveryThreshold} from this store.
        </div>
      )}
    </div>
  );
}
