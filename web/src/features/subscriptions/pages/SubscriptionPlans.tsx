import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, RefreshCw, ShieldCheck } from "lucide-react";

import useSubscription from "../hooks/useSubscription";
import useSubscriptionPlans from "../hooks/useSubscriptionPlans";
import { createCheckout } from "../services/subscriptionApi";

import type {
  BillingInterval,
  CreateCheckoutPayload,
  SubscriptionPlan,
  SubscriptionPlanConfig,
} from "../types/subscriptionTypes";

import {
  assertStripeCheckoutUrl,
  getMaxYearlySavingsPercent,
  getPlanCardAction,
  getPlanPrice,
} from "../utils/subscriptionPlanUtils";

import BillingIntervalSelector from "../components/BillingIntervalSelector";
import CurrentSubscription from "../components/CurrentSubscription";
import SubscriptionPlans from "../components/SubscriptionPlans";

import "../styles/SubscriptionPlans.scss";

/* ============================================================================
   FOCKIS — CHOOSE YOUR PLAN

   Data sources (no mock data, no fallback prices):
   - GET  /subscription-plans       → plans, prices, features
   - GET  /subscriptions/current    → current plan & status
   - POST /subscriptions/checkout   → { plan, billingInterval } → Stripe URL
============================================================================ */

const PLANS_ANCHOR = "fk-sub-plans";

export default function SubscriptionPlansPage() {
  const navigate = useNavigate();

  const {
    subscription,
    loading: subscriptionLoading,
    error: subscriptionError,
    refresh: refreshSubscription,
  } = useSubscription();

  const { plans, loading: plansLoading, error: plansError, reload: reloadPlans } = useSubscriptionPlans();

  const [billingInterval, setBillingInterval] = useState<BillingInterval>("MONTHLY");
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const subscriptionKnown = !subscriptionLoading && Boolean(subscription);
  const currentPlan: SubscriptionPlan = subscription?.plan ?? "BASIC";
  const yearlySavings = useMemo(() => getMaxYearlySavingsPercent(plans), [plans]);

  const getAction = useCallback(
    (config: SubscriptionPlanConfig) =>
      getPlanCardAction({ config, interval: billingInterval, subscription, subscriptionKnown }),
    [billingInterval, subscription, subscriptionKnown],
  );

  async function handleSelect(selectedPlan: SubscriptionPlan) {
    if (pendingPlan) return;

    const config = plans.find((item) => item.plan === selectedPlan);
    if (!config) {
      setCheckoutError("This subscription plan is currently unavailable.");
      return;
    }

    const action = getAction(config);

    if (action.kind === "manage" || action.kind === "included") {
      navigate("/subscriptions");
      return;
    }

    if (action.kind !== "checkout" || action.disabled || selectedPlan === "BASIC") return;

    const price = getPlanPrice(config, billingInterval);
    if (price === null || price <= 0) {
      setCheckoutError("This plan does not have a valid price for the selected billing interval.");
      return;
    }

    const payload: CreateCheckoutPayload = {
      plan: selectedPlan,
      billingInterval,
    };

    try {
      setPendingPlan(selectedPlan);
      setCheckoutError(null);

      const result = await createCheckout(payload);
      const checkoutUrl = assertStripeCheckoutUrl(result.checkoutUrl);

      // Keep the pending state: the browser is leaving for Stripe.
      window.location.assign(checkoutUrl.toString());
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Unable to start subscription checkout.");
      setPendingPlan(null);
    }
  }

  const showGrid = !plansLoading && !plansError;

  return (
    <main className="fk-sub-page fk-sub-plans-page">
      <header className="fk-sub-hero">
        <div className="fk-sub-hero__brand">
          <img src="/brand/fockis-icon-96.png" alt="" width={40} height={40} />
          <span className="fk-sub-eyebrow">Fockis Membership</span>
        </div>

        <h1 className="fk-sub-hero__title">Choose Your Fockis Plan</h1>

        <p className="fk-sub-hero__subtitle">
          Unlock more ways to connect, create, discover, and grow with Fockis.
        </p>
      </header>

      <CurrentSubscription
        subscription={subscription}
        loading={subscriptionLoading}
        error={subscriptionError}
        plans={plans}
        onRetry={() => void refreshSubscription()}
        plansAnchorId={PLANS_ANCHOR}
      />

      <section className="fk-sub-toolbar" aria-labelledby="fk-sub-billing-heading">
        <div className="fk-sub-toolbar__copy">
          <h2 id="fk-sub-billing-heading">Billing schedule</h2>
          <p>
            {billingInterval === "YEARLY"
              ? "One payment each year. Prices below are per year."
              : "One payment each month. Prices below are per month."}
          </p>
        </div>

        <BillingIntervalSelector
          value={billingInterval}
          disabled={Boolean(pendingPlan)}
          yearlySavingsPercent={yearlySavings}
          onChange={(value) => {
            setBillingInterval(value);
            setCheckoutError(null);
          }}
        />
      </section>

      {checkoutError && (
        <div className="fk-sub-alert fk-sub-alert--error" role="alert">
          <strong>Checkout couldn't start.</strong> {checkoutError}
        </div>
      )}

      {pendingPlan && (
        <div className="fk-sub-alert fk-sub-alert--info" role="status" aria-live="polite">
          <span className="fk-sub-spinner" aria-hidden="true" />
          Preparing your secure Stripe checkout…
        </div>
      )}

      {plansLoading && (
        <div className="fk-sub-grid" aria-busy="true" aria-label="Loading plans">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="fk-sub-plan fk-sub-plan--skeleton" aria-hidden="true">
              <div className="fk-sub-skeleton fk-sub-skeleton--media" />
              <div className="fk-sub-plan__body">
                <div className="fk-sub-skeleton fk-sub-skeleton--line" />
                <div className="fk-sub-skeleton fk-sub-skeleton--title" />
                <div className="fk-sub-skeleton fk-sub-skeleton--price" />
                <div className="fk-sub-skeleton fk-sub-skeleton--line" />
                <div className="fk-sub-skeleton fk-sub-skeleton--line" />
                <div className="fk-sub-skeleton fk-sub-skeleton--line" />
              </div>
            </div>
          ))}
          <span className="fk-sub-sr-only" role="status">
            Loading Fockis plans…
          </span>
        </div>
      )}

      {plansError && (
        <div className="fk-sub-state fk-sub-state--error" role="alert">
          <h2>We couldn't load the plans</h2>
          <p>{plansError}</p>
          <button type="button" className="fk-sub-btn fk-sub-btn--primary" onClick={() => void reloadPlans()}>
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {showGrid && (
        <SubscriptionPlans
          id={PLANS_ANCHOR}
          plans={plans}
          currentPlan={currentPlan}
          billingInterval={billingInterval}
          loading={Boolean(pendingPlan)}
          pendingPlan={pendingPlan}
          getAction={getAction}
          onSelect={(plan) => void handleSelect(plan)}
        />
      )}

      <footer className="fk-sub-trust">
        <span>
          <Lock size={15} aria-hidden="true" />
          Secure payments powered by Stripe
        </span>
        <span>
          <ShieldCheck size={15} aria-hidden="true" />
          Your selected billing schedule is used at checkout
        </span>
      </footer>
    </main>
  );
}
