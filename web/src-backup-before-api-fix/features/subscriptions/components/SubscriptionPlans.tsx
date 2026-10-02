import React from "react";

import type {
  BillingInterval,
  SubscriptionPlan,
  SubscriptionPlanConfig,
} from "../types/subscriptionTypes";

import SubscriptionPlanCard from "../components/SubscriptionPlanCard";

/* ============================================================================
   FOCKIS SUBSCRIPTION PLANS
============================================================================ */

interface SubscriptionPlansProps {
  plans?: SubscriptionPlanConfig[];

  currentPlan: SubscriptionPlan;

  billingInterval: BillingInterval;

  loading?: boolean;

  onSelect: (
    plan: SubscriptionPlan,
  ) => void;
}

/* ============================================================================
   DEFAULT PLANS

   Used when the backend does not provide plans.

   IMPORTANT:
   These objects use the COMPLETE SubscriptionPlanConfig type.
============================================================================ */

const DEFAULT_PLANS: SubscriptionPlanConfig[] = [
  {
    plan: "BASIC",

    name: "Basic",

    description:
      "Free Fockis account with essential services.",

    monthlyPrice: 0,

    yearlyPrice: 0,

    currency: "USD",

    features: [
      {
        name: "Fockis Feed",
        included: true,
      },

      {
        name: "Create posts",
        included: true,
      },

      {
        name: "Friends and groups",
        included: true,
      },

      {
        name: "Marketplace browsing",
        included: true,
      },

      {
        name: "Basic profile",
        included: true,
      },

      {
        name: "Premium account features",
        included: false,
      },
    ],

    active: true,

    popular: false,

    displayOrder: 1,

    rank: 1,
  },

  {
    plan: "BRONZE",

    name: "Bronze",

    description:
      "More Fockis services and higher account limits.",

    monthlyPrice: 9.99,

    yearlyPrice: 99.99,

    currency: "USD",

    features: [
      {
        name: "Everything in Basic",
        included: true,
      },

      {
        name: "Higher account limits",
        included: true,
      },

      {
        name: "Enhanced profile features",
        included: true,
      },

      {
        name: "Additional Fockis services",
        included: true,
      },

      {
        name: "Advanced analytics",
        included: false,
      },
    ],

    active: true,

    popular: false,

    displayOrder: 2,

    rank: 2,
  },

  {
    plan: "SILVER",

    name: "Silver",

    description:
      "Expanded Fockis services for growing users.",

    monthlyPrice: 19.99,

    yearlyPrice: 199.99,

    currency: "USD",

    features: [
      {
        name: "Everything in Bronze",
        included: true,
      },

      {
        name: "Expanded account limits",
        included: true,
      },

      {
        name: "Advanced profile tools",
        included: true,
      },

      {
        name: "Advanced marketplace tools",
        included: true,
      },

      {
        name: "Advanced analytics",
        included: true,
      },
    ],

    active: true,

    popular: true,

    displayOrder: 3,

    rank: 3,
  },

  {
    plan: "GOLDEN",

    name: "Golden",

    description:
      "Advanced Fockis services and premium capabilities.",

    monthlyPrice: 39.99,

    yearlyPrice: 399.99,

    currency: "USD",

    features: [
      {
        name: "Everything in Silver",
        included: true,
      },

      {
        name: "Premium account capabilities",
        included: true,
      },

      {
        name: "Advanced marketing tools",
        included: true,
      },

      {
        name: "Premium analytics",
        included: true,
      },

      {
        name: "Priority features",
        included: true,
      },
    ],

    active: true,

    popular: false,

    displayOrder: 4,

    rank: 4,
  },

  {
    plan: "DIAMOND",

    name: "Diamond",

    description:
      "The highest Fockis account level with maximum services.",

    monthlyPrice: 79.99,

    yearlyPrice: 799.99,

    currency: "USD",

    features: [
      {
        name: "Everything in Golden",
        included: true,
      },

      {
        name: "Maximum account limits",
        included: true,
      },

      {
        name: "Maximum premium capabilities",
        included: true,
      },

      {
        name: "Advanced marketing",
        included: true,
      },

      {
        name: "Maximum analytics",
        included: true,
      },

      {
        name: "Highest Fockis account level",
        included: true,
      },
    ],

    active: true,

    popular: false,

    displayOrder: 5,

    rank: 5,
  },
];

/* ============================================================================
   COMPONENT
============================================================================ */

export default function SubscriptionPlans({
  plans = DEFAULT_PLANS,

  currentPlan,

  billingInterval,

  loading = false,

  onSelect,
}: SubscriptionPlansProps) {

  /* --------------------------------------------------------------------------
     ACTIVE PLANS
  -------------------------------------------------------------------------- */

  const activePlans =
    [...plans]
      .filter(
        (plan) =>
          plan.active,
      )
      .sort(
        (a, b) =>
          a.displayOrder -
          b.displayOrder,
      );

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <section className="fk-subscription-plans">

      {/* ======================================================================
          BILLING INFORMATION
      ====================================================================== */}

      <div className="fk-subscription-plans__billing">

        <span>
          Billing
        </span>

        <strong>
          {billingInterval === "YEARLY"
            ? "Yearly"
            : "Monthly"}
        </strong>

      </div>


      {/* ======================================================================
          PLAN GRID
      ====================================================================== */}

      <div className="fk-subscription-plans__grid">

        {activePlans.map(
          (config) => (

            <SubscriptionPlanCard
              key={config.plan}

              /*
               * IMPORTANT:
               *
               * Pass the COMPLETE config directly.
               *
               * Do NOT create another cardConfig object.
               */
              config={config}

              currentPlan={
                currentPlan
              }

              billingInterval={
                billingInterval
              }

              loading={
                loading
              }

              onSelect={
                onSelect
              }
            />

          ),
        )}

      </div>

    </section>
  );
}