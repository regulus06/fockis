import { api } from "../../../api/api";

export interface PayoutStatus {
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  transfersActive: boolean;
  readyForPayouts: boolean;
  requirementsDue: string[];
}

/* ---------------------------------------------------------------------------
   Money summary (all amounts are integer cents)
--------------------------------------------------------------------------- */

export interface PayoutPlanInfo {
  id: string;
  name: string;
  version: number;
  currency: string;
  source?: "assigned" | "default";
  earlyPayout: {
    enabled: boolean;
    percentBps: number;
    fixedCents: number;
    minFeeCents: number;
    maxFeeCents: number | null;
    tiers: Array<{ upToCents: number | null; percentBps: number; fixedCents: number }>;
  };
  minPayoutCents: number;
  maxPayoutCents: number | null;
  waitDaysAfterPayment: number;
  payoutScheduleLabel: string;
}

export interface SellerHold {
  id: string;
  scope: "store" | "order";
  orderNumber: string | null;
  amountCents: number | null;
  currency: string;
  reason: string;
  message: string | null;
  reviewBy: string | null;
  since: string | null;
}

export interface BankPayout {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  arrivalDate: string | null;
  createdAt: string;
  method: string;
  failureMessage: string | null;
}

export interface PayoutSummary {
  store: { id: string; name: string };
  currency: string;
  totals: {
    salesCents: number;
    commissionCents: number;
    earningsCents: number;
    availableCents: number;
    pendingCents: number;
    heldCents: number;
    transferredCents: number;
    earlyFeesCents: number;
    refundedCents: number;
  };
  account: {
    connected: boolean;
    ready: boolean;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
    requirementsDue: string[];
    stripeBalance?: {
      available: Array<{ amountCents: number; currency: string }>;
      pending: Array<{ amountCents: number; currency: string }>;
    };
    bankPayouts?: BankPayout[];
    payoutSchedule?: {
      interval: string;
      weeklyAnchor: string | null;
      monthlyAnchor: number | null;
      delayDays: number;
    };
  };
  plan: PayoutPlanInfo | null;
  holds: SellerHold[];
  earlyRequests: Array<{
    id: string;
    status: string;
    currency: string;
    grossCents: number;
    feeCents: number;
    netCents: number;
    transferredNetCents: number;
    items: number;
    createdAt: string | null;
  }>;
}

export type SaleState = "transferred" | "available" | "pending" | "held" | "refunded";

export interface PayoutHistoryRow {
  orderId: string;
  orderNumber: string;
  shipmentId: string;
  date: string | null;
  currency: string;
  grossCents: number;
  commissionCents: number;
  commissionRate: number;
  sellerCents: number;
  earlyFeeCents: number;
  netCents: number;
  payoutType: "standard" | "early" | null;
  state: SaleState;
  stateReason: string;
  stripeTransferId: string | null;
}

export interface EarlyPayoutPreview {
  eligible: boolean;
  reasons: string[];
  currency: string;
  items: Array<{ orderId: string; shipmentId: string; orderNumber: string; amountCents: number; feeCents: number }>;
  fee: {
    grossCents: number;
    percentBps: number;
    percentFeeCents: number;
    fixedCents: number;
    rawFeeCents: number;
    minFeeCents: number;
    maxFeeCents: number | null;
    feeCents: number;
    netCents: number;
  };
  plan: PayoutPlanInfo | null;
  quoteHash: string | null;
  note: string;
}

export interface EarlyPayoutResult {
  id: string;
  status: "completed" | "partial" | "failed" | "processing";
  currency: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  transferredNetCents: number;
  collectedFeeCents: number;
  items: Array<{ orderNumber: string; amountCents: number; feeCents: number; status: string; error: string | null }>;
}

function storeQuery(storeId: string): string {
  return `storeId=${encodeURIComponent(storeId)}`;
}

/**
 * Seller payouts (Stripe Connect).
 * Backend: apps/api/src/payouts
 */
export const payoutsApi = {
  /** Current payout setup status for a store. */
  async getStatus(storeId: string): Promise<PayoutStatus> {
    const response = await api.get<PayoutStatus>(
      `/payouts/status?${storeQuery(storeId)}`,
    );
    return response.data;
  },

  /** Returns the Stripe onboarding URL to send the seller to. */
  async startOnboarding(storeId: string): Promise<string> {
    const response = await api.post<{ url: string }>(
      `/payouts/onboard?${storeQuery(storeId)}`,
    );
    return response.data.url;
  },

  /** Earnings, balances, plan, holds and Stripe account details. */
  async getSummary(storeId: string): Promise<PayoutSummary> {
    const response = await api.get<PayoutSummary>(`/payouts/summary?${storeQuery(storeId)}`);
    return response.data;
  },

  /** Every sale with commission, fees and where its money is. */
  async getHistory(storeId: string): Promise<PayoutHistoryRow[]> {
    const response = await api.get<PayoutHistoryRow[]>(`/payouts/history?${storeQuery(storeId)}`);
    return response.data;
  },

  /** What an early payout would be right now (nothing is paid). */
  async previewEarly(storeId: string): Promise<EarlyPayoutPreview> {
    const response = await api.get<EarlyPayoutPreview>(`/payouts/early/preview?${storeQuery(storeId)}`);
    return response.data;
  },

  /** Pays early after the seller agreed to the fee in the preview. */
  async confirmEarly(storeId: string, quoteHash: string): Promise<EarlyPayoutResult> {
    const response = await api.post<EarlyPayoutResult>(`/payouts/early?${storeQuery(storeId)}`, { quoteHash });
    return response.data;
  },

  /** Returns a one-time link to the seller's Stripe Express dashboard. */
  async getDashboardLink(storeId: string): Promise<string> {
    const response = await api.post<{ url: string }>(
      `/payouts/dashboard?${storeQuery(storeId)}`,
    );
    return response.data.url;
  },
};

/** Reads a readable message from an axios error. */
export function payoutErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data;
  const message = data?.message;

  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  if (error instanceof Error && error.message) return error.message;

  return "Something went wrong. Please try again.";
}

/** Formats integer cents as money, e.g. 124000 → "$1,240.00". */
export function formatCents(cents: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** Basis points as a percent label, e.g. 150 → "1.5%". */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
