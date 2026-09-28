import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  AdminSubscriptionPlan,
} from "../types/subscriptionPlanAdminTypes";

import {
  getAdminSubscriptionPlans,
} from "../services/subscriptionPlanAdminApi";

import SubscriptionPlanAdminCard from "../components/SubscriptionPlanAdminCard";

import "../styles/SubscriptionPage.scss";

/* ============================================================================
   PAGE
============================================================================ */

export default function SubscriptionPlanManagementPage() {
  const [plans, setPlans] =
    useState<AdminSubscriptionPlan[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* --------------------------------------------------------------------------
     LOAD
  -------------------------------------------------------------------------- */

  const loadPlans =
    useCallback(async () => {
      try {
        setLoading(true);

        setError(null);

        const data =
          await getAdminSubscriptionPlans();

        setPlans(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load subscription plans.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /* --------------------------------------------------------------------------
     INITIAL LOAD
  -------------------------------------------------------------------------- */

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  /* --------------------------------------------------------------------------
     UPDATE LOCAL PLAN
  -------------------------------------------------------------------------- */

  function handleUpdated(
    updated: AdminSubscriptionPlan,
  ) {
    setPlans((current) =>
      current.map((plan) =>
        plan.plan === updated.plan
          ? updated
          : plan,
      ),
    );
  }

  /* --------------------------------------------------------------------------
     LOADING
  -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <main className="fk-subscription-admin-page">

        <div className="fk-subscription-admin-loading">
          Loading subscription plans...
        </div>

      </main>
    );
  }

  /* --------------------------------------------------------------------------
     ERROR
  -------------------------------------------------------------------------- */

  if (error) {
    return (
      <main className="fk-subscription-admin-page">

        <div className="fk-subscription-admin-page__header">

          <div>
            <span>
              FOCKIS ADMIN
            </span>

            <h1>
              Subscription Plans
            </h1>
          </div>

        </div>

        <div className="fk-subscription-admin-error">
          {error}
        </div>

        <button
          type="button"
          className="fk-subscription-admin-save"
          onClick={loadPlans}
        >
          Try Again
        </button>

      </main>
    );
  }

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <main className="fk-subscription-admin-page">

      <header className="fk-subscription-admin-page__header">

        <div>

          <span className="fk-subscription-admin-eyebrow">
            FOCKIS ADMIN
          </span>

          <h1>
            Subscription Plans
          </h1>

          <p>
            Manage your Fockis account plans,
            pricing, descriptions, and availability.
          </p>

        </div>

        <button
          type="button"
          className="fk-subscription-admin-refresh"
          onClick={loadPlans}
        >
          Refresh
        </button>

      </header>

      <section className="fk-subscription-admin-warning">

        <strong>
          Pricing Management
        </strong>

        <span>
          Changes made here are stored in the
          Fockis subscription plan configuration.
        </span>

      </section>

      <section className="fk-subscription-admin-grid">

        {plans.map((plan) => (
          <SubscriptionPlanAdminCard
            key={plan.plan}
            plan={plan}
            onUpdated={handleUpdated}
          />
        ))}

      </section>

    </main>
  );
}