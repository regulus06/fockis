import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

// Existing Fockis payment system — used as-is (no changes to shared payment code).
import StripeProvider from "../../payments/StripeProvider";
import CheckoutPage, { type ConfirmPaymentResponse } from "../../payments/pages/CheckoutPage";

import OrganizationIdentitySidebar from "../components/OrganizationIdentitySidebar";
import organizationDomainBillingApi, { money, perPeriod, type OrgDomainCheckout } from "../services/organizationDomainBillingApi";

import "../styles/OrganizationIdentity.scss";
import "../styles/DomainFee.scss";

/**
 * /organizations/:organizationId/identity/domains/pay?kind=renew|members&members=N
 *
 * 1. The API prices the purchase (prices set by Fockis admins in the Admin
 *    Center) and returns a reference tying the payment to this organization.
 * 2. The existing Fockis CheckoutPage runs the normal flow
 *    (/payments/create → Stripe → /payments/confirm).
 * 3. The API checks the paid record and activates / extends the domain or adds
 *    member domains. If this page closes early, the Domains page applies the
 *    payment the next time it loads.
 */
export default function OrganizationDomainCheckoutPage() {
  const { organizationId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const kind = params.get("kind") === "members" ? "members" : "renew";
  const members = Math.max(0, Number(params.get("members")) || 0);
  const back = `/organizations/${encodeURIComponent(organizationId)}/identity/domains`;

  const [quote, setQuote] = useState<OrgDomainCheckout | null>(null);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    organizationDomainBillingApi
      .checkout(organizationId, { kind, memberDomains: members || undefined })
      .then((q) => alive && setQuote(q))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not prepare the payment."));
    return () => {
      alive = false;
    };
  }, [organizationId, kind, members]);

  async function onSuccess(payment: ConfirmPaymentResponse) {
    if (done.current) return;
    done.current = true;
    setFinishing(true);
    const p = payment as ConfirmPaymentResponse & { stripePaymentIntentId?: string };
    const intent = p.stripePaymentIntentId || p.paymentIntentId;
    try {
      if (intent) await organizationDomainBillingApi.claim(organizationId, intent);
    } catch {
      // Not fatal: the Domains page applies the paid record when it loads.
    }
    navigate(back, { replace: true });
  }

  if (!quote) {
    return (
      <div className="identity-layout">
        <OrganizationIdentitySidebar organizationId={organizationId} />
        <main className="identity-main">
          <Link className="back-link" to={back}>
            ← Domains
          </Link>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : (
            <div className="loading-state">Preparing checkout…</div>
          )}
        </main>
      </div>
    );
  }

  const period = perPeriod(quote.periodMonths);
  const details: Array<{ label: string; value: string }> = [{ label: "Domain", value: quote.domain }];
  if (quote.kind === "renew") {
    if (quote.basePrice > 0) details.push({ label: `${quote.organizationTypeLabel} domain`, value: `${money(quote.basePrice, quote.currency)} ${period}` });
    if (quote.memberDomains > 0)
      details.push({ label: "Member domains", value: `${quote.memberDomains} × ${money(quote.memberDomainPrice, quote.currency)} ${period}` });
    details.push({ label: "Billing", value: quote.periodMonths === 0 ? "One-time fee" : `${quote.periodLabel} — renew from Domains, no automatic charges` });
  } else {
    details.push({ label: "Member domains", value: `${quote.memberDomains} more` });
    if (quote.paidUntil) details.push({ label: "Covers until", value: new Date(quote.paidUntil).toLocaleDateString() });
  }
  if (quote.note) details.push({ label: "Note", value: quote.note });

  return (
    <div className="domain-fee-checkout">
      {finishing && (
        <div className="domain-fee-checkout__done" role="status">
          ✓ Payment received — updating your domain…
        </div>
      )}
      <StripeProvider>
        <CheckoutPage
          amount={quote.amount}
          currency={quote.currency}
          purpose={quote.purpose}
          referenceId={quote.referenceId}
          title={quote.kind === "members" ? `Member domains for ${quote.domain}` : `${quote.paidUntil ? "Renew" : "Activate"} ${quote.domain}`}
          description={`Fockis domain fee · ${quote.summary}`}
          metadata={quote.metadata}
          item={{
            typeLabel: "Fockis domain",
            provider: quote.organization || quote.domain,
            details,
          }}
          onSuccess={onSuccess}
          onCancel={() => navigate(back)}
        />
      </StripeProvider>
    </div>
  );
}
