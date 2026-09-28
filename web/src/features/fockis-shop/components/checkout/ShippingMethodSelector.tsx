import { ShopLoading } from '../common/ShopLoading';

import type { ShippingEstimate } from '../../types/shipping.types';

type Props = {
  estimates: ShippingEstimate[] | null;
  shippingError: string | null;
  shippingSelections: Record<string, string>;
  storeNameById: Record<string, string>;
  formatPrice: (amount: number) => string;
  onSelect: (
    storeId: string,
    optionId: string,
  ) => void;
};

export function ShippingMethodSelector({
  estimates,
  shippingError,
  shippingSelections,
  storeNameById,
  formatPrice,
  onSelect,
}: Props) {
  if (estimates === null) {
    return (
      <section className="checkout-form-section">
        <h3>2. Shipping method</h3>

        <ShopLoading
          label="Calculating shipping…"
          rows={2}
        />
      </section>
    );
  }

  if (shippingError) {
    return (
      <section className="checkout-form-section">
        <h3>2. Shipping method</h3>

        <div className="shop-state-panel">
          <h4>
            Shipping unavailable
          </h4>

          <p>{shippingError}</p>
        </div>
      </section>
    );
  }

  if (estimates.length === 0) {
    return (
      <section className="checkout-form-section">
        <h3>2. Shipping method</h3>

        <div className="shop-state-panel">
          <p>
            No additional shipping
            selection is required for
            this order.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-form-section">
      <h3>2. Shipping method</h3>

      {estimates.map((estimate) => {
        const options = Array.isArray(
          estimate.options,
        )
          ? estimate.options
          : [];

        const selectedOptionId =
          shippingSelections[
            estimate.storeId
          ] ??
          estimate.selectedOptionId ??
          options[0]?.id ??
          '';

        return (
          <div
            key={estimate.storeId}
            className="shipping-method-group"
          >
            <div className="shipping-method-group-store mono">
              {storeNameById[
                estimate.storeId
              ] ?? 'Fockis Store'}
            </div>

            {options.length === 0 ? (
              <div
                className="shop-state-panel"
                style={{
                  marginTop: 10,
                }}
              >
                <p>
                  No delivery methods are
                  available for this store.
                </p>
              </div>
            ) : (
              <div className="shipping-estimate">
                {options.map((option) => {
                  const isSelected =
                    selectedOptionId ===
                    option.id;

                  return (
                    <label
                      key={option.id}
                      className="shipping-estimate-option"
                    >
                      <input
                        type="radio"
                        name={`shipping-${estimate.storeId}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() =>
                          onSelect(
                            estimate.storeId,
                            option.id,
                          )
                        }
                      />

                      <span>
                        <strong>
                          {option.label}
                        </strong>

                        {option.estimatedDays && (
                          <small
                            style={{
                              display:
                                'block',
                              marginTop: 3,
                              color:
                                'var(--slate)',
                            }}
                          >
                            Estimated delivery:{' '}
                            {option.estimatedDays.min ===
                            option.estimatedDays.max
                              ? `${option.estimatedDays.min} day${
                                  option.estimatedDays.min ===
                                  1
                                    ? ''
                                    : 's'
                                }`
                              : `${option.estimatedDays.min}–${option.estimatedDays.max} days`}
                          </small>
                        )}
                      </span>

                      <span className="shipping-estimate-price">
                        {option.price === 0
                          ? 'FREE'
                          : formatPrice(
                              option.price,
                            )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}