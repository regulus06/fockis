import React, {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import useSubscription from "../hooks/useSubscription";

import {
  createCheckout,
} from "../services/subscriptionApi";

import type {
  BillingInterval,
  SubscriptionPlan,
} from "../types/subscriptionTypes";

/*
 * IMPORTANT:
 *
 * SubscriptionPlans is located in:
 *
 * ../components/SubscriptionPlans
 *
 * NOT:
 *
 * ./SubscriptionPlans
 */
import SubscriptionPlans from "../components/SubscriptionPlans";

import "../styles/SubscriptionPlans.scss";

/* ============================================================================
   FOCKIS SUBSCRIPTION PLANS PAGE
============================================================================ */

export default function SubscriptionPlansPage() {
  const navigate = useNavigate();

  const {
    plan,
    subscription,
    loading,
    actionLoading,
    error,
  } = useSubscription();

  const [
    checkoutLoading,
    setCheckoutLoading,
  ] = useState(false);

  const [
    checkoutError,
    setCheckoutError,
  ] = useState<string | null>(null);

  /* --------------------------------------------------------------------------
     CURRENT PLAN
  -------------------------------------------------------------------------- */

  const currentPlan: SubscriptionPlan =
    plan ?? "BASIC";

  /* --------------------------------------------------------------------------
     BILLING INTERVAL
  -------------------------------------------------------------------------- */

  const billingInterval: BillingInterval =
    subscription?.billingInterval ??
    "MONTHLY";

  /* --------------------------------------------------------------------------
     PROCESSING
  -------------------------------------------------------------------------- */

  const isProcessing =
    loading ||
    actionLoading ||
    checkoutLoading;

  /* --------------------------------------------------------------------------
     SELECT PLAN
  -------------------------------------------------------------------------- */

  const handleSelect = async (
    selectedPlan: SubscriptionPlan,
  ): Promise<void> => {

    /*
     * BASIC is free.
     * No Stripe checkout is necessary.
     */
    if (selectedPlan === "BASIC") {
      navigate("/subscriptions");
      return;
    }

    /*
     * Prevent duplicate checkout requests.
     */
    if (checkoutLoading) {
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      /*
       * Only paid plans can reach Stripe.
       */
      const paidPlan:
        | "BRONZE"
        | "SILVER"
        | "GOLDEN"
        | "DIAMOND" =
        selectedPlan as
          | "BRONZE"
          | "SILVER"
          | "GOLDEN"
          | "DIAMOND";

      /*
       * Backend receives only:
       *
       * {
       *   plan,
       *   billingInterval
       * }
       *
       * Backend determines the Stripe Price ID.
       */
      const result =
        await createCheckout({
          plan: paidPlan,
          billingInterval,
        });

      /*
       * Stripe Checkout URL.
       */
      if (result.checkoutUrl) {
        window.location.href =
          result.checkoutUrl;

        return;
      }

      /*
       * Some backend implementations may
       * return a subscription directly.
       */
      if (result.subscription) {
        navigate(
          "/subscriptions",
        );

        return;
      }

      throw new Error(
        result.message ??
          "Unable to create the subscription checkout session.",
      );

    } catch (err) {

      setCheckoutError(
        err instanceof Error
          ? err.message
          : "Unable to start subscription checkout.",
      );

    } finally {

      setCheckoutLoading(false);

    }
  };

  /* --------------------------------------------------------------------------
     LOADING
  -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="fk-subscription-loading">
        Loading subscription plans...
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <main className="fk-subscription-plans-page">

      {/* ======================================================================
          HEADER
      ====================================================================== */}

      <header
        className="fk-subscription-plans-page__header"
      >

        <span className="fk-subscriptions-eyebrow">
          FOCKIS ACCOUNT
        </span>

        <h1>
          Choose Your Fockis Account
        </h1>

        <p>
          Compare Fockis account levels and
          choose the plan that fits your needs.
        </p>

      </header>


      {/* ======================================================================
          CURRENT ACCOUNT
      ====================================================================== */}

      <div className="fk-subscription-current-summary">

        <span>
          Current account
        </span>

        <strong>
          {currentPlan}
        </strong>

      </div>


      {/* ======================================================================
          ERROR
      ====================================================================== */}

      {(error || checkoutError) && (
        <div
          className="fk-subscription-error"
          role="alert"
        >
          {checkoutError ?? error}
        </div>
      )}


      {/* ======================================================================
          CHECKOUT STATUS
      ====================================================================== */}

      {checkoutLoading && (
        <div
          className="fk-subscription-checkout-message"
          role="status"
        >
          Preparing your secure checkout...
        </div>
      )}


      {/* ======================================================================
          PLAN CARDS
      ====================================================================== */}

      <SubscriptionPlans
        currentPlan={currentPlan}
        billingInterval={billingInterval}
        loading={isProcessing}
        onSelect={handleSelect}
      />

    </main>
  );
}