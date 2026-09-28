import { Link } from 'react-router-dom';

import type { CartTotals } from '../../types/cart.types';

import { formatPrice } from '../../utils/currency';

interface CartSummaryProps {
  totals: CartTotals;
  selectedTotals?: CartTotals;
}

export function CartSummary({
  totals,
  selectedTotals,
}: CartSummaryProps) {
  /*
   * IMPORTANT:
   *
   * selectedTotals must come from useCart().selectedTotals.
   *
   * If the parent has not been updated yet, use an empty selection
   * instead of crashing the entire cart page.
   */
  const checkoutTotals: CartTotals =
    selectedTotals ?? {
      itemCount: 0,
      subtotal: 0,
      estimatedShipping: 0,
      estimatedTax: 0,
      total: 0,
    };

  const hasSelection =
    checkoutTotals.itemCount > 0;

  const remainingItemCount = Math.max(
    0,
    totals.itemCount -
      checkoutTotals.itemCount
  );

  return (
    <div className="cart-panel cart-summary-panel">
      <h4>Order summary</h4>

      {/* ================================================================ */}
      {/* SELECTED ITEMS                                                   */}
      {/* ================================================================ */}

      {hasSelection ? (
        <>
          <div className="cart-summary-selection-note">
            {checkoutTotals.itemCount}{' '}
            item
            {checkoutTotals.itemCount === 1
              ? ''
              : 's'}{' '}
            selected for checkout
          </div>

          {/* SUBTOTAL */}

          <div className="cart-summary-row">
            <span>
              Subtotal (
              {checkoutTotals.itemCount}{' '}
              item
              {checkoutTotals.itemCount === 1
                ? ''
                : 's'}
              )
            </span>

            <span className="mono">
              {formatPrice(
                checkoutTotals.subtotal
              )}
            </span>
          </div>

          {/* SHIPPING */}

          <div className="cart-summary-row">
            <span>
              Estimated shipping
            </span>

            <span className="mono">
              {checkoutTotals.estimatedShipping ===
              0
                ? 'Free'
                : formatPrice(
                    checkoutTotals.estimatedShipping
                  )}
            </span>
          </div>

          {/* TAX */}

          <div className="cart-summary-row">
            <span>
              Estimated tax
            </span>

            <span className="mono">
              {formatPrice(
                checkoutTotals.estimatedTax
              )}
            </span>
          </div>

          {/* TOTAL */}

          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>

            <span className="mono">
              {formatPrice(
                checkoutTotals.total
              )}
            </span>
          </div>

          {/* CHECKOUT */}

          <Link
            to="/shop/checkout"
            className="btn btn-navy"
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: 16,
            }}
          >
            Proceed to Checkout
          </Link>
        </>
      ) : (
        <>
          <div className="cart-summary-empty">
            <strong>
              Select items to checkout
            </strong>

            <span>
              Choose the products you want
              to purchase. The rest will
              stay safely in your cart.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-navy"
            disabled
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: 16,
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            Proceed to Checkout
          </button>
        </>
      )}

      {/* ================================================================ */}
      {/* REMAINING ITEMS                                                  */}
      {/* ================================================================ */}

      {hasSelection &&
        remainingItemCount > 0 && (
          <div className="cart-summary-remainder">
            {remainingItemCount}{' '}
            other item
            {remainingItemCount === 1
              ? ''
              : 's'}{' '}
            will remain in your cart.
          </div>
        )}
    </div>
  );
}