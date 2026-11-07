import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// Existing Fockis payment system — used as-is (no changes to shared payment code).
import StripeProvider from "../../../../features/payments/StripeProvider";
import CheckoutPage, { type ConfirmPaymentResponse } from "../../../../features/payments/pages/CheckoutPage";

import { Icon } from "../../../components/academy/market/Icon";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademySession } from "../../../lib/academySession";
import { KIND_LABEL, formatPrice, hasFockisSession, learnApi, mediaUrl } from "../../../lib/studioApi";
import { SignInGate } from "../AcademyPortal";

/**
 * /academy/checkout/:code — buy a paid class.
 *
 * 1. The Academy backend prices the class and returns a reference that ties
 *    the payment to this learner + class (POST /academy/learn/:code/checkout).
 * 2. The existing Fockis CheckoutPage runs the normal flow
 *    (/payments/create → Stripe → /payments/confirm).
 * 3. Academy verifies the paid record and unlocks the class
 *    (POST /academy/learn/:code/claim). If this tab closes early, the class
 *    unlocks automatically the next time the learner opens it.
 */
export default function AcademyCheckout() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const session = useAcademySession();
  const fockis = hasFockisSession();
  const info = useAcademyLoad(() => (session.status === "user" && fockis ? learnApi.checkout(code) : Promise.reject(new Error("wait"))), [code, session.status, fockis]);
  const [finishing, setFinishing] = useState(false);
  const done = useRef(false);

  const back = `/academy/learn/${encodeURIComponent(code)}`;
  const classroom = `/academy/classroom/${encodeURIComponent(code)}?welcome=1`;

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="Sign in to buy this class" />;

  if (!fockis)
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <span className="fa-st-empty__ic">
              <Icon name="wallet" size={26} />
            </span>
            <h2>Sign in to Fockis to pay</h2>
            <p className="fa-muted">
              Academy purchases use your Fockis account&apos;s secure checkout. Sign in to Fockis in this browser, then come back to this page — your
              Academy account stays signed in.
            </p>
            <div className="fa-gate__btns">
              <a className="fa-btn fa-btn--primary" href={`/login?next=${encodeURIComponent(`/academy/checkout/${code}`)}`}>
                Sign in to Fockis
              </a>
              <Link className="fa-btn fa-btn--outline" to={back}>
                Back to class
              </Link>
            </div>
          </div>
        </div>
      </div>
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
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <h2>Checkout unavailable</h2>
            <p className="fa-error">{info.state.error}</p>
            <div className="fa-gate__btns">
              <Link className="fa-btn fa-btn--primary" to={back}>
                Back to class
              </Link>
            </div>
          </div>
        </div>
      </div>
    );

  const c = info.state.data;

  async function onSuccess(payment: ConfirmPaymentResponse) {
    if (done.current) return;
    done.current = true;
    setFinishing(true);
    const p = payment as ConfirmPaymentResponse & { stripePaymentIntentId?: string };
    const intent = p.stripePaymentIntentId || p.paymentIntentId;
    try {
      if (intent) await learnApi.claim(code, intent);
    } catch {
      // Not fatal: the class page unlocks from the paid record on the next visit.
    }
    // The shared checkout redirects to its default page after success;
    // send the learner straight to the class instead.
    window.location.replace(classroom);
  }

  return (
    <div className="fa-acad-checkout">
      {finishing && (
        <div className="fa-acad-checkout__done" role="status">
          <Icon name="check" size={18} /> Payment received — opening your class…
        </div>
      )}
      <StripeProvider>
        <CheckoutPage
          amount={c.amount}
          currency={c.currency}
          purpose={c.purpose}
          referenceId={c.referenceId}
          title={`Enroll in ${c.title}`}
          description={`${KIND_LABEL[c.kind]} by ${c.provider} · ${formatPrice(false, c.amount, c.currency)} · lifetime access`}
          metadata={c.metadata}
          item={{
            imageUrl: mediaUrl(c.coverUrl),
            typeLabel: KIND_LABEL[c.kind],
            provider: c.provider,
            details: [
              { label: "Platform", value: "Fockis Academy" },
              { label: "Includes", value: "All lessons, files and a certificate on completion" },
            ],
          }}
          onSuccess={onSuccess}
          onCancel={() => navigate(back)}
        />
      </StripeProvider>
    </div>
  );
}
