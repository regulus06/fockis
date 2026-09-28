import {
  Route,
} from "react-router-dom";

import SubscriptionPage
  from "../features/subscriptions/pages/SubscriptionPage";

import SubscriptionPlansPage
  from "../features/subscriptions/pages/SubscriptionPlansPage";

import SubscriptionBillingPage
  from "../features/subscriptions/pages/SubscriptionBillingPage";

import SubscriptionSuccessPage
  from "../features/subscriptions/pages/SubscriptionSuccessPage";

import SubscriptionCancelPage
  from "../features/subscriptions/pages/SubscriptionCancelPage";

import SubscriptionPlanManagementPage
  from "../features/subscriptions/pages/SubscriptionPlanManagementPage";

import "../features/subscriptions/styles/SubscriptionPlans.scss";

/* ============================================================================
   FOCKIS SUBSCRIPTION ROUTES
============================================================================ */

export function SubscriptionRoutes() {
  return (
    <>
      {/* ================================================================
          CURRENT SUBSCRIPTION
          /subscriptions
      ================================================================= */}

      <Route
        path="/subscriptions"
        element={
          <SubscriptionPage />
        }
      />


      {/* ================================================================
          SUBSCRIPTION PLANS
          /subscriptions/plans
      ================================================================= */}

      <Route
        path="/subscriptions/plans"
        element={
          <SubscriptionPlansPage />
        }
      />


      {/* ================================================================
          BILLING
          /subscriptions/billing
      ================================================================= */}

      <Route
        path="/subscriptions/billing"
        element={
          <SubscriptionBillingPage />
        }
      />


      {/* ================================================================
          SUCCESS
          /subscriptions/success
      ================================================================= */}

      <Route
        path="/subscriptions/success"
        element={
          <SubscriptionSuccessPage />
        }
      />


      {/* ================================================================
          CANCEL
          /subscriptions/cancel
      ================================================================= */}

      <Route
        path="/subscriptions/cancel"
        element={
          <SubscriptionCancelPage />
        }
      />


      {/* ================================================================
          ADMIN PLAN MANAGEMENT
          /admin/subscription-plans
      ================================================================= */}

      <Route
        path="/admin/subscription-plans"
        element={
          <SubscriptionPlanManagementPage />
        }
      />
    </>
  );
}