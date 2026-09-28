import { Link } from 'react-router-dom';
import type { CartSellerGroup as CartSellerGroupType } from '../../types/cart.types';
import { CartItem } from './CartItem';
import { formatPrice } from '../../utils/currency';

/**
 * ============================================================================
 * FOCKIS SHOP — CART SELLER GROUP
 * ============================================================================
 *
 * A seller/store section inside the shopping cart.
 *
 * IMPORTANT:
 * CartLineItem does NOT contain selection state.
 *
 * Selection is managed by the cart store through:
 *
 *   selectedLineIds
 *
 * Therefore this component must never read:
 *
 *   item.selected
 *
 * or create:
 *
 *   { ...item, selected: ... }
 *
 * CartItem is responsible for displaying/managing an individual line.
 * ============================================================================
 */

interface CartSellerGroupProps {
  group: CartSellerGroupType;
}

export function CartSellerGroup({
  group,
}: CartSellerGroupProps) {
  /**
   * Prevent a negative "Add $X more" message if the subtotal has already
   * passed the free-delivery threshold.
   */
  const amountUntilFreeDelivery =
    group.freeDeliveryThreshold != null
      ? Math.max(
          0,
          group.freeDeliveryThreshold - group.subtotal,
        )
      : 0;

  return (
    <section className="cart-seller-group">
      {/* ================================================================== */}
      {/* SELLER / STORE HEADER */}
      {/* ================================================================== */}

      <div className="cart-seller-group-head">
        <Link
          to={`/shop/store/${group.storeSlug}`}
          className="cart-seller-group-store"
        >
          🏪 {group.storeName}
        </Link>

        {/* -------------------------------------------------------------- */}
        {/* FREE DELIVERY MESSAGE                                          */}
        {/* -------------------------------------------------------------- */}

        {group.freeDeliveryThreshold != null &&
          group.estimatedShipping > 0 &&
          amountUntilFreeDelivery > 0 && (
            <span className="cart-seller-group-hint mono">
              Add{' '}
              {formatPrice(amountUntilFreeDelivery)} more for
              free delivery
            </span>
          )}

        {/* -------------------------------------------------------------- */}
        {/* FREE DELIVERY UNLOCKED                                         */}
        {/* -------------------------------------------------------------- */}

        {group.freeDeliveryThreshold != null &&
          group.estimatedShipping === 0 && (
            <span className="cart-seller-group-hint free">
              ✓ Free delivery unlocked
            </span>
          )}
      </div>

      {/* ================================================================== */}
      {/* CART ITEMS */}
      {/* ================================================================== */}

      <div className="cart-seller-group-items">
        {group.items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
          />
        ))}
      </div>

      {/* ================================================================== */}
      {/* STORE SUBTOTAL */}
      {/* ================================================================== */}

      <div className="cart-seller-group-subtotal mono">
        Store subtotal:{' '}
        {formatPrice(group.subtotal)}
      </div>
    </section>
  );
}