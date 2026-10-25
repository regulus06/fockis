/* ============================================================================
   FOCKIS SUBSCRIPTION FEATURE GATE

   UI-only gate. It decides what to SHOW, never what the user may DO —
   protected API routes stay enforced by the backend SubscriptionGuard.

   Usage (unchanged):
     <SubscriptionFeatureGate requiredPlan="SILVER">…</SubscriptionFeatureGate>

   Future-ready:
     <SubscriptionFeatureGate requiredEntitlement="shop.premium">…
   An entitlement only passes when the backend explicitly returns it in
   the subscription's `entitlements` array (not sent today).
============================================================================ */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

import useSubscription from "../hooks/useSubscription";
import type { SubscriptionPlan } from "../types/subscriptionTypes";
import { getSubscriptionPlanTheme } from "../config/subscriptionPlanThemes";
import { getPlanLabel, getPlanRank } from "../utils/subscriptionPlanUtils";
import { hasEntitlement } from "../utils/subscriptionEntitlements";
import type { SubscriptionEntitlementId } from "../utils/subscriptionEntitlements";

import "../styles/SubscriptionFeatureGate.scss";

interface Props {
  requiredPlan?: SubscriptionPlan;
  requiredEntitlement?: SubscriptionEntitlementId;
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional feature name used in the upgrade message. */
  featureName?: string;
}

export default function SubscriptionFeatureGate({
  requiredPlan,
  requiredEntitlement,
  children,
  fallback,
  featureName,
}: Props) {
  const { subscription, loading } = useSubscription();

  if (loading) return null;

  // Mirrors the backend (SubscriptionsService.getPlan): only ACTIVE or
  // TRIALING subscriptions count; anything else is treated as BASIC.
  const planIsLive = subscription?.status === "ACTIVE" || subscription?.status === "TRIALING";
  const effectivePlan: SubscriptionPlan = subscription && planIsLive ? subscription.plan : "BASIC";

  const planOk = requiredPlan ? getPlanRank(effectivePlan) >= getPlanRank(requiredPlan) : true;

  const entitlementOk = requiredEntitlement ? hasEntitlement(subscription, requiredEntitlement) : true;

  if (planOk && entitlementOk) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const theme = getSubscriptionPlanTheme(requiredPlan);
  const message = requiredPlan
    ? `${featureName ?? "This feature"} is available with the ${getPlanLabel(requiredPlan)} plan or higher.`
    : `${featureName ?? "This feature"} isn't included in your current membership.`;

  return (
    <div className={`fk-sub-gate fk-sub-gate--${theme.key}`} role="region" aria-label="Upgrade required">
      {requiredPlan ? (
        <img className="fk-sub-gate__gem" src={theme.image} alt="" width={120} height={70} />
      ) : (
        <span className="fk-sub-gate__icon" aria-hidden="true">
          <Lock size={22} />
        </span>
      )}
      <div className="fk-sub-gate__copy">
        <strong>Upgrade to unlock</strong>
        <p>{message}</p>
      </div>
      <Link className="fk-sub-btn fk-sub-btn--primary" to="/subscriptions/plans">
        View plans
      </Link>
    </div>
  );
}
