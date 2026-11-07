import React, { useMemo, useState } from "react";

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

/**
 * Optional display details for the order summary.
 * Purely presentational — nothing here is sent to the backend
 * or used to calculate the amount.
 */
export interface CheckoutItemDetails {
  /** Cover image / thumbnail URL. */
  imageUrl?: string;
  /** Short badge, e.g. "Seminar", "Course", "Workshop", "Order". */
  typeLabel?: string;
  /** Category, e.g. "Cybersecurity". */
  category?: string;
  /** Seller / instructor / organizer name. */
  provider?: string;
  /** Human-readable schedule, e.g. "Nov 12, 2026 · 6:00 PM EST". */
  schedule?: string;
  /** Extra label/value rows shown in the summary. */
  details?: Array<{ label: string; value: string }>;
}

interface CheckoutPageProps {
  amount: number;
  currency?: string;
  country?: string;
  purpose?: PaymentPurpose | string;
  referenceId?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, string>;

  /** Optional order-summary details (display only). */
  item?: CheckoutItemDetails;

  onSuccess?: (payment: ConfirmPaymentResponse) => void;

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
const PAYMENT_PURPOSE_MAP: Record<string, BackendPaymentPurpose> = {
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

/** Friendly labels for the summary (display only). */
const PURPOSE_LABELS: Record<BackendPaymentPurpose, string> = {
  fockis_id: "Fockis ID",
  marketplace_order: "Marketplace order",
  coin_purchase: "Fockis Coins",
  travel_booking: "Travel booking",
  music: "Music",
  event: "Event registration",
  meeting: "Meeting",
  church: "Organization",
  advertising: "Advertising",
  subscription: "Subscription",
  other: "Payment",
};

/**
 * Converts whatever the frontend supplies into
 * the exact value expected by the NestJS backend.
 */
function normalizePaymentPurpose(purpose?: string): BackendPaymentPurpose {
  const value = purpose?.trim() || "OTHER";

  return (
    PAYMENT_PURPOSE_MAP[value] ??
    PAYMENT_PURPOSE_MAP[value.toUpperCase()] ??
    "other"
  );
}

/* ============================================================================
   HELPERS
============================================================================ */

function normalizeCurrency(currency?: string): string {
  const value = currency?.trim().toUpperCase() || "USD";

  if (value.length !== 3) {
    return "USD";
  }

  return value;
}

function normalizeCountry(country?: string): string {
  const value = country?.trim().toUpperCase() || "US";

  if (value.length !== 2) {
    return "US";
  }

  return value;
}

function getCurrencyForCountry(country: string): string {
  return COUNTRY_CURRENCY_MAP[country] ?? "USD";
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getCountryName(code: string): string {
  try {
    const DisplayNames = (
      Intl as unknown as {
        DisplayNames?: new (
          locales?: string | string[],
          options?: { type: "region" },
        ) => { of: (code: string) => string | undefined };
      }
    ).DisplayNames;

    if (DisplayNames) {
      return new DisplayNames(undefined, { type: "region" }).of(code) ?? code;
    }
  } catch {
    // Fall through.
  }

  return code;
}

function getErrorMessage(error: unknown): string {
  const axiosError = error as {
    response?: {
      data?: {
        message?: string | string[];
        error?: string;
      };
    };
    message?: string;
  };

  const backendMessage = axiosError?.response?.data?.message;

  if (Array.isArray(backendMessage)) {
    return backendMessage.join(", ");
  }

  if (backendMessage) {
    return String(backendMessage);
  }

  const backendError = axiosError?.response?.data?.error;

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
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through.
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ============================================================================
   SUCCESS ROUTES
============================================================================ */

function getSuccessPath(backendPurpose: BackendPaymentPurpose): string {
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
   ICONS (inline SVG, stroke = currentColor)
============================================================================ */

type IconProps = { size?: number };

const svgProps = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

const LockIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const ShieldIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CardIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M2.5 10h19M6.5 15h4" />
  </svg>
);

const CheckIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
);

const AlertIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
);

const ArrowLeftIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

const UserIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const CalendarIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

const ReceiptIcon = ({ size }: IconProps) => (
  <svg {...svgProps(size)}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

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
  description = "Complete your payment securely with Stripe.",
  metadata,
  item,
  onSuccess,
  onCancel,
}: CheckoutPageProps) {
  const stripe = useStripe();
  const elements = useElements();

  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardFocused, setCardFocused] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  /* ==========================================================================
     DERIVED VALUES
  ========================================================================== */

