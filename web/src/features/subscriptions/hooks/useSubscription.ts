import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  Subscription,
  SubscriptionPlan,
  BillingInterval,
  ChangePlanPayload,
  CreateCheckoutPayload,
} from "../types/subscriptionTypes";

import {
  getCurrentSubscription,
  createCheckout,
  upgradeSubscription,
  cancelSubscription,
  resumeSubscription,
  resetToBasic,
} from "../services/subscriptionApi";

/* ============================================================================
   FOCKIS SUBSCRIPTION HOOK
============================================================================ */

export default function useSubscription() {
  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* --------------------------------------------------------------------------
     LOAD CURRENT SUBSCRIPTION
  -------------------------------------------------------------------------- */

  const loadSubscription =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const data =
          await getCurrentSubscription();

        setSubscription(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load subscription.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  /* --------------------------------------------------------------------------
     CREATE CHECKOUT
     
     Used when a BASIC/free user wants to subscribe to a paid plan.
     
     Flow:
     
     BASIC
       ↓
     Select paid plan
       ↓
     Stripe Checkout
       ↓
     Payment
       ↓
     Subscription activated
  -------------------------------------------------------------------------- */

  const checkout = useCallback(
    async (
      plan: Exclude<
        SubscriptionPlan,
        "BASIC"
      >,
      billingInterval: BillingInterval,
    ) => {
      try {
        setActionLoading(true);
        setError(null);

        const payload: CreateCheckoutPayload = {
          plan,
          billingInterval,
        };

        const result =
          await createCheckout(
            payload,
          );

        /* ------------------------------------------------------
           STRIPE CHECKOUT URL
        ------------------------------------------------------ */

        if (result.checkoutUrl) {
          window.location.href =
            result.checkoutUrl;

          return result;
        }

        /* ------------------------------------------------------
           SESSION ID
           
           Keep this available if the backend later
           uses Stripe Elements instead of redirecting.
        ------------------------------------------------------ */

        if (result.sessionId) {
          return result;
        }

        throw new Error(
          "Stripe checkout URL was not returned.",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to start subscription checkout.";

        setError(message);

        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  /* --------------------------------------------------------------------------
     UPGRADE / CHANGE PLAN
  -------------------------------------------------------------------------- */

  const upgrade = useCallback(
    async (
      plan: SubscriptionPlan,
      billingInterval: BillingInterval,
    ) => {
      try {
        setActionLoading(true);
        setError(null);

        const payload: ChangePlanPayload = {
          plan,
          billingInterval,
        };

        const data =
          await upgradeSubscription(
            payload,
          );

        setSubscription(data);

        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to upgrade subscription.";

        setError(message);

        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  /* --------------------------------------------------------------------------
     CANCEL SUBSCRIPTION
  -------------------------------------------------------------------------- */

  const cancel = useCallback(
    async () => {
      try {
        setActionLoading(true);
        setError(null);

        const data =
          await cancelSubscription();

        setSubscription(data);

        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to cancel subscription.";

        setError(message);

        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  /* --------------------------------------------------------------------------
     RESUME SUBSCRIPTION
  -------------------------------------------------------------------------- */

  const resume = useCallback(
    async () => {
      try {
        setActionLoading(true);
        setError(null);

        const data =
          await resumeSubscription();

        setSubscription(data);

        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to resume subscription.";

        setError(message);

        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  /* --------------------------------------------------------------------------
     RESET TO BASIC
  -------------------------------------------------------------------------- */

  const resetBasic =
    useCallback(async () => {
      try {
        setActionLoading(true);
        setError(null);

        const data =
          await resetToBasic();

        setSubscription(data);

        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to return to BASIC.";

        setError(message);

        throw err;
      } finally {
        setActionLoading(false);
      }
    }, []);

  /* --------------------------------------------------------------------------
     REFRESH
  -------------------------------------------------------------------------- */

  const refresh =
    useCallback(async () => {
      await loadSubscription();
    }, [loadSubscription]);

  /* --------------------------------------------------------------------------
     RETURN
  -------------------------------------------------------------------------- */

  return {
    /* Current subscription */

    subscription,

    /* Current plan */

    plan:
      subscription?.plan ??
      "BASIC",

    /* Current status */

    status:
      subscription?.status ??
      "ACTIVE",

    /* Loading */

    loading,

    actionLoading,

    /* Error */

    error,

    /* Actions */

    checkout,

    upgrade,

    cancel,

    resume,

    resetBasic,

    refresh,
  };
}