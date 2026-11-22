import React, { useEffect, useMemo, useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import StripeProvider from "../../payments/StripeProvider";
import { getToken } from "../../../utils/auth";
import { Icon } from "../renderer/icons";
import { formatMoney } from "../renderer/theme";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import type { SiteContent } from "../types/content";
import type { QuoteResponse, WebsiteOrder } from "../types/studio";
import { useCart } from "./cart";

type Method = "pickup" | "delivery" | "shipping";

interface Props {
  siteId: string;
  content: SiteContent;
  onClose: () => void;
}

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function PaymentStep({
  siteId,
  payload,
  quote,
  onPaid,
}: {
  siteId: string;
  payload: Record<string, unknown>;
  quote: QuoteResponse;
  onPaid: (order: WebsiteOrder) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setBusy(true);
    setError(null);
    try {
      // 1. Server re-prices the cart, creates the order and a payment through the Fockis payment system.
      const checkout = await websiteStudioApi.checkout(siteId, payload);
      if (!checkout.clientSecret || !checkout.paymentIntentId) throw new Error("The payment could not be started.");
      // 2. Card is confirmed directly with Stripe (card data never touches Fockis servers).
      const customer = payload.customer as { name: string; email: string; phone?: string };
      const result = await stripe.confirmCardPayment(checkout.clientSecret, {
        payment_method: { card, billing_details: { name: customer.name, email: customer.email, phone: customer.phone || undefined } },
      });
      if (result.error) throw new Error(result.error.message || "Your card was declined.");
      // 3. Backend verifies the PaymentIntent with Stripe before marking the order as paid.
      const order = await websiteStudioApi.confirmOrder(checkout.orderId, checkout.paymentIntentId);
      if (order.status === "pending_payment") throw new Error("Payment is still processing. We will email you when it completes.");
      onPaid(order);
    } catch (e) {
      setError(apiError(e, "Payment failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ws-checkout__pay">
      <label className="ws-field">
        <span>Card details</span>
        <div className="ws-card-element">
          <CardElement options={{ hidePostalCode: false, style: { base: { fontSize: "16px" } } }} onChange={(e) => setComplete(e.complete)} />
        </div>
      </label>
      {error ? <p className="ws-form-error">{error}</p> : null}
      <button type="button" className="ws-btn ws-btn--primary ws-btn--block" disabled={!stripe || !complete || busy} onClick={pay}>
        <Icon name="Lock" size={18} />
        <span>{busy ? "Processing…" : `Pay ${formatMoney(quote.total, quote.currency)}`}</span>
      </button>
      <p className="ws-checkout__secure">Secure payment powered by Fockis Payments.</p>
    </div>
  );
}

export default function CheckoutDialog({ siteId, content, onClose }: Props) {
  const cart = useCart();
  const f = content.settings.features;
  const methods = useMemo(() => (["pickup", "delivery", "shipping"] as Method[]).filter((m) => f[m]), [f]);
  const [method, setMethod] = useState<Method>(methods[0] ?? "pickup");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [date, setDate] = useState(todayPlus(cart.items.some((i) => i.kind === "custom-cake") ? content.settings.cakeOptions.leadTimeDays : 0));
  const [time, setTime] = useState("12:00");
  const [address, setAddress] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "pay" | "done">("details");
  const [order, setOrder] = useState<WebsiteOrder | null>(null);
  const loggedIn = Boolean(getToken());

  const items = cart.items;
  useEffect(() => {
    if (!items.length) return;
    let active = true;
    websiteStudioApi
      .quote(siteId, { items, fulfillment: { method }, couponCode: appliedCoupon || undefined })
      .then((q) => active && (setQuote(q), setQuoteError(null)))
      .catch((e) => active && setQuoteError(apiError(e, "Unable to price your order.")));
    return () => {
      active = false;
    };
  }, [siteId, items, method, appliedCoupon]);

  const detailsValid =
    customer.name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(customer.email) &&
    (method === "pickup" ? !!date : address.trim().length > 5) &&
    !!quote &&
    quote.lines.every((l) => l.available);

  const payload = {
    items,
    customer,
    fulfillment: { method, date: method === "shipping" ? undefined : date, time: method === "shipping" ? undefined : time, address: method === "pickup" ? undefined : address },
    couponCode: appliedCoupon || undefined,
    notes,
    country: content.settings.country || "US",
  };

  const signIn = () => {
    try {
      sessionStorage.setItem("fockis:returnTo", window.location.href);
    } catch {
      /* ignore */
    }
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  };

  return (
    <div className="ws-modal" role="dialog" aria-modal="true" aria-label="Checkout" onClick={onClose}>
      <div className="ws-modal__panel ws-checkout" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ws-modal__close" onClick={onClose} aria-label="Close">
          <Icon name="X" size={22} />
        </button>
        {step === "done" && order ? (
          <div className="ws-checkout__done">
            <span className="ws-checkout__check">
              <Icon name="Check" size={34} strokeWidth={2.4} />
            </span>
            <h3>Thank you for your order!</h3>
            <p>
              Order <strong>#{order.orderNumber}</strong> is confirmed. A receipt was sent to {order.customer.email}.
            </p>
            <p className="ws-muted">
              Total paid: {formatMoney(order.total, order.currency)} · {order.fulfillment.method}
            </p>
            <button type="button" className="ws-btn ws-btn--primary" onClick={onClose}>
              <span>Done</span>
            </button>
          </div>
        ) : (
          <>
            <h3 className="ws-checkout__title">Checkout</h3>
            <div className="ws-checkout__grid">
              <div className="ws-checkout__form">
                {step === "details" ? (
                  <>
                    <div className="ws-field-row">
                      <label className="ws-field">
                        <span>Full name</span>
                        <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} autoComplete="name" />
                      </label>
                      <label className="ws-field">
                        <span>Phone</span>
                        <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} autoComplete="tel" />
                      </label>
                    </div>
                    <label className="ws-field">
                      <span>Email</span>
                      <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} autoComplete="email" />
                    </label>
                    {methods.length ? (
                      <div className="ws-segment" role="radiogroup" aria-label="Fulfillment">
                        {methods.map((m) => (
                          <button type="button" key={m} className={m === method ? "is-active" : ""} onClick={() => setMethod(m)}>
                            <Icon name={m === "pickup" ? "Store" : m === "delivery" ? "Bike" : "Truck"} size={18} />
                            {m === "pickup" ? "Pickup" : m === "delivery" ? "Delivery" : "Shipping"}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {method !== "shipping" ? (
                      <div className="ws-field-row">
                        <label className="ws-field">
                          <span>{method === "pickup" ? "Pickup date" : "Delivery date"}</span>
                          <input type="date" min={todayPlus(0)} value={date} onChange={(e) => setDate(e.target.value)} />
                        </label>
                        <label className="ws-field">
                          <span>Time</span>
                          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                        </label>
                      </div>
                    ) : null}
                    {method !== "pickup" ? (
                      <label className="ws-field">
                        <span>{method === "delivery" ? "Delivery address" : "Shipping address"}</span>
                        <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
                      </label>
                    ) : null}
                    <label className="ws-field">
                      <span>Order notes (optional)</span>
                      <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                    {loggedIn ? (
                      <button type="button" className="ws-btn ws-btn--primary ws-btn--block" disabled={!detailsValid} onClick={() => setStep("pay")}>
                        <span>Continue to payment</span>
                        <Icon name="ArrowRight" size={18} />
                      </button>
                    ) : (
                      <div className="ws-checkout__signin">
                        <p>Sign in with your Fockis account to pay securely and track your order.</p>
                        <button type="button" className="ws-btn ws-btn--primary ws-btn--block" onClick={signIn}>
                          <Icon name="User" size={18} />
                          <span>Sign in to pay</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : quote ? (
                  <>
                    <button type="button" className="ws-link-btn" onClick={() => setStep("details")}>
                      <Icon name="ChevronLeft" size={16} /> Back to details
                    </button>
                    <StripeProvider>
                      <PaymentStep
                        siteId={siteId}
                        payload={payload}
                        quote={quote}
                        onPaid={(o) => {
                          setOrder(o);
                          setStep("done");
                          cart.clear();
                        }}
                      />
                    </StripeProvider>
                  </>
                ) : null}
              </div>
              <aside className="ws-checkout__summary">
                <h4>Order summary</h4>
                {quoteError ? <p className="ws-form-error">{quoteError}</p> : null}
                {(quote?.lines ?? []).map((l) => (
                  <div key={l.key} className={`ws-sum-line${l.available ? "" : " is-unavailable"}`}>
                    <span>
                      {l.quantity} × {l.name}
                      {l.message ? <small>{l.message}</small> : null}
                    </span>
                    <span>{formatMoney(l.total, quote!.currency)}</span>
                  </div>
                ))}
                {step === "details" ? (
                  <div className="ws-coupon">
                    <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" />
                    <button type="button" onClick={() => setAppliedCoupon(coupon.trim())}>
                      Apply
                    </button>
                  </div>
                ) : null}
                {quote?.couponMessage ? <p className={quote.couponApplied ? "ws-ok" : "ws-form-error"}>{quote.couponMessage}</p> : null}
                {quote ? (
                  <div className="ws-sum-totals">
                    <div><span>Subtotal</span><span>{formatMoney(quote.subtotal, quote.currency)}</span></div>
                    {quote.discount ? <div><span>Discount</span><span>−{formatMoney(quote.discount, quote.currency)}</span></div> : null}
                    <div><span>{method === "shipping" ? "Shipping" : method === "delivery" ? "Delivery" : "Pickup"}</span><span>{quote.shipping ? formatMoney(quote.shipping, quote.currency) : "Free"}</span></div>
                    {quote.tax ? <div><span>Tax</span><span>{formatMoney(quote.tax, quote.currency)}</span></div> : null}
                    <div className="is-total"><span>Total</span><span>{formatMoney(quote.total, quote.currency)}</span></div>
                  </div>
                ) : (
                  <p className="ws-muted">Calculating…</p>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
