import type {
  BillingInterval,
  SubscriptionPlan,
  SubscriptionPlanConfig,
} from "../types/subscriptionTypes";

import { sortActivePlans } from "../utils/subscriptionPlanUtils";
import type { PlanCardAction } from "../utils/subscriptionPlanUtils";

import SubscriptionPlanCard from "./SubscriptionPlanCard";

/* ============================================================================
   FOCKIS SUBSCRIPTION PLAN GRID

   Renders the backend plans exactly as configured (active only, in
   displayOrder). No frontend feature or price fallbacks.
============================================================================ */

interface SubscriptionPlansProps {
  plans: SubscriptionPlanConfig[];
  currentPlan: SubscriptionPlan;
  billingInterval: BillingInterval;
  loading?: boolean;
  pendingPlan?: SubscriptionPlan | null;
  getAction?: (config: SubscriptionPlanConfig) => PlanCardAction;
  onSelect: (plan: SubscriptionPlan) => void;
  id?: string;
}

export default function SubscriptionPlans({
  plans,
  currentPlan,
  billingInterval,
  loading = false,
  pendingPlan = null,
  getAction,
  onSelect,
  id,
}: SubscriptionPlansProps) {
  const activePlans = sortActivePlans(plans);

  if (activePlans.length === 0) {
    return (
      <p className="fk-sub-empty" role="status">
        No subscription plans are available right now. Please check back soon.
      </p>
    );
  }

  return (
    <section id={id} className="fk-sub-grid" aria-label="Fockis account plans">
      {activePlans.map((config) => (
        <SubscriptionPlanCard
          key={config.plan}
          config={config}
          currentPlan={currentPlan}
          billingInterval={billingInterval}
          loading={loading}
          pending={pendingPlan === config.plan}
          action={getAction?.(config)}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}
