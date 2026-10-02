import { Link } from 'react-router-dom';
import type { Store } from '../../types/store.types';
import { Badge } from '../common/Badge';
import { storeShippingBadges, storeLocationLabel } from '../../utils/store';

export function StoreCard({ store }: { store: Store }) {
  return (
    <div className="store-card">
      <div
        className="banner"
        style={store.bannerUrl ? { backgroundImage: `url('${store.bannerUrl}')` } : { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, background: 'var(--paper-2)' }}
      >
        {!store.bannerUrl && (store.emoji ?? '🏪')}
      </div>
      <div className="body">
        <div className="row-top">
          <h4>{store.name}</h4>
          <div className="rating"><span className="star">★</span>{store.rating.average.toFixed(1)}</div>
        </div>
        <div className="loc">{storeLocationLabel(store)}</div>
        {store.verified && (
          <div className="badge-row">
            <Badge variant="verified" />
          </div>
        )}
        <div className="tag-row">
          {store.tags.map((tag) => (
            <span className="tag" key={tag}>{tag}</span>
          ))}
        </div>
        <div className="ship-row">
          {storeShippingBadges(store).map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <Link to={`/shop/store/${store.slug}`} className="cta">Visit Store</Link>
      </div>
    </div>
  );
}
