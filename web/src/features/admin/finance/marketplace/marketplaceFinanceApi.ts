/* ============================================================================
   Admin Center → Finance → Marketplace payouts — API
   Backend: apps/api/src/payouts (super admins only).
   All money is in integer cents; percentages are basis points (150 = 1.5 %).
============================================================================ */

const ROOT = "/api/admin";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("fockis_token")
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${ROOT}${path}`, { credentials: "include", ...options, headers });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = (data as { message?: unknown })?.message;
    throw new Error(
      Array.isArray(message) ? message.join(" ") : typeof message === "string" ? message : `Request failed (${response.status})`,
    );
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/* ------------------------------------------------------------------------ */

export interface CommissionSettings {
  defaultRate: number;
  defaultFixedCents: number;
  minCommissionCents: number;
  maxCommissionCents: number | null;
  categoryRates: Array<{ key: string; rate: number }>;
  storeRates: Array<{ key: string; rate: number }>;
  isActive: boolean;
  auditLog?: Array<{ action: string; changedBy: string; changedAt: string; changes: Record<string, unknown> }>;
  updatedAt?: string;
}

export interface FeeTier {
  upToCents: number | null;
  percentBps: number;
  fixedCents: number;
}

export interface PayoutPlan {
  _id: string;
  name: string;
  description: string;
  currency: string;
  earlyPayout: {
    enabled: boolean;
    percentBps: number;
    fixedCents: number;
    minFeeCents: number;
    maxFeeCents: number | null;
    tiers: FeeTier[];
  };
  minPayoutCents: number;
  maxPayoutCents: number | null;
  waitDaysAfterPayment: number;
  payoutScheduleLabel: string;
  isDefault: boolean;
  status: "active" | "inactive" | "archived";
  effectiveFrom: string | null;
  effectiveTo: string | null;
  version: number;
  assignedStores?: number;
  updatedAt?: string;
}

export type PayoutPlanInput = Partial<Omit<PayoutPlan, "_id" | "isDefault" | "status" | "version" | "assignedStores" | "updatedAt">>;

export interface HoldReasonOption {
  value: string;
  label: string;
}

export interface PayoutHold {
  _id: string;
  storeId: string;
  scope: "store" | "order";
  orderId: string | null;
  orderNumber: string;
  amountCents: number | null;
  currency: string;
  reason: string;
  sellerMessage: string;
  status: "active" | "released";
  reviewBy: string | null;
  createdBy: string;
  releasedBy: string;
  releasedAt: string | null;
  createdAt: string;
  history: Array<{ action: string; by: string; at: string; note: string }>;
}

export interface StoreRow {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  stripeConnected: boolean;
  transfersActive: boolean;
  planId: string | null;
}

export interface StoreRecord {
  store: { id: string; name: string };
  currency: string;
  totals: Record<
    | "salesCents"
    | "commissionCents"
    | "earningsCents"
    | "availableCents"
    | "pendingCents"
    | "heldCents"
    | "transferredCents"
    | "earlyFeesCents"
    | "refundedCents",
    number
  >;
  account: { connected: boolean; ready: boolean; requirementsDue: string[]; payoutsEnabled?: boolean };
  plan: (Pick<PayoutPlan, "name" | "currency"> & { id: string; source: string }) | null;
  holds: PayoutHold[];
  earlyRequests: Array<{ id: string; status: string; currency: string; grossCents: number; feeCents: number; netCents: number; createdAt: string | null }>;
  history: Array<{
    orderNumber: string;
    shipmentId: string;
    date: string | null;
    currency: string;
    grossCents: number;
    commissionCents: number;
    sellerCents: number;
    earlyFeeCents: number;
    netCents: number;
    payoutType: string | null;
    state: string;
    stripeTransferId: string | null;
  }>;
}

export interface MarketplaceOverview {
  paidToSellers: Array<{ _id: string; transferredCents: number; commissionCents: number; earlyFeeCents: number; shipments: number }>;
  earlyPayoutFeesCents: number;
  earlyPayoutsNetCents: number;
  earlyPayoutCount: number;
  activeHolds: number;
  storesOnHold: number;
}

export interface EarlyRequest {
  _id: string;
  storeId: string;
  status: string;
  currency: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  transferredNetCents: number;
  collectedFeeCents: number;
  items: Array<{ orderNumber: string; amountCents: number; feeCents: number; status: string; error: string }>;
  pricingSnapshot: { plan?: { name?: string; version?: number } };
  createdAt: string;
}

export interface AuditEntry {
  _id: string;
  action: string;
  entity: string;
  entityId: string;
  storeId: string;
  actorUserId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export const marketplaceFinanceApi = {
  overview: () => request<MarketplaceOverview>("/marketplace-finance/overview"),

  getCommission: () => request<CommissionSettings>("/marketplace-commission"),
  updateCommission: (body: Partial<CommissionSettings>) =>
    request<CommissionSettings>("/marketplace-commission", { method: "PATCH", ...json(body) }),

  plans: (archived = false) => request<PayoutPlan[]>(`/marketplace-finance/plans${archived ? "?archived=1" : ""}`),
  createPlan: (body: PayoutPlanInput) => request<PayoutPlan>("/marketplace-finance/plans", { method: "POST", ...json(body) }),
  updatePlan: (id: string, body: PayoutPlanInput) =>
    request<PayoutPlan>(`/marketplace-finance/plans/${encodeURIComponent(id)}`, { method: "PATCH", ...json(body) }),
  setPlanStatus: (id: string, status: PayoutPlan["status"]) =>
    request<PayoutPlan>(`/marketplace-finance/plans/${encodeURIComponent(id)}/status`, { method: "POST", ...json({ status }) }),
  makeDefault: (id: string) =>
    request<PayoutPlan>(`/marketplace-finance/plans/${encodeURIComponent(id)}/default`, { method: "POST" }),

  stores: (q: string) => request<StoreRow[]>(`/marketplace-finance/stores?q=${encodeURIComponent(q)}`),
  storeRecord: (storeId: string) => request<StoreRecord>(`/marketplace-finance/stores/${encodeURIComponent(storeId)}`),
  assignPlan: (storeId: string, planId: string | null) =>
    request<{ storeId: string; planId: string | null }>(`/marketplace-finance/stores/${encodeURIComponent(storeId)}/plan`, {
      method: "PUT",
      ...json({ planId }),
    }),

  holdReasons: () => request<HoldReasonOption[]>("/marketplace-finance/holds/reasons"),
  holds: (filter: Record<string, string>) =>
    request<PayoutHold[]>(`/marketplace-finance/holds?${new URLSearchParams(filter).toString()}`),
  createHold: (body: {
    storeId: string;
    scope: "store" | "order";
    orderId?: string;
    orderNumber?: string;
    amountCents?: number | null;
    currency?: string;
    reason: string;
    sellerMessage?: string;
    reviewBy?: string | null;
    note?: string;
  }) => request<PayoutHold>("/marketplace-finance/holds", { method: "POST", ...json(body) }),
  releaseHold: (id: string, note: string) =>
    request<{ hold: PayoutHold; released: Array<{ status: string }> }>(
      `/marketplace-finance/holds/${encodeURIComponent(id)}/release`,
      { method: "POST", ...json({ note }) },
    ),
  extendHold: (id: string, reviewBy: string, note: string) =>
    request<PayoutHold>(`/marketplace-finance/holds/${encodeURIComponent(id)}/extend`, { method: "POST", ...json({ reviewBy, note }) }),
  noteHold: (id: string, note: string) =>
    request<PayoutHold>(`/marketplace-finance/holds/${encodeURIComponent(id)}/notes`, { method: "POST", ...json({ note }) }),

  earlyPayouts: (filter: Record<string, string> = {}) =>
    request<EarlyRequest[]>(`/marketplace-finance/early-payouts?${new URLSearchParams(filter).toString()}`),
  audit: (filter: Record<string, string> = {}) =>
    request<AuditEntry[]>(`/marketplace-finance/audit?${new URLSearchParams(filter).toString()}`),

  /** Downloads the CSV with the admin's sign-in (a plain link would not send it). */
  async downloadEarlyPayoutsCsv(): Promise<void> {
    const headers = new Headers();
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${ROOT}/marketplace-finance/export/early-payouts.csv`, { credentials: "include", headers });
    if (!response.ok) throw new Error(`Export failed (${response.status})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fockis-early-payouts.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};

/* ------------------------------------------------------------------------ */

export function money(cents: number | null | undefined, currency = "usd"): string {
  const value = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** "12.50" (dollars typed by an admin) → 1250 cents. Empty → null. */
export function toCents(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value < 0) return NaN;
  return Math.round(value * 100);
}

export function centsToText(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);
}

/** "1.5" (percent typed by an admin) → 150 basis points. */
export function toBps(text: string): number {
  const value = Number(text.trim() || "0");
  if (!Number.isFinite(value) || value < 0 || value > 100) return NaN;
  return Math.round(value * 100);
}

export function bpsToText(bps: number | null | undefined): string {
  return bps ? String(bps / 100) : "0";
}
