import { FormEvent, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useElements, useStripe } from "@stripe/react-stripe-js";

import { ShippingAddressForm } from "./ShippingAddressForm";
import { ShippingMethodSelector } from "./ShippingMethodSelector";
import { PaymentMethod } from "./PaymentMethod";
import { OrderReview } from "./OrderReview";
import { CheckoutSummary } from "./CheckoutSummary";

import type { CheckoutController } from "../../hooks/useCheckout";
import type { CountryConfig as SharedCountryConfig } from "../../types/checkout.types";

type Props = {
  checkout: CheckoutController;
};

export function CheckoutForm({ checkout }: Props) {
  const stripe = useStripe();
  const elements = useElements();

  /**
   * Convert the backend-only "cod" payment method into
   * the UI payment method name "cash_on_delivery".
   */
  const uiCountryConfig = useMemo<SharedCountryConfig>(() => {
    return {
      ...checkout.countryConfig,
      paymentMethods: checkout.countryConfig.paymentMethods.map(
        (method) => {
          if (method === "cod") {
            return "cash_on_delivery";
          }

          return method;
        },
      ),
    };
  }, [checkout.countryConfig]);

  const handleCheckoutSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      console.log("[CHECKOUT FORM] SUBMIT EVENT FIRED");

      console.log("[CHECKOUT FORM] Checkout state:", {
        placing: checkout.placing,
        canPlaceOrder: checkout.canPlaceOrder,
        addressComplete: checkout.addressComplete,
        shippingComplete: checkout.shippingComplete,
        cardComplete: checkout.cardComplete,
        paymentMethod: checkout.paymentMethod,
        total: checkout.totals.total,
        itemCount: checkout.checkoutItems.length,
      });

      try {
        console.log(
          "[CHECKOUT FORM] Calling checkout.submitOrder()",
        );

        await checkout.submitOrder();

        console.log(
          "[CHECKOUT FORM] checkout.submitOrder() completed",
        );
      } catch (error) {
        console.error(
          "[CHECKOUT FORM] checkout.submitOrder() failed:",
          error,
        );
      }
    },
    [checkout],
  );

  const selectedShippingSummary =
    checkout.shippingEstimates.length > 0
      ? checkout.shippingEstimates
          .map((estimate) => {
            const selectedOptionId =
              checkout.shippingSelections[estimate.storeId] ??
              estimate.selectedOptionId ??
              estimate.options[0]?.id ??
              "";

            if (!selectedOptionId) {
              return null;
            }

            const option = estimate.options.find(
              (candidate) => candidate.id === selectedOptionId,
            );

            if (!option) {
              return null;
            }

            return {
              id: `${estimate.storeId}:${option.id}`,
              storeId: estimate.storeId,
              storeName:
                checkout.storeNameById[estimate.storeId] ??
                estimate.storeId,
              optionId: option.id,
              optionName: option.label ?? option.id,
              price: option.price,
            };
          })
          .filter(
            (
              value,
            ): value is {
              id: string;
              storeId: string;
              storeName: string;
              optionId: string;
              optionName: string;
              price: number;
            } => Boolean(value),
          )
      : [];

  return (
    <section className="tight">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h1>Checkout</h1>

            <p>
              Complete your shipping, delivery, payment, and optional tip
              information.
            </p>
          </div>

          <Link to="/shop/cart" className="section-link">
            ← Back to cart
          </Link>
        </div>

        <div
          style={{
            marginBottom: 20,
            padding: "14px 16px",
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--paper)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong>
              🌎 Shipping to: {checkout.countryConfig.name}
            </strong>

            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "var(--slate)",
              }}
            >
              Prices, tips, and order totals shown in{" "}
              <strong>
                {checkout.countryConfig.currency}
              </strong>
            </div>
          </div>

          <div
            className="mono"
            style={{
              fontWeight: 700,
            }}
          >
            {checkout.countryConfig.currency}
          </div>
        </div>

        {(checkout.checkoutError || checkout.shippingError) && (
          <div
            className="shop-state-panel"
            style={{
              marginBottom: 20,
              padding: 16,
              textAlign: "left",
            }}
          >
            <strong>Checkout could not be completed</strong>

            <p
              style={{
                marginTop: 5,
                marginBottom: 0,
              }}
            >
              {checkout.checkoutError ||
                checkout.shippingError}
            </p>
          </div>
        )}

        <form
          className="checkout-layout"
          onSubmit={handleCheckoutSubmit}
          noValidate
        >
          <div className="checkout-main">
            <ShippingAddressForm
              address={checkout.address}
              countryConfig={uiCountryConfig}
              isHaiti={checkout.isHaiti}
              onAddressChange={(nextAddress) => {
                checkout.setAddress((current) => ({
                  ...current,
                  fullName:
                    nextAddress.fullName ??
                    current.fullName,

                  email:
                    current.email,

                  line1:
                    nextAddress.line1 ??
                    current.line1,

                  line2:
                    nextAddress.line2 ??
                    current.line2,

                  city:
                    nextAddress.city ??
                    current.city,

                  state:
                    nextAddress.state ??
                    current.state,

                  postalCode:
                    nextAddress.postalCode ??
                    current.postalCode,

                  country:
                    nextAddress.country ??
                    current.country,

                  countryCode:
                    nextAddress.countryCode ??
                    current.countryCode,

                  phone:
                    nextAddress.phone ??
                    current.phone,
                }));
              }}
              onCountryChange={(country) => {
                checkout.handleCountryChange(country);
              }}
            />

            <ShippingMethodSelector
              estimates={checkout.shippingEstimates}
              shippingError={checkout.shippingError}
              shippingSelections={
                checkout.shippingSelections
              }
              storeNameById={
                checkout.storeNameById
              }
              formatPrice={(value: number) =>
                checkout.formatCheckoutPrice(value)
              }
              onSelect={(selection) => {
                if (typeof selection === "string") {
                  const parts = selection.split(":");

                  if (parts.length >= 2) {
                    const storeId = parts[0];
                    const optionId = parts
                      .slice(1)
                      .join(":");

                    if (storeId && optionId) {
                      checkout.selectShipping(
                        storeId,
                        optionId,
                      );
                    }
                  }

                  return;
                }

                if (
                  selection &&
                  typeof selection === "object"
                ) {
                  const selected = selection as {
                    storeId?: string;
                    optionId?: string;
                    id?: string;
                  };

                  if (
                    selected.storeId &&
                    selected.optionId
                  ) {
                    checkout.selectShipping(
                      selected.storeId,
                      selected.optionId,
                    );
                  }
                }
              }}
            />

            <PaymentMethod
              paymentMethod={
                checkout.paymentMethod
              }
              supportedPaymentMethods={
                checkout.supportedPaymentMethods
              }
              countryConfig={uiCountryConfig}
              isHaiti={checkout.isHaiti}
              orderTotal={
                checkout.totals.total
              }
              tipAmount={
                checkout.tipAmount
              }
              stripeReady={
                Boolean(stripe)
              }
              elementsReady={
                Boolean(elements)
              }
              cardComplete={
                checkout.cardComplete
              }
              formatPrice={(value: number) =>
                checkout.formatCheckoutPrice(value)
              }
              onPaymentMethodChange={
                checkout.selectPaymentMethod
              }
              onCardComplete={
                checkout.setCardComplete
              }
              onError={(error) => {
                checkout.setCheckoutError(
                  error ?? "",
                );
              }}
              tipOption={
                checkout.tipOption
              }
              customTip={
                checkout.customTip
              }
              onTipOptionChange={
                checkout.setTipOption
              }
              onCustomTipChange={
                checkout.setCustomTip
              }
            />

            <OrderReview
              groups={
                checkout.checkoutSellerGroups
              }
              formatPrice={(value: number) =>
                checkout.formatCheckoutPrice(value)
              }
            />
          </div>

          <CheckoutSummary
            groups={
              checkout.checkoutSellerGroups
            }
            totals={checkout.totals}
            countryName={
              checkout.countryConfig.name
            }
            currency={
              checkout.countryConfig.currency
            }
            paymentMethod={
              checkout.paymentMethod
            }
            isHaiti={checkout.isHaiti}
            tipAmount={
              checkout.tipAmount
            }
            orderTotal={
              checkout.orderTotal
            }
            addressComplete={
              checkout.addressComplete
            }
            shippingComplete={
              checkout.shippingComplete
            }
            cardComplete={
              checkout.cardComplete
            }
            placing={
              checkout.placing
            }
            canPlaceOrder={
              checkout.canPlaceOrder
            }
            formatPrice={(value: number) =>
              checkout.formatCheckoutPrice(value)
            }
          />
        </form>

        {selectedShippingSummary.length > 0 && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--paper)",
            }}
          >
            <strong>
              Selected delivery methods
            </strong>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gap: 8,
              }}
            >
              {selectedShippingSummary.map(
                (selection) => (
                  <div
                    key={selection.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 16,
                      fontSize: 14,
                    }}
                  >
                    <span>
                      {selection.storeName} —{" "}
                      {selection.optionName}
                    </span>

                    <span className="mono">
                      {checkout.formatCheckoutPrice(
                        Number(selection.price),
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default CheckoutForm;