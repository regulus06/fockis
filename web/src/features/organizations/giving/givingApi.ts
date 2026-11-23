/**
 * givingApi.ts — Give Online (tithes, offerings, special gifts).
 *
 *   GET  /organizations/:id/giving                 public: giving on/off, funds
 *   POST /organizations/:id/giving                 start a gift → Stripe client secret
 *   POST /organizations/:id/giving/:giftId/confirm after Stripe confirms the card
 *   GET  /organizations/:id/giving/mine            my gifts to this church
 *   GET  /organizations/:id/giving/admin           settings, totals, gifts (managers)
 *   GET  /organizations/:id/payouts/cover-quote    public: extra to cover the Fockis fee
 *   PUT  /organizations/:id/giving/admin/settings  save settings (managers)
 *
 * Card details never pass through this API: they go from Stripe Elements
 * straight to Stripe. The server checks every permission.
 */

import { churchRequest, getAuthToken } from "../api/organizationApi";

export interface GivingFund {
  key: string;
  label: string;
  description: string;
  active?: boolean;
}

export interface GivingInfo {
  organization: { id: string; name: string };
  enabled: boolean;
  currency: string;
  funds: GivingFund[];
  suggestedAmounts: number[];
  message: string;
  minAmount: number;
  /** People without a Fockis account can give (name + email). */
  allowGuests?: boolean;
  /** Minimum gift for guests. */
  guestMinAmount?: number;
  signedIn: boolean;
  canManage: boolean;
}

export interface GiftStart {
  giftId: string;
  clientSecret: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  fundLabel: string;
  /** The gift itself, and what the giver added to cover the Fockis fee. */
  giftAmount?: number;
  coverFee?: number;
  /** Guest gifts only: one-time key that confirms this gift. Kept in memory only. */
  guestKey?: string;
}

export interface CoverQuote {
  enabled: boolean;
  cover: number;
  currency: string;
}

export interface Gift {
  id: string;
  fundKey: string;
  fundLabel: string;
  amount: number;
  currency: string;
  note: string;
  status: "pending" | "paid" | "failed" | "refunded";
  receiptNumber: string;
  coverFee?: number;
  refundedAmount?: number;
  refundedAt?: string | null;
  refundRequested?: boolean;
  /** Staff only. */
  refundRequestReason?: string;
  anonymous: boolean;
  /** Given without a Fockis account. */
  guest?: boolean;
  giverName: string;
  createdAt: string | null;
  paidAt: string | null;
}

export interface GivingSettings {
  enabled: boolean;
  currency: string;
  funds: GivingFund[];
  suggestedAmounts: number[];
  message: string;
  thankYouMessage: string;
  /** People without a Fockis account can give. */
  allowGuests: boolean;
  updatedAt: string | null;
  saved: boolean;
}

export interface Total {
  currency: string;
  total: number;
  count: number;
}

export interface GivingAdmin {
  organization: { id: string; name: string };
  settings: GivingSettings;
  currencies: string[];
  summary: {
    thisMonth: Total[];
    thisYear: Total[];
    allTime: Total[];
    byFund: { fundKey: string; fundLabel: string; currency: string; total: number; count: number }[];
  };
  items: Gift[];
  truncated: boolean;
  /** Only the owner can refund gifts (before they are paid out). */
  canRefund?: boolean;
}

const base = (id: string) => `/organizations/${encodeURIComponent(id)}/giving`;

export interface GivingQr {
  url: string;
  svg: string;
  /** PNG data URL, 1024 px. */
  png: string;
  organizationName: string;
  fund: { key: string; label: string } | null;
  givingEnabled: boolean;
}

export const givingApi = {
  info: (organizationId: string, signal?: AbortSignal) => churchRequest<GivingInfo>(base(organizationId), { signal, anonymous: !getAuthToken() }),
  coverQuote: (organizationId: string, amount: number, signal?: AbortSignal) =>
    churchRequest<CoverQuote>(`/organizations/${encodeURIComponent(organizationId)}/payouts/cover-quote`, { query: { amount: String(amount) }, signal, anonymous: !getAuthToken() }),
  start: (organizationId: string, input: { fundKey: string; amount: number; note?: string; anonymous?: boolean; country?: string; coverFee?: boolean }) =>
    churchRequest<GiftStart>(base(organizationId), { method: "POST", body: input }),
  /** Giving without a Fockis account (name + email for the receipt). */
  startGuest: (organizationId: string, input: { fundKey: string; amount: number; note?: string; anonymous?: boolean; country?: string; coverFee?: boolean; name: string; email: string }) =>
    churchRequest<GiftStart>(`${base(organizationId)}/guest`, { method: "POST", body: input, anonymous: true }),
  confirmGuest: (organizationId: string, giftId: string, paymentIntentId: string, guestKey: string) =>
    churchRequest<Gift & { thankYouMessage: string }>(`${base(organizationId)}/${encodeURIComponent(giftId)}/guest-confirm`, { method: "POST", body: { paymentIntentId, guestKey }, anonymous: true }),
  confirm: (organizationId: string, giftId: string, paymentIntentId: string) =>
    churchRequest<Gift & { thankYouMessage: string }>(`${base(organizationId)}/${encodeURIComponent(giftId)}/confirm`, { method: "POST", body: { paymentIntentId } }),
  /** QR code that opens the giving form (link built by the server). */
  qr: (organizationId: string, fund?: string, signal?: AbortSignal) =>
    churchRequest<GivingQr>(`${base(organizationId)}/qr`, { query: fund ? { fund } : undefined, signal, anonymous: !getAuthToken() }),
  mine: (organizationId: string, signal?: AbortSignal) => churchRequest<{ items: Gift[] }>(`${base(organizationId)}/mine`, { signal }),
  admin: (organizationId: string, query: { fund?: string; from?: string; to?: string }, signal?: AbortSignal) =>
    churchRequest<GivingAdmin>(`${base(organizationId)}/admin`, { query, signal }),
  refund: (organizationId: string, giftId: string, reason: string) =>
    churchRequest<Gift>(`${base(organizationId)}/admin/gifts/${encodeURIComponent(giftId)}/refund`, { method: "POST", body: { reason } }),
  requestRefund: (organizationId: string, giftId: string, reason: string) =>
    churchRequest<Gift>(`${base(organizationId)}/${encodeURIComponent(giftId)}/refund-request`, { method: "POST", body: { reason } }),
  saveSettings: (organizationId: string, input: Partial<Omit<GivingSettings, "updatedAt" | "saved">>) =>
    churchRequest<GivingSettings>(`${base(organizationId)}/admin/settings`, { method: "PUT", body: input }),
};

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
