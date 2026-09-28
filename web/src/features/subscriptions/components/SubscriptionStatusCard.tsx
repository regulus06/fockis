import React from "react";

import type {
  BillingInterval,
  SubscriptionPlan,
} from "../types/subscriptionTypes";

import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLAN_ORDER,
} from "../types/subscriptionTypes";

import SubscriptionPlanCard from "./SubscriptionPlanCard";

interface Props {
  currentPlan: SubscriptionPlan;

  billingInterval: BillingInterval;

  loading?: boolean;

  onSelect: (
    plan: SubscriptionPlan,
  ) => void;
}

export default function SubscriptionPlans({
  currentPlan,
  billingInterval,
  loading = false,
  onSelect,
}: Props) {
  return (
    <div className="fk-subscription-plans">
      {SUBSCRIPTION_PLAN_ORDER.map(
        (plan) => (
          <SubscriptionPlanCard
            key={plan}
            config={
              SUBSCRIPTION_PLANS[
                plan
              ]
            }
            currentPlan={
              currentPlan
            }
            billingInterval={
              billingInterval
            }
            loading={loading}
            onSelect={onSelect}
          />
        ),
      )}
    </div>
  );
}