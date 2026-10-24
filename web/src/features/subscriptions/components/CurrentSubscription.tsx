import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";

import type { Subscription, SubscriptionPlanConfig } from "../types/subscriptionTypes";

import { getSubscriptionPlanTheme } from "../config/subscriptionPlanThemes";
import {
  formatSubscriptionDate,
  getIntervalLabel,
  getPlanLabel,
  getStatusLabel,
  isEndedStatus,
} from "../utils/subscriptionPlanUtils";

/* ============================================================================
   CURRENT SUBSCRIPTION BANNER

   Shows ONLY what GET /subscriptions/current returned: plan, status,
   interval and the real period dates. Nothing is assumed when the
   request fails.
============================================================================ */

interface Props {
  subscription: Subscription | null;
  loading?: boolean;
  error?: string | null;
  plans?: SubscriptionPlanConfig[];
  onRetry?: () => void;
  /** id of the plan grid, used by the "Explore premium plans" link. */
  plansAnchorId?: string;
}

function getRenewalLine(subscription: Subscription): string | null {
  const periodEnd = formatSubscriptionDate(subscription.currentPeriodEnd);
  const trialEnd = formatSubscriptionDate(subscription.trialEndsAt ?? subscription.trialEnd);

  if (subscription.status === "TRIALING" && trialEnd) return `Trial ends ${trialEnd}`;
  if (isEndedStatus(subscription.status)) return periodEnd ? `Ended ${periodEnd}` : null;
  if (subscription.cancelAtPeriodEnd) return periodEnd ? `Access ends ${periodEnd}` : "Cancellation scheduled";
  if (periodEnd) return `Renews ${periodEnd}`;
  return null;
}

export default function CurrentSubscription({
  subscription,
  loading = false,
  error = null,
  plans,
  onRetry,
  plansAnchorId = "fk-sub-plans",
}: Props) {
  if (loading) {
    return (
      <section className="fk-sub-current is-loading" aria-busy="true" aria-label="Current subscription">
        <div className="fk-sub-skeleton fk-sub-skeleton--gem" />
        <div className="fk-sub-current__copy">
          <div className="fk-sub-skeleton fk-sub-skeleton--line" />
          <div className="fk-sub-skeleton fk-sub-skeleton--title" />
        </div>
      </section>
    );
  }

  if (!subscription) {
    return (
      <section className="fk-sub-current is-unknown" aria-label="Current subscription">
        <div className="fk-sub-current__copy">
          <span className="fk-sub-eyebrow">Your current plan</span>
          <h2 className="fk-sub-current__title">We couldn't confirm your plan</h2>
          <p className="fk-sub-current__meta">
            Your subscription details are unavailable right now
            {error ? ` (${error.replace(/\.$/, "")})` : ""}. Checkout stays disabled until your plan is confirmed.
          </p>
        </div>
        {onRetry && (
          <button type="button" className="fk-sub-btn fk-sub-btn--secondary" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
        )}
      </section>
    );
  }

  const theme = getSubscriptionPlanTheme(subscription.plan);
  const planName = getPlanLabel(subscription.plan, plans);
  const isBasic = subscription.plan === "BASIC";
  const interval = getIntervalLabel(subscription.billingInterval);
  const renewal = getRenewalLine(subscription);
  const statusKey = (subscription.status ?? "").toLowerCase();

  return (
    <section className={`fk-sub-current fk-sub-current--${theme.key}`} aria-label="Current subscription">
      <img className="fk-sub-current__gem" src={theme.image} alt="" width={96} height={56} />

      <div className="fk-sub-current__copy">
        <span className="fk-sub-eyebrow">Your current plan</span>

        <div className="fk-sub-current__heading">
          <h2 className="fk-sub-current__title">{planName}</h2>
          <span className={`fk-sub-status fk-sub-status--${statusKey}`}>
            <span className="fk-sub-status__dot" aria-hidden="true" />
            {getStatusLabel(subscription.status)}
          </span>
        </div>

        {isBasic ? (
          <p className="fk-sub-current__meta">
            <Sparkles size={15} aria-hidden="true" />
            You're on the free plan. Premium plans add more ways to connect, create and grow.
          </p>
        ) : (
          <p className="fk-sub-current__meta">
            {[interval ? `${interval} billing` : null, renewal].filter(Boolean).join(" · ") ||
              "Billing details are not available yet."}
          </p>
        )}
      </div>

      {isBasic ? (
        <a className="fk-sub-btn fk-sub-btn--primary" href={`#${plansAnchorId}`}>
          Explore premium plans
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      ) : (
        <Link className="fk-sub-btn fk-sub-btn--secondary" to="/subscriptions">
          Manage subscription
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
