import React, {
  useMemo,
  useState,
} from "react";

import {
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { useNavigate } from "react-router-dom";

import { api } from "../../../api/api";

import "../styles/CheckoutPage.scss";

/* ============================================================================
   TYPES
============================================================================ */

type PaymentPurpose =
  | "FOCKIS_ID"
  | "MARKETPLACE"
  | "COINS"
  | "TRAVEL"
  | "MUSIC"
  | "EVENTS"
  | "MEETINGS"
  | "CHURCH"
  | "ADVERTISING"
  | "SUBSCRIPTIONS"
  | "BOOKINGS"
  | "OTHER";

type BackendPaymentPurpose =
  | "fockis_id"
  | "marketplace_order"
  | "coin_purchase"
  | "travel_booking"
  | "music"
  | "event"
  | "meeting"
  | "church"
  | "advertising"
  | "subscription"
  | "other";

interface CheckoutPageProps {
  amount: number;
  currency?: string;
  country?: string;
  purpose?: PaymentPurpose | string;
  referenceId?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, string>;

  onSuccess?: (
    payment: ConfirmPaymentResponse,
  ) => void;

  onCancel?: () => void;
}

interface CreatePaymentResponse {
  success?: boolean;
  paymentId?: string;
  clientSecret?: string;
  paymentIntentId?: string;
  status?: string;
  amount?: number;
  currency?: string;
}

export interface ConfirmPaymentResponse {
  success?: boolean;
  paymentId?: string;
  paymentIntentId?: string;
  status?: string;
  amount?: number;
  currency?: string;
}

/* ============================================================================
   COUNTRY / CURRENCY
============================================================================ */

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: "USD",
  CA: "CAD",

  HT: "HTG",
  DO: "DOP",
  JM: "JMD",
  MX: "MXN",

  BR: "BRL",
  AR: "ARS",
  CO: "COP",
  CL: "CLP",
  PE: "PEN",

  GB: "GBP",

  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  BE: "EUR",
  NL: "EUR",
  IE: "EUR",

  CH: "CHF",

  JP: "JPY",
  CN: "CNY",
  IN: "INR",

  AU: "AUD",
  NZ: "NZD",
};

/* ============================================================================
   PAYMENT PURPOSE MAP
============================================================================ */

/**
 * Frontend purpose -> Backend purpose
 *
 * IMPORTANT:
 * The backend ValidationPipe expects the exact
 * lowercase enum values.
 */
const PAYMENT_PURPOSE_MAP: Record<
  string,
  BackendPaymentPurpose
> = {
  FOCKIS_ID: "fockis_id",
  fockis_id: "fockis_id",

  MARKETPLACE: "marketplace_order",
  marketplace: "marketplace_order",
  marketplace_order: "marketplace_order",

  COINS: "coin_purchase",
  coins: "coin_purchase",
  coin_purchase: "coin_purchase",

  TRAVEL: "travel_booking",
  travel: "travel_booking",
  travel_booking: "travel_booking",

  MUSIC: "music",

  EVENTS: "event",
  event: "event",

  MEETINGS: "meeting",
  meeting: "meeting",

  CHURCH: "church",
  church: "church",

  ADVERTISING: "advertising",
  advertising: "advertising",

  SUBSCRIPTIONS: "subscription",
  subscription: "subscription",

  BOOKINGS: "travel_booking",
  bookings: "travel_booking",

  OTHER: "other",
  other: "other",
};

/**
 * Converts whatever the frontend supplies into
 * the exact value expected by the NestJS backend.
 */
function normalizePaymentPurpose(
  purpose?: string,
): BackendPaymentPurpose {
  const value =
    purpose?.trim() || "OTHER";

  return (
    PAYMENT_PURPOSE_MAP[value] ??
    PAYMENT_PURPOSE_MAP[
      value.toUpperCase()
    ] ??
    "other"
  );
}

/* ============================================================================
   HELPERS
============================================================================ */

function normalizeCurrency(
  currency?: string,
): string {
  const value =
    currency?.trim().toUpperCase() ||
    "USD";

  if (value.length !== 3) {
    return "USD";
  }

  return value;
}

