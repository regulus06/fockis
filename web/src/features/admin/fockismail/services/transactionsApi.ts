// Credit ledger and usage analytics, scoped per business.

import type { CreditChannel, CreditTransaction, TransactionType, UsageBreakdown, UsagePoint } from "../types/platform.types";
import { PLATFORM_ENDPOINTS as EP } from "./endpoints";
import { call } from "./httpClient";
import { platformDb } from "./platformDb";
import { storeFor } from "./mockDb";

export interface TransactionFilters {
  channel?: CreditChannel | "all";
  type?: TransactionType | "all";
  days?: number;
}

export interface UsageReport {
  daily: UsagePoint[];
  byCampaign: UsageBreakdown[];
  byAutomation: UsageBreakdown[];
  byChannel: UsageBreakdown[];
  totals: { email: number; sms: number };
}

function usageFor(businessId: string, days: number): UsageReport {
  const bal = platformDb.balances.find((b) => b.businessId === businessId);
  const store = storeFor(businessId);
  const email = bal?.emailCreditsUsed ?? 0;
  const sms = bal?.smsCreditsUsed ?? 0;
  const span = Math.max(1, days);
  // Demo shape: weekday-heavy usage with campaign spikes, summing to the totals.
  const weights = Array.from({ length: span }, (_, i) => (i % 7 === 2 ? 4 : i % 7 === 5 ? 0.6 : 1) * (1 + ((i * 13) % 5) / 10));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const fraction = Math.min(1, span / 30);
  const daily: UsagePoint[] = weights.map((w, i) => ({
    date: new Date(Date.now() - (span - 1 - i) * 86400000).toISOString(),
    email: Math.round((email * fraction * w) / wsum),
    sms: Math.round((sms * fraction * w * (i % 7 === 4 ? 2 : 1)) / wsum),
  }));
  const sent = store.campaigns.filter((c) => c.stats.recipients > 0).slice(0, 6);
  const campSum = sent.reduce((n, c) => n + c.stats.recipients, 0) || 1;
  const byCampaign = sent.map((c) => ({ label: c.name, kind: "campaign" as const, email: Math.round((email * 0.75 * c.stats.recipients) / campSum), sms: 0 }));
  const autos = store.automations.filter((a) => a.contacts > 0).slice(0, 5);
  const autoSum = autos.reduce((n, a) => n + a.contacts, 0) || 1;
  const byAutomation = autos.map((a) => ({ label: a.name, kind: "automation" as const, email: Math.round((email * 0.25 * a.contacts) / autoSum), sms: Math.round((sms * 0.4 * a.contacts) / autoSum) }));
  return {
    daily,
    byCampaign,
    byAutomation,
    byChannel: [
      { label: "Email campaigns", kind: "channel", email: Math.round(email * 0.75), sms: 0 },
      { label: "Automations", kind: "channel", email: Math.round(email * 0.25), sms: Math.round(sms * 0.4) },
      { label: "SMS campaigns", kind: "channel", email: 0, sms: Math.round(sms * 0.6) },
    ],
    totals: { email: Math.round(email * fraction), sms: Math.round(sms * fraction) },
  };
}

export const transactionsApi = {
  list: (businessId: string, filters: TransactionFilters = {}) =>
    call<CreditTransaction[]>(() =>
      platformDb.transactions
        .filter((t) => t.businessId === businessId)
        .filter((t) => !filters.channel || filters.channel === "all" || t.channel === filters.channel)
        .filter((t) => !filters.type || filters.type === "all" || t.type === filters.type)
        .filter((t) => !filters.days || new Date(t.createdAt).getTime() >= Date.now() - filters.days * 86400000)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    EP.transactions(businessId), { query: { ...filters } }),

  usage: (businessId: string, days: number) => call<UsageReport>(() => usageFor(businessId, days), EP.usage(businessId), { query: { days } }),

  /** Agency: usage per client for the same period. */
  usageByClient: (days: number) =>
    call<UsageBreakdown[]>(() =>
      platformDb.businesses
        .filter((b) => !b.isAgencyOwner && b.status !== "archived")
        .map((b) => {
          const u = usageFor(b.id, days);
          return { label: b.name, kind: "client" as const, email: u.totals.email, sms: u.totals.sms };
        }),
    `${EP.agencyCredits}/usage`, { query: { days } }),
};