  const checkoutId = useMemo(() => createCheckoutId(), []);

  const resolvedCountry = useMemo(() => normalizeCountry(country), [country]);

  const resolvedCurrency = useMemo(() => {
    if (currency?.trim()) {
      return normalizeCurrency(currency);
    }

    return getCurrencyForCountry(resolvedCountry);
  }, [currency, resolvedCountry]);

  const backendPurpose = useMemo(
    () => normalizePaymentPurpose(purpose),
    [purpose],
  );

  const numericAmount = useMemo(() => {
    const parsed = Number(amount);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Number(parsed.toFixed(2));
  }, [amount]);

  const formattedAmount = useMemo(
    () => formatMoney(numericAmount, resolvedCurrency),
    [numericAmount, resolvedCurrency],
  );

  const countryName = useMemo(
    () => getCountryName(resolvedCountry),
    [resolvedCountry],
  );

  const typeLabel = item?.typeLabel?.trim() || PURPOSE_LABELS[backendPurpose];

  const isPaid = Boolean(successMessage);

  const canSubmit =
    Boolean(stripe) &&
    Boolean(elements) &&
    cardComplete &&
    !isProcessing &&
    !isPaid &&
    numericAmount > 0;

  /* ==========================================================================
     CARD CHANGE
  ========================================================================== */

  const handleCardChange = (event: {
    complete?: boolean;
    error?: {
      message?: string;
    };
  }) => {
    const complete = Boolean(event.complete);
    const message = event.error?.message ?? null;

    setCardComplete(complete);
    setCardError(message);
    setErrorMessage(null);
  };

