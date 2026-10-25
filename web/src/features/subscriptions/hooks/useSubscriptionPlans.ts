import { useCallback, useEffect, useState } from "react";

import { getSubscriptionPlans } from "../services/subscriptionApi";
import type { SubscriptionPlanConfig } from "../types/subscriptionTypes";
import { sortActivePlans } from "../utils/subscriptionPlanUtils";

/* ============================================================================
   FOCKIS SUBSCRIPTION PLANS HOOK

   Loads the published plans from GET /subscription-plans.
   No fallback prices: while loading, `plans` is empty; on failure,
   `error` is set. Only active plans are returned, in display order.
============================================================================ */

export default function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isMounted: () => boolean = () => true) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getSubscriptionPlans();
      if (!isMounted()) return;
      setPlans(sortActivePlans(Array.isArray(result) ? result : []));
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : "Unable to load subscription plans.");
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void load(() => mounted);
    return () => {
      mounted = false;
    };
  }, [load]);

  const reload = useCallback(() => load(), [load]);

  return { plans, loading, error, reload };
}
