import type { Store } from '../../types/store.types';
import { StoreBanner } from './StoreBanner';
import { StoreLogo } from './StoreLogo';
import { Badge } from '../common/Badge';
import { Stars } from '../common/Stars';
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
            <Stars rating={store.rating.average} reviews={store.rating.totalReviews} showEmpty />
          </div>
          {store.location?.country && <div className="loc">{storeLocationLabel(store)}</div>}
          <div className="badge-row">
            {store.verified && <Badge variant="verified" />}
            <span className="tag">{store.productCount} products</span>
            {store.orderCount != null && store.orderCount > 0 && (
              <span className="tag">{store.orderCount.toLocaleString()}+ orders</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
