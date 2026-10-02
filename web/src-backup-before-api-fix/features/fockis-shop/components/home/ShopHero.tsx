import { Link } from 'react-router-dom';
import { ShopSearch } from '../common/ShopSearch';
import { useShop } from '../../hooks/useShop';
import { useStores } from '../../hooks/useStores';
import { useProducts } from '../../hooks/useProducts';
import type { Store } from '../../types/store.types';

export function ShopHero() {
const { deliverToCountryLabel } = useShop();

const {
data: storeData,
loading: storesLoading,
error: storesError,
} = useStores({
page: 1,
pageSize: 100,
});

const {
data: productData,
loading: productsLoading,
error: productsError,
} = useProducts({
page: 1,
pageSize: 100,
});

const stores: Store[] = Array.isArray(storeData?.items)
? (storeData.items as Store[])
: [];

const storeCount =
typeof storeData?.total === 'number'
? storeData.total
: stores.length;

const productCount =
typeof productData?.total === 'number'
? productData.total
: productData?.items?.length ?? 0;

const countryCount = new Set(
stores
.map((store) => store.location?.countryCode)
.filter(Boolean),
).size;

const statsLoading =
storesLoading || productsLoading;

const statsError =
Boolean(storesError) || Boolean(productsError);

return (
<section
className="hero"
style={{ paddingBottom: 56 }}
>
<div className="hero-inner">
<div
className="sec-label"
style={{
justifyContent: 'center',
color: 'var(--brass-light)',
}}
>
<span
className="num"
style={{
borderColor: 'var(--brass-light)',
color: 'var(--brass-light)',
}}
>
01
</span>

      GLOBAL MARKETPLACE
    </div>

    <h1>Shop the World.</h1>

    <p className="lede">
      Discover products from businesses near you and
      around the world.
    </p>

    <ShopSearch />

    <div className="deliver-row">
      <span>Deliver to:</span>

      <Link
        to="/shop/countries"
        className="flag-chip"
      >
        {deliverToCountryLabel} ▾
      </Link>
    </div>

    <div className="hero-cta-row">
      <Link
        to="/shop/products"
        className="btn btn-brass"
      >
        Start Shopping
      </Link>

      <Link
        to="/shop/sell"
        className="btn btn-outline-light"
      >
        Open a Store
      </Link>
    </div>
  </div>

  <div className="wrap">
    <div className="hero-stats">
      <div className="stat">
        <b>
          {statsLoading
            ? '—'
            : statsError
              ? '—'
              : `${countryCount}`}
        </b>

        <span>
          Countries represented
        </span>
      </div>

      <div className="stat">
        <b>
          {statsLoading
            ? '—'
            : statsError
              ? '—'
              : storeCount.toLocaleString()}
        </b>

        <span>Stores</span>
      </div>

      <div className="stat">
        <b>
          {statsLoading
            ? '—'
            : statsError
              ? '—'
              : productCount.toLocaleString()}
        </b>

        <span>Products</span>
      </div>

      <div className="stat">
        <b>Live</b>

        <span>Marketplace data</span>
      </div>
    </div>
  </div>
</section>

);
}
