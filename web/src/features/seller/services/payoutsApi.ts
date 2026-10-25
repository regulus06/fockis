import { api } from "../../../api/api";

export interface PayoutStatus {
  connected: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  transfersActive: boolean;
  readyForPayouts: boolean;
  requirementsDue: string[];
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
