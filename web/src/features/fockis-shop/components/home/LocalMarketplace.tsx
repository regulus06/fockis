import { Link } from "react-router-dom";
import { MapPin, Store as StoreIcon } from "lucide-react";

import { useStores } from "../../hooks/useStores";
import type { Store } from "../../types/store.types";

export function LocalMarketplace() {
const { data, loading, error } = useStores({
location: "local",
page: 1,
pageSize: 6,
sort: "relevance",
});

const stores: Store[] = data?.items ?? [];

return ( <section className="local-marketplace"> <div className="local-marketplace__header"> <div> <span className="local-marketplace__eyebrow">
Local marketplace </span>

```
      <h2>Stores near you</h2>

      <p>
        Discover stores available through the Fockis marketplace.
      </p>
    </div>

    <Link
      to="/shop/stores"
      className="local-marketplace__view-all"
    >
      View all stores
    </Link>
  </div>

  {loading && (
    <div className="local-marketplace__state">
      <StoreIcon size={22} />
      <span>Loading local stores...</span>
    </div>
  )}

  {!loading && error && (
    <div className="local-marketplace__state local-marketplace__state--error">
      <StoreIcon size={22} />
      <span>{error}</span>
    </div>
  )}

  {!loading && !error && stores.length === 0 && (
    <div className="local-marketplace__state">
      <StoreIcon size={22} />
      <span>
        No local stores are currently available.
      </span>
    </div>
  )}

  {!loading && !error && stores.length > 0 && (
    <div className="local-marketplace__grid">
      {stores.map((store: Store) => (
        <Link
          key={store.id}
          to={`/shop/stores/${store.slug}`}
          className="local-marketplace__card"
        >
          <div className="local-marketplace__image">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
              />
            ) : (
              <span className="local-marketplace__fallback">
                {store.emoji || "🏪"}
              </span>
            )}
          </div>

          <div className="local-marketplace__content">
            <div className="local-marketplace__name-row">
              <h3>{store.name}</h3>

              {store.verified && (
                <span className="local-marketplace__verified">
                  Verified
                </span>
              )}
            </div>

            <div className="local-marketplace__location">
              <MapPin size={15} />

              <span>
                {store.location.city},{" "}
                {store.location.country}
              </span>
            </div>

            <div className="local-marketplace__meta">
              <span>
                {store.productCount}{" "}
                {store.productCount === 1
                  ? "product"
                  : "products"}
              </span>

              {store.rating.totalReviews > 0 && (
                <span>
                  ★ {store.rating.average.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )}
</section>
);
}
