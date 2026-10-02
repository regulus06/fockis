import { useMemo } from 'react';
import { useStores } from '../../hooks/useStores';
import type { Store } from '../../types/store.types';

interface InternationalRoute {
from: string;
to: string;
storeCount: number;
}

export function InternationalCommerce() {
const { data, loading, error } = useStores({
sort: 'relevance',
page: 1,
pageSize: 100,
});

const stores: Store[] = Array.isArray(data?.items)
? (data.items as Store[])
: [];

const internationalStores = useMemo(
() =>
stores.filter(
(store) => store.shipping?.internationalShipping === true,
),
[stores],
);

const routes = useMemo<InternationalRoute[]>(() => {
const routeMap = new Map<string, InternationalRoute>();

for (const store of internationalStores) {
  const from = store.location?.country;

  if (!from) {
    continue;
  }

  const key = from.toLowerCase();

  const existing = routeMap.get(key);

  if (existing) {
    existing.storeCount += 1;
  } else {
    routeMap.set(key, {
      from,
      to: 'International customers',
      storeCount: 1,
    });
  }
}

return Array.from(routeMap.values())
  .sort((a, b) => b.storeCount - a.storeCount)
  .slice(0, 6);

}, [internationalStores]);

return (
<section id="international">
<div className="wrap">
<div className="section-head">
<div>
<div className="sec-label">
<span className="num">13</span>
INTERNATIONAL COMMERCE
</div>

        <h2>From local business to global customer</h2>

        <p>
          Discover Fockis stores that offer international shipping
          through their marketplace settings.
        </p>
      </div>
    </div>

    {loading ? (
      <div className="shop-loading">
        Loading international stores...
      </div>
    ) : error ? (
      <div className="shop-error">
        Unable to load international commerce data right now.
      </div>
    ) : internationalStores.length === 0 ? (
      <div className="shop-empty">
        No stores currently advertise international shipping.
      </div>
    ) : (
      <div className="intl-grid">
        <div className="route-list">
          {routes.map((route) => (
            <div
              className="route-item"
              key={route.from}
            >
              <span className="from">
                {route.from}
              </span>

              <span className="arrow">
                →
              </span>

              <span className="to">
                {route.to}
              </span>

              <span className="route-count">
                {route.storeCount}{' '}
                {route.storeCount === 1
                  ? 'store'
                  : 'stores'}
              </span>
            </div>
          ))}
        </div>

        <div className="intl-example">
          <div
            className="sec-label"
            style={{ marginBottom: 14 }}
          >
            <span className="num">
              LIVE
            </span>
            INTERNATIONAL SHIPPING
          </div>

          <div className="row">
            <span className="lbl">
              Stores offering international shipping
            </span>

            <span className="val mono">
              {internationalStores.length.toLocaleString()}
            </span>
          </div>

          <div className="row">
            <span className="lbl">
              Countries represented
            </span>

            <span className="val mono">
              {
                new Set(
                  internationalStores
                    .map(
                      (store) =>
                        store.location?.countryCode ||
                        store.location?.country,
                    )
                    .filter(Boolean),
                ).size
              }
            </span>
          </div>

          <div className="row">
            <span className="lbl">
              International shipping
            </span>

            <span
              className="val"
              style={{ color: 'var(--green)' }}
            >
              Available
            </span>
          </div>

          <div className="row">
            <span className="lbl">
              Availability
            </span>

            <span className="val">
              Depends on individual store
            </span>
          </div>
        </div>
      </div>
    )}
  </div>
</section>

);
}