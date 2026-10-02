import React from "react";

import {
  useNavigate,
} from "react-router-dom";

import useSubscription from "../hooks/useSubscription";

import "../styles/SubscriptionPage.scss";

/* ============================================================================
   FOCKIS SUBSCRIPTION PAGE
============================================================================ */

export default function SubscriptionPage() {
  const navigate = useNavigate();

  const {
    subscription,

    plan,

    status,

    loading,

    actionLoading,

    error,

    cancel,

    resume,

    resetBasic,
  } = useSubscription();

  /* --------------------------------------------------------------------------
     LOADING
  -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="fk-subscription-loading">
        Loading your subscription...
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     DATA
  -------------------------------------------------------------------------- */

  const isBasic =
    plan === "BASIC";

  const isCanceled =
    subscription?.cancelAtPeriodEnd ===
    true;

  const isPaid =
    !isBasic;

  /* --------------------------------------------------------------------------
     GO TO PLANS
  -------------------------------------------------------------------------- */

  const handleViewPlans = () => {
    navigate(
      "/subscriptions/plans",
    );
  };

  /* --------------------------------------------------------------------------
     CANCEL
  -------------------------------------------------------------------------- */

  const handleCancel = async () => {
    const confirmed =
      window.confirm(
        "Cancel this subscription at the end of the current billing period?",
      );

    if (!confirmed) {
      return;
    }

    try {
      await cancel();
    } catch {
      // Error handled by hook.
    }
  };

  /* --------------------------------------------------------------------------
     RESUME
  -------------------------------------------------------------------------- */

  const handleResume = async () => {
    try {
      await resume();
    } catch {
      // Error handled by hook.
    }
  };

  /* --------------------------------------------------------------------------
     RESET TO BASIC
  -------------------------------------------------------------------------- */

  const handleReset = async () => {
    const confirmed =
      window.confirm(
        "Return this account to the free BASIC plan?",
      );

    if (!confirmed) {
      return;
    }

    try {
      await resetBasic();
    } catch {
      // Error handled by hook.
    }
  };

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <div className="fk-subscription-page">

      {/* ======================================================================
          HEADER
      ====================================================================== */}

      <header className="fk-account-header">

        <div>

          <span className="fk-subscriptions-eyebrow">
            FOCKIS ACCOUNT
          </span>

          <h1>
            My Subscription
          </h1>

          <p>
            Manage your Fockis account level
            and billing settings.
          </p>

        </div>

        <button
          type="button"
          onClick={handleViewPlans}
          className="fk-primary-button"
        >
          {isBasic
            ? "Subscribe Now"
            : "View Plans"}
        </button>

      </header>

      {/* ======================================================================
          ERROR
      ====================================================================== */}

      {error && (
        <div className="fk-subscription-error">
          {error}
        </div>
      )}

      {/* ======================================================================
          BASIC USER CALL TO ACTION
      ====================================================================== */}

      {isBasic && (
        <section className="fk-subscription-section">

          <div className="fk-subscribe-card">

            <div>

              <span className="fk-subscriptions-eyebrow">
                UPGRADE YOUR FOCKIS ACCOUNT
              </span>

              <h2>
                Get more from Fockis
              </h2>

              <p>
                Upgrade from BASIC to BRONZE,
                SILVER, GOLDEN, or DIAMOND.
                Choose monthly or yearly billing
                and complete your payment securely
                through Stripe.
              </p>

            </div>

            <button
              type="button"
              className="fk-primary-button"
              onClick={handleViewPlans}
            >
              View Subscription Plans
            </button>

          </div>

        </section>
      )}

      {/* ======================================================================
          CURRENT PLAN
      ====================================================================== */}

      <section className="fk-current-subscription">

        <div className="fk-current-plan-card">

          <div className="fk-current-plan-label">
            CURRENT ACCOUNT
          </div>

          <div className="fk-current-plan-name">
            {plan}
          </div>

          <div
            className={`fk-status fk-status-${status.toLowerCase()}`}
          >
            {status}
          </div>

          <p>
            {isBasic
              ? "You are using the free BASIC account."
              : `You are currently using the ${plan} account.`}
          </p>

        </div>

        <div className="fk-subscription-details">

          {/* BILLING */}

          <div className="fk-detail">

            <span>
              Billing
            </span>

            <strong>
              {subscription?.billingInterval ??
                "FREE"}
            </strong>

          </div>

          {/* PRICE */}

          <div className="fk-detail">

            <span>
              Price
            </span>

            <strong>
              $
              {Number(
                subscription?.price ?? 0,
              ).toFixed(2)}
            </strong>

          </div>

          {/* CURRENCY */}

          <div className="fk-detail">

            <span>
              Currency
            </span>

            <strong>
              {subscription?.currency ??
                "USD"}
            </strong>

          </div>

          {/* STATUS */}

          <div className="fk-detail">

            <span>
              Status
            </span>

            <strong>
              {status}
            </strong>

          </div>

        </div>

      </section>

      {/* ======================================================================
          BILLING PERIOD
      ====================================================================== */}

      {subscription?.currentPeriodEnd && (
        <section className="fk-subscription-section">

          <h2>
            Billing Period
          </h2>

          <div className="fk-period-card">

            <div>

              <span>
                Current period ends
              </span>

              <strong>
                {new Date(
                  subscription.currentPeriodEnd,
                ).toLocaleDateString()}
              </strong>

            </div>

            {isCanceled && (
              <div className="fk-cancel-warning">
                Your subscription is scheduled
                to end at the period end.
              </div>
            )}

          </div>

        </section>
      )}

      {/* ======================================================================
          MANAGE ACCOUNT
      ====================================================================== */}

      <section className="fk-subscription-section">

        <h2>
          Manage Account
        </h2>

        <div className="fk-subscription-actions">

          {/* --------------------------------------------------------------
              BASIC USER
          -------------------------------------------------------------- */}

          {isBasic && (
            <button
              type="button"
              className="fk-primary-button"
              onClick={handleViewPlans}
            >
              Subscribe to a Paid Plan
            </button>
          )}

          {/* --------------------------------------------------------------
              CANCEL
          -------------------------------------------------------------- */}

          {isPaid && !isCanceled && (
            <button
              type="button"
              className="fk-danger-button"
              disabled={actionLoading}
              onClick={handleCancel}
            >
              {actionLoading
                ? "Processing..."
                : "Cancel Subscription"}
            </button>
          )}

          {/* --------------------------------------------------------------
              RESUME
          -------------------------------------------------------------- */}

          {isPaid && isCanceled && (
            <button
              type="button"
              className="fk-primary-button"
              disabled={actionLoading}
              onClick={handleResume}
            >
              {actionLoading
                ? "Processing..."
                : "Resume Subscription"}
            </button>
          )}

          {/* --------------------------------------------------------------
              RETURN TO BASIC
          -------------------------------------------------------------- */}

          {isPaid && (
            <button
              type="button"
              className="fk-secondary-button"
              disabled={actionLoading}
              onClick={handleReset}
            >
              {actionLoading
                ? "Processing..."
                : "Return to BASIC"}
            </button>
          )}

          {/* --------------------------------------------------------------
              COMPARE PLANS
          -------------------------------------------------------------- */}

          <button
            type="button"
            className="fk-secondary-button"
            onClick={handleViewPlans}
          >
            Compare Plans
          </button>

        </div>

      </section>

      {/* ======================================================================
          ACCOUNT LEVELS
      ====================================================================== */}

      <section className="fk-subscription-section">

        <h2>
          Fockis Account Levels
        </h2>

        <div className="fk-level-list">

          {/* BASIC */}

          <div>

            <strong>
              BASIC
            </strong>

            <span>
              Free account
            </span>

          </div>

          {/* BRONZE */}

          <div>

            <strong>
              BRONZE
            </strong>

            <span>
              Enhanced account
            </span>

          </div>

          {/* SILVER */}

          <div>

            <strong>
              SILVER
            </strong>

            <span>
              Advanced account
            </span>

          </div>

          {/* GOLDEN */}

          <div>

            <strong>
              GOLDEN
            </strong>

            <span>
              Premium account
            </span>

          </div>

          {/* DIAMOND */}

          <div>

            <strong>
              DIAMOND
            </strong>

            <span>
              Highest account level
            </span>

          </div>

        </div>

      </section>

    </div>
  );
}