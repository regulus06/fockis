import { api } from "../../../api/api";

import type {
  EarningsDashboard,
  EarningsTransaction,
  Withdrawal,
  PayoutSchedule,
} from "../types/earnings.types";

/* ============================================================================
TYPES
============================================================================ */

export interface StripeOnboardingResponse {
  url: string | null;
  accountId: string | null;
  alreadyComplete?: boolean;
  onboardingComplete?: boolean;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
}

export interface StripeStatusResponse {
  connected: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}

export interface WithdrawalResponse {
  _id: string;
  userId: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;

  status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled";

  stripeAccountId?: string | null;
  stripeTransferId?: string | null;
  stripePayoutId?: string | null;

  failureReason?: string | null;
  description?: string | null;

  createdAt: string;
  updatedAt: string;
}

/* ============================================================================
SETTLEMENT RESPONSE
============================================================================ */

export interface SettlePendingEarningsResponse {
  success?: boolean;

  message?: string;

  settled?: boolean;

  settledAmount?: number;

  pendingAmount?: number;

  availableBalance?: number;

  pendingBalance?: number;

  lifetimeEarnings?: number;

  transactionsSettled?: number;

  [key: string]: unknown;
}

/* ============================================================================
API
============================================================================ */

export const earningsApi = {
  // =========================================================================
  // DASHBOARD
  // =========================================================================

  async getDashboard(): Promise<EarningsDashboard> {
    const response =
      await api.get<EarningsDashboard>(
        "/earnings",
      );

    return response.data;
  },

  // =========================================================================
  // TRANSACTIONS
  // =========================================================================

  async getTransactions(
    page = 1,
    limit = 25,
  ): Promise<{
    transactions: EarningsTransaction[];
    page: number;
    limit: number;
    total: number;
    pages: number;
  }> {
    const response =
      await api.get<{
        transactions: EarningsTransaction[];
        page: number;
        limit: number;
        total: number;
        pages: number;
      }>(
        "/earnings/transactions",
        {
          params: {
            page,
            limit,
          },
        },
      );

    return response.data;
  },

  // =========================================================================
  // WITHDRAWALS
  // =========================================================================

  async getWithdrawals(): Promise<
    Withdrawal[]
  > {
    const response =
      await api.get<Withdrawal[]>(
        "/earnings/withdrawals",
      );

    return response.data;
  },

  // =========================================================================
  // STRIPE CONNECT ACCOUNT
  // =========================================================================

  async createStripeAccount(
    country = "US",
  ) {
    const response =
      await api.post(
        "/earnings/stripe/connect",
        {
          country,
        },
      );

    return response.data;
  },

  // =========================================================================
  // STRIPE ONBOARDING
  // =========================================================================

  async getStripeOnboardingUrl(): Promise<
    StripeOnboardingResponse
  > {
    const response =
      await api.post<StripeOnboardingResponse>(
        "/earnings/stripe/onboarding",
      );

    return response.data;
  },

  // =========================================================================
  // STRIPE STATUS
  // =========================================================================

  async getStripeStatus(): Promise<
    StripeStatusResponse
  > {
    const response =
      await api.get<StripeStatusResponse>(
        "/earnings/stripe/status",
      );

    return response.data;
  },

  // =========================================================================
  // WITHDRAW
  // =========================================================================

  async withdraw(
    amount: number,
  ): Promise<WithdrawalResponse> {
    const response =
      await api.post<WithdrawalResponse>(
        "/earnings/withdraw",
        {
          amount,
        },
      );

    return response.data;
  },

  // =========================================================================
  // SETTLE PENDING EARNINGS
  //
  // Moves eligible pending creator earnings into the available balance.
  //
  // Backend endpoint:
  // POST /earnings/settle
  // =========================================================================

  async settlePendingEarnings(): Promise<
    SettlePendingEarningsResponse
  > {
    const response =
      await api.post<SettlePendingEarningsResponse>(
        "/earnings/settle",
      );

    return response.data;
  },

  // =========================================================================
  // BACKWARD-COMPATIBLE SETTLE ALIAS
  //
  // Existing code that calls:
  //
  // earningsApi.settle()
  //
  // will continue to work.
  // =========================================================================

  async settle(): Promise<
    SettlePendingEarningsResponse
  > {
    return this.settlePendingEarnings();
  },

  // =========================================================================
  // PAYOUT SCHEDULE
  // =========================================================================

  async updatePayoutSchedule(
    payoutSchedule: PayoutSchedule,
  ) {
    const response =
      await api.put(
        "/earnings/payout-settings",
        {
          payoutSchedule,
        },
      );

    return response.data;
  },
};