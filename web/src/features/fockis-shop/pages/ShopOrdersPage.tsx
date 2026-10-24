
import { Link } from 'react-router-dom';
import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopEmptyState } from '../components/common/ShopEmptyState';
import { useOrders } from '../hooks/useOrders';
import { formatPrice } from '../utils/currency';
import type { OrderStatus } from '../types/order.types';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  paid: 'Paid',
  processing: 'Processing',
  ready_to_ship: 'Ready to ship',
  shipped: 'Shipped',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  paid: 1,
  processing: 2,
  ready_to_ship: 3,
  shipped: 4,
  in_transit: 5,
  out_for_delivery: 6,
  delivered: 7,
  cancelled: 8,
  refunded: 8,
};

function normalizeStatus(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getDisplayStatus(
  parentStatus: unknown,
  sellerStatus: OrderStatus | string | undefined,
): string {
  const parent = normalizeStatus(parentStatus);
  const seller = normalizeStatus(sellerStatus);

  // Cancellation/refund must not be overwritten by a progress status.
  if (parent === 'refunded' || seller === 'refunded') return 'refunded';
  if (parent === 'cancelled' || seller === 'cancelled') return 'cancelled';

  // Use the furthest known progress state so stale seller-group status
  // does not hide a newer parent-order status, or vice versa.
  if (!parent) return seller || 'pending';
  if (!seller) return parent;

  return (STATUS_RANK[parent] ?? -1) >= (STATUS_RANK[seller] ?? -1)
    ? parent
    : seller;
}

// TODO(auth): requires an authenticated user — wrap with the app's auth guard.
export default function ShopOrdersPage() {
  const { orders, loading, error } = useOrders();

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main className="fk-container fk-page">
        <ShopBreadcrumbs
          items={[
            { label: 'Shop', to: '/shop' },
            { label: 'Orders' },
          ]}
        />

        <div>
          <div className="fk-page__head">
            <div>
              <h1>Your orders</h1>
              <p>Track, review and manage your Fockis orders.</p>
            </div>
          </div>

          {loading && <ShopLoading label="Loading orders…" rows={3} />}

          {!loading && error && (
            <p role="alert">
              We couldn't load your orders. Please refresh the page and try again.
            </p>
          )}

          {!loading && !error && orders.length === 0 && (
            <ShopEmptyState
              icon="📦"
              title="No orders yet"
              message="Orders you place will show up here."
              action={
                <Link to="/shop" className="fk-btn fk-btn--cart">
                  Start shopping
                </Link>
              }
            />
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="orders-list">
              {orders.map((order) => {
                // orderApi preserves additional fields returned by the API.
                const parentStatus = (
                  order as typeof order & { status?: string; orderStatus?: string }
                ).status ?? (
                  order as typeof order & { orderStatus?: string }
                ).orderStatus;

                return (
                  <Link
                    to={`/shop/orders/${order.id}`}
                    className="order-list-item"
                    key={order.id}
                  >
                    <div>
                      <div className="mono">{order.orderNumber}</div>
                      <div className="order-list-item-date">
                        {new Date(order.placedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="order-list-item-sellers">
                      {order.sellerGroups.map((group) => group.storeName).join(', ')}
                    </div>

                    <div className="order-list-item-status">
                      {order.sellerGroups.map((group) => {
                        const status = getDisplayStatus(parentStatus, group.status);

                        return (
                          <span
                            className={`tag order-status order-status--${status}`}
                            key={group.id}
                          >
                            {STATUS_LABEL[status] ?? status.replace(/_/g, ' ')}
                          </span>
                        );
                      })}

                      {order.sellerGroups.length === 0 && (
                        <span className="tag order-status">
                          {STATUS_LABEL[normalizeStatus(parentStatus)] ??
                            normalizeStatus(parentStatus) ??
                            'Pending'}
                        </span>
                      )}
                    </div>

                    <div className="mono">{formatPrice(order.total)}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ShopFooter />
    </div>
  );
}
