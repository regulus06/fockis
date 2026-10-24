import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CreditCard, FileText, RefreshCw, ShieldAlert, Wallet } from "lucide-react";

import useSubscription from "../hooks/useSubscription";
import useSubscriptionPlans from "../hooks/useSubscriptionPlans";
import type { SubscriptionStatus } from "../types/subscriptionTypes";
import { getSubscriptionPlanTheme } from "../config/subscriptionPlanThemes";
import {
  formatMoney,
  formatSubscriptionDate,
  getIntervalLabel,
  getPlanLabel,
  getStatusLabel,
} from "../utils/subscriptionPlanUtils";

import "../styles/SubscriptionPage.scss";

/* ============================================================================
   BILLING AND PAYMENTS — real subscription record only.
============================================================================ */

function getPaymentMessage(status: SubscriptionStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Your subscription is active and in good standing.";
    case "TRIALING":
      return "Your account is in a trial period.";
    case "PAST_DUE":
      return "Your most recent payment requires attention.";
    case "CANCELED":
      return "Your subscription is canceled.";
    case "EXPIRED":
      return "Your subscription has expired.";
    default:
      return "Your payment status is unavailable.";
  }
}

export default function SubscriptionBillingPage() {
  const navigate = useNavigate();
  const { subscription, loading, actionLoading, error, refresh } = useSubscription();
  const { plans } = useSubscriptionPlans();

  async function handleRefresh() {
    try {
      await refresh();
    } catch {
      // Errors are exposed by the existing subscription hook.
    }
  }

  if (loading) {
    return (
      <main className="fk-sub-page">
        <div className="fk-sub-state" role="status" aria-live="polite">
          <span className="fk-sub-spinner fk-sub-spinner--lg" aria-hidden="true" />
          <p>Loading your billing information…</p>
        </div>
      </main>
    );
  }

  if (!subscription) {
    return (
      <main className="fk-sub-page">
        <div className={`fk-sub-state${error ? " fk-sub-state--error" : ""}`}>
          <Wallet size={36} aria-hidden="true" />
          <span className="fk-sub-eyebrow">Fockis Billing</span>
          <h1>Billing information unavailable</h1>
          <p>
            {error
              ? "We couldn't retrieve your subscription information."
              : "There is no subscription record available to display."}
          </p>
          {error && (
            <p className="fk-sub-alert fk-sub-alert--error" role="alert">
              {error}
            </p>
          )}
          <div className="fk-sub-actions">
            <button
              type="button"
              className="fk-sub-btn fk-sub-btn--primary"
              disabled={actionLoading}
              onClick={() => void handleRefresh()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Try again
            </button>
            <button
              type="button"
              className="fk-sub-btn fk-sub-btn--secondary"
              onClick={() => navigate("/subscriptions/plans")}
            >
              Explore plans
            </button>
          </div>
        </div>
      </main>
    );
  }

  const status = subscription.status;
  const theme = getSubscriptionPlanTheme(subscription.plan);
  const planName = getPlanLabel(subscription.plan, plans);
  const interval = getIntervalLabel(subscription.billingInterval);
  const priceValue = Number(subscription.price);
  const currency = subscription.currency ?? "USD";
  const periodEnd = formatSubscriptionDate(subscription.currentPeriodEnd);

  const details = [
    { label: "Billing interval", value: interval ?? "Not applicable" },
    { label: "Billing currency", value: currency },
    { label: "Current period started", value: formatSubscriptionDate(subscription.currentPeriodStart) ?? "Not available" },
    { label: "Current period ends", value: periodEnd ?? "Not available" },
  ];

  return (
    <main className="fk-sub-page">
      <header className="fk-sub-page-header">
        <div>
          <span className="fk-sub-eyebrow">Fockis Membership</span>
          <h1>Billing and payments</h1>
          <p>Your membership price, billing period and payment status.</p>
        </div>
        <button type="button" className="fk-sub-btn fk-sub-btn--secondary" onClick={() => navigate("/subscriptions")}>
          <ArrowLeft size={16} aria-hidden="true" />
          My subscription
        </button>
      </header>

      {error && (
        <div className="fk-sub-alert fk-sub-alert--error" role="alert">
          {error}
        </div>
      )}

      <section className={`fk-sub-membership fk-sub-membership--${theme.key}`} aria-labelledby="fk-sub-billing-plan">
        <div className="fk-sub-membership__media">
          <img src={theme.image} alt={theme.imageAlt} width={266} height={156} />
        </div>

        <div className="fk-sub-membership__body">
          <span className="fk-sub-eyebrow">Current membership</span>
          <div className="fk-sub-membership__heading">
            <h2 id="fk-sub-billing-plan">{planName}</h2>
            <span className={`fk-sub-status fk-sub-status--${status.toLowerCase()}`}>
              <span className="fk-sub-status__dot" aria-hidden="true" />
              {getStatusLabel(status)}
            </span>
          </div>

          <p className="fk-sub-membership__price">
            {Number.isFinite(priceValue) ? (
              <>
                <strong>{priceValue === 0 ? "Free" : formatMoney(priceValue, currency)}</strong>
                {priceValue > 0 && subscription.billingInterval && (
                  <span>/{subscription.billingInterval === "YEARLY" ? "year" : "month"}</span>
                )}
              </>
            ) : (
              <strong>Price not available</strong>
            )}
          </p>

          <dl className="fk-sub-details">
            {details.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {subscription.cancelAtPeriodEnd && (
        <div className="fk-sub-alert fk-sub-alert--warning" role="status">
          <div>
            <strong>Cancellation scheduled.</strong> Your subscription ends on {periodEnd ?? "the end of the current period"}.
            Manage it from My Subscription.
          </div>
        </div>
      )}

      <div className="fk-sub-columns">
        <section className="fk-sub-panel" aria-labelledby="fk-sub-payment-status">
          <div className="fk-sub-panel__title-row">
            <h2 id="fk-sub-payment-status">Payment status</h2>
            {status === "PAST_DUE" ? <ShieldAlert size={22} aria-hidden="true" /> : <CreditCard size={22} aria-hidden="true" />}
          </div>
          <p>{getPaymentMessage(status)}</p>

          {status === "PAST_DUE" && (
            <p className="fk-sub-note">Contact Fockis support to update your payment method and restore full access.</p>
          )}

          {subscription.lastPaymentFailedAt && (
            <dl className="fk-sub-details fk-sub-details--compact">
              <div>
                <dt>Last payment failure</dt>
                <dd>{formatSubscriptionDate(subscription.lastPaymentFailedAt) ?? "Not available"}</dd>
              </div>
              <div>
                <dt>Recorded failures</dt>
                <dd>{subscription.paymentFailureCount ?? 0}</dd>
              </div>
            </dl>
          )}

          <div className="fk-sub-actions">
            <button type="button" className="fk-sub-btn fk-sub-btn--primary" onClick={() => navigate("/subscriptions/plans")}>
              Explore plans
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="fk-sub-btn fk-sub-btn--ghost"
              disabled={actionLoading}
              onClick={() => void handleRefresh()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </section>

        <section className="fk-sub-panel" aria-labelledby="fk-sub-invoices">
          <div className="fk-sub-panel__title-row">
            <h2 id="fk-sub-invoices">Payment methods and invoices</h2>
            <FileText size={22} aria-hidden="true" />
          </div>
          <p>
            Updating your card, downloading invoices and viewing payment history aren't connected yet. They require a
            Stripe customer billing portal or invoice endpoints on the Fockis API.
          </p>
          <p className="fk-sub-note">For a receipt or a card change, contact Fockis support.</p>
        </section>
      </div>
    </main>
  );
}
