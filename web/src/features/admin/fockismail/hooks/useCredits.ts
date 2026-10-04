import { useEffect } from "react";
import { creditsApi } from "../services/creditsApi";
import { subscribeNotifications } from "../services/notificationsApi";
import { useAsync } from "./useAsync";
import { creditThresholds } from "../data/billingMockData";

/** Credit balance for one business. Reloads after purchases/plan changes. */
export function useCredits(businessId: string | undefined) {
  const balance = useAsync(
    () => (businessId ? creditsApi.getBalance(businessId) : Promise.reject(new Error("No workspace selected."))),
    [businessId],
  );
  const { reload } = balance;
  useEffect(() => subscribeNotifications(reload), [reload]);
  // Thresholds are static config in mock mode; the backend can supply them later.
  return { ...balance, thresholds: creditThresholds };
}
