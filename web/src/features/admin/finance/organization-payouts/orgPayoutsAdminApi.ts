/* ============================================================================
   Admin Center → Finance → Organization payouts — API
   Backend: apps/api/src/payouts/organization-payouts (super admins only).
   Uses the same API address as the rest of the app (works on fockis.com and
   on localhost). Money is in integer cents; percentages in basis points.
============================================================================ */

import { CHURCH_API_BASE } from "../../../organizations/api/organizationApi";

const ROOT = `${CHURCH_API_BASE.replace(/\/church$/, "")}/admin/organization-payouts`;

function token(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("fockis_token")
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const res = await fetch(`${ROOT}${path}`, { credentials: "include", ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = (data as { message?: unknown })?.message;
    throw new Error(Array.isArray(message) ? message.join(" ") : typeof message === "string" ? message : `Request failed (${res.status})`);
  }
  return data as T;
}

export interface FeeRules {
  percentBps: number;
  fixedCents: number;
  minFeeCents: number;
  maxFeeCents: number | null;
}

export interface OrgPayoutConfig {
  fee: FeeRules;
  feeCurrency: string;
  holdDays: number;
  coverFeeEnabled: boolean;
  minPayoutFloorCents: number;
  updatedAt: string | null;
}

export interface OrgBalance {
  currency: string;
  waitingCents: number;
  availableCents: number;
  inPayoutCents: number;
  paidCents: number;
  feesCents: number;
  grossCents: number;
}

export interface OrgRow {
  organizationId: string;
  name: string;
  connected: boolean;
  transfersActive: boolean;
  schedule: { interval: string; weeklyDay: number; monthlyDay: number };
  minPayoutCents: number;
  nextRunAt: string | null;
  onHold: boolean;
  holdReason: string;
  feeOverride: FeeRules | null;
  balances: OrgBalance[];
}

export interface AdminPayout {
  id: string;
  organizationId: string;
  name: string;
  currency: string;
  amountCents: number;
  feeCents: number;
  entryCount: number;
  status: string;
  trigger: string;
  failureMessage: string;
  createdAt: string | null;
  paidAt: string | null;
}

export interface OrgPayoutsAdmin {
  mode: "test" | "live";
  config: OrgPayoutConfig;
  organizations: OrgRow[];
  recentPayouts: AdminPayout[];
  failedPayouts: number;
}

export const orgPayoutsAdminApi = {
  overview: () => request<OrgPayoutsAdmin>(""),
  saveConfig: (input: Partial<OrgPayoutConfig>) => request<OrgPayoutConfig>("/config", { method: "PUT", body: JSON.stringify(input) }),
  updateOrg: (organizationId: string, input: { feeOverride?: FeeRules | null; onHold?: boolean; holdReason?: string }) =>
    request<OrgPayoutsAdmin>(`/organizations/${encodeURIComponent(organizationId)}`, { method: "PATCH", body: JSON.stringify(input) }),
  runNow: (organizationId: string) =>
    request<{ results: Array<{ status: string; currency?: string; amountCents?: number; message?: string }> }>(
      `/organizations/${encodeURIComponent(organizationId)}/run`,
      { method: "POST" },
    ),
};

export function money(centsValue: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(centsValue / 100);
  } catch {
    return `${(centsValue / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
