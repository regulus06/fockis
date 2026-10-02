import { Link } from 'react-router-dom';

interface OrderConfirmationProps {
  orderId: string | null;
  orderNumber: string | null;
}

export function OrderConfirmation({ orderId, orderNumber }: OrderConfirmationProps) {
  return (
    <div className="order-confirmation">
      <div className="order-confirmation-icon" aria-hidden="true">✓</div>
      <h1>Order placed</h1>
      <p>
        {orderNumber ? (
          <>Your order <strong className="mono">{orderNumber}</strong> has been placed.</>
        ) : (
          'Your order has been placed.'
        )}
      </p>
      <p>We've sent a confirmation to your email. You can track its status from your orders page.</p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 26 }}>
        {orderId && (
          <Link to={`/shop/orders/${orderId}`} className="btn btn-navy">
            View Order
          </Link>
        )}
        <Link to="/shop" className="btn btn-outline">Continue Shopping</Link>
      </div>
    </div>
  );
}
