import { ShopLoading } from "../common/ShopLoading";
import type { ShippingEstimate } from "../../types/shipping.types";

type Props = {
  estimates: ShippingEstimate[] | null;
  shippingError: string | null;
  shippingSelections: Record<string, string>;
  storeNameById: Record<string, string>;
  formatPrice: (amount: number) => string;
  onSelect: (storeId: string, optionId: string) => void;
};

export function ShippingMethodSelector({
  estimates,
  shippingError,
  shippingSelections,
  storeNameById,
  formatPrice,
  onSelect,
}: Props) {
  return (
    <section
      className="checkout-form-section"
      aria-labelledby="shipping-method-heading"
    >
      <h3 id="shipping-method-heading">
        2. Shipping method
      </h3>

      {estimates === null ? (
        <ShopLoading
          label="Calculating shipping…"
          rows={2}
        />
      ) : shippingError ? (
        <div className="shop-state-panel" role="alert">
          <h4>Shipping unavailable</h4>
          <p>{shippingError}</p>
        </div>
      ) : estimates.length === 0 ? (
        <div className="shop-state-panel">
          <p>
            No shipping options were returned for this order.
            Please check the shipping configuration.
          </p>
        </div>
      ) : (
        estimates.map((estimate) => {
          const options = Array.isArray(estimate.options)
            ? estimate.options
            : [];

          const selectedOptionId =
            shippingSelections[estimate.storeId] ??
            estimate.selectedOptionId ??
            "";

          return (
            <div
              key={estimate.storeId}
              className="shipping-method-group"
            >
              <label
                className="shipping-method-group-store"
                htmlFor={`shipping-method-${estimate.storeId}`}
              >
                Shipping for{" "}
                {storeNameById[estimate.storeId] ??
                  "Fockis Store"}
              </label>

              {options.length === 0 ? (
                <div className="shop-state-panel" role="status">
                  <p>
                    No delivery methods are available for this
                    store.
                  </p>
                </div>
              ) : (
                <select
                  id={`shipping-method-${estimate.storeId}`}
                  className="shipping-method-select"
                  name={`shipping-${estimate.storeId}`}
                  value={selectedOptionId}
                  required
                  onChange={(event) =>
                    onSelect(
                      estimate.storeId,
                      event.currentTarget.value,
                    )
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: 48,
                    marginTop: 10,
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    background: "var(--paper)",
                    color: "inherit",
                    font: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>
                    Select shipping method
                  </option>

                  {options.map((option) => {
                    const delivery = option.estimatedDays
                      ? option.estimatedDays.min ===
                        option.estimatedDays.max
                        ? `${option.estimatedDays.min} day${
                            option.estimatedDays.min === 1
                              ? ""
                              : "s"
                          }`
                        : `${option.estimatedDays.min}–${option.estimatedDays.max} days`
                      : "";

                    return (
                      <option
                        key={option.id}
                        value={option.id}
                      >
                        {option.label}
                        {delivery ? ` · ${delivery}` : ""}
                        {" · "}
                        {option.price === 0
                          ? "FREE"
                          : formatPrice(option.price)}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}

export default ShippingMethodSelector;