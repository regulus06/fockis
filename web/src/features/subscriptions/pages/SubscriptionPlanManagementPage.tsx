import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

import type { AdminSubscriptionPlan } from "../types/subscriptionPlanAdminTypes";
import { getAdminSubscriptionPlans } from "../services/subscriptionPlanAdminApi";
import { getPlanRank } from "../utils/subscriptionPlanUtils";

import SubscriptionPlanAdminCard from "../components/SubscriptionPlanAdminCard";

import "../styles/SubscriptionPlanManagementPage.scss";

/* ============================================================================
   ADMIN — SUBSCRIPTION PLAN MANAGEMENT

   Data: GET /admin/subscription-plans (admin-only on the backend).
   A non-admin who opens this route gets the backend's 401/403 message
   and no editable data.
============================================================================ */

export default function SubscriptionPlanManagementPage() {
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminSubscriptionPlans();
      const list = Array.isArray(data) ? data : [];
      setPlans(
        [...list].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || getPlanRank(a.plan) - getPlanRank(b.plan),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load subscription plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  function handleUpdated(updated: AdminSubscriptionPlan) {
    setPlans((current) => current.map((item) => (item.plan === updated.plan ? updated : item)));
  }

  const activeCount = plans.filter((item) => item.active).length;

  return (
    <main className="fk-sub-page fk-sub-admin-page">
      <header className="fk-sub-page-header">
        <div>
          <span className="fk-sub-eyebrow">Fockis Admin · Subscriptions</span>
          <h1>Subscription plans</h1>
          <p>Account-level membership plans: names, prices, features, Stripe prices and availability.</p>
        </div>
        <button
          type="button"
          className="fk-sub-btn fk-sub-btn--secondary"
          disabled={loading}
          onClick={() => void loadPlans()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <div className="fk-sub-alert fk-sub-alert--info">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>Changes go live immediately.</strong> Saved prices and features are what customers see and what
          checkout charges. Keep each Stripe Price ID in sync with the price shown here.
        </div>
      </div>

      {loading && (
        <div className="fk-sub-state" role="status" aria-live="polite">
          <span className="fk-sub-spinner fk-sub-spinner--lg" aria-hidden="true" />
          <p>Loading subscription plans…</p>
        </div>
      )}

      {!loading && error && (
        <div className="fk-sub-state fk-sub-state--error" role="alert">
          <h2>Unable to load plans</h2>
          <p>{error}</p>
          <button type="button" className="fk-sub-btn fk-sub-btn--primary" onClick={() => void loadPlans()}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="fk-sub-admin-summary">
            {plans.length} plans · {activeCount} active · scope: Fockis account
          </p>
          <section className="fk-sub-admin-grid" aria-label="Editable subscription plans">
            {plans.map((plan) => (
              <SubscriptionPlanAdminCard key={plan.plan} plan={plan} onUpdated={handleUpdated} />
            ))}
          </section>
        </>
      )}
    </main>
  );
}
