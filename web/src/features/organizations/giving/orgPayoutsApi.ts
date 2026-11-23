/**
 * orgPayoutsApi.ts — organization payouts (money given to the organization,
 * minus the Fockis fee, sent to its Stripe account on its schedule).
 *
 *   GET  /organizations/:id/payouts             overview (owner, administrators)
 *   POST /organizations/:id/payouts/refresh     re-read Stripe after onboarding
 *   POST /organizations/:id/payouts/connect     owner → { url } Stripe onboarding
 *   POST /organizations/:id/payouts/dashboard   owner → { url } Stripe dashboard
 *   PUT  /organizations/:id/payouts/schedule    owner
 *   POST /organizations/:id/payouts/pay-now     owner
 *
 * Every permission is checked by the server. Amounts are integer cents.
 */

import { churchRequest } from "../api/organizationApi";

export type Interval = "manual" | "daily" | "weekly" | "monthly";

export interface PayoutSchedule {
  interval: Interval;
  weeklyDay: number;
  monthlyDay: number;
}

export interface PayoutBalance {
  currency: string;
  waitingCents: number;
  availableCents: number;
  inPayoutCents: number;
  paidCents: number;
  feesCents: number;
  grossCents: number;
}

export interface PayoutLine {
  id: string;
  kind: "income" | "refund";
  description: string;
  currency: string;
  grossCents: number;
  feeCents: number;
  coveredFeeCents: number;
  netCents: number;
  state: "waiting" | "available" | "in_payout" | "paid";
  availableAt: string | null;
  createdAt: string | null;
  payoutId: string | null;
}

export interface PayoutRecord {
  id: string;
  currency: string;
  amountCents: number;
  grossCents: number;
  feeCents: number;
  entryCount: number;
  status: "processing" | "paid" | "failed";
  trigger: "schedule" | "manual";
  failureMessage: string;
  createdAt: string | null;
  paidAt: string | null;
}

export interface PayoutsOverview {
  organization: { id: string; name: string };
  canManage: boolean;
  stripe: { connected: boolean; transfersActive: boolean; requirementsDue: string[] };
  schedule: PayoutSchedule;
  minPayoutCents: number;
  minPayoutFloorCents: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  onHold: boolean;
  holdReason: string;
  fee: { percentBps: number; fixedCents: number; minFeeCents: number; maxFeeCents: number | null; feeCurrency: string; custom: boolean };
  holdDays: number;
  balances: PayoutBalance[];
  lines: PayoutLine[];
  payouts: PayoutRecord[];
}

export interface PayoutRunResult {
  status: string;
  currency?: string;
  amountCents?: number;
  message?: string;
}

const base = (id: string) => `/organizations/${encodeURIComponent(id)}/payouts`;

export const orgPayoutsApi = {
  overview: (id: string, signal?: AbortSignal) => churchRequest<PayoutsOverview>(base(id), { signal }),
  refresh: (id: string) => churchRequest<PayoutsOverview>(`${base(id)}/refresh`, { method: "POST" }),
  connect: (id: string, country: string) => churchRequest<{ url: string }>(`${base(id)}/connect`, { method: "POST", body: { country } }),
  dashboard: (id: string) => churchRequest<{ url: string }>(`${base(id)}/dashboard`, { method: "POST" }),
  saveSchedule: (id: string, input: PayoutSchedule & { minPayoutCents: number }) =>
    churchRequest<PayoutsOverview>(`${base(id)}/schedule`, { method: "PUT", body: input }),
  payNow: (id: string) => churchRequest<{ results: PayoutRunResult[]; overview: PayoutsOverview }>(`${base(id)}/pay-now`, { method: "POST" }),
};

export function cents(amountCents: number, currency: string) {
  const value = amountCents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function feeText(fee: PayoutsOverview["fee"]) {
  const parts: string[] = [];
  if (fee.percentBps) parts.push(`${(fee.percentBps / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`);
  if (fee.fixedCents) parts.push(cents(fee.fixedCents, fee.feeCurrency));
  if (!parts.length) return "No Fockis fee";
  let text = `${parts.join(" + ")} per gift`;
  if (fee.minFeeCents) text += `, at least ${cents(fee.minFeeCents, fee.feeCurrency)}`;
  if (fee.maxFeeCents !== null) text += `, at most ${cents(fee.maxFeeCents, fee.feeCurrency)}`;
  return text;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