  /* ==========================================================================
     SUBMIT PAYMENT
     (Flow unchanged: create -> Stripe confirm -> Fockis backend confirm)
  ========================================================================== */

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isProcessing || isPaid) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

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
      setErrorMessage("The payment amount is invalid.");
      return;
    }

    if (!cardComplete) {
      setErrorMessage("Please enter your complete card information.");
      return;
    }

    const card = elements.getElement(CardElement);

    if (!card) {
      setErrorMessage("Unable to load the secure card field.");
      return;
    }

    setIsProcessing(true);

    try {
      /* STEP 1 — CREATE PAYMENT */

      const safeReferenceId = referenceId?.trim() || `checkout-${checkoutId}`;

      const idempotencyKey = `fockis:${backendPurpose}:${safeReferenceId}:${checkoutId}`;

      console.log("[Fockis Checkout] Creating payment:", {
        purpose: backendPurpose,
        referenceId: safeReferenceId,
        amount: numericAmount,
        currency: resolvedCurrency,
        country: resolvedCountry,
      });

      const createResponse = await api.post<CreatePaymentResponse>(
        "/payments/create",
        {
          purpose: backendPurpose,
          referenceId: safeReferenceId,
          baseAmount: numericAmount,
          baseCurrency: resolvedCurrency,
          country: resolvedCountry,
          idempotencyKey,
          metadata: {
            ...(metadata ?? {}),
            source: metadata?.source ?? "fockis-web-checkout",
            checkoutId,
            checkoutVersion: "3",
            frontendPurpose: String(purpose),
            backendPurpose,
          },
        },
      );

      const payment = createResponse.data;

      if (!payment || !payment.clientSecret) {
        throw new Error("Fockis did not return a Stripe client secret.");
      }

      /* STEP 2 — STRIPE CONFIRMATION */

      const stripeResult = await stripe.confirmCardPayment(
        payment.clientSecret,
        {
          payment_method: {
            card,
          },
        },
      );

      if (stripeResult.error) {
        throw new Error(
          stripeResult.error.message || "Stripe could not process the payment.",
        );
      }

      const paymentIntent = stripeResult.paymentIntent;

      if (!paymentIntent) {
        throw new Error("Stripe did not return a payment intent.");
      }

      /* STEP 3 — STRIPE STATUS */

      switch (paymentIntent.status) {
        case "succeeded":
          break;

        case "processing":
          throw new Error(
            "Your payment is still being processed. Please check your Fockis payment history shortly.",
          );

        case "requires_action":
          throw new Error("Additional payment authentication is required.");

        case "requires_payment_method":
          throw new Error(
            "The payment method was declined. Please try another card.",
          );

        case "canceled":
          throw new Error("This payment was canceled.");

        default:
          throw new Error(
            `Payment was not completed. Stripe status: ${paymentIntent.status}.`,
          );
      }

      /* STEP 4 — FOCKIS BACKEND CONFIRMATION */

      const confirmResponse = await api.post<ConfirmPaymentResponse>(
        "/payments/confirm",
        {
          paymentIntentId: paymentIntent.id,
        },
      );

      const confirmedPayment = confirmResponse.data;

      if (confirmedPayment?.success === false) {
        throw new Error("Fockis could not confirm the payment.");
      }

      /* STEP 5 — SUCCESS */

      setSuccessMessage("Payment completed successfully. Redirecting...");
      setErrorMessage(null);

      onSuccess?.(confirmedPayment);

      /* STEP 6 — REDIRECT */

      const successPath = getSuccessPath(backendPurpose);

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 1000);
      });

      navigate(successPath, {
        replace: true,
        state: {
          payment: confirmedPayment,
          paymentIntentId: paymentIntent.id,
          purpose: backendPurpose,
          referenceId: safeReferenceId,
          paymentSuccess: true,
          activated: backendPurpose === "fockis_id",
        },
      });
    } catch (error: unknown) {
      console.error("[Fockis Checkout] Payment error:", error);

      setSuccessMessage(null);
      setErrorMessage(getErrorMessage(error));
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

    if (backendPurpose === "fockis_id") {
      navigate("/settings/fockis-id", { replace: true });
      return;
    }

    navigate("/fockis-preview", { replace: true });
  };

  /* ==========================================================================
     RENDER
  ========================================================================== */

  const steps = [
    { label: "Review", state: "done" as const },
    { label: "Payment", state: isPaid ? ("done" as const) : ("active" as const) },
    { label: "Confirmation", state: isPaid ? ("active" as const) : ("todo" as const) },
  ];

  const showImage = Boolean(item?.imageUrl) && !imageFailed;

  return (
    <div className="fockis-checkout">
      {/* ==================================================================
          TOP BAR
      ================================================================== */}

      <div className="fockis-checkout__topbar">
        <div className="fockis-checkout__topbar-inner">
          <button
            type="button"
            className="fockis-checkout__back"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            <ArrowLeftIcon size={16} />
            <span>Back</span>
          </button>

          <div className="fockis-checkout__brand" aria-label="Fockis Payments">
            <span className="fockis-checkout__brand-mark" aria-hidden="true">
              F
            </span>
            <span className="fockis-checkout__brand-text">
              Fockis <em>Payments</em>
            </span>
          </div>

          <div className="fockis-checkout__secure">
            <LockIcon size={15} />
            <span>Secure checkout</span>
          </div>
        </div>
      </div>

      <div className="fockis-checkout__container">
        {/* ==================================================================
            HEADER + STEPPER
        ================================================================== */}

        <header className="fockis-checkout__header">
          <div className="fockis-checkout__heading">
            <span className="fockis-checkout__eyebrow">Checkout</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <ol className="fockis-checkout__stepper" aria-label="Checkout progress">
            {steps.map((step, index) => (
              <li
                key={step.label}
                className={`fockis-checkout__stepper-item is-${step.state}`}
                aria-current={step.state === "active" ? "step" : undefined}
              >
                <span className="fockis-checkout__stepper-dot">
                  {step.state === "done" ? <CheckIcon size={14} /> : index + 1}
                </span>
                <span className="fockis-checkout__stepper-label">
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </header>

        {/* ==================================================================
            MAIN GRID
        ================================================================== */}

        <div className="fockis-checkout__grid">
          {/* ================================================================
              PAYMENT
          ================================================================ */}

          <section
            className="fockis-checkout__panel fockis-checkout__payment-card"
            aria-labelledby="fockis-checkout-payment-title"
          >
            <div className="fockis-checkout__panel-head">
              <span className="fockis-checkout__panel-icon">
                <CardIcon size={20} />
              </span>
              <div>
                <h2 id="fockis-checkout-payment-title">Payment method</h2>
                <p>All transactions are secure and encrypted.</p>
              </div>
            </div>

            <form
              className={[
                "fockis-checkout__form",
                isProcessing ? "is-processing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onSubmit={handleSubmit}
              noValidate
            >
              {/* METHOD TILE (card is the only method the backend supports here) */}

              <div className="fockis-checkout__method is-selected">
                <span className="fockis-checkout__method-radio" aria-hidden="true">
                  <span />
                </span>

                <div className="fockis-checkout__method-body">
                  <strong>Credit or debit card</strong>
                  <span>Processed securely by Stripe</span>
                </div>

                <div className="fockis-checkout__brands" aria-label="Accepted cards">
                  <span className="is-visa">VISA</span>
                  <span className="is-mc">Mastercard</span>
                  <span className="is-amex">AMEX</span>
                  <span className="is-disc">Discover</span>
                </div>
              </div>

              {/* CARD FIELD */}

              <div className="fockis-checkout__card-field">
                <div className="fockis-checkout__field-head">
                  <label htmlFor="fockis-card-element">Card information</label>

                  {cardComplete && !cardError && (
                    <span className="fockis-checkout__card-ready">
                      <CheckIcon size={14} />
                      Card ready
                    </span>
                  )}
                </div>

                <div
                  id="fockis-card-element"
                  className={[
                    "fockis-checkout__stripe-element",
                    cardError ? "is-invalid" : "",
                    cardComplete ? "is-complete" : "",
                    cardFocused ? "is-focused" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <CardElement
                    onChange={handleCardChange}
                    onFocus={() => setCardFocused(true)}
                    onBlur={() => setCardFocused(false)}
                    options={{
                      hidePostalCode: false,
                      disabled: isProcessing || isPaid,
                      style: {
                        base: {
                          fontSize: "16px",
                          color: "#0B1B3F",
                          fontFamily:
                            "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          lineHeight: "24px",
                          fontSmoothing: "antialiased",
                          iconColor: "#1659F5",
                          "::placeholder": {
                            color: "#94A3B8",
                          },
                        },
                        invalid: {
                          color: "#DC2626",
                          iconColor: "#DC2626",
                        },
                        complete: {
                          color: "#0B1B3F",
                        },
                      },
                    }}
                  />
                </div>

                {cardError && (
                  <div className="fockis-checkout__field-error" role="alert">
                    <AlertIcon size={15} />
                    <span>{cardError}</span>
                  </div>
                )}
              </div>

              {/* SECURITY NOTE */}

              <div className="fockis-checkout__security">
                <span className="fockis-checkout__security-icon">
                  <ShieldIcon size={20} />
                </span>

                <div>
                  <strong>Your payment information is protected</strong>
                  <p>
                    Card details are encrypted and processed by Stripe. Fockis
                    never stores your full card number.
                  </p>
                </div>
              </div>

              {/* ALERTS */}

              {errorMessage && (
                <div
                  className="fockis-checkout__alert fockis-checkout__alert--error"
                  role="alert"
                >
                  <span className="fockis-checkout__alert-icon">
                    <AlertIcon size={18} />
                  </span>
                  <div>
                    <strong>Payment failed</strong>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div
                  className="fockis-checkout__alert fockis-checkout__alert--success"
                  role="status"
                >
                  <span className="fockis-checkout__alert-icon">
                    <CheckIcon size={18} />
                  </span>
                  <div>
                    <strong>Payment successful</strong>
                    <p>{successMessage}</p>
                  </div>
                </div>
              )}

              {/* ACTIONS */}

              <div className="fockis-checkout__actions">
                <button
                  type="button"
                  className="fockis-checkout__cancel"
                  onClick={handleCancel}
                  disabled={isProcessing}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="fockis-checkout__submit"
                  disabled={!canSubmit}
                >
                  {isProcessing ? (
                    <>
                      <span className="fockis-checkout__spinner" aria-hidden="true" />
                      Processing payment...
                    </>
                  ) : isPaid ? (
                    <>
                      <CheckIcon size={18} />
                      Paid
                    </>
                  ) : (
                    <>
                      <LockIcon size={16} />
                      Pay {formattedAmount}
                    </>
                  )}
                </button>
              </div>

              <p className="fockis-checkout__terms">
                By completing this payment you agree to the Fockis terms of
                service and refund policy.
              </p>
            </form>
          </section>

          {/* ================================================================
              ORDER SUMMARY
          ================================================================ */}

          <aside
            className="fockis-checkout__panel fockis-checkout__summary"
            aria-labelledby="fockis-checkout-summary-title"
          >
            <div className="fockis-checkout__panel-head">
              <span className="fockis-checkout__panel-icon">
                <ReceiptIcon size={20} />
              </span>
              <div>
                <h2 id="fockis-checkout-summary-title">Order summary</h2>
                <p>Review your purchase before paying.</p>
              </div>
            </div>

            <div className="fockis-checkout__product">
              <div className="fockis-checkout__product-media">
                {showImage ? (
                  <img
                    src={item?.imageUrl}
                    alt=""
                    loading="lazy"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <span className="fockis-checkout__product-fallback" aria-hidden="true">
                    F
                  </span>
                )}
              </div>

              <div className="fockis-checkout__product-body">
                <div className="fockis-checkout__product-tags">
                  <span className="fockis-checkout__tag">{typeLabel}</span>
                  {item?.category && (
                    <span className="fockis-checkout__tag fockis-checkout__tag--muted">
                      {item.category}
                    </span>
                  )}
                </div>

                <strong className="fockis-checkout__product-title">{title}</strong>

                {item?.provider && (
                  <span className="fockis-checkout__product-line">
                    <UserIcon size={14} />
                    {item.provider}
                  </span>
                )}

                {item?.schedule && (
                  <span className="fockis-checkout__product-line">
                    <CalendarIcon size={14} />
                    {item.schedule}
                  </span>
                )}
              </div>
            </div>

            <dl className="fockis-checkout__summary-meta">
              <div>
                <dt>Payment type</dt>
                <dd>{PURPOSE_LABELS[backendPurpose]}</dd>
              </div>

              <div>
                <dt>Billing country</dt>
                <dd>{countryName}</dd>
              </div>

              <div>
                <dt>Currency</dt>
                <dd>{resolvedCurrency}</dd>
              </div>

              {item?.details?.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="fockis-checkout__subtotal">
              <span>Subtotal</span>
              <span>{formattedAmount}</span>
            </div>

            <div className="fockis-checkout__total">
              <span>Total</span>
              <strong>{formattedAmount}</strong>
            </div>

            <ul className="fockis-checkout__guarantees">
              <li>
                <CheckIcon size={15} />
                Secure Stripe checkout
              </li>
              <li>
                <CheckIcon size={15} />
                Payment verified by Fockis before access is granted
              </li>
              <li>
                <CheckIcon size={15} />
                Receipt saved to your payment history
              </li>
            </ul>

            <div className="fockis-checkout__powered">
              <LockIcon size={13} />
              <span>
                Powered by <strong>Stripe</strong>
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
