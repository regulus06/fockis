import { Link } from 'react-router-dom';
import { Rail } from '../common/Rail';
import { useStores } from '../../hooks/useStores';
import { ShopLoading } from '../common/ShopLoading';
import type { Store } from '../../types/store.types';

export function TopRatedStores() {
const { data, loading, error } = useStores({
sort: 'rating',
page: 1,
pageSize: 8,
});

const stores: Store[] = Array.isArray(data?.items)
? data.items as Store[]
: [];

return (
<section className="shaded">
<div className="wrap">
<div className="section-head">
<div>
<div className="sec-label">
<span className="num">12</span>
TOP RATED
</div>

        <h2 style={{ fontSize: 26 }}>
          Top rated stores
        </h2>
      </div>

      <Link
        to="/shop/stores"
        className="section-link"
      >
        View all stores →
      </Link>
    </div>

    {loading ? (
      <ShopLoading rows={1} />
    ) : error ? (
      <div className="shop-error">
        Unable to load top-rated stores right now.
      </div>
    ) : stores.length === 0 ? (
      <div className="shop-empty">
        No stores are available right now.
      </div>
    ) : (
      <Rail ariaLabel="Top rated stores">
        {stores.map((store: Store) => (
          <Link
            to={`/shop/store/${store.slug}`}
            className="store-rail-card rail-item"
            key={store.id}
            style={{ display: 'block' }}
          >
            <div className="logo">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                />
              ) : (
                store.emoji ?? '🏪'
              )}
            </div>

            <h5>{store.name}</h5>

            <div className="loc">
              {store.location.city
                ? `${store.location.city}, ${store.location.country}`
                : store.location.country}
            </div>

            <div className="stats">
              <span>
                ★ {store.rating.average.toFixed(1)}
              </span>

              <span>·</span>

              <span>
                {store.rating.totalReviews.toLocaleString()} reviews
              </span>
            </div>
          </Link>
        ))}
      </Rail>
    )}
  </div>
</section>

);
}