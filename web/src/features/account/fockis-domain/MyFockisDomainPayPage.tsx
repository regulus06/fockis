import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Existing Fockis payment system — used as-is (no changes to shared payment code).
import StripeProvider from "../../payments/StripeProvider";
import CheckoutPage, { type ConfirmPaymentResponse } from "../../payments/pages/CheckoutPage";

import fockisDomainApi, { apiMessage, money, perPeriod, type PersonalDomainCheckout } from "./fockisDomainApi";
import "./MyFockisDomain.scss";

/**
 * /settings/fockis-domain/pay — pay or renew a personal Fockis domain.
 * The API prices it (Admin Center → Domains → Domain Pricing), the existing
 * CheckoutPage takes the payment, then the API checks the paid record. If this
 * page closes early, /settings/fockis-domain applies the payment when it loads.
 */
export default function MyFockisDomainPayPage() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState<PersonalDomainCheckout | null>(null);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    fockisDomainApi
      .checkout()
      .then((q) => alive && setQuote(q))
      .catch((e) => alive && setError(apiMessage(e, "Could not prepare the payment.")));
    return () => {
      alive = false;
    };
  }, []);

  async function onSuccess(payment: ConfirmPaymentResponse) {
    if (done.current) return;
    done.current = true;
    setFinishing(true);
    const p = payment as ConfirmPaymentResponse & { stripePaymentIntentId?: string };
    const intent = p.stripePaymentIntentId || p.paymentIntentId;
    try {
      if (intent) await fockisDomainApi.claim(intent);
    } catch {
      // Not fatal: the domain page applies the paid record when it loads.
    }
    navigate("/settings/fockis-domain", { replace: true });
  }

  if (!quote) {
    return (
      <div className="fk-mydomain">
        <div className="fk-mydomain__wrap">
          <Link className="fk-mydomain__back" to="/settings/fockis-domain">
            ← My Fockis domain
          </Link>
          {error ? <p className="fk-mydomain__error">{error}</p> : <p className="fk-mydomain__muted">Preparing checkout…</p>}
        </div>
      </div>
    );
  }

  const details = [
    { label: "Domain", value: quote.domain },
    { label: "Billing", value: quote.periodMonths === 0 ? "One-time fee" : `${quote.periodLabel} — renew from Settings, no automatic charges` },
    { label: "Includes", value: "Your name.fockis.com shown on your Fockis profile" },
  ];
  if (quote.note) details.push({ label: "Note", value: quote.note });

  return (
    <div className="fk-mydomain-checkout">
      {finishing && (
        <div className="fk-mydomain-checkout__done" role="status">
          ✓ Payment received — updating your domain…
        </div>
      )}
      <StripeProvider>
        <CheckoutPage
          amount={quote.amount}
          currency={quote.currency}
          purpose={quote.purpose}
          referenceId={quote.referenceId}
          title={`${quote.renewal ? "Renew" : "Get"} ${quote.domain}`}
          description={`Personal Fockis domain · ${money(quote.amount, quote.currency)} ${perPeriod(quote.periodMonths)}`}
          metadata={quote.metadata}
          item={{ typeLabel: "Fockis domain", provider: "Fockis", details }}
          onSuccess={onSuccess}
          onCancel={() => navigate("/settings/fockis-domain")}
        />
      </StripeProvider>
    </div>
  );
}
