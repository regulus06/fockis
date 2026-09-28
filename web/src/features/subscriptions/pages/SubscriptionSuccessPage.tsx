/* ============================================================================
   FOCKIS SUBSCRIPTION SUCCESS PAGE
============================================================================ */

import React, {
  useEffect,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import useSubscription from "../hooks/useSubscription";

import "../styles/SubscriptionPage.scss";


/* ============================================================================
   SUBSCRIPTION SUCCESS PAGE
============================================================================ */

export default function SubscriptionSuccessPage() {

  const navigate =
    useNavigate();


  /* ============================================================
     SUBSCRIPTION HOOK
  ============================================================ */

  const {
    subscription,
    loading,
    refresh,
  } =
    useSubscription();


  /* ============================================================
     REFRESH SUBSCRIPTION
  ============================================================ */

  useEffect(() => {
    void refresh();
  }, [refresh]);


  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <main
        className="fk-subscription-page"
      >
        <div
          className="fk-subscription-loading"
        >
          Confirming your subscription...
        </div>
      </main>
    );
  }


  /* ============================================================
     PLAN NAME
  ============================================================ */

  const planName =
    subscription
      ? formatPlanName(
          subscription.plan,
        )
      : null;


  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <main
      className="fk-subscription-page"
    >

      <section
        className="fk-subscription-result"
      >

        {/* ========================================================
            SUCCESS ICON
        ======================================================== */}

        <div
          className="fk-subscription-result__icon"
          aria-hidden="true"
        >
          ✓
        </div>


        {/* ========================================================
            EYEBROW
        ======================================================== */}

        <span
          className="fk-subscription-eyebrow"
        >
          PAYMENT COMPLETE
        </span>


        {/* ========================================================
            TITLE
        ======================================================== */}

        <h1>
          Welcome to your new
          Fockis account level
        </h1>


        {/* ========================================================
            SUBSCRIPTION
        ======================================================== */}

        {subscription && (
          <div
            className="fk-subscription-success-details"
          >

            <p>
              Your current account is{" "}
              <strong>
                {planName}
              </strong>
            </p>


            <p>
              Status:{" "}
              <strong>
                {formatStatus(
                  subscription.status,
                )}
              </strong>
            </p>


            {subscription.billingInterval && (
              <p>
                Billing:{" "}
                <strong>
                  {formatBillingInterval(
                    subscription.billingInterval,
                  )}
                </strong>
              </p>
            )}

          </div>
        )}


        {/* ========================================================
            PAYMENT COMPLETED BUT SUBSCRIPTION
            HAS NOT SYNCHRONIZED YET
        ======================================================== */}

        {!subscription && (
          <p>
            Your payment was completed.
            Your subscription information
            is being synchronized.
          </p>
        )}


        {/* ========================================================
            VIEW SUBSCRIPTION
        ======================================================== */}

        <button
          type="button"
          onClick={() =>
            navigate(
              "/subscriptions",
            )
          }
        >
          View subscription
        </button>


        {/* ========================================================
            RETURN TO FOCKIS
        ======================================================== */}

        <button
          type="button"
          className="fk-subscription-secondary-button"
          onClick={() =>
            navigate(
              "/fockis-preview",
            )
          }
        >
          Return to Fockis
        </button>

      </section>

    </main>
  );
}


/* ============================================================================
   FORMAT PLAN NAME
============================================================================ */

function formatPlanName(
  plan: string,
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
   FORMAT STATUS
============================================================================ */

function formatStatus(
  status: string,
): string {

  switch (status) {

    case "ACTIVE":
      return "Active";

    case "TRIALING":
      return "Trialing";

    case "PAST_DUE":
      return "Payment past due";

    case "CANCELED":
      return "Canceled";

    case "EXPIRED":
      return "Expired";

    default:
      return status;
  }
}


/* ============================================================================
   FORMAT BILLING INTERVAL
============================================================================ */

function formatBillingInterval(
  interval: string,
): string {

  switch (interval) {

    case "MONTHLY":
      return "Monthly";

    case "YEARLY":
      return "Yearly";

    default:
      return interval;
  }
}
