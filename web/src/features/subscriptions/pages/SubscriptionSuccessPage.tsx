import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";

import useSubscription from "../hooks/useSubscription";
import useSubscriptionPlans from "../hooks/useSubscriptionPlans";
import { getSubscriptionPlanTheme } from "../config/subscriptionPlanThemes";
import { getIntervalLabel, getPlanLabel, getStatusLabel } from "../utils/subscriptionPlanUtils";

import "../styles/SubscriptionPage.scss";

/* ============================================================================
   SUBSCRIPTION SUCCESS

   Stripe redirects here after checkout. That redirect alone does NOT
   prove the subscription is active — the Stripe webhook updates the
   backend. This page only celebrates once GET /subscriptions/current
   reports a paid plan that is ACTIVE or TRIALING. Until then it polls
   a few times and shows an honest "confirming" state.
============================================================================ */

const MAX_CHECKS = 6;
const CHECK_INTERVAL_MS = 3000;

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate();
  const { subscription, loading, refresh } = useSubscription();
  const { plans } = useSubscriptionPlans();

  const [checks, setChecks] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!loading) setInitialLoadDone(true);
  }, [loading]);

  const confirmed =
    Boolean(subscription) &&
    subscription?.plan !== "BASIC" &&
    (subscription?.status === "ACTIVE" || subscription?.status === "TRIALING");

  useEffect(() => {
    if (loading || confirmed || checks >= MAX_CHECKS) return;

    const timer = window.setTimeout(() => {
      setChecks((value) => value + 1);
      void refresh();
    }, CHECK_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [loading, confirmed, checks, refresh]);

  if (!initialLoadDone) {
    return (
      <main className="fk-sub-page">
        <div className="fk-sub-state" role="status" aria-live="polite">
          <span className="fk-sub-spinner fk-sub-spinner--lg" aria-hidden="true" />
          <p>Confirming your subscription…</p>
        </div>
      </main>
    );
  }

  const stillChecking = !confirmed && checks < MAX_CHECKS;

  if (confirmed && subscription) {
    const theme = getSubscriptionPlanTheme(subscription.plan);
    const planName = getPlanLabel(subscription.plan, plans);
    const interval = getIntervalLabel(subscription.billingInterval);

    return (
      <main className="fk-sub-page">
        <section className={`fk-sub-result fk-sub-result--success fk-sub-result--${theme.key}`} aria-live="polite">
          <img className="fk-sub-result__gem" src={theme.image} alt={theme.imageAlt} width={266} height={156} />
          <span className="fk-sub-result__badge">
            <CheckCircle2 size={18} aria-hidden="true" />
            Subscription confirmed
          </span>
          <h1>Welcome to Fockis {planName}</h1>
          <p>Your membership is active. Thank you for supporting Fockis.</p>

          <dl className="fk-sub-details fk-sub-details--center">
            <div>
              <dt>Plan</dt>
              <dd>{planName}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{getStatusLabel(subscription.status)}</dd>
            </div>
            {interval && (
              <div>
                <dt>Billing</dt>
                <dd>{interval}</dd>
              </div>
            )}
          </dl>

          <div className="fk-sub-actions fk-sub-actions--center">
            <button type="button" className="fk-sub-btn fk-sub-btn--primary" onClick={() => navigate("/subscriptions")}>
              View my subscription
            </button>
            <button type="button" className="fk-sub-btn fk-sub-btn--secondary" onClick={() => navigate("/fockis-preview")}>
              Return to Fockis
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="fk-sub-page">
      <section className="fk-sub-result" aria-live="polite">
        <span className="fk-sub-result__icon">
          {stillChecking ? <span className="fk-sub-spinner fk-sub-spinner--lg" aria-hidden="true" /> : <Clock size={30} aria-hidden="true" />}
        </span>
        <span className="fk-sub-eyebrow">Checkout complete</span>
        <h1>{stillChecking ? "Confirming your subscription…" : "Your subscription is still being confirmed"}</h1>
        <p>
          {stillChecking
            ? "Stripe has returned you to Fockis. We're waiting for the payment confirmation to reach your account."
            : "We haven't received confirmation yet. This can take a few minutes. Your plan updates automatically once Stripe confirms the payment — please don't start checkout again."}
        </p>

        {subscription && (
          <p className="fk-sub-note">
            Current plan on record: <strong>{getPlanLabel(subscription.plan, plans)}</strong> (
            {getStatusLabel(subscription.status)})
          </p>
        )}

        <div className="fk-sub-actions fk-sub-actions--center">
          {!stillChecking && (
            <button
              type="button"
              className="fk-sub-btn fk-sub-btn--primary"
              disabled={loading}
              onClick={() => {
                setChecks(0);
                void refresh();
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Check again
            </button>
          )}
          <button type="button" className="fk-sub-btn fk-sub-btn--secondary" onClick={() => navigate("/subscriptions")}>
            View my subscription
          </button>
        </div>
      </section>
    </main>
  );
}
