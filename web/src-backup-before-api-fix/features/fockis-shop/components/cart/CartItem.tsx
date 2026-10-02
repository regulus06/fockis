import { Link } from 'react-router-dom';

import type { CartLineItem } from '../../types/cart.types';

import { formatPrice } from '../../utils/currency';

import { useCart } from '../../hooks/useCart';

export function CartItem({
  item,
}: {
  item: CartLineItem;
}) {
  const {
    setQuantity,
    removeItem,
    selectedLineIds,
    toggleItemSelection,
  } = useCart();

  const isSelected = selectedLineIds.includes(item.id);

  return (
    <div
      className={`cart-item ${
        isSelected ? 'is-selected' : ''
      }`}
    >
      {/* ================================================================ */}
      {/* CHECKBOX                                                         */}
      {/* ================================================================ */}

      <div className="cart-item-select">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {
            toggleItemSelection(item.id);
          }}
          aria-label={`Select ${item.productName} for checkout`}
        />
      </div>

      {/* ================================================================ */}
      {/* PRODUCT                                                          */}
      {/* ================================================================ */}

      <Link
        to={`/shop/product/${item.productSlug}`}
        className="cart-item-thumb"
        aria-hidden="true"
      >
        {item.productEmoji ?? '📦'}
      </Link>

      <div className="cart-item-body">
        <Link
          to={`/shop/product/${item.productSlug}`}
          className="cart-item-name"
        >
          {item.productName}
        </Link>

        {item.variant && (
          <div className="cart-item-variant mono">
            {item.variant.optionsLabel}
          </div>
        )}

        <div className="cart-item-price mono">
          {formatPrice(item.unitPrice)}
        </div>
      </div>

      {/* ================================================================ */}
      {/* QUANTITY                                                         */}
      {/* ================================================================ */}

      <div className="cart-item-qty">
        <div className="pdp-qty-stepper">
          <button
            type="button"
            onClick={() =>
              setQuantity(
                item.id,
                item.quantity - 1
              )
            }
            aria-label="Decrease quantity"
            disabled={item.quantity <= 1}
          >
            −
          </button>

          <span className="mono">
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() =>
              setQuantity(
                item.id,
                item.quantity + 1
              )
            }
            aria-label="Increase quantity"
            disabled={
              item.quantity >= item.maxQuantity
            }
          >
            +
          </button>
        </div>

        <button
          type="button"
          className="cart-item-remove"
          onClick={() =>
            removeItem(item.id)
          }
        >
          Remove
        </button>
      </div>

      {/* ================================================================ */}
      {/* TOTAL                                                            */}
      {/* ================================================================ */}

      <div className="cart-item-line-total mono">
        {formatPrice(
          item.unitPrice * item.quantity
        )}
      </div>
    </div>
  );
}