function normalizeCountry(
  country?: string,
): string {
  const value =
    country?.trim().toUpperCase() ||
    "US";

  if (value.length !== 2) {
    return "US";
  }

  return value;
}

function getCurrencyForCountry(
  country: string,
): string {
  return (
    COUNTRY_CURRENCY_MAP[country] ??
    "USD"
  );
}

function formatMoney(
  amount: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency,
      },
    ).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getErrorMessage(
  error: unknown,
): string {
  const axiosError =
    error as {
      response?: {
        data?: {
          message?: string | string[];
          error?: string;
        };
      };
      message?: string;
    };

  const backendMessage =
    axiosError?.response?.data?.message;

  if (Array.isArray(backendMessage)) {
    return backendMessage.join(", ");
  }

  if (backendMessage) {
    return String(backendMessage);
  }

  const backendError =
    axiosError?.response?.data?.error;

  if (backendError) {
    return backendError;
  }

  if (axiosError?.message) {
    return axiosError.message;
  }

  return "Unable to complete the payment.";
}

function createCheckoutId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through.
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/* ============================================================================
   SUCCESS ROUTES
============================================================================ */

function getSuccessPath(
  backendPurpose: BackendPaymentPurpose,
): string {
  switch (backendPurpose) {
    case "fockis_id":
      return "/settings/fockis-id";

    case "marketplace_order":
      return "/shop";

    case "coin_purchase":
      return "/wallet";

    case "travel_booking":
      return "/travel";

    case "music":
      return "/music";

    case "event":
      return "/events";

    case "meeting":
      return "/meetings";

    case "church":
      return "/organizations";

    case "advertising":
      return "/marketing";

    case "subscription":
      return "/subscriptions";

    case "other":
    default:
      return "/fockis-preview";
  }
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function CheckoutPage({
  amount,
  currency,
  country,
  purpose = "OTHER",
  referenceId,
  title = "Secure Checkout",
  description =
    "Complete your payment securely with Stripe.",
  metadata,
  onSuccess,
  onCancel,
}: CheckoutPageProps) {
  const stripe = useStripe();
  const elements = useElements();

  const navigate = useNavigate();

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [
    cardComplete,
    setCardComplete,
  ] = useState(false);

  const [
    cardError,
    setCardError,
  ] = useState<string | null>(null);

  /* ==========================================================================
     CHECKOUT ID
  ========================================================================== */

  const checkoutId = useMemo(
    () => createCheckoutId(),
    [],
  );

  /* ==========================================================================
     COUNTRY
  ========================================================================== */

  const resolvedCountry =
    useMemo(
      () =>
        normalizeCountry(country),
      [country],
    );

  /* ==========================================================================
     CURRENCY
  ========================================================================== */

  const resolvedCurrency =
    useMemo(() => {
      if (currency?.trim()) {
        return normalizeCurrency(
          currency,
        );
      }

      return getCurrencyForCountry(
        resolvedCountry,
      );
    }, [
      currency,
      resolvedCountry,
    ]);

  /* ==========================================================================
     PAYMENT PURPOSE
  ========================================================================== */

  const backendPurpose =
    useMemo(
      () =>
        normalizePaymentPurpose(
          purpose,
        ),
      [purpose],
    );

  /* ==========================================================================
     AMOUNT
  ========================================================================== */

  const numericAmount =
    useMemo(() => {
      const parsed = Number(amount);

      if (!Number.isFinite(parsed)) {
        return 0;
      }

      return Number(
        parsed.toFixed(2),
      );
    }, [amount]);

  const formattedAmount =
    useMemo(
      () =>
        formatMoney(
          numericAmount,
          resolvedCurrency,
        ),
      [
        numericAmount,
        resolvedCurrency,
      ],
    );

  /* ==========================================================================
     SUBMIT
  ========================================================================== */

  const canSubmit =
    Boolean(stripe) &&
    Boolean(elements) &&
    cardComplete &&
    !isProcessing &&
    numericAmount > 0;

  /* ==========================================================================
     CARD CHANGE
  ========================================================================== */

  const handleCardChange = (
    event: {
      complete?: boolean;
      error?: {
        message?: string;
      };
    },
  ) => {
    const complete =
      Boolean(event.complete);

    const message =
      event.error?.message ?? null;

    setCardComplete(complete);
    setCardError(message);

    if (message) {
      setErrorMessage(message);
    } else {
      setErrorMessage(null);
    }
  };

  /* ==========================================================================
     SUBMIT PAYMENT
  ========================================================================== */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    /* ------------------------------------------------------------------------
       STRIPE CHECK
    ------------------------------------------------------------------------ */

    if (!stripe) {
      setErrorMessage(
        "Stripe is still loading. Please wait a moment and try again.",
      );
      return;
    }

    if (!elements) {
      setErrorMessage(
        "The secure payment form is not ready. Please refresh the page and try again.",
      );
      return;
    }

    if (numericAmount <= 0) {
      setErrorMessage(
        "The payment amount is invalid.",
      );
      return;
    }

    if (!cardComplete) {
      setErrorMessage(
        "Please enter your complete card information.",
      );
      return;
    }

    const card =
      elements.getElement(
        CardElement,
      );

    if (!card) {
      setErrorMessage(
        "Unable to load the secure card field.",
      );
      return;
    }

    setIsProcessing(true);

    try {
      /* ======================================================================
         STEP 1 — CREATE PAYMENT
      ====================================================================== */

      const safeReferenceId =
        referenceId?.trim() ||
        `checkout-${checkoutId}`;

      /*
       * IMPORTANT:
       *
       * Send the backend enum value, NOT the
       * frontend value.
       *
       * Example:
       *
       * FOCKIS_ID
       *
       * becomes:
       *
       * fockis_id
       */
      const idempotencyKey =
        `fockis:${backendPurpose}:${safeReferenceId}:${checkoutId}`;

      console.log(
        "[Fockis Checkout] Creating payment:",
        {
          purpose: backendPurpose,
          referenceId:
            safeReferenceId,
          amount: numericAmount,
          currency:
            resolvedCurrency,
          country:
            resolvedCountry,
        },
      );

      const createResponse =
        await api.post<CreatePaymentResponse>(
          "/payments/create",
          {
            purpose:
              backendPurpose,

            referenceId:
              safeReferenceId,

            baseAmount:
              numericAmount,

            baseCurrency:
              resolvedCurrency,

            country:
              resolvedCountry,

            idempotencyKey,

            metadata: {
              ...(metadata ?? {}),

              source:
                metadata?.source ??
                "fockis-web-checkout",

              checkoutId,

              checkoutVersion:
                "3",

              frontendPurpose:
                String(purpose),

              backendPurpose:
                backendPurpose,
            },
          },
        );

      const payment =
        createResponse.data;

      if (
        !payment ||
        !payment.clientSecret
      ) {
        throw new Error(
          "Fockis did not return a Stripe client secret.",
        );
      }

      /* ======================================================================
         STEP 2 — STRIPE CONFIRMATION
      ====================================================================== */

      const stripeResult =
        await stripe.confirmCardPayment(
          payment.clientSecret,
          {
            payment_method: {
              card,
            },
          },
        );

      if (stripeResult.error) {
        throw new Error(
          stripeResult.error.message ||
          "Stripe could not process the payment.",
        );
      }

      const paymentIntent =
        stripeResult.paymentIntent;

      if (!paymentIntent) {
        throw new Error(
          "Stripe did not return a payment intent.",
        );
      }

      /* ======================================================================
         STEP 3 — STRIPE STATUS
      ====================================================================== */

      switch (
        paymentIntent.status
      ) {
        case "succeeded":
          break;

        case "processing":
          throw new Error(
            "Your payment is still being processed. Please check your Fockis payment history shortly.",
          );

        case "requires_action":
          throw new Error(
            "Additional payment authentication is required.",
          );

        case "requires_payment_method":
          throw new Error(
            "The payment method was declined. Please try another card.",
          );

        case "canceled":
          throw new Error(
            "This payment was canceled.",
          );

        default:
          throw new Error(
            `Payment was not completed. Stripe status: ${paymentIntent.status}.`,
          );
      }

      /* ======================================================================
         STEP 4 — FOCKIS CONFIRMATION
      ========================================================================== */

      const confirmResponse =
        await api.post<ConfirmPaymentResponse>(
          "/payments/confirm",
          {
            paymentIntentId:
              paymentIntent.id,
          },
        );

      const confirmedPayment =
        confirmResponse.data;

      if (
        confirmedPayment?.success ===
        false
      ) {
        throw new Error(
          "Fockis could not confirm the payment.",
        );
      }

      /* ======================================================================
         STEP 5 — SUCCESS
      ========================================================================== */

      setSuccessMessage(
        "Payment completed successfully. Redirecting...",
      );

      setErrorMessage(null);

      onSuccess?.(
        confirmedPayment,
      );

      /* ======================================================================
         STEP 6 — REDIRECT
      ========================================================================== */

      const successPath =
        getSuccessPath(
          backendPurpose,
        );

      await new Promise<void>(
        (resolve) => {
          window.setTimeout(
            resolve,
            1000,
          );
        },
      );

      navigate(
        successPath,
        {
          replace: true,

          state: {
            payment:
              confirmedPayment,

            paymentIntentId:
              paymentIntent.id,

            purpose:
              backendPurpose,

            referenceId:
              safeReferenceId,

            paymentSuccess:
              true,

            activated:
              backendPurpose ===
              "fockis_id",
          },
        },
      );
    } catch (
      error: unknown
    ) {
      console.error(
        "[Fockis Checkout] Payment error:",
        error,
      );

      setSuccessMessage(null);

      setErrorMessage(
        getErrorMessage(error),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /* ==========================================================================
     CANCEL
  ========================================================================== */

  const handleCancel = () => {
    if (isProcessing) {
      return;
    }

    if (onCancel) {
      onCancel();
      return;
    }

    if (
      backendPurpose ===
      "fockis_id"
    ) {
      navigate(
        "/settings/fockis-id",
        {
          replace: true,
        },
      );

      return;
    }

    navigate(
      "/fockis-preview",
      {
        replace: true,
      },
    );
  };

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="fockis-checkout">
      <div className="fockis-checkout__container">

        {/* ==================================================================
            HEADER
        ================================================================== */}

        <header className="fockis-checkout__header">

          <div>

            <span className="fockis-checkout__eyebrow">
              FOCKIS PAYMENTS
            </span>

            <h1>
              {title}
            </h1>

            <p>
              {description}
            </p>

          </div>

          <div className="fockis-checkout__secure">

            <span className="fockis-checkout__secure-icon">
              🔒
            </span>

            <div>

              <strong>
                Secure payment
              </strong>

              <span>
                Powered by Stripe
              </span>

            </div>

          </div>

        </header>

        {/* ==================================================================
            MAIN
        ================================================================== */}

        <div className="fockis-checkout__grid">

          {/* ================================================================
              PAYMENT
          ================================================================ */}

          <section className="fockis-checkout__payment-card">

            <div className="fockis-checkout__section-heading">

              <div>

                <span className="fockis-checkout__step">
                  01
                </span>

                <div>

                  <h2>
                    Payment method
                  </h2>

                  <p>
                    Enter your card
                    information below.
                  </p>

                </div>

              </div>

            </div>

            <form
              className="fockis-checkout__form"
              onSubmit={
                handleSubmit
              }
            >

              {/* ==========================================================
                  CARD
              ========================================================== */}

              <div className="fockis-checkout__card-field">

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: "12px",
                    marginBottom:
                      "8px",
                  }}
                >

                  <label
                    htmlFor="fockis-card-element"
                  >
                    Card information
                  </label>

                  {cardComplete &&
                    !cardError && (
                      <span
                        style={{
                          color:
                            "#16a34a",
                          fontSize:
                            "13px",
                          fontWeight:
                            700,
                        }}
                      >
                        ✓ Card ready
                      </span>
                    )}

                </div>

                <div
                  id="fockis-card-element"
                  className={[
                    "fockis-checkout__stripe-element",
                    cardError
                      ? "is-invalid"
                      : "",
                    cardComplete
                      ? "is-complete"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(" ")}
                >

                  <CardElement
                    onChange={
                      handleCardChange
                    }
                    options={{
                      hidePostalCode:
                        false,

                      style: {
                        base: {
                          fontSize:
                            "16px",

                          color:
                            "#111827",

                          fontFamily:
                            "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

                          lineHeight:
                            "24px",

                          fontSmoothing:
                            "antialiased",

                          "::placeholder":
                            {
                              color:
                                "#9ca3af",
                            },
                        },

                        invalid: {
                          color:
                            "#dc2626",
                        },

                        complete: {
                          color:
                            "#111827",
                        },
                      },
                    }}
                  />

                </div>

                {cardError && (
                  <div
                    className="fockis-checkout__field-error"
                    role="alert"
                  >
                    {cardError}
                  </div>
                )}

              </div>

              {/* ==========================================================
                  SECURITY
              ========================================================== */}

              <div className="fockis-checkout__security">

                <div className="fockis-checkout__security-icon">
                  ✓
                </div>

                <div>

                  <strong>
                    Your payment information
                    is protected
                  </strong>

                  <p>
                    Your card details are
                    securely processed by
                    Stripe. Fockis does not
                    store your complete card
                    number.
                  </p>

                </div>

              </div>

              {/* ==========================================================
                  ERROR
              ========================================================== */}

              {errorMessage && (
                <div
                  className="fockis-checkout__alert fockis-checkout__alert--error"
                  role="alert"
                >

                  <span>
                    !
                  </span>

                  <div>

                    <strong>
                      Payment failed
                    </strong>

                    <p>
                      {errorMessage}
                    </p>

                  </div>

                </div>
              )}

              {/* ==========================================================
                  SUCCESS
              ========================================================== */}

              {successMessage && (
                <div
                  className="fockis-checkout__alert fockis-checkout__alert--success"
                  role="status"
                >

                  <span>
                    ✓
                  </span>

                  <div>

                    <strong>
                      Payment successful
                    </strong>

                    <p>
                      {successMessage}
                    </p>

                  </div>

                </div>
              )}

              {/* ==========================================================
                  ACTIONS
              ========================================================== */}

              <div className="fockis-checkout__actions">

                <button
                  type="button"
                  className="fockis-checkout__cancel"
                  onClick={
                    handleCancel
                  }
                  disabled={
                    isProcessing
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="fockis-checkout__submit"
                  disabled={
                    !canSubmit
                  }
                >

                  {isProcessing ? (
                    <>
                      <span className="fockis-checkout__spinner" />

                      Processing
                      payment...
                    </>
                  ) : (
                    <>
                      Pay{" "}
                      {
                        formattedAmount
                      }
                    </>
                  )}

                </button>

              </div>

            </form>

          </section>

          {/* ================================================================
              ORDER SUMMARY
          ================================================================ */}

          <aside className="fockis-checkout__summary">

            <div className="fockis-checkout__summary-header">

              <span className="fockis-checkout__step">
                02
              </span>

              <div>

                <h2>
                  Order summary
                </h2>

                <p>
                  Review your payment
                  before continuing.
                </p>

              </div>

            </div>

            <div className="fockis-checkout__summary-item">

              <div>

                <span>
                  Service
                </span>

                <strong>
                  {title}
                </strong>

              </div>

              <strong>
                {formattedAmount}
              </strong>

            </div>

            <div className="fockis-checkout__summary-meta">

              <div>

                <span>
                  Payment type
                </span>

                <strong>
                  {backendPurpose}
                </strong>

              </div>

              <div>

                <span>
                  Country
                </span>

                <strong>
                  {resolvedCountry}
                </strong>

              </div>

              <div>

                <span>
                  Currency
                </span>

                <strong>
                  {resolvedCurrency}
                </strong>

              </div>

            </div>

            <div className="fockis-checkout__total">

              <span>
                Total
              </span>

              <strong>
                {formattedAmount}
              </strong>

            </div>

            <div className="fockis-checkout__guarantees">

              <div>

                <span>
                  ✓
                </span>

                <p>
                  Secure Stripe checkout
                </p>

              </div>

              <div>

                <span>
                  ✓
                </span>

                <p>
                  Payment confirmation
                  from Fockis
                </p>

              </div>

              <div>

                <span>
                  ✓
                </span>

                <p>
                  Your card details are
                  protected
                </p>

              </div>

            </div>

          </aside>

        </div>

      </div>
    </div>
  );
}