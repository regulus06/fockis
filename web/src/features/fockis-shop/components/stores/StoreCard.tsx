import { Link } from 'react-router-dom';
import type { Store } from '../../types/store.types';
import { Badge } from '../common/Badge';
import { storeShippingBadges, storeLocationLabel } from '../../utils/store';

export function StoreCard({ store }: { store: Store }) {
  const average = Number(store.rating?.average ?? 0);
  const reviews = Number(store.rating?.totalReviews ?? 0);
  const hasRating = Number.isFinite(average) && average > 0;

  return (
    <div className="store-card">
      <div
        className="banner"
        style={
          store.bannerUrl
            ? { backgroundImage: `url('${store.bannerUrl}')` }
            : undefined
        }
      >
        <span className="store-card__logo" aria-hidden="true">
          {store.logoUrl ? <img src={store.logoUrl} alt="" loading="lazy" /> : (store.emoji ?? '🏪')}
        </span>
      </div>
      <div className="body">
        <div className="row-top">
          <h4>{store.name}</h4>
          {hasRating && (
            <div className="rating" aria-label={`${average.toFixed(1)} out of 5`}>
              <span className="star">★</span>
              {average.toFixed(1)}
              {reviews > 0 && <span className="count"> ({reviews.toLocaleString()})</span>}
            </div>
          )}
        </div>
        {store.location?.country && <div className="loc">{storeLocationLabel(store)}</div>}
        {store.verified && (
          <div className="badge-row">
            <Badge variant="verified" />
          </div>
        )}
        {store.tags.length > 0 && (
          <div className="tag-row">
            {store.tags.slice(0, 4).map((tag) => (
              <span className="tag" key={tag}>{tag}</span>
            ))}
          </div>
        )}
        {storeShippingBadges(store).length > 0 && (
          <div className="ship-row">
            {storeShippingBadges(store).map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        )}
        <Link to={`/shop/store/${store.slug}`} className="cta">Visit store</Link>
      </div>
    </div>
  );
}
