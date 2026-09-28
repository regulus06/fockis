import React from "react";

import {
  useNavigate,
} from "react-router-dom";

import useSubscription from "../hooks/useSubscription";

import "../styles/SubscriptionPage.scss";

/* ============================================================================
   PAGE
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
      // handled by hook
    }
  };

  /* --------------------------------------------------------------------------
     RESUME
  -------------------------------------------------------------------------- */

  const handleResume = async () => {
    try {
      await resume();
    } catch {
      // handled by hook
    }
  };

  /* --------------------------------------------------------------------------
     RESET
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
      // handled by hook
    }
  };

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <div className="fk-subscription-page">

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
          onClick={() =>
            navigate(
              "/subscriptions/plans",
            )
          }
          className="fk-primary-button"
        >
          View Plans
        </button>

      </header>

      {error && (
        <div className="fk-subscription-error">
          {error}
        </div>
      )}

      {/* CURRENT PLAN */}

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

          <div className="fk-detail">
            <span>
              Billing
            </span>

            <strong>
              {subscription?.billingInterval ??
                "FREE"}
            </strong>
          </div>

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

          <div className="fk-detail">
            <span>
              Currency
            </span>

            <strong>
              {subscription?.currency ??
                "USD"}
            </strong>
          </div>

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

      {/* BILLING PERIOD */}

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

      {/* ACTIONS */}

      <section className="fk-subscription-section">

        <h2>
          Manage Account
        </h2>

        <div className="fk-subscription-actions">

          {!isBasic && !isCanceled && (
            <button
              type="button"
              className="fk-danger-button"
              disabled={actionLoading}
              onClick={handleCancel}
            >
              Cancel Subscription
            </button>
          )}

          {!isBasic && isCanceled && (
            <button
              type="button"
              className="fk-primary-button"
              disabled={actionLoading}
              onClick={handleResume}
            >
              Resume Subscription
            </button>
          )}

          {!isBasic && (
            <button
              type="button"
              className="fk-secondary-button"
              disabled={actionLoading}
              onClick={handleReset}
            >
              Return to BASIC
            </button>
          )}

          <button
            type="button"
            className="fk-secondary-button"
            onClick={() =>
              navigate(
                "/subscriptions/plans",
              )
            }
          >
            Compare Plans
          </button>

        </div>

      </section>

      {/* FEATURES */}

      <section className="fk-subscription-section">

        <h2>
          Fockis Account Levels
        </h2>

        <div className="fk-level-list">

          <div>
            <strong>
              BASIC
            </strong>

            <span>
              Free account
            </span>
          </div>

          <div>
            <strong>
              BRONZE
            </strong>

            <span>
              Enhanced account
            </span>
          </div>

          <div>
            <strong>
              SILVER
            </strong>

            <span>
              Advanced account
            </span>
          </div>

          <div>
            <strong>
              GOLDEN
            </strong>

            <span>
              Premium account
            </span>
          </div>

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