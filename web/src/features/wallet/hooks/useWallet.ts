import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getWallet,
  type Wallet,
} from "../services/walletApi";

/* ============================================================================
TYPES
============================================================================ */

interface UseWalletOptions {
  autoRefresh?: boolean;
}

/* ============================================================================
HOOK
============================================================================ */

export function useWallet(
  options: UseWalletOptions = {},
) {
  const {
    autoRefresh = true,
  } = options;

  const [
    wallet,
    setWallet,
  ] = useState<Wallet | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  /* ==========================================================================
  LOAD WALLET
  ========================================================================== */

  const refresh =
    useCallback(
      async () => {
        try {
          setError(null);

          const result =
            await getWallet();

          setWallet(
            result,
          );

          return result;
        } catch (err: any) {
          console.error(
            "[useWallet] Failed to load wallet:",
            err,
          );

          setError(
            err?.response?.data
              ?.message ??
              err?.message ??
              "Failed to load wallet.",
          );

          return null;
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  /* ==========================================================================
  INITIAL LOAD
  ========================================================================== */

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    void refresh();
  }, [
    autoRefresh,
    refresh,
  ]);

  /* ==========================================================================
  DERIVED BALANCE
  ========================================================================== */

  const coins =
    Number(
      wallet?.coins ?? 0,
    );

  return {
    wallet,

    coins,

    loading,

    error,

    refresh,

    hasCoins:
      coins > 0,
  };
}