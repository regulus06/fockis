import { useCallback, useEffect, useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Lock, LoaderCircle } from "lucide-react";

import StripeProvider from "../../payments/StripeProvider";
import CheckoutForm from "../../payments/components/CheckoutForm";
import { formatMoney, registrationApi, type PaymentStart, type RegistrationDetail } from "./registrationApi";

interface Props {
  registrationId: string;
  /** From the register call; fetched again when missing (resume). */
  payment: PaymentStart | null;
  amount: number;
  currency: string;
  holdExpiresAt?: string | null;
  billingName: string;
  billingEmail: string;
  onPaid: (registration: RegistrationDetail) => void;
}

function useCountdown(until?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [until]);
  if (!until) return null;
  const left = Math.max(0, new Date(until).getTime() - now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return { left, text: h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}:${String(s).padStart(2, "0")}` };
}

function PayButton({ registrationId, payment, amount, currency, billingName, billingEmail, onPaid, cardComplete }: Omit<Props, "payment" | "holdExpiresAt"> & { payment: PaymentStart; cardComplete: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setBusy(true);
    setError("");
    try {
      const result = await stripe.confirmCardPayment(payment.clientSecret, {
        payment_method: { card, billing_details: { name: billingName, email: billingEmail } },
      });
      if (result.error) throw new Error(result.error.message || "Your card was declined.");
      const intentId = result.paymentIntent?.id ?? payment.paymentIntentId;
      if (!intentId) throw new Error("The payment could not be verified.");
      // The server checks the payment with Stripe before confirming the registration.
      const confirmed = await registrationApi.confirmPayment(registrationId, intentId);
      onPaid(confirmed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The payment didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && (
        <div className="fkr-alert fkr-alert--error" role="alert">
          {error}
        </div>
      )}
      <button type="button" className="fkr-btn fkr-btn--primary fkr-btn--block" disabled={!stripe || !cardComplete || busy} onClick={() => void pay()}>
        {busy ? <LoaderCircle className="fkr-spin" size={18} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
        {busy ? "Processing payment…" : `Pay ${formatMoney(amount, currency)}`}
      </button>
    </>
  );
}

/** Secure checkout step for a paid registration (existing Fockis Stripe integration). */
export default function RegistrationPayment(props: Props) {
  const { registrationId, holdExpiresAt } = props;
  const [payment, setPayment] = useState<PaymentStart | null>(props.payment);
  const [loadError, setLoadError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const countdown = useCountdown(holdExpiresAt);

  const load = useCallback(() => {
    setLoadError("");
    registrationApi
      .resumePayment(registrationId)
      .then(setPayment)
      .catch((caught) => setLoadError(caught instanceof Error ? caught.message : "Unable to start the payment."));
  }, [registrationId]);

  useEffect(() => {
    if (!payment) load();
  }, [payment, load]);

  return (
    <section className="fkr-card" aria-labelledby="fkr-pay-title">
      <header className="fkr-card__head">
        <span className="fkr-card__icon" aria-hidden="true">
          <Lock size={22} />
        </span>
        <div>
          <h2 id="fkr-pay-title">Secure checkout</h2>
          <p>Your places are reserved while you pay.{countdown && countdown.left > 0 ? ` Time left: ${countdown.text}.` : ""}</p>
        </div>
      </header>

      {countdown && countdown.left === 0 && (
        <div className="fkr-alert fkr-alert--error" role="alert">
          Your reservation expired. Please register again.
        </div>
      )}
      {loadError && (
        <div className="fkr-alert fkr-alert--error" role="alert">
          {loadError}{" "}
          <button type="button" className="fkr-link-btn" onClick={load}>
            Try again
          </button>
        </div>
      )}
      {!payment && !loadError && (
        <p className="fkr-muted" role="status">
          <LoaderCircle className="fkr-spin" size={16} aria-hidden="true" /> Preparing secure checkout…
        </p>
      )}

      {payment && (
        <div className="fkr-stripe">
          <StripeProvider>
            <CheckoutForm total={payment.amount} currency={payment.currency} onCardCompleteChange={setCardComplete} />
            <PayButton {...props} payment={payment} amount={payment.amount} currency={payment.currency} cardComplete={cardComplete} />
          </StripeProvider>
        </div>
      )}
    </section>
  );
}
