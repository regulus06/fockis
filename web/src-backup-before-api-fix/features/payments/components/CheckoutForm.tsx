import React, { useEffect, useState } from "react";
import {
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import "./CheckoutForm.scss";

type Props = {
  total: number;
  currency?: string;
  disabled?: boolean;

  /**
   * Called when the payment method changes.
   */
  onPaymentMethodChange?: (
    method: "card",
  ) => void;

  /**
   * Called whenever Stripe reports whether
   * the card information is complete.
   */
  onCardCompleteChange?: (
    complete: boolean,
  ) => void;

  /**
   * Called when Stripe reports a card error.
   */
  onCardError?: (
    message: string | null,
  ) => void;

  /**
   * Called when Stripe CardElement is ready.
   */
  onCardReadyChange?: (
    ready: boolean,
  ) => void;
};

function normalizeCurrency(
  currency?: string,
): string {
  const value = String(
    currency || "USD",
  )
    .trim()
    .toUpperCase();

  return value.length === 3
    ? value
    : "USD";
}

function formatCurrency(
  amount: number,
  currency: string,
): string {
  const normalizedCurrency =
    normalizeCurrency(currency);

  const safeAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency: normalizedCurrency,
      },
    ).format(safeAmount);
  } catch {
    return `${normalizedCurrency} ${safeAmount.toFixed(
      2,
    )}`;
  }
}

export default function CheckoutForm({
  total,
  currency = "USD",
  disabled = false,
  onPaymentMethodChange,
  onCardCompleteChange,
  onCardError,
  onCardReadyChange,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [cardReady, setCardReady] =
    useState(false);

  const [cardComplete, setCardComplete] =
    useState(false);

  const [cardError, setCardError] =
    useState<string | null>(null);

  const [focused, setFocused] =
    useState(false);

  const formattedTotal =
    formatCurrency(
      total,
      currency,
    );

  const stripeLoading =
    !stripe || !elements;

  useEffect(() => {
    onCardCompleteChange?.(
      cardComplete,
    );
  }, [
    cardComplete,
    onCardCompleteChange,
  ]);

  useEffect(() => {
    onCardReadyChange?.(
      cardReady,
    );
  }, [
    cardReady,
    onCardReadyChange,
  ]);

  const handleCardReady = () => {
    setCardReady(true);

    onCardReadyChange?.(true);
  };

  const handleCardChange = (
    event: {
      complete?: boolean;
      empty?: boolean;
      error?: {
        message?: string;
      };
    },
  ) => {
    const complete =
      Boolean(event.complete);

    const message =
      event.error?.message ??
      null;

    setCardComplete(
      complete,
    );

    setCardError(message);

    onCardCompleteChange?.(
      complete,
    );

    onCardError?.(
      message,
    );
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handlePaymentMethodChange =
    () => {
      onPaymentMethodChange?.(
        "card",
      );
    };

  return (
    <div className="checkout-form">

      {/* ================================================================
          PAYMENT METHOD
      ================================================================ */}

      <div className="payment-method-selector">
        <label
          className="payment-method-option selected"
        >
          <input
            type="radio"
            name="fockis-payment-method"
            value="card"
            checked
            onChange={
              handlePaymentMethodChange
            }
            disabled={disabled}
          />

          <div className="payment-method-content">
            <div className="payment-method-title">
              <strong>
                Credit or Debit Card
              </strong>

              <span className="payment-method-badge">
                Secure
              </span>
            </div>

            <span className="payment-method-description">
              Visa, Mastercard,
              American Express,
              Discover
            </span>
          </div>

          <div
            className="payment-method-check"
            aria-hidden="true"
          >
            ✓
          </div>
        </label>
      </div>

      {/* ================================================================
          CARD INFORMATION
      ================================================================ */}

      <div className="stripe-card-section">

        <div className="stripe-field-header">
          <label htmlFor="fockis-card-element">
            Card information
          </label>

          {cardComplete && (
            <span className="stripe-field-valid">
              ✓ Complete
            </span>
          )}
        </div>

        <div
          id="fockis-card-element"
          className={[
            "card-box",
            cardReady
              ? "card-ready"
              : "",
            focused
              ? "card-focused"
              : "",
            cardError
              ? "card-invalid"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <CardElement
            id="fockis-stripe-card"
            onReady={
              handleCardReady
            }
            onChange={
              handleCardChange
            }
            onFocus={
              handleFocus
            }
            onBlur={
              handleBlur
            }
            options={{
              hidePostalCode: false,

              style: {
                base: {
                  fontSize: "16px",
                  lineHeight: "24px",
                  color: "#111827",

                  fontFamily:
                    "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

                  fontSmoothing:
                    "antialiased",

                  "::placeholder": {
                    color: "#9ca3af",
                  },

                  iconColor:
                    "#6b7280",
                },

                invalid: {
                  color: "#dc2626",

                  iconColor:
                    "#dc2626",
                },

                complete: {
                  color: "#111827",
                },
              },
            }}
          />
        </div>

        {/* CARD ERROR */}

        {cardError && (
          <div
            className="checkout-error"
            role="alert"
          >
            <span
              aria-hidden="true"
            >
              !
            </span>

            <span>
              {cardError}
            </span>
          </div>
        )}

        {/* CARD HINT */}

        {!cardError &&
          cardReady &&
          !cardComplete && (
            <p className="payment-card-hint">
              Enter your card number,
              expiration date, security
              code, and postal code.
            </p>
          )}

        {/* STRIPE LOADING */}

        {stripeLoading && (
          <div
            className="stripe-loading"
            role="status"
            aria-live="polite"
          >
            <span className="stripe-loading-spinner" />

            <span>
              Loading secure payment
              form...
            </span>
          </div>
        )}
      </div>

      {/* ================================================================
          SECURITY
      ================================================================ */}

      <div className="payment-security">
        <div
          className="payment-security-icon"
          aria-hidden="true"
        >
          🔒
        </div>

        <div>
          <strong>
            Your payment information is
            protected
          </strong>

          <p>
            Your card information is
            encrypted and securely
            processed by Stripe.
            Fockis never receives or
            stores your complete card
            number.
          </p>
        </div>
      </div>

      {/* ================================================================
          TOTAL
      ================================================================ */}

      <div className="payment-total">
        <div>
          <span>
            Total to pay
          </span>

          <small>
            Secure checkout
          </small>
        </div>

        <strong>
          {formattedTotal}
        </strong>
      </div>

      {/* ================================================================
          PAYMENT STATUS
      ================================================================ */}

      {!stripe && (
        <div
          className="checkout-status checkout-status-loading"
          role="status"
        >
          <span className="status-spinner" />

          <span>
            Connecting to Stripe...
          </span>
        </div>
      )}

      {stripe &&
        !elements && (
          <div
            className="checkout-status checkout-status-error"
            role="alert"
          >
            <span>
              !
            </span>

            <span>
              The secure payment form
              could not be loaded.
              Please refresh the page.
            </span>
          </div>
        )}

      {/* ================================================================
          TRUST INFORMATION
      ================================================================ */}

      <div className="payment-information">

        <div>
          <span
            aria-hidden="true"
          >
            🔒
          </span>

          <span>
            Secure Stripe payment
          </span>
        </div>

        <div>
          <span
            aria-hidden="true"
          >
            ✓
          </span>

          <span>
            Fockis does not store your
            full card number
          </span>
        </div>

        <div>
          <span
            aria-hidden="true"
          >
            ✓
          </span>

          <span>
            Encrypted payment processing
          </span>
        </div>

      </div>

    </div>
  );
}