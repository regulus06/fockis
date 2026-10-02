/* ============================================================================
   FOCKIS SUBSCRIPTION BILLING PAGE
============================================================================ */

import {
  useNavigate,
} from "react-router-dom";

import useSubscription
  from "../hooks/useSubscription";

import type {
  SubscriptionPlan,
} from "../types/subscriptionTypes";

import "../styles/SubscriptionPage.scss";


/* ============================================================================
   PLAN LABEL
============================================================================ */

function getPlanName(
  plan: SubscriptionPlan,
): string {

  switch (plan) {

    case "BASIC":
      return "Basic";

    case "BRONZE":
      return "Bronze";

    case "SILVER":
      return "Silver";

    case "GOLDEN":
      return "Golden";

    case "DIAMOND":
      return "Diamond";

    default:
      return plan;
  }
}


/* ============================================================================
   CURRENCY
============================================================================ */

function formatCurrency(
  amount: number,
  currency = "USD",
): string {

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}


/* ============================================================================
   DATE
============================================================================ */

function formatDate(
  value?: string,
): string {

  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
}


/* ============================================================================
   STATUS
============================================================================ */

function getStatusLabel(
  status?: string,
): string {

  switch (status) {

    case "ACTIVE":
      return "Active";

    case "TRIALING":
      return "Trial";

    case "PAST_DUE":
      return "Payment required";

    case "CANCELED":
      return "Canceled";

    case "EXPIRED":
      return "Expired";

    default:
      return status ?? "Unknown";
  }
}


/* ============================================================================
   PAGE
============================================================================ */

export default function SubscriptionBillingPage() {

  const navigate =
    useNavigate();


  const {
    subscription,
    loading,
    refresh,
  } =
    useSubscription();


  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {

    return (
      <main className="fk-subscription-page">

        <section className="fk-subscription-result">

          <div className="fk-subscription-loading">
            Loading billing information...
          </div>

        </section>

      </main>
    );
  }


  /* ============================================================
     NO SUBSCRIPTION
  ============================================================ */

  if (!subscription) {

    return (
      <main className="fk-subscription-page">

        <section className="fk-subscription-result">

          <div className="fk-subscription-result__icon">
            $
          </div>

          <span className="fk-subscription-eyebrow">
            SUBSCRIPTION BILLING
          </span>

          <h1>
            No active subscription
          </h1>

          <p>
            You are currently using the
            Basic Fockis account level.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/subscriptions/plans",
              )
            }
          >
            View plans
          </button>

        </section>

      </main>
    );
  }


  /* ============================================================
     DATA
  ============================================================ */

  const planName =
    getPlanName(
      subscription.plan,
    );

  const status =
    getStatusLabel(
      subscription.status,
    );

  const currency =
    subscription.currency ??
    "USD";

  const price =
    subscription.price ?? 0;


  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <main className="fk-subscription-page">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <section className="fk-subscription-result">

        <span className="fk-subscription-eyebrow">
          FOCKIS BILLING
        </span>

        <h1>
          Subscription billing
        </h1>

        <p>
          Manage your Fockis account level
          and subscription information.
        </p>

      </section>


      {/* ========================================================
          BILLING CARD
      ======================================================== */}

      <section className="fk-subscription-billing-card">

        <div className="fk-subscription-billing-card__header">

          <div>

            <span className="fk-subscription-eyebrow">
              CURRENT PLAN
            </span>

            <h2>
              {planName}
            </h2>

          </div>

          <span
            className={[
              "fk-subscription-status",
              `fk-subscription-status--${subscription.status.toLowerCase()}`,
            ].join(" ")}
          >
            {status}
          </span>

        </div>


        {/* ======================================================
            PRICE
        ====================================================== */}

        <div className="fk-subscription-billing-card__price">

          <strong>
            {formatCurrency(
              price,
              currency,
            )}
          </strong>

          {price > 0 && (
            <span>
              /
              {subscription.billingInterval ===
              "YEARLY"
                ? "year"
                : "month"}
            </span>
          )}

        </div>


        {/* ======================================================
            DETAILS
        ====================================================== */}

        <div className="fk-subscription-billing-details">

          <div>
            <span>
              Billing interval
            </span>

            <strong>
              {subscription.billingInterval
                ? subscription.billingInterval ===
                  "YEARLY"
                  ? "Yearly"
                  : "Monthly"
                : "—"}
            </strong>
          </div>


          <div>
            <span>
              Current period
            </span>

            <strong>
              {formatDate(
                subscription.currentPeriodStart,
              )}
            </strong>
          </div>


          <div>
            <span>
              Renewal date
            </span>

            <strong>
              {formatDate(
                subscription.currentPeriodEnd,
              )}
            </strong>
          </div>


          <div>
            <span>
              Subscription status
            </span>

            <strong>
              {status}
            </strong>
          </div>

        </div>


        {/* ======================================================
            CANCELLATION NOTICE
        ====================================================== */}

        {subscription.cancelAtPeriodEnd && (

          <div className="fk-subscription-billing-warning">

            <strong>
              Subscription scheduled to cancel
            </strong>

            <p>
              Your subscription will remain
              active until the end of the
              current billing period.
            </p>

          </div>

        )}


        {/* ======================================================
            ACTIONS
        ====================================================== */}

        <div className="fk-subscription-billing-actions">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/subscriptions/plans",
              )
            }
          >
            Change plan
          </button>


          <button
            type="button"
            className="fk-subscription-button-secondary"
            onClick={() =>
              navigate(
                "/subscriptions",
              )
            }
          >
            {subscription.cancelAtPeriodEnd
              ? "Manage subscription"
              : "Subscription settings"}
          </button>

        </div>

      </section>


      {/* ========================================================
          PAYMENT INFORMATION
      ======================================================== */}

      <section className="fk-subscription-billing-card">

        <div className="fk-subscription-billing-card__header">

          <div>

            <span className="fk-subscription-eyebrow">
              PAYMENT INFORMATION
            </span>

            <h2>
              Billing account
            </h2>

          </div>

        </div>


        <div className="fk-subscription-billing-details">

          <div>
            <span>
              Currency
            </span>

            <strong>
              {currency}
            </strong>
          </div>


          <div>
            <span>
              Stripe customer
            </span>

            <strong>
              {subscription.stripeCustomerId
                ? "Connected"
                : "Not available"}
            </strong>
          </div>


          <div>
            <span>
              Payment status
            </span>

            <strong>
              {subscription.status ===
              "PAST_DUE"
                ? "Payment required"
                : "Up to date"}
            </strong>
          </div>

        </div>

      </section>


      {/* ========================================================
          REFRESH
      ======================================================== */}

      <div className="fk-subscription-billing-refresh">

        <button
          type="button"
          className="fk-subscription-button-secondary"
          onClick={() => {
            void refresh();
          }}
        >
          Refresh billing information
        </button>

      </div>

    </main>
  );
}