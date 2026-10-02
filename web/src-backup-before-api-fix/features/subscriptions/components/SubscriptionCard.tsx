import React from "react";

import type {
  SubscriptionPlan,
  SubscriptionPlanConfig,
  BillingInterval,
} from "../types/subscriptionTypes";

/* ============================================================
   PROPS
============================================================ */

interface SubscriptionPlanCardProps {
  config: SubscriptionPlanConfig;

  billingInterval: BillingInterval;

  currentPlan: SubscriptionPlan;

  loading?: boolean;

  onSelect: (
    plan: SubscriptionPlan,
  ) => void;
}

/* ============================================================
   PLAN RANK
============================================================ */

function getPlanRank(
  plan: SubscriptionPlan,
): number {
  switch (plan) {
    case "BASIC":
      return 1;

    case "BRONZE":
      return 2;

    case "SILVER":
      return 3;

    case "GOLDEN":
      return 4;

    case "DIAMOND":
      return 5;

    default:
      return 0;
  }
}

/* ============================================================
   SUBSCRIPTION PLAN CARD
============================================================ */

export default function SubscriptionPlanCard({
  config,
  billingInterval,
  currentPlan,
  loading = false,
  onSelect,
}: SubscriptionPlanCardProps) {
  const {
    plan,
    name,
    description,
    monthlyPrice,
    yearlyPrice,
    features,
    popular = false,
    active = true,
  } = config;

  /* ==========================================================
     PRICE
  ========================================================== */

  const price =
    billingInterval === "YEARLY"
      ? yearlyPrice
      : monthlyPrice;

  /* ==========================================================
     PLAN STATE
  ========================================================== */

  const isCurrent =
    currentPlan === plan;

  const currentRank =
    getPlanRank(currentPlan);

  const planRank =
    getPlanRank(plan);

  const isBasic =
    plan === "BASIC";

  const isUpgrade =
    planRank > currentRank;

  const isDowngrade =
    planRank < currentRank;

  /* ==========================================================
     BUTTON TEXT
  ========================================================== */

  let buttonText =
    "Choose Plan";

  if (!active) {
    buttonText =
      "Unavailable";
  } else if (loading) {
    buttonText =
      "Processing...";
  } else if (isCurrent) {
    buttonText =
      "Current Plan";
  } else if (isBasic) {
    buttonText =
      "Free Plan";
  } else if (isUpgrade) {
    buttonText =
      currentPlan === "BASIC"
        ? "Subscribe"
        : "Upgrade";
  } else if (isDowngrade) {
    buttonText =
      "Downgrade";
  }

  /* ==========================================================
     BUTTON DISABLED
  ========================================================== */

  /*
   * IMPORTANT:
   *
   * BASIC is disabled because it is already the free account.
   *
   * Paid plans are enabled when they are higher than the
   * current plan so the user can subscribe or upgrade.
   *
   * Downgrades remain disabled for now because your checkout
   * flow is designed for subscription/upgrade.
   */

  const buttonDisabled =
    loading ||
    !active ||
    isCurrent ||
    isBasic ||
    isDowngrade;

  /* ==========================================================
     SELECT
  ========================================================== */

  const handleSelect = () => {
    if (buttonDisabled) {
      return;
    }

    onSelect(plan);
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <article
      className={[
        "fk-subscription-plan-card",

        `fk-subscription-plan-card--${plan.toLowerCase()}`,

        isCurrent
          ? "is-current"
          : "",

        popular
          ? "is-popular"
          : "",

        isUpgrade
          ? "is-upgrade"
          : "",

        isDowngrade
          ? "is-downgrade"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      {/* ======================================================
          POPULAR
      ====================================================== */}

      {popular && (
        <div className="fk-subscription-plan-card__popular">
          Most Popular
        </div>
      )}

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="fk-subscription-plan-card__header">

        <div className="fk-subscription-plan-card__name">
          {name}
        </div>

        <div className="fk-subscription-plan-card__description">
          {description}
        </div>

      </div>

      {/* ======================================================
          PRICE
      ====================================================== */}

      <div className="fk-subscription-plan-card__price">

        <span className="fk-subscription-plan-card__currency">
          $
        </span>

        <span className="fk-subscription-plan-card__amount">
          {price.toFixed(2)}
        </span>

        <span className="fk-subscription-plan-card__interval">
          /
          {" "}
          {billingInterval === "YEARLY"
            ? "year"
            : "month"}
        </span>

      </div>

      {/* ======================================================
          FREE LABEL
      ====================================================== */}

      {isBasic && (
        <div className="fk-subscription-plan-card__free">
          Free forever
        </div>
      )}

      {/* ======================================================
          CURRENT PLAN LABEL
      ====================================================== */}

      {isCurrent && (
        <div className="fk-subscription-plan-card__current">
          Your current Fockis account
        </div>
      )}

      {/* ======================================================
          FEATURES
      ====================================================== */}

      <div className="fk-subscription-plan-card__features">

        {features.map(
          (
            feature,
            index,
          ) => (
            <div
              key={`${plan}-feature-${index}`}
              className={[
                "fk-subscription-plan-card__feature",

                feature.included
                  ? "is-included"
                  : "is-excluded",
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

              <span className="fk-subscription-plan-card__feature-label">
                {feature.name}
              </span>

            </div>
          ),
        )}

      </div>

      {/* ======================================================
          ACTION
      ====================================================== */}

      <button
        type="button"
        className={[
          "fk-subscription-plan-card__button",

          isCurrent
            ? "is-current"
            : "",

          isBasic
            ? "is-basic"
            : "",

          isUpgrade
            ? "is-upgrade"
            : "",

          isDowngrade
            ? "is-downgrade"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}

        disabled={
          buttonDisabled
        }

        onClick={
          handleSelect
        }
      >
        {buttonText}
      </button>

    </article>
  );
}