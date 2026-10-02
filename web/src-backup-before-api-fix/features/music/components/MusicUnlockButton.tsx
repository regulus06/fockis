import {
  useState,
} from "react";

import {
  useElements,
  useStripe,
  CardElement,
} from "@stripe/react-stripe-js";

import CheckoutForm from "../../payments/components/CheckoutForm";

import { useMusicPurchase } from "../hooks/useMusicPurchase";
import { formatMusicPrice } from "../utils/formatMusicPrice";

import type {
  AccessLevel,
} from "../types/music.types";

type MusicUnlockButtonProps = {
  contentId: string;
  priceCents: number;
  currency: string;
  accessLevel?: AccessLevel;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onPurchased: () => void;
  labelPrefix?: string;
};

export function MusicUnlockButton({
  contentId,
  priceCents,
  currency,
  accessLevel,
  isAuthenticated,
  onRequireAuth,
  onPurchased,
  labelPrefix = "Unlock",
}: MusicUnlockButtonProps) {
  const stripe = useStripe();
  const elements = useElements();

  const {
    status,
    clientSecret,
    error,
    startPurchase,
    reset,
  } = useMusicPurchase();

  const [
    confirming,
    setConfirming,
  ] = useState(false);

  const [
    cardComplete,
    setCardComplete,
  ] = useState(false);

  const [
    localError,
    setLocalError,
  ] = useState<string | null>(
    null,
  );

  /* ========================================================================
     ALREADY OWNED
  ======================================================================== */

  if (accessLevel === "full") {
    return (
      <button
        type="button"
        className="music-unlock-btn music-unlock-btn--purchased"
        disabled
      >
        ✓ Purchased
      </button>
    );
  }

  /* ========================================================================
     START PURCHASE
  ======================================================================== */

  async function handleStartPurchase() {
    setLocalError(null);

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!stripe || !elements) {
      setLocalError(
        "Payment system is still loading. Please try again.",
      );

      return;
    }

    const result =
      await startPurchase(
        contentId,
      );

    if (!result) {
      return;
    }
  }

  /* ========================================================================
     CONFIRM STRIPE PAYMENT
  ======================================================================== */

  async function handleConfirmPayment() {
    setLocalError(null);

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!clientSecret) {
      setLocalError(
        "Payment session is unavailable. Please start checkout again.",
      );

      return;
    }

    if (!stripe || !elements) {
      setLocalError(
        "Payment system is unavailable. Please refresh and try again.",
      );

      return;
    }

    const card =
      elements.getElement(
        CardElement,
      );

    if (!card) {
      setLocalError(
        "The card payment field is unavailable. Please refresh and try again.",
      );

      return;
    }

    if (!cardComplete) {
      setLocalError(
        "Please enter your complete card information.",
      );

      return;
    }

    setConfirming(true);

    try {
      const paymentResult =
        await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card,
            },
          },
        );

      if (paymentResult.error) {
        setLocalError(
          paymentResult.error
            .message ??
            "Payment failed. Please try again.",
        );

        return;
      }

      const paymentIntent =
        paymentResult.paymentIntent;

      if (!paymentIntent) {
        setLocalError(
          "Stripe did not return a payment result.",
        );

        return;
      }

      if (
        paymentIntent.status ===
        "succeeded"
      ) {
        /*
         * IMPORTANT:
         *
         * Do not create the entitlement
         * on the frontend.
         *
         * The backend/webhook should verify
         * the Stripe payment and grant access.
         *
         * onPurchased() should therefore
         * refresh the Music access state.
         */
        onPurchased();

        reset();

        setCardComplete(
          false,
        );

        setLocalError(null);

        return;
      }

      if (
        paymentIntent.status ===
        "processing"
      ) {
        /*
         * Do NOT pretend the purchase
         * is completed.
         *
         * Stripe may still be processing it.
         */
        setLocalError(
          "Your payment is still processing. Your music access will appear after the payment is verified.",
        );

        return;
      }

      if (
        paymentIntent.status ===
        "requires_action"
      ) {
        setLocalError(
          "Additional payment authentication is required. Please complete the authentication step.",
        );

        return;
      }

      setLocalError(
        `Payment was not completed. Stripe status: ${paymentIntent.status}.`,
      );
    } catch (err) {
      console.error(
        "[MusicUnlockButton] Stripe confirmation failed:",
        err,
      );

      setLocalError(
        err instanceof Error
          ? err.message
          : "Payment failed. Please try again.",
      );
    } finally {
      setConfirming(false);
    }
  }

  /* ========================================================================
     PURCHASE BUTTON
  ======================================================================== */

  if (!clientSecret) {
    return (
      <div className="music-unlock">

        <button
          type="button"
          className="music-unlock-btn"
          onClick={
            handleStartPurchase
          }
          disabled={
            status === "loading"
          }
        >
          {status === "loading"
            ? "Starting checkout…"
            : `${labelPrefix} for ${formatMusicPrice(
                priceCents,
                currency,
              )}`}
        </button>

        {error && (
          <p
            className="music-unlock-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {localError && (
          <p
            className="music-unlock-error"
            role="alert"
          >
            {localError}
          </p>
        )}

      </div>
    );
  }

  /* ========================================================================
     EXISTING FOCKIS PAYMENT FORM
  ======================================================================== */

  return (
    <div className="music-unlock">

      <div className="music-unlock__checkout">

        <CheckoutForm
          total={
            priceCents / 100
          }
          currency={currency}
          disabled={confirming}
          onCardCompleteChange={
            setCardComplete
          }
          onCardError={(
            message,
          ) => {
            setLocalError(
              message,
            );
          }}
        />

      </div>

      {/* ================================================================
          CONFIRM PAYMENT
      ================================================================ */}

      <button
        type="button"
        className="music-unlock-btn"
        onClick={
          handleConfirmPayment
        }
        disabled={
          confirming ||
          !stripe ||
          !elements ||
          !cardComplete
        }
      >
        {confirming
          ? "Processing payment…"
          : `Pay ${formatMusicPrice(
              priceCents,
              currency,
            )} & Unlock`}
      </button>

      {/* ================================================================
          CANCEL
      ================================================================ */}

      <button
        type="button"
        className="music-unlock-btn music-unlock-btn--cancel"
        onClick={() => {
          if (confirming) {
            return;
          }

          reset();

          setLocalError(
            null,
          );

          setCardComplete(
            false,
          );
        }}
        disabled={confirming}
      >
        Cancel
      </button>

      {error && (
        <p
          className="music-unlock-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {localError && (
        <p
          className="music-unlock-error"
          role="alert"
        >
          {localError}
        </p>
      )}

    </div>
  );
}

export default MusicUnlockButton;