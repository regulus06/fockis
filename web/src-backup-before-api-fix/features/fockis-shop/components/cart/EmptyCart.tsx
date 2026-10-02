import { Link } from 'react-router-dom';
import { ShopEmptyState } from '../common/ShopEmptyState';

export function EmptyCart() {
  return (
    <ShopEmptyState
      icon="🛒"
      title="Your cart is empty"
      message="Browse the marketplace and add something you like."
      action={
        <Link to="/shop" className="btn btn-navy">
          Start Shopping
        </Link>
      }
    />
  );
}
