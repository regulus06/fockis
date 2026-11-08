import { api } from "../../../api/api";

/**
 * A person's own Fockis domain (john.fockis.com). The price is set by Fockis
 * in Admin Center → Domains → Domain Pricing. Payment uses the existing
 * Fockis checkout.
 */

export type PersonalDomainState = "free" | "exempt" | "paid" | "active" | "grace" | "unpaid" | "expired";

export interface PersonalDomainInfo {
  domain: string;
  name: string;
  state: PersonalDomainState;
  active: boolean;
  price: number;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  graceDays: number;
  paidUntil: string | null;
  graceEndsAt: string | null;
  reservedUntil: string | null;
  renewSoon: boolean;
  canPay: boolean;
  note: string;
  createdAt: string | null;
}

export interface MyFockisDomain {
  domain: PersonalDomainInfo | null;
  payments: Array<{ method: "stripe" | "manual"; amount?: number; currency?: string; from?: string; to?: string; at: string }>;
  pricing: { enabled: boolean; price: number; currency: string; periodMonths: number; periodLabel: string; graceDays: number; reservationDays: number; note: string };
}

export interface PersonalDomainCheckout {
  purpose: string;
  referenceId: string;
  amount: number;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  domain: string;
  renewal: boolean;
  paidUntil: string | null;
  note: string;
  metadata: Record<string, string>;
}

const BASE = "/me/fockis-domain";

export const fockisDomainApi = {
  mine: async () => (await api.get<MyFockisDomain>(BASE)).data,
  check: async (name: string) => (await api.get<{ name: string; domain: string; available: boolean; reason: string }>(`${BASE}/check`, { params: { name } })).data,
  reserve: async (name: string) => (await api.post<MyFockisDomain>(BASE, { name })).data,
  release: async () => (await api.delete<MyFockisDomain>(BASE)).data,
  checkout: async () => (await api.post<PersonalDomainCheckout>(`${BASE}/checkout`)).data,
  claim: async (paymentIntentId: string) => (await api.post<MyFockisDomain>(`${BASE}/claim`, { paymentIntentId })).data,
  /** Public: the active domain shown on a profile. */
  forProfile: async (userId: string) => (await api.get<{ domain: string | null }>(`/fockis-domains/user/${encodeURIComponent(userId)}`)).data,
};

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function perPeriod(months: number) {
  if (months === 0) return "one-time";
  if (months === 1) return "per month";
  if (months === 12) return "per year";
  if (months % 12 === 0) return `every ${months / 12} years`;
  return `every ${months} months`;
}

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");

export function apiMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message ?? err?.message;
  return Array.isArray(m) ? m.join(", ") : m || fallback;
}

export default fockisDomainApi;
