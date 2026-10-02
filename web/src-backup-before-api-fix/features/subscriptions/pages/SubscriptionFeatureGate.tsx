/* ============================================================================
   FOCKIS SUBSCRIPTION FEATURE GATE
============================================================================ */

import React from "react";

import useSubscription from "../hooks/useSubscription";

import type {
  SubscriptionPlan,
} from "../types/subscriptionTypes";

import "../styles/SubscriptionFeatureGate.scss";


/* ============================================================================
   PROPS
============================================================================ */

interface Props {
  requiredPlan: SubscriptionPlan;

  children: React.ReactNode;

  fallback?: React.ReactNode;
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
   PLAN NAME
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
   SUBSCRIPTION FEATURE GATE
============================================================================ */

export default function SubscriptionFeatureGate({
  requiredPlan,
  children,
  fallback,
}: Props) {

  const {
    subscription,
    loading,
  } =
    useSubscription();


  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return null;
  }


  /* ============================================================
     CURRENT PLAN
     
     No subscription means BASIC.
  ============================================================ */

  const currentPlan: SubscriptionPlan =
    subscription?.plan ?? "BASIC";


  /* ============================================================
     ACCESS CHECK
  ============================================================ */

  const hasAccess =
    getRank(currentPlan) >=
    getRank(requiredPlan);


  /* ============================================================
     ACCESS GRANTED
  ============================================================ */

  if (hasAccess) {
    return (
      <>
        {children}
      </>
    );
  }


  /* ============================================================
     CUSTOM FALLBACK
  ============================================================ */

  if (fallback) {
    return (
      <>
        {fallback}
      </>
    );
  }


  /* ============================================================
     DEFAULT FALLBACK
  ============================================================ */

  return (
    <div
      className="fk-subscription-gate"
    >

      <div
        className="fk-subscription-gate__icon"
        aria-hidden="true"
      >
        🔒
      </div>


      <strong>
        Upgrade required
      </strong>


      <p>
        This feature requires the{" "}
        <strong>
          {getPlanName(
            requiredPlan,
          )}
        </strong>{" "}
        account level or higher.
      </p>

    </div>
  );
}