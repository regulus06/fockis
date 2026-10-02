import { Link } from 'react-router-dom';
import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopEmptyState } from '../components/common/ShopEmptyState';
import { useOrders } from '../hooks/useOrders';
import { formatPrice } from '../utils/currency';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// TODO(auth): requires an authenticated user — wrap with the app's auth guard.
export default function ShopOrdersPage() {
  const { orders, loading } = useOrders();

  return (
    <div className="shop-page-root">
      <ShopHeader />
      <div className="wrap" style={{ paddingTop: 32 }}>
        <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: 'Orders' }]} />
      </div>
      <section className="tight">
        <div className="wrap">
          <div className="section-head">
            <div><h1>Your orders</h1></div>
          </div>

          {loading && <ShopLoading label="Loading orders…" rows={3} />}

          {!loading && orders.length === 0 && (
            <ShopEmptyState
              icon="📦"
              title="No orders yet"
              message="Orders you place will show up here."
              action={<Link to="/shop" className="btn btn-navy">Start Shopping</Link>}
            />
          )}

          {!loading && orders.length > 0 && (
            <div className="orders-list">
              {orders.map((order) => (
                <Link to={`/shop/orders/${order.id}`} className="order-list-item" key={order.id}>
                  <div>
                    <div className="mono">{order.orderNumber}</div>
                    <div className="order-list-item-date">{new Date(order.placedAt).toLocaleDateString()}</div>
                  </div>
                  <div className="order-list-item-sellers">
                    {order.sellerGroups.map((g) => g.storeName).join(', ')}
                  </div>
                  <div className="order-list-item-status">
                    {order.sellerGroups.map((g) => (
                      <span className="tag" key={g.id}>{STATUS_LABEL[g.status]}</span>
                    ))}
                  </div>
                  <div className="mono">{formatPrice(order.total)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <ShopFooter />
    </div>
  );
}
