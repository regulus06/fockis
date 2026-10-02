import type { Store } from '../../types/store.types';
import { StoreBanner } from './StoreBanner';
import { StoreLogo } from './StoreLogo';
import { Badge } from '../common/Badge';
import { storeLocationLabel } from '../../utils/store';

export function StoreHeader({ store }: { store: Store }) {
  return (
    <div className="store-page-header">
      <StoreBanner store={store} />
      <div className="store-page-header-body wrap">
        <StoreLogo store={store} />
        <div className="store-page-header-info">
          <div className="row-top">
            <h1>{store.name}</h1>
            <div className="rating"><span className="star">★</span>{store.rating.average.toFixed(1)} <span className="count mono">({store.rating.totalReviews.toLocaleString()})</span></div>
          </div>
          <div className="loc">{storeLocationLabel(store)}</div>
          <div className="badge-row">
            {store.verified && <Badge variant="verified" />}
            <span className="tag">{store.productCount} products</span>
            {store.orderCount != null && <span className="tag">{store.orderCount.toLocaleString()}+ orders</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
