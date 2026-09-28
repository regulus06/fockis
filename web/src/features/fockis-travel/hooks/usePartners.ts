import {
  useCallback,
  useState,
} from 'react';

import {
  partnersApi,
} from '../services/partnersApi';

/**
 * ============================================================================
 * FOCKIS TRAVEL — USE PARTNERS
 * ============================================================================
 *
 * This hook intentionally delegates the partner contract to partnersApi.
 *
 * Once partnersApi is finalized, its exact operations can be exposed here
 * without duplicating backend logic inside components.
 * ============================================================================
 */

export function usePartners() {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Execute a partner API operation while maintaining common loading/error
   * state.
   *
   * This keeps the hook useful without assuming undocumented partner methods.
   */
  const execute = useCallback(
    async <T>(
      operation: () => Promise<T>,
    ): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        return await operation();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Partner request failed.';

        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    partnersApi,
    loading,
    error,
    clearError,
    execute,
  };
}

export default usePartners;