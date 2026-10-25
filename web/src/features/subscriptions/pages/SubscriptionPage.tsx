import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  Crown,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import useSubscription from "../hooks/useSubscription";
import useSubscriptionPlans from "../hooks/useSubscriptionPlans";
import { getSubscriptionPlanTheme } from "../config/subscriptionPlanThemes";
import {
  formatMoney,
  formatSubscriptionDate,
  getIntervalLabel,
  getPlanLabel,
  getStatusLabel,
  normalizeSubscriptionFeatures,
} from "../utils/subscriptionPlanUtils";
import { getGrantedEntitlements } from "../utils/subscriptionEntitlements";

import "../styles/SubscriptionPage.scss";

/* ============================================================================
   MY SUBSCRIPTION — overview of the user's real subscription record.
============================================================================ */

export default function SubscriptionPage() {
  const navigate = useNavigate();

  const { subscription, plan, status, loading, actionLoading, error, cancel, resume, refresh } = useSubscription();
  const { plans } = useSubscriptionPlans();

  const isBasic = plan === "BASIC";
  const isCanceled = subscription?.cancelAtPeriodEnd === true;
  const isPastDue = status === "PAST_DUE";
  const isTrialing = status === "TRIALING";
  const isEnded = status === "CANCELED" || status === "EXPIRED";

  const canCancel = !isBasic && !isCanceled && !isEnded && !isPastDue && Boolean(subscription);
  const canResume = !isBasic && isCanceled && !isEnded && Boolean(subscription);

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? " +
        "Your paid access continues until the end of the current billing period.",
    );
    if (!confirmed) return;
    try {
      await cancel();
    } catch {
      // The subscription hook exposes the error.
    }
  }

  async function handleResume() {
    const confirmed = window.confirm("Would you like to resume your subscription?");
    if (!confirmed) return;
    try {
      await resume();
    } catch {
      // The subscription hook exposes the error.
    }
  }

  async function handleRefresh() {
    try {
      await refresh();
    } catch {
      // The subscription hook handles request errors.
    }
  }

  if (loading) {
    return (
      <main className="fk-sub-page">
        <div className="fk-sub-state" role="status" aria-live="polite">
          <span className="fk-sub-spinner fk-sub-spinner--lg" aria-hidden="true" />
          <p>Loading your subscription…</p>
        </div>
      </main>
    );
  }

  if (!subscription) {
    return (
      <main className="fk-sub-page">
        <div className="fk-sub-state fk-sub-state--error">
          <ShieldAlert size={36} aria-hidden="true" />
          <h1>Unable to load your subscription</h1>
          <p>We couldn't retrieve your subscription information, so your current plan has not been confirmed.</p>
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
              View plans
            </button>
          </div>
        </div>
      </main>
    );
  }

  const theme = getSubscriptionPlanTheme(plan);
  const planName = getPlanLabel(plan, plans);
  const planConfig = plans.find((item) => item.plan === plan);
  const features = normalizeSubscriptionFeatures(planConfig?.features).filter((item) => item.included);
  const entitlements = getGrantedEntitlements(subscription);
  const interval = getIntervalLabel(subscription.billingInterval);
  const priceValue = Number(subscription.price);
  const periodEnd = formatSubscriptionDate(subscription.currentPeriodEnd);

  const details: { label: string; value: string }[] = [
    { label: "Status", value: getStatusLabel(status) },
    { label: "Billing interval", value: interval ?? "Not applicable" },
    {
      label: subscription.cancelAtPeriodEnd || isEnded ? "Access ends" : "Next renewal",
      value: periodEnd ?? "Not available",
    },
    { label: "Member since", value: formatSubscriptionDate(subscription.createdAt) ?? "Not available" },
  ];

  if (isTrialing) {
    details.push({
      label: "Trial ends",
      value: formatSubscriptionDate(subscription.trialEndsAt ?? subscription.trialEnd) ?? "Not available",
    });
  }

  return (
    <main className="fk-sub-page">
      <header className="fk-sub-page-header">
        <div>
          <span className="fk-sub-eyebrow">Fockis Membership</span>
          <h1>My Subscription</h1>
          <p>Your membership, billing schedule and subscription preferences.</p>
        </div>
        <button type="button" className="fk-sub-btn fk-sub-btn--primary" onClick={() => navigate("/subscriptions/plans")}>
          {isBasic || isEnded ? "Explore plans" : "Compare plans"}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </header>

      {error && (
        <div className="fk-sub-alert fk-sub-alert--error" role="alert">
          {error}
        </div>
      )}

      <section className={`fk-sub-membership fk-sub-membership--${theme.key}`} aria-labelledby="fk-sub-membership-title">
        <div className="fk-sub-membership__media">
          <img src={theme.image} alt={theme.imageAlt} width={266} height={156} />
        </div>

        <div className="fk-sub-membership__body">
          <span className="fk-sub-eyebrow">Current membership</span>
          <div className="fk-sub-membership__heading">
            <h2 id="fk-sub-membership-title">{planName}</h2>
            <span className={`fk-sub-status fk-sub-status--${status.toLowerCase()}`}>
              <span className="fk-sub-status__dot" aria-hidden="true" />
              {getStatusLabel(status)}
            </span>
          </div>

          <p className="fk-sub-membership__price">
            {Number.isFinite(priceValue) && priceValue > 0 ? (
              <>
                <strong>{formatMoney(priceValue, subscription.currency)}</strong>
                {subscription.billingInterval && (
                  <span>/{subscription.billingInterval === "YEARLY" ? "year" : "month"}</span>
                )}
              </>
            ) : (
              <strong>{isBasic ? "Free" : "Price not available"}</strong>
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

      {isCanceled && !isEnded && (
        <div className="fk-sub-alert fk-sub-alert--warning" role="status">
          <CalendarClock size={20} aria-hidden="true" />
          <div>
            <strong>Cancellation scheduled.</strong> Your {planName} access ends on {periodEnd ?? "the end of the current period"}.
            You can resume before then.
          </div>
        </div>
      )}

      {isPastDue && (
        <div className="fk-sub-alert fk-sub-alert--error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <div>
            <strong>Payment needs attention.</strong> Your last payment did not go through. Review your billing details
            to keep your membership active.
          </div>
        </div>
      )}

      {isEnded && (
        <div className="fk-sub-alert fk-sub-alert--neutral" role="status">
          <XCircle size={20} aria-hidden="true" />
          <div>
            <strong>Subscription ended.</strong> Your paid membership is no longer active. Explore the plans to subscribe
            again.
          </div>
        </div>
      )}

      <div className="fk-sub-columns">
        <section className="fk-sub-panel" aria-labelledby="fk-sub-manage-title">
          <h2 id="fk-sub-manage-title">Manage your membership</h2>
          <div className="fk-sub-actions">
            <button type="button" className="fk-sub-btn fk-sub-btn--primary" onClick={() => navigate("/subscriptions/plans")}>
              <Crown size={16} aria-hidden="true" />
              {isBasic || isEnded ? "Explore plans" : "View plans"}
            </button>
            <button type="button" className="fk-sub-btn fk-sub-btn--secondary" onClick={() => navigate("/subscriptions/billing")}>
              <CreditCard size={16} aria-hidden="true" />
              Billing details
            </button>
            {canResume && (
              <button
                type="button"
                className="fk-sub-btn fk-sub-btn--primary"
                disabled={actionLoading}
                onClick={() => void handleResume()}
              >
                {actionLoading ? "Processing…" : "Resume subscription"}
              </button>
            )}
            <button
              type="button"
              className="fk-sub-btn fk-sub-btn--ghost"
              disabled={actionLoading}
              onClick={() => void handleRefresh()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refresh status
            </button>
          </div>

          {canCancel && (
            <div className="fk-sub-danger-zone">
              <div>
                <strong>Cancel subscription</strong>
                <p>Cancellation takes effect at the end of your current billing period.</p>
              </div>
              <button
                type="button"
                className="fk-sub-btn fk-sub-btn--danger"
                disabled={actionLoading}
                onClick={() => void handleCancel()}
              >
                {actionLoading ? "Processing…" : "Cancel subscription"}
              </button>
            </div>
          )}

          {!isBasic && !isEnded && (
            <p className="fk-sub-note">
              Switching between paid plans isn't available online yet. Contact Fockis support to change your plan.
            </p>
          )}
        </section>

        <section className="fk-sub-panel" aria-labelledby="fk-sub-included-title">
          <h2 id="fk-sub-included-title">Included in {planName}</h2>
          {features.length > 0 ? (
            <ul className="fk-sub-checklist">
              {features.map((feature) => (
                <li key={feature.name}>{feature.name}</li>
              ))}
            </ul>
          ) : (
            <p className="fk-sub-note">Plan features are being updated.</p>
          )}

          {entitlements.length > 0 && (
            <>
              <h3 className="fk-sub-panel__subheading">Active entitlements</h3>
              <ul className="fk-sub-tags">
                {entitlements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
