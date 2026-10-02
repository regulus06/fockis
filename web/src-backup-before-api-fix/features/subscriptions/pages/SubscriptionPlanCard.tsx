import React from "react";

import type {
  BillingInterval,
  SubscriptionFeature,
  SubscriptionPlanConfig,
} from "../types/subscriptionTypes";

import "../styles/SubscriptionPlanCard.scss";

/* ============================================================================
   FOCKIS SUBSCRIPTION PLAN CARD
============================================================================ */

export interface SubscriptionPlanCardProps {
  config: SubscriptionPlanConfig;

  currentPlan?: string;

  billingInterval?: BillingInterval;

  loading?: boolean;

  onSelect?: (
    plan: SubscriptionPlanConfig["plan"],
  ) => void;
}

/* ============================================================================
   FEATURE LABEL
============================================================================ */

function getFeatureLabel(
  feature: SubscriptionFeature,
): string {
  if (
    feature &&
    typeof feature.name === "string"
  ) {
    return feature.name;
  }

  if (
    feature &&
    typeof feature.description === "string"
  ) {
    return feature.description;
  }

  return "";
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function SubscriptionPlanCard({
  config,
  currentPlan,
  billingInterval = "MONTHLY",
  loading = false,
  onSelect,
}: SubscriptionPlanCardProps) {

  /* --------------------------------------------------------------------------
     CURRENT PLAN
  -------------------------------------------------------------------------- */

  const isCurrentPlan =
    currentPlan?.toUpperCase() ===
    config.plan.toUpperCase();

  /* --------------------------------------------------------------------------
     PRICE
  -------------------------------------------------------------------------- */

  const price =
    billingInterval === "YEARLY"
      ? config.yearlyPrice
      : config.monthlyPrice;

  /* --------------------------------------------------------------------------
     FEATURES
  -------------------------------------------------------------------------- */

  const features =
    Array.isArray(config.features)
      ? config.features
      : [];

  /* --------------------------------------------------------------------------
     INTERVAL LABEL
  -------------------------------------------------------------------------- */

  const intervalLabel =
    billingInterval === "YEARLY"
      ? "year"
      : "month";

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <article
      className={[
        "fk-subscription-plan-card",

        isCurrentPlan
          ? "fk-subscription-plan-card--current"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      {/* ================================================================
          HEADER
      ================================================================ */}

      <div className="fk-subscription-plan-card__header">

        <h3 className="fk-subscription-plan-card__name">
          {config.name}
        </h3>

        {isCurrentPlan && (
          <span className="fk-subscription-plan-card__current">
            Current Plan
          </span>
        )}

      </div>


      {/* ================================================================
          DESCRIPTION
      ================================================================ */}

      {config.description && (
        <p className="fk-subscription-plan-card__description">
          {config.description}
        </p>
      )}


      {/* ================================================================
          PRICE
      ================================================================ */}

      <div className="fk-subscription-plan-card__price">

        <span className="fk-subscription-plan-card__currency">
          {config.currency === "USD"
            ? "$"
            : config.currency}
        </span>

        <span className="fk-subscription-plan-card__amount">
          {price}
        </span>

        <span className="fk-subscription-plan-card__interval">
          /{intervalLabel}
        </span>

      </div>


      {/* ================================================================
          FEATURES
      ================================================================ */}

      <div className="fk-subscription-plan-card__features">

        {features.map(
          (
            feature,
            index,
          ) => {

            const label =
              getFeatureLabel(feature);

            if (!label) {
              return null;
            }

            return (
              <div
                key={`${config.plan}-feature-${index}`}
                className={[
                  "fk-subscription-plan-card__feature",

                  feature.included
                    ? ""
                    : "fk-subscription-plan-card__feature--excluded",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >

                <span
                  className="fk-subscription-plan-card__feature-icon"
                  aria-hidden="true"
                >
                  {feature.included
                    ? "✓"
                    : "×"}
                </span>

                <span>
                  {label}
                </span>

              </div>
            );
          },
        )}

      </div>


      {/* ================================================================
          ACTION
      ================================================================ */}

      <button
        type="button"
        className={[
          "fk-subscription-plan-card__button",

          isCurrentPlan
            ? "fk-subscription-plan-card__button--current"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}

        disabled={
          isCurrentPlan ||
          loading
        }

        onClick={() => {

          if (
            !isCurrentPlan &&
            !loading
          ) {
            onSelect?.(
              config.plan,
            );
          }

        }}
      >

        {loading
          ? "Processing..."
          : isCurrentPlan
            ? "Current Plan"
            : "Choose Plan"}

      </button>

    </article>
  );
}
