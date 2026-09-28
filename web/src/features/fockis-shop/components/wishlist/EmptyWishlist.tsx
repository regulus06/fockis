import { Link } from 'react-router-dom';
import { ShopEmptyState } from '../common/ShopEmptyState';

export function EmptyWishlist() {
  return (
    <ShopEmptyState
      icon="♡"
      title="Your wishlist is empty"
      message="Save products you like by tapping the heart icon."
      action={
        <Link to="/shop" className="btn btn-navy">
          Browse Products
        </Link>
      }
    />
  );
}
