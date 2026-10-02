import { Link } from 'react-router-dom';
import { useStores } from '../../hooks/useStores';
import { ShopLoading } from '../common/ShopLoading';
import type { Store } from '../../types/store.types';

const DASH_NAV = [
'Overview',
'Products',
'Orders',
'Customers',
];

export function SellerCenterPreview() {
const { data, loading, error } = useStores({
page: 1,
pageSize: 100,
});

const stores: Store[] = Array.isArray(data?.items)
? (data.items as Store[])
: [];

const totalProducts = stores.reduce(
(total, store) => total + (store.productCount ?? 0),
0,
);

const totalOrders = stores.reduce(
(total, store) => total + (store.orderCount ?? 0),
0,
);

return (
<section className="shaded">
<div className="wrap">
<div className="section-head">
<div>
<div className="sec-label">
<span className="num">15</span>
SELLER CENTER
</div>

        <h2>Manage your store in one place</h2>
      </div>
    </div>

    {loading ? (
      <ShopLoading rows={2} />
    ) : error ? (
      <div className="shop-error">
        Unable to load seller information right now.
      </div>
    ) : (
      <Link
        to="/shop/seller/dashboard"
        className="dash-shell"
        style={{ display: 'block' }}
      >
        <div className="dash-topbar">
          <span>Fockis Seller Center</span>

          <span
            className="mono"
            style={{
              fontWeight: 400,
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            Live data
          </span>
        </div>

        <div className="dash-body">
          <div className="dash-nav">
            {DASH_NAV.map((item, index) => (
              <span
                key={item}
                className={index === 0 ? 'active' : undefined}
              >
                {item}
              </span>
            ))}
          </div>

          <div className="dash-main">
            {stores.length === 0 ? (
              <div className="shop-empty">
                You have not created a Fockis Store yet.
              </div>
            ) : (
              <div className="dash-stats">
                <div className="dash-stat">
                  <div className="lbl">
                    Stores
                  </div>

                  <div className="val mono">
                    {stores.length.toLocaleString()}
                  </div>
                </div>

                <div className="dash-stat">
                  <div className="lbl">
                    Products
                  </div>

                  <div className="val mono">
                    {totalProducts.toLocaleString()}
                  </div>
                </div>

                <div className="dash-stat">
                  <div className="lbl">
                    Orders
                  </div>

                  <div className="val mono">
                    {totalOrders.toLocaleString()}
                  </div>
                </div>

                <div className="dash-stat">
                  <div className="lbl">
                    Verified Stores
                  </div>

                  <div className="val mono">
                    {stores
                      .filter((store) => store.verified)
                      .length.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    )}
  </div>
</section>

);
}