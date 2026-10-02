import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  priceAlertsApi,
} from '../services/priceAlertsApi';

import type {
  CreatePriceAlertInput,
  PriceAlert,
} from '../types';

/**
 * ============================================================================
 * FOCKIS TRAVEL — USE PRICE ALERTS
 * ============================================================================
 */

export function usePriceAlerts(
  autoLoad = true,
) {
  const [alerts, setAlerts] =
    useState<PriceAlert[]>([]);

  const [loading, setLoading] =
    useState(autoLoad);

  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await priceAlertsApi.list();

        setAlerts(
          Array.isArray(result)
            ? result
            : [],
        );

        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load price alerts.';

        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createAlert = useCallback(
    async (
      data: CreatePriceAlertInput,
    ) => {
      setError(null);

      try {
        const alert =
          await priceAlertsApi.create(
            data,
          );

        setAlerts((current) => [
          alert,
          ...current,
        ]);

        return alert;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create price alert.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  const removeAlert = useCallback(
    async (id: string) => {
      setError(null);

      try {
        await priceAlertsApi.remove(id);

        setAlerts((current) =>
          current.filter(
            (alert) =>
              alert._id !== id &&
              alert.id !== id,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to delete price alert.';

        setError(message);
        throw err;
      }
    },
    [],
  );

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  return {
    alerts,
    loading,
    error,

    refresh,

    createAlert,
    removeAlert,
  };
}

export default usePriceAlerts;