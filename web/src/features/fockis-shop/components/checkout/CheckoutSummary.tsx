import type {
  CheckoutSellerGroup,
  PaymentMethod,
} from '../../types/checkout.types';

type CheckoutTotals = {
  subtotal: number;
  estimatedShipping: number;
  estimatedTax: number;
  total: number;
  itemCount: number;
};

type Props = {
  groups?: CheckoutSellerGroup[] | null;
  totals?: CheckoutTotals | null;
  countryName?: string;
  currency?: string;
  paymentMethod?: PaymentMethod;
  isHaiti?: boolean;
  tipAmount?: number;
  orderTotal?: number;
  addressComplete?: boolean;
  shippingComplete?: boolean;
  cardComplete?: boolean;
  placing?: boolean;
  canPlaceOrder?: boolean;
  formatPrice?: (amount: number) => string;
};

const EMPTY_TOTALS: CheckoutTotals = {
  subtotal: 0,
  estimatedShipping: 0,
  estimatedTax: 0,
  total: 0,
  itemCount: 0,
};

function safeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function defaultFormatPrice(amount: number): string {
  return `$${safeNumber(amount).toFixed(2)}`;
}

export function CheckoutSummary({
  groups,
  totals,
  countryName,
  currency,
  paymentMethod,
  isHaiti = false,
  tipAmount = 0,
  orderTotal,
  placing = false,
  formatPrice,
}: Props) {
  const safeGroups = Array.isArray(groups) ? groups : [];

  const safeTotals: CheckoutTotals = {
    ...EMPTY_TOTALS,
    subtotal: safeNumber(totals?.subtotal),
    estimatedShipping: safeNumber(totals?.estimatedShipping),
    estimatedTax: safeNumber(totals?.estimatedTax),
    total: safeNumber(totals?.total),
    itemCount: Math.max(
      0,
      Math.floor(safeNumber(totals?.itemCount)),
    ),
  };

  const safeTipAmount = safeNumber(tipAmount);

  const safeOrderTotal =
    orderTotal === undefined || orderTotal === null
      ? safeTotals.total + safeTipAmount
      : safeNumber(orderTotal);

  const displayPrice =
    typeof formatPrice === 'function'
      ? formatPrice
      : defaultFormatPrice;

  const safeCountryName =
    countryName?.trim() || 'United States';

  const safeCurrency =
    currency?.trim() || 'USD';

  const safePaymentMethod =
    paymentMethod ?? 'card';

  const paymentLabel =
    safePaymentMethod === 'cash_on_delivery'
      ? '💵 Cash on Delivery'
      : safePaymentMethod === 'moncash'
        ? '📱 MonCash'
        : safePaymentMethod === 'natcash'
          ? '📲 NatCash'
          : safePaymentMethod === 'paypal'
            ? '🅿️ PayPal'
            : '💳 Credit / Debit Card';

  const buttonDisabled = placing;

  return (
    <aside className="checkout-sidebar">
      <div className="cart-summary-panel">
        <div className="cart-panel">
          <h4>Order summary</h4>

          <p
            style={{
              color: 'var(--slate)',
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {safeTotals.itemCount}{' '}
            {safeTotals.itemCount === 1 ? 'item' : 'items'}{' '}
            across {safeGroups.length}{' '}
            {safeGroups.length === 1 ? 'store' : 'stores'}
          </p>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              border: '1px solid var(--line)',
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--slate)',
              }}
            >
              Shipping to
            </div>

            <strong>{safeCountryName}</strong>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
              }}
            >
              Currency:{' '}
              <strong>{safeCurrency}</strong>
            </div>
          </div>

          {safeGroups.length > 0 ? (
            <div
              style={{
                marginTop: 18,
                borderTop: '1px solid var(--line)',
              }}
            >
              {safeGroups.map((group) => {
                const groupItems = Array.isArray(group.items)
                  ? group.items
                  : [];

                return (
                  <div
                    key={
                      group.storeId ||
                      group.storeName
                    }
                    className="order-review-group"
                    style={{
                      paddingTop: 14,
                    }}
                  >
                    <div className="order-review-group-store">
                      {group.storeName ||
                        'Fockis Shop seller'}
                    </div>

                    {groupItems.map((item, index) => {
                      const quantity = Math.max(
                        0,
                        Math.floor(
                          safeNumber(item.quantity),
                        ),
                      );

                      const unitPrice = safeNumber(
                        item.unitPrice,
                      );

                      return (
                        <div
                          key={
                            item.id ||
                            `${item.productId}-${index}`
                          }
                          className="order-review-item"
                        >
                          <span
                            style={{
                              paddingRight: 12,
                            }}
                          >
                            {item.productEmoji ?? '📦'}{' '}
                            {item.productName || 'Product'}{' '}
                            × {quantity}
                          </span>

                          <strong>
                            {displayPrice(
                              unitPrice * quantity,
                            )}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                marginTop: 18,
                padding: 12,
                borderTop: '1px solid var(--line)',
                color: 'var(--slate)',
                fontSize: 12,
              }}
            >
              No checkout items are currently selected.
            </div>
          )}

          <div
            style={{
              borderTop: '1px solid var(--line)',
              marginTop: 16,
              paddingTop: 10,
            }}
          >
            <div className="cart-summary-row">
              <span>Subtotal</span>

              <strong>
                {displayPrice(safeTotals.subtotal)}
              </strong>
            </div>

            <div className="cart-summary-row">
              <span>Shipping</span>

              <strong>
                {safeTotals.estimatedShipping === 0
                  ? 'FREE'
                  : displayPrice(
                      safeTotals.estimatedShipping,
                    )}
              </strong>
            </div>

            <div className="cart-summary-row">
              <span>Estimated tax</span>

              <strong>
                {displayPrice(safeTotals.estimatedTax)}
              </strong>
            </div>

            {safeTipAmount > 0 && (
              <div className="cart-summary-row">
                <span>Tip</span>

                <strong>
                  {displayPrice(safeTipAmount)}
                </strong>
              </div>
            )}

            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>

              <strong>
                {displayPrice(safeOrderTotal)}
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: '1px solid var(--line)',
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <div
              style={{
                color: 'var(--slate)',
                marginBottom: 4,
              }}
            >
              Payment method
            </div>

            <strong>{paymentLabel}</strong>

            {safePaymentMethod === 'cash_on_delivery' &&
              isHaiti && (
                <div
                  style={{
                    marginTop: 6,
                    color: 'var(--slate)',
                    lineHeight: 1.45,
                  }}
                >
                  Pay{' '}
                  <strong>
                    {displayPrice(safeOrderTotal)}
                  </strong>{' '}
                  when your order arrives.
                </div>
              )}

            {(safePaymentMethod === 'moncash' ||
              safePaymentMethod === 'natcash') &&
              isHaiti && (
                <div
                  style={{
                    marginTop: 6,
                    color: 'var(--slate)',
                    lineHeight: 1.45,
                  }}
                >
                  Haiti payment:{' '}
                  <strong>
                    {displayPrice(safeOrderTotal)}
                  </strong>
                </div>
              )}
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: '1px solid var(--line)',
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <strong>Order validation</strong>

            <div
              style={{
                marginTop: 5,
                color: 'var(--slate)',
              }}
            >
              Your shipping address, delivery method, and
              payment information will be validated securely
              when you place the order.
            </div>
          </div>

          {placing && (
            <div
              style={{
                marginTop: 14,
                padding: 10,
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--slate)',
              }}
            >
              Processing your order securely…
            </div>
          )}

          <button
            type="submit"
            className="btn btn-brass"
            disabled={buttonDisabled}
            aria-disabled={buttonDisabled}
            aria-busy={placing}
            style={{
              width: '100%',
              minHeight: 50,
              justifyContent: 'center',
              marginTop: 20,
              fontSize: 15,
              fontWeight: 700,
              cursor: buttonDisabled
                ? 'not-allowed'
                : 'pointer',
              opacity: buttonDisabled ? 0.6 : 1,
            }}
          >
            {placing
              ? 'Processing order…'
              : `Place order · ${displayPrice(
                  safeOrderTotal,
                )}`}
          </button>

          <p
            style={{
              marginTop: 12,
              textAlign: 'center',
              fontSize: 10.5,
              lineHeight: 1.5,
              color: 'var(--slate)',
            }}
          >
            By placing your order, you agree to the
            Fockis Shop terms and applicable seller policies.
          </p>

          <div
            className="payment-information"
            style={{
              marginTop: 18,
            }}
          >
            <div>
              🔒
              <span>Secure Fockis checkout</span>
            </div>

            <div>
              ✓
              <span>Buyer protection</span>
            </div>

            <div>
              ✓
              <span>Multi-store order support</span>
            </div>

            {isHaiti && (
              <>
                <div>
                  📱
                  <span>MonCash available</span>
                </div>

                <div>
                  📲
                  <span>NatCash available</span>
                </div>

                <div>
                  💵
                  <span>Cash on Delivery available</span>
                </div>
              </>
            )}

            <div>
              💛
              <span>Optional tipping</span>
            </div>

            <div>
              🌎
              <span>{safeCurrency} payment</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}