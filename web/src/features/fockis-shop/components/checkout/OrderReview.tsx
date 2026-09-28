import type {
  CheckoutSellerGroup,
} from '../../types/checkout.types';

type Props = {
  groups: CheckoutSellerGroup[];
  formatPrice: (
    amount: number,
  ) => string;
};

export function OrderReview({
  groups,
  formatPrice,
}: Props) {
  return (
    <section className="checkout-form-section">
      <h3>4. Review your order</h3>

      {groups.map((group) => (
        <div
          key={group.storeId}
          className="order-review-group"
        >
          <div className="order-review-group-store mono">
            {group.storeName}
          </div>

          {group.items.map(
            (item, index) => (
              <div
                key={`${item.productId}-${index}`}
                className="order-review-item"
              >
                <span>
                  {item.productEmoji ??
                    '📦'}{' '}
                  {item.productName}

                  {item.variant
                    ? ` (${item.variant.optionsLabel})`
                    : ''}

                  {' × '}
                  {item.quantity}
                </span>

                <strong className="mono">
                  {formatPrice(
                    Number(
                      item.unitPrice,
                    ) *
                      item.quantity,
                  )}
                </strong>
              </div>
            ),
          )}

          <div
            className="cart-summary-row"
            style={{
              marginTop: 8,
            }}
          >
            <span>
              Store subtotal
            </span>

            <strong className="mono">
              {formatPrice(
                group.subtotal,
              )}
            </strong>
          </div>
        </div>
      ))}
    </section>
  );
}