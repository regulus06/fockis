import { useParams } from 'react-router-dom';
import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopEmptyState } from '../components/common/ShopEmptyState';
import { useOrder } from '../hooks/useOrders';
import { formatPrice } from '../utils/currency';

// TODO(auth): requires an authenticated user who owns this order.
export default function ShopOrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, loading } = useOrder(orderId);

  if (loading) {
    return (
      <div className="shop-page-root">
        <ShopHeader />
        <div className="wrap" style={{ padding: '60px 32px' }}>
          <ShopLoading label="Loading order…" rows={4} />
        </div>
        <ShopFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="shop-page-root">
        <ShopHeader />
        <div className="wrap" style={{ padding: '60px 32px' }}>
          <ShopEmptyState icon="📦" title="Order not found" />
        </div>
        <ShopFooter />
      </div>
    );
  }

  return (
    <div className="shop-page-root">
      <ShopHeader />
      <div className="wrap" style={{ paddingTop: 32 }}>
        <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: 'Orders', to: '/shop/orders' }, { label: order.orderNumber }]} />
      </div>
      <section className="tight">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h1>Order {order.orderNumber}</h1>
              <p>Placed {new Date(order.placedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="order-details-layout">
            <div>
              {order.sellerGroups.map((group) => (
                <div className="order-review-group" key={group.id}>
                  <div className="order-review-group-store mono">{group.storeName} · {group.status}</div>
                  {group.items.map((item) => (
                    <div className="order-review-item" key={item.id}>
                      <span>{item.productEmoji ?? '📦'} {item.productName} × {item.quantity}</span>
                      <span className="mono">{formatPrice(item.lineTotal)}</span>
                    </div>
                  ))}
                  {group.trackingNumber && <div className="mono" style={{ marginTop: 8 }}>Tracking: {group.trackingNumber}</div>}
                </div>
              ))}
            </div>
            <div className="cart-panel cart-summary-panel">
              <h4>Order summary</h4>
              <div className="cart-summary-row"><span>Subtotal</span><span className="mono">{formatPrice(order.subtotal)}</span></div>
              <div className="cart-summary-row"><span>Shipping</span><span className="mono">{formatPrice(order.shippingTotal)}</span></div>
              <div className="cart-summary-row"><span>Tax</span><span className="mono">{formatPrice(order.taxTotal)}</span></div>
              <div className="cart-summary-row cart-summary-total"><span>Total</span><span className="mono">{formatPrice(order.total)}</span></div>
              <hr className="hairline" style={{ margin: '14px 0' }} />
              <div className="intl-example">
                <div className="row"><span className="lbl">Ship to</span><span className="val">{order.shippingAddress.fullName}</span></div>
                <div className="row"><span className="lbl">Address</span><span className="val" style={{ textAlign: 'right' }}>{order.shippingAddress.line1}, {order.shippingAddress.city}</span></div>
                <div className="row"><span className="lbl">Payment</span><span className="val" style={{ color: 'var(--green)' }}>{order.paymentStatus}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ShopFooter />
    </div>
  );
}
