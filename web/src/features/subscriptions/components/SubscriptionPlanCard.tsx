/* ============================================================================
   FOCKIS SUBSCRIPTION PLAN CARD
============================================================================ */

import React from "react";

import type {
  BillingInterval,
  SubscriptionPlan,
  SubscriptionPlanConfig,
} from "../types/subscriptionTypes";


/* ============================================================================
   PROPS
============================================================================ */

interface Props {
  config: SubscriptionPlanConfig;

  currentPlan: SubscriptionPlan;

  billingInterval: BillingInterval;

  loading?: boolean;

  onSelect: (
    plan: SubscriptionPlan,
  ) => void;
}


/* ============================================================================
   FORMAT PRICE
============================================================================ */

function formatPrice(
  price: number,
  currency: string = "USD",
): string {

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(price);
}


/* ============================================================================
   PLAN RANK
============================================================================ */

function getRank(
  plan: SubscriptionPlan,
): number {

  switch (plan) {

    case "DIAMOND":
      return 5;

    case "GOLDEN":
      return 4;

    case "SILVER":
      return 3;

    case "BRONZE":
      return 2;

    case "BASIC":
    default:
      return 1;
  }
}


/* ============================================================================
   HIGHLIGHTED PLAN
============================================================================ */

/*
 * Silver is currently the recommended plan.
 *
 * If the backend plan configuration later exposes
 * a "popular" property, this can be changed to:
 *
 * config.popular
 */

function isHighlightedPlan(
  plan: SubscriptionPlan,
): boolean {

  return plan === "SILVER";
}


/* ============================================================================
   COMPONENT
============================================================================ */

export default function SubscriptionPlanCard({
  config,
  currentPlan,
  billingInterval,
  loading = false,
  onSelect,
}: Props) {


  /* --------------------------------------------------------------------------
     CURRENT PLAN
  -------------------------------------------------------------------------- */

  const isCurrent =
    currentPlan === config.plan;


  /* --------------------------------------------------------------------------
     PLAN RANK
  -------------------------------------------------------------------------- */

  const currentRank =
    getRank(currentPlan);

  const planRank =
    getRank(config.plan);


  const isUpgrade =
    planRank > currentRank;


  const isDowngrade =
    planRank < currentRank;


  /* --------------------------------------------------------------------------
     HIGHLIGHT
  -------------------------------------------------------------------------- */

  const highlighted =
    isHighlightedPlan(
      config.plan,
    );


  /* --------------------------------------------------------------------------
     PRICE
  -------------------------------------------------------------------------- */

  const price =
    billingInterval === "YEARLY"
      ? config.yearlyPrice
      : config.monthlyPrice;


  /* --------------------------------------------------------------------------
     CURRENCY
  -------------------------------------------------------------------------- */

  const currency =
    config.currency || "USD";


  /* --------------------------------------------------------------------------
     BUTTON TEXT
  -------------------------------------------------------------------------- */

  let buttonText =
    "Choose plan";


  if (isCurrent) {

    buttonText =
      "Current plan";

  } else if (isUpgrade) {

    buttonText =
      `Upgrade to ${config.name}`;

  } else if (isDowngrade) {

    buttonText =
      `Switch to ${config.name}`;

  }


  /* --------------------------------------------------------------------------
     CARD CLASSES
  -------------------------------------------------------------------------- */

  const cardClasses = [
    "fk-subscription-plan",

    highlighted
      ? "fk-subscription-plan--highlighted"
      : "",

    isCurrent
      ? "fk-subscription-plan--current"
      : "",
  ]
    .filter(Boolean)
    .join(" ");


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (

    <article
      className={cardClasses}
    >

      {/* ================================================================
          MOST POPULAR
      ================================================================ */}

      {highlighted && (

        <div
          className="fk-subscription-plan__popular"
        >
          Most popular
        </div>

      )}


      {/* ================================================================
          HEADER
      ================================================================ */}

      <div
        className="fk-subscription-plan__header"
      >

        <span
          className="fk-subscription-plan__rank"
        >
          Level {planRank}
        </span>


        <h3>
          {config.name}
        </h3>


        <p>
          {config.description}
        </p>

      </div>


      {/* ================================================================
          PRICE
      ================================================================ */}

      <div
        className="fk-subscription-plan__price"
      >

        <strong>

          {price === 0
            ? "Free"
            : formatPrice(
                price,
                currency,
              )}

        </strong>


        {price > 0 && (

          <span>

            /
            {billingInterval === "YEARLY"
              ? "year"
              : "month"}

          </span>

        )}

      </div>


      {/* ================================================================
          FEATURES
      ================================================================ */}

      <ul
        className="fk-subscription-plan__features"
      >

        {config.features.map(
          (
            feature,
            index,
          ) => (

            <li
              key={`${config.plan}-feature-${index}`}
              className={
                feature.included
                  ? "fk-subscription-feature--included"
                  : "fk-subscription-feature--excluded"
              }
            >

              <span
                className="fk-subscription-feature__icon"
                aria-hidden="true"
              >
                {feature.included
                  ? "✓"
                  : "×"}
              </span>


              <span
                className="fk-subscription-feature__content"
              >

                <span
                  className="fk-subscription-feature__name"
                >
                  {feature.name}
                </span>


                {feature.description && (

                  <span
                    className="fk-subscription-feature__description"
                  >
                    {feature.description}
                  </span>

                )}

              </span>

            </li>

          ),
        )}

      </ul>


      {/* ================================================================
          SELECT BUTTON
      ================================================================ */}

      <button
        type="button"
        className="fk-subscription-plan__button"
        disabled={
          isCurrent ||
          loading
        }
        onClick={() =>
          onSelect(
            config.plan,
          )
        }
      >

        {loading
          ? "Processing..."
          : buttonText}

      </button>

    </article>

  );
}