import { api } from "../../../api/api";

/* ============================================================================
TYPES
============================================================================ */

export interface Wallet {
  _id: string;

  userId: string;

  coins: number;

  totalPurchased: number;

  totalSpent: number;

  totalReceived: number;

  createdAt?: string;

  updatedAt?: string;
}

/* ============================================================================
COIN PACKAGE
============================================================================ */

export interface CoinPackage {
  id: string;

  name: string;

  coins: number;

  price: number;

  currency: string;

  popular?: boolean;

  bonus?: number;
}

/* ============================================================================
WALLET RESPONSE
============================================================================ */

export interface WalletResponse {
  success?: boolean;

  message?: string;

  wallet?: Wallet;

  coins?: number;

  addedCoins?: number;

  receivedCoins?: number;

  spentCoins?: number;

  totalPurchased?: number;

  totalSpent?: number;

  totalReceived?: number;
}

/* ============================================================================
COIN PURCHASE RESPONSE
============================================================================ */

export interface CoinPurchaseResponse {
  success: boolean;

  clientSecret: string;

  paymentIntentId: string;

  package: CoinPackage;
}

/* ============================================================================
CONFIRM PURCHASE RESPONSE
============================================================================ */

export interface ConfirmCoinPurchaseResponse {
  success: boolean;

  message: string;

  alreadyProcessed?: boolean;

  package?: CoinPackage;

  addedCoins: number;

  balance: number;

  coins?: number;

  transaction?: CoinTransaction;
}

/* ============================================================================
COIN TRANSACTION
============================================================================ */

export type CoinTransactionType =
  | "PURCHASE"
  | "GIFT_SENT"
  | "GIFT_RECEIVED"
  | "REFUND"
  | "BONUS";

export interface CoinTransaction {
  _id: string;

  userId: string;

  coins: number;

  amount: number;

  currency?: string;

  type: CoinTransactionType;

  description: string;

  referenceId?: string;

  paymentIntentId?: string;

  packageId?: string;

  createdAt?: string;

  updatedAt?: string;
}

/* ============================================================================
TRANSACTIONS RESPONSE
============================================================================ */

export interface TransactionsResponse {
  success?: boolean;

  transactions?: CoinTransaction[];
}

/* ============================================================================
HELPER
============================================================================ */

function unwrap<T>(
  response: any,
): T {
  return (
    response?.data ??
    response
  ) as T;
}

/* ============================================================================
GET WALLET
============================================================================ */

export async function getWallet(): Promise<Wallet> {
  const response =
    await api.get(
      "/wallet",
    );

  const data =
    unwrap<WalletResponse>(
      response,
    );

  if (data.wallet) {
    return data.wallet;
  }

  return {
    _id: "",

    userId: "",

    coins:
      Number(
        data.coins ?? 0,
      ),

    totalPurchased:
      Number(
        data.totalPurchased ??
          0,
      ),

    totalSpent:
      Number(
        data.totalSpent ?? 0,
      ),

    totalReceived:
      Number(
        data.totalReceived ??
          0,
      ),
  };
}

/* ============================================================================
GET COIN BALANCE
============================================================================ */

export async function getCoinBalance(): Promise<number> {
  const response =
    await api.get(
      "/wallet/balance",
    );

  const data =
    unwrap<WalletResponse>(
      response,
    );

  return Number(
    data.coins ?? 0,
  );
}

/* ============================================================================
GET COIN PACKAGES
============================================================================ */

export async function getCoinPackages(): Promise<
  CoinPackage[]
> {
  const response =
    await api.get(
      "/wallet/coin-packages",
    );

  const data =
    unwrap<{
      success?: boolean;

      packages?: CoinPackage[];
    }>(response);

  return (
    data.packages ?? []
  );
}

/* ============================================================================
CREATE COIN PURCHASE
============================================================================ */

export async function createCoinPurchase(
  packageId: string,
): Promise<CoinPurchaseResponse> {
  if (!packageId) {
    throw new Error(
      "Coin package is required.",
    );
  }

  const response =
    await api.post(
      "/wallet/buy-coins",
      {
        packageId,
      },
    );

  return unwrap<CoinPurchaseResponse>(
    response,
  );
}

/* ============================================================================
CONFIRM COIN PURCHASE
============================================================================ */

export async function confirmCoinPurchase(
  paymentIntentId: string,
): Promise<ConfirmCoinPurchaseResponse> {
  if (!paymentIntentId) {
    throw new Error(
      "Stripe payment intent is required.",
    );
  }

  const response =
    await api.post(
      "/wallet/confirm-coin-purchase",
      {
        paymentIntentId,
      },
    );

  return unwrap<ConfirmCoinPurchaseResponse>(
    response,
  );
}

/* ============================================================================
LEGACY BUY COINS
============================================================================

Kept temporarily so older imports elsewhere in the project do not immediately
break.

New purchases should NOT use this function.

Use:

createCoinPurchase()
confirmCoinPurchase()

============================================================================ */

export interface LegacyBuyCoinsResponse {
  success?: boolean;

  message?: string;

  coins?: number;

  balance?: number;

  addedCoins?: number;
}

export async function buyCoins(
  packageId: string,
  coins: number,
  paymentId?: string,
): Promise<LegacyBuyCoinsResponse> {
  if (!packageId) {
    throw new Error(
      "Coin package is required.",
    );
  }

  if (
    !Number.isInteger(
      coins,
    ) ||
    coins <= 0
  ) {
    throw new Error(
      "Invalid coin amount.",
    );
  }

  const response =
    await api.post(
      "/wallet/buy",
      {
        packageId,

        coins,

        ...(paymentId
          ? {
              paymentId,
            }
          : {}),
      },
    );

  return unwrap<LegacyBuyCoinsResponse>(
    response,
  );
}

/* ============================================================================
GET TRANSACTIONS
============================================================================ */

export async function getTransactions(): Promise<
  CoinTransaction[]
> {
  const response =
    await api.get(
      "/wallet/transactions",
    );

  const data =
    unwrap<TransactionsResponse>(
      response,
    );

  return (
    data.transactions ??
    []
  );
}

/* ============================================================================
FILTER HELPERS
============================================================================ */

export async function getPurchaseTransactions(): Promise<
  CoinTransaction[]
> {
  const transactions =
    await getTransactions();

  return transactions.filter(
    (
      transaction,
    ) =>
      transaction.type ===
      "PURCHASE",
  );
}

export async function getGiftSentTransactions(): Promise<
  CoinTransaction[]
> {
  const transactions =
    await getTransactions();

  return transactions.filter(
    (
      transaction,
    ) =>
      transaction.type ===
      "GIFT_SENT",
  );
}

export async function getGiftReceivedTransactions(): Promise<
  CoinTransaction[]
> {
  const transactions =
    await getTransactions();

  return transactions.filter(
    (
      transaction,
    ) =>
      transaction.type ===
      "GIFT_RECEIVED",
  );
}

export async function getBonusTransactions(): Promise<
  CoinTransaction[]
> {
  const transactions =
    await getTransactions();

  return transactions.filter(
    (
      transaction,
    ) =>
      transaction.type ===
      "BONUS",
  );
}

/* ============================================================================
API OBJECT
============================================================================ */

export const walletApi = {
  getWallet,

  getCoinBalance,

  getCoinPackages,

  createCoinPurchase,

  confirmCoinPurchase,

  buyCoins,

  getTransactions,

  getPurchaseTransactions,

  getGiftSentTransactions,

  getGiftReceivedTransactions,

  getBonusTransactions,
};

export default walletApi;