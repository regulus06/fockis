/**
 * GiveDialog.tsx — "Give Online" on the church website.
 *
 *   1. Choose a fund (Tithe, Offering, …), an amount and an optional note.
 *   2. Pay by card with the existing Fockis Stripe checkout (StripeProvider +
 *      CheckoutForm). Card details go straight to Stripe.
 *   3. The server re-checks the payment with Stripe, then shows the receipt.
 *
 * Also shows the signed-in person's own giving history at this church.
 */

import { useEffect, useState, type FormEvent } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ArrowLeft, CheckCircle2, HandHeart, History, Loader2, Lock, ShieldCheck, X } from "lucide-react";

import StripeProvider from "../../payments/StripeProvider";
import CheckoutForm from "../../payments/components/CheckoutForm";
import { givingApi, money, type CoverQuote, type Gift, type GiftStart, type GivingInfo } from "./givingApi";
import "./giving.scss";

type Step = { kind: "form" } | { kind: "pay"; start: GiftStart } | { kind: "done"; gift: Gift & { thankYouMessage: string } } | { kind: "history" };

function errorText(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function viewerCountry(): string {
  const region = (navigator.language || "").split("-")[1];
  return region && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : "US";
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");

export default function GiveDialog({ organizationId, info, onClose, initialHistory = false, initialFund }: { organizationId: string; info: GivingInfo; onClose: () => void; /** Open on "My giving" (member portal link). */ initialHistory?: boolean; /** Fund chosen by a QR code / link (ignored if not offered). */ initialFund?: string }) {
  const [step, setStep] = useState<Step>(initialHistory ? { kind: "history" } : { kind: "form" });
  const [fundKey, setFundKey] = useState((initialFund && info.funds.some((f) => f.key === initialFund) ? initialFund : null) ?? info.funds[0]?.key ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [coverFee, setCoverFee] = useState(false);
  const [quote, setQuote] = useState<CoverQuote | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  const fund = info.funds.find((f) => f.key === fundKey) ?? null;
  const value = Number(amount);
  const validAmount = value >= info.minAmount && value <= 100000;

  // "Add the fee so the church receives the full gift" (the server recalculates it).
  useEffect(() => {
    if (!validAmount) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      givingApi
        .coverQuote(organizationId, Math.round(value * 100) / 100, controller.signal)
        .then(setQuote)
        .catch(() => !controller.signal.aborted && setQuote(null));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [organizationId, value, validAmount]);

  const canCover = Boolean(quote?.enabled && quote.cover > 0 && validAmount);
  const total = validAmount ? Math.round((value + (coverFee && canCover ? quote!.cover : 0)) * 100) / 100 : 0;

  async function begin(e: FormEvent) {
    e.preventDefault();
    if (!fund) return setError("Choose what your gift is for.");
    if (!(value >= info.minAmount)) return setError(`Enter an amount of at least ${money(info.minAmount, info.currency)}.`);
    setBusy(true);
    setError(null);
    try {
      const start = await givingApi.start(organizationId, { fundKey: fund.key, amount: Math.round(value * 100) / 100, note: note.trim() || undefined, anonymous, country: viewerCountry(), coverFee: coverFee && canCover });
      setCardComplete(false);
      setStep({ kind: "pay", start });
    } catch (err) {
      setError(errorText(err, "The payment could not be started. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function again() {
    setAmount("");
    setCoverFee(false);
    setNote("");
    setError(null);
    setStep({ kind: "form" });
  }

  const title = step.kind === "done" ? "Thank you!" : step.kind === "history" ? "My giving" : "Give Online";

  return (
    <div className="gv-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="gv-dialog" role="dialog" aria-modal="true" aria-labelledby="gv-title">
        <header className="gv-dialog__head">
          <span className="gv-dialog__icon" aria-hidden="true">
            <HandHeart />
          </span>
          <div>
            <h2 id="gv-title">{title}</h2>
            <p>{info.organization.name}</p>
          </div>
          <button type="button" className="gv-close" onClick={onClose} aria-label="Close" disabled={busy}>
            <X aria-hidden="true" />
          </button>
        </header>

        {step.kind === "form" && (
          <form className="gv-body" onSubmit={begin}>
            {info.message && <p className="gv-message">{info.message}</p>}

            <fieldset className="gv-field">
              <legend>My gift is for</legend>
              <div className="gv-funds" role="radiogroup">
                {info.funds.map((f) => (
                  <label key={f.key} className={"gv-fund" + (f.key === fundKey ? " is-on" : "")}>
                    <input type="radio" name="gv-fund" value={f.key} checked={f.key === fundKey} onChange={() => setFundKey(f.key)} />
                    <b>{f.label}</b>
                    {f.description && <small>{f.description}</small>}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="gv-field">
              <label htmlFor="gv-amount">Amount ({info.currency})</label>
              <div className="gv-amounts">
                {info.suggestedAmounts.map((v) => (
                  <button key={v} type="button" className={"gv-chip" + (value === v ? " is-on" : "")} onClick={() => setAmount(String(v))} aria-pressed={value === v}>
                    {money(v, info.currency)}
                  </button>
                ))}
              </div>
              <input
                id="gv-amount"
                className="gv-input gv-input--amount"
                type="number"
                min={info.minAmount}
                max={100000}
                step="0.01"
                inputMode="decimal"
                placeholder="Other amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="gv-field">
              <label htmlFor="gv-note">Note to the church (optional)</label>
              <input id="gv-note" className="gv-input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. In memory of…" />
            </div>

            <label className="gv-check">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              <span>
                Give anonymously
                <small>Church staff will see the gift but not your name.</small>
              </span>
            </label>

            {canCover && (
              <label className="gv-check">
                <input type="checkbox" checked={coverFee} onChange={(e) => setCoverFee(e.target.checked)} />
                <span>
                  Add {money(quote!.cover, info.currency)} to cover the fees
                  <small>
                    So {info.organization.name} receives your full {money(value, info.currency)}.
                  </small>
                </span>
              </label>
            )}

            {error && (
              <p className="gv-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="gv-btn gv-btn--primary gv-btn--block" disabled={busy || !fund}>
              {busy ? <Loader2 className="gv-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />}
              {validAmount ? `Continue to payment · ${money(total, info.currency)}` : "Continue to payment"}
            </button>
            <p className="gv-secure">
              <ShieldCheck aria-hidden="true" /> Secure card payment through Fockis. Your card details go directly to Stripe and are never stored by Fockis or the church.
            </p>
            <button type="button" className="gv-link" onClick={() => setStep({ kind: "history" })}>
              <History aria-hidden="true" /> View my giving
            </button>
          </form>
        )}

        {step.kind === "pay" && (
          <div className="gv-body">
            <div className="gv-summary">
              <span>
                {step.start.fundLabel}
                {step.start.coverFee ? <small> · includes {money(step.start.coverFee, info.currency)} to cover fees</small> : null}
              </span>
              <b>{money(step.start.amount, step.start.currency)}</b>
            </div>
            <StripeProvider>
              <CheckoutForm total={step.start.amount} currency={step.start.currency} onCardCompleteChange={setCardComplete} />
              <PayButton
                organizationId={organizationId}
                start={step.start}
                cardComplete={cardComplete}
                onBusy={setBusy}
                onPaid={(gift) => setStep({ kind: "done", gift })}
              />
            </StripeProvider>
            <button type="button" className="gv-link" onClick={() => setStep({ kind: "form" })} disabled={busy}>
              <ArrowLeft aria-hidden="true" /> Change gift
            </button>
          </div>
        )}

        {step.kind === "done" && (
          <div className="gv-body gv-done">
            <CheckCircle2 className="gv-done__icon" aria-hidden="true" />
            <h3>Your gift was received</h3>
            {step.gift.thankYouMessage && <p className="gv-message">{step.gift.thankYouMessage}</p>}
            <dl className="gv-receipt">
              <div>
                <dt>Gift</dt>
                <dd>{step.gift.fundLabel}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{money(step.gift.amount, step.gift.currency)}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{fmtDate(step.gift.paidAt)}</dd>
              </div>
              <div>
                <dt>Receipt</dt>
                <dd>{step.gift.receiptNumber}</dd>
              </div>
            </dl>
            <p className="gv-fineprint">This is a payment confirmation from Fockis. Ask the church if you need an official giving statement.</p>
            <div className="gv-row">
              <button type="button" className="gv-btn gv-btn--ghost" onClick={again}>
                Give again
              </button>
              <button type="button" className="gv-btn gv-btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}

        {step.kind === "history" && <MyGiving organizationId={organizationId} onBack={() => setStep({ kind: "form" })} />}
      </div>
    </div>
  );
}

function PayButton({
  organizationId,
  start,
  cardComplete,
  onBusy,
  onPaid,
}: {
  organizationId: string;
  start: GiftStart;
  cardComplete: boolean;
  onBusy: (busy: boolean) => void;
  onPaid: (gift: Gift & { thankYouMessage: string }) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const result = await stripe.confirmCardPayment(start.clientSecret, { payment_method: { card } });
      if (result.error) throw new Error(result.error.message || "Your card was declined.");
      const intentId = result.paymentIntent?.id ?? start.paymentIntentId;
      if (!intentId) throw new Error("The payment could not be verified.");
      // The server re-checks the payment with Stripe before recording the gift.
      onPaid(await givingApi.confirm(organizationId, start.giftId, intentId));
    } catch (err) {
      setError(errorText(err, "The payment didn't go through."));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  return (
    <>
      {error && (
        <p className="gv-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="gv-btn gv-btn--primary gv-btn--block" disabled={!stripe || !cardComplete || busy} onClick={() => void pay()}>
        {busy ? <Loader2 className="gv-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />} {busy ? "Processing payment…" : `Give ${money(start.amount, start.currency)}`}
      </button>
    </>
  );
}

function MyGiving({ organizationId, onBack }: { organizationId: string; onBack: () => void }) {
  const [items, setItems] = useState<Gift[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    givingApi
      .mine(organizationId, controller.signal)
      .then((r) => setItems(r.items))
      .catch((err) => !controller.signal.aborted && setError(errorText(err, "Your giving could not be loaded.")));
    return () => controller.abort();
  }, [organizationId]);

  const [asking, setAsking] = useState<string | null>(null);

  async function askRefund(g: Gift) {
    const reason = window.prompt(`Ask the church to refund your ${money(g.amount, g.currency)} gift (${g.fundLabel})? Tell them why:`);
    if (!reason?.trim()) return;
    setAsking(g.id);
    try {
      const updated = await givingApi.requestRefund(organizationId, g.id, reason.trim());
      setItems((cur) => (cur ? cur.map((x) => (x.id === g.id ? { ...x, ...updated } : x)) : cur));
    } catch (err) {
      setError(errorText(err, "Your request could not be sent."));
    } finally {
      setAsking(null);
    }
  }

  const totals = new Map<string, number>();
  for (const g of items ?? []) if (g.status !== "refunded") totals.set(g.currency, (totals.get(g.currency) ?? 0) + g.amount);

  return (
    <div className="gv-body">
      {error && <p className="gv-error">{error}</p>}
      {!items && !error && (
        <p className="gv-muted">
          <Loader2 className="gv-spin" aria-hidden="true" /> Loading…
        </p>
      )}
      {items?.length === 0 && <p className="gv-muted">You haven't given online to this church yet.</p>}
      {items && items.length > 0 && (
        <>
          <p className="gv-total">
            Total given online: <b>{[...totals].map(([c, t]) => money(t, c)).join(" · ")}</b>
          </p>
          <ul className="gv-history">
            {items.map((g) => (
              <li key={g.id}>
                <span>
                  <b>{g.fundLabel}</b>
                  <small>
                    {fmtDate(g.paidAt)} · {g.receiptNumber}
                    {g.anonymous ? " · anonymous" : ""}
                    {g.status === "refunded" ? " · refunded" : g.refundRequested ? " · refund requested" : ""}
                  </small>
                  {g.status === "paid" && !g.refundRequested && (
                    <button type="button" className="gv-history__refund" disabled={asking !== null} onClick={() => void askRefund(g)}>
                      {asking === g.id ? "Sending…" : "Request a refund"}
                    </button>
                  )}
                </span>
                <b>{money(g.amount, g.currency)}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="gv-link" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> Back to giving
      </button>
    </div>
  );
}
