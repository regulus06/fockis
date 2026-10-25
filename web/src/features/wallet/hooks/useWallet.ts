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
SHARED WALLET CACHE
============================================================================ */

const WALLET_CACHE_TTL = 5_000;

let cachedWallet: Wallet | null = null;
let cachedAt = 0;
let walletRequest: Promise<Wallet> | null = null;

/**
 * Clears the shared wallet cache.
 *
 * Call this after a transaction changes the wallet balance.
 */
export function invalidateWalletCache(): void {
  cachedWallet = null;
  cachedAt = 0;
}

/**
 * Loads the wallet while sharing concurrent requests between components.
 */
async function loadWallet(
  force = false,
): Promise<Wallet> {
  const now = Date.now();

  if (
    !force &&
    cachedWallet !== null &&
    now - cachedAt < WALLET_CACHE_TTL
  ) {
    return cachedWallet;
  }

  // Reuse an existing request instead of sending duplicate API calls.
  if (walletRequest !== null) {
    return walletRequest;
  }

  const request = getWallet()
    .then((result) => {
      cachedWallet = result;
      cachedAt = Date.now();

      return result;
    })
    .finally(() => {
      if (walletRequest === request) {
        walletRequest = null;
      }
    });

  walletRequest = request;

  return request;
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

  const [wallet, setWallet] =
    useState<Wallet | null>(null);

  const [loading, setLoading] =
    useState<boolean>(autoRefresh);

  const [error, setError] =
    useState<string | null>(null);

  /* ==========================================================================
  LOAD WALLET
  ========================================================================== */

  const refresh = useCallback(
    async (force = false): Promise<Wallet | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await loadWallet(force);

        setWallet(result);

        return result;
      } catch (err: unknown) {
        console.error(
          "[useWallet] Failed to load wallet:",
          err,
        );

        const message =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof err.response === "object" &&
          err.response !== null &&
          "data" in err.response &&
          typeof err.response.data === "object" &&
          err.response.data !== null &&
          "message" in err.response.data
            ? String(err.response.data.message)
            : err instanceof Error
              ? err.message
              : "Failed to load wallet.";

        setError(message);

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
      setLoading(false);
      return;
    }

    void refresh();
  }, [autoRefresh, refresh]);

  /* ==========================================================================
  DERIVED BALANCE
  ========================================================================== */

  const coins = Number(wallet?.coins ?? 0);

  return {
    wallet,
    coins,
    loading,
    error,
    refresh,
    hasCoins: coins > 0,
  };
}