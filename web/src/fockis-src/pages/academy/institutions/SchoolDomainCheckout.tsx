import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// Existing Fockis payment system — used as-is (no changes to shared payment code).
import StripeProvider from "../../../../features/payments/StripeProvider";
import CheckoutPage, { type ConfirmPaymentResponse } from "../../../../features/payments/pages/CheckoutPage";

import { Icon } from "../../../components/academy/market/Icon";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademySession } from "../../../lib/academySession";
import { formatPrice, hasFockisSession } from "../../../lib/studioApi";
import { INSTITUTION_TYPE_LABEL, domainPeriodText, schoolsApi } from "../../../lib/institutionsApi";
import { SignInGate } from "../AcademyPortal";

/**
 * /academy/school/:id/pay — pay or renew an organization's Fockis domain.
 *
 * 1. The Academy backend prices the domain (price set by Fockis admins in the
 *    Admin Center) and returns a reference tying the payment to this
 *    organization and period (POST /academy/institutions/manage/:id/domain/checkout).
 * 2. The existing Fockis CheckoutPage runs the normal flow
 *    (/payments/create → Stripe → /payments/confirm).
 * 3. Academy verifies the paid record and extends the domain
 *    (POST …/domain/claim). If this tab closes early, the school dashboard picks
 *    the payment up the next time it opens.
 */
export default function SchoolDomainCheckout() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const session = useAcademySession();
  const fockis = hasFockisSession();
  const info = useAcademyLoad(() => (session.status === "user" && fockis ? schoolsApi.domainCheckout(id) : Promise.reject(new Error("wait"))), [id, session.status, fockis]);
  const [finishing, setFinishing] = useState(false);
  const done = useRef(false);

  const back = `/academy/school/${encodeURIComponent(id)}`;
  const here = `/academy/school/${encodeURIComponent(id)}/pay`;

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="Sign in to pay for your domain" />;

  if (!fockis)
    return (
      <Gate
        icon="wallet"
        title="Sign in to Fockis to pay"
        back={back}
        action={
          <a className="fa-btn fa-btn--primary" href={`/login?next=${encodeURIComponent(here)}`}>
            Sign in to Fockis
          </a>
        }
      >
        Payments use your Fockis account&apos;s secure checkout. Sign in to Fockis in this browser, then come back to this page — your Academy account stays signed in.
      </Gate>
    );

  if (info.state.status === "loading")
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <p className="fa-muted">Preparing checkout…</p>
        </div>
      </div>
    );
  if (info.state.status === "error")
    return (
      <Gate icon="help" title="Nothing to pay right now" back={back}>
        <span className="fa-error">{info.state.error}</span>
      </Gate>
    );

  const c = info.state.data;
  const period = domainPeriodText(c.periodMonths);

  async function onSuccess(payment: ConfirmPaymentResponse) {
    if (done.current) return;
    done.current = true;
    setFinishing(true);
    const p = payment as ConfirmPaymentResponse & { stripePaymentIntentId?: string };
    const intent = p.stripePaymentIntentId || p.paymentIntentId;
    try {
      if (intent) await schoolsApi.domainClaim(id, intent);
    } catch {
      // Not fatal: the school dashboard applies the paid record the next time it loads.
    }
    window.location.replace(back);
  }

  return (
    <div className="fa-acad-checkout">
      {finishing && (
        <div className="fa-acad-checkout__done" role="status">
          <Icon name="check" size={18} /> Payment received — opening your school…
        </div>
      )}
      <StripeProvider>
        <CheckoutPage
          amount={c.amount}
          currency={c.currency}
          purpose={c.purpose}
          referenceId={c.referenceId}
          title={`${c.renewal ? "Renew" : "Activate"} ${c.title}`}
          description={`Fockis domain for ${c.organization} · ${formatPrice(false, c.amount, c.currency)} ${period}`}
          metadata={c.metadata}
          item={{
            typeLabel: "Fockis domain",
            provider: c.organization,
            details: [
              { label: "Domain", value: c.title },
              { label: "Organization type", value: INSTITUTION_TYPE_LABEL[c.type] ?? c.type },
              { label: "Billing", value: c.periodMonths === 0 ? "One-time fee" : `${c.periodLabel} (renew from your dashboard — no automatic charges)` },
              { label: "Includes", value: "Student logins, school classes and your public school page" },
              ...(c.note ? [{ label: "Note", value: c.note }] : []),
            ],
          }}
          onSuccess={onSuccess}
          onCancel={() => navigate(back)}
        />
      </StripeProvider>
    </div>
  );
}

function Gate({ icon, title, back, action, children }: { icon: "wallet" | "help"; title: string; back: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fa-root fa-page fa-page--soft">
      <div className="fa-container fa-narrow">
        <div className="fa-card fa-gate">
          <span className="fa-st-empty__ic">
            <Icon name={icon} size={26} />
          </span>
          <h2>{title}</h2>
          <p className="fa-muted">{children}</p>
          <div className="fa-gate__btns">
            {action}
            <Link className="fa-btn fa-btn--outline" to={back}>
              Back to my school
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
