import type {
  BillingInterval,
  SubscriptionPlan,
} from "../types/subscriptionTypes";

import useSubscriptionPlans from "../hooks/useSubscriptionPlans";

import SubscriptionPlans from "./SubscriptionPlans";

/* ============================================================================
   LEGACY PLAN LIST WRAPPER

   This component previously rendered hard-coded frontend plans and
   prices. It keeps the same props for compatibility but now loads the
   real plans from GET /subscription-plans.
============================================================================ */

interface Props {
  currentPlan: SubscriptionPlan;
  billingInterval: BillingInterval;
  loading?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
}

export default function SubscriptionStatusCard({
  currentPlan,
  billingInterval,
  loading = false,
  onSelect,
}: Props) {
  const { plans, loading: plansLoading, error } = useSubscriptionPlans();

  if (plansLoading) {
    return (
      <p className="fk-sub-state" role="status">
        Loading plans…
      </p>
    );
  }

  if (error) {
    return (
      <p className="fk-sub-alert fk-sub-alert--error" role="alert">
        {error}
      </p>
    );
  }

  return (
    <SubscriptionPlans
      plans={plans}
      currentPlan={currentPlan}
      billingInterval={billingInterval}
      loading={loading}
      onSelect={onSelect}
    />
  );
}
