import { api } from "../../../../api/api";

/* ============================================================================
   FOCKIS DOMAIN FEES — Admin Center API
   (apps/api/src/organization-identity/billing/organization-domain-billing.controller.ts)
   One price list for every Fockis domain: Organization Identity domains
   (churches, ministries…) and Fockis Academy schools.
   domains.view to read, domains.manage to change.
============================================================================ */

export type OrgDomainState = "no_domain" | "free" | "exempt" | "paid" | "active" | "grace" | "unpaid" | "expired";

export interface DomainPriceType {
  key: string;
  label: string;
  group: "organizations" | "academy" | "both";
}

export interface DomainPricing {
  enabled: boolean;
  enabledAt: string | null;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  graceDays: number;
  memberDomainPrice: number;
  personalDomainPrice: number;
  note: string;
  prices: Record<string, number>;
  types: DomainPriceType[];
  updatedAt: string | null;
  history: Array<{ summary: string; byName?: string; at: string }>;
}

export type DomainPricingInput = Partial<Pick<DomainPricing, "enabled" | "currency" | "periodMonths" | "graceDays" | "memberDomainPrice" | "personalDomainPrice" | "note" | "prices">>;

export interface OrgFeeRow {
  organizationId: string;
  organizationName: string;
  organizationTypeLabel: string;
  domain: string;
  domainStatus: string;
  state: OrgDomainState;
  active: boolean;
  price: number;
  currency: string;
  paidUntil: string | null;
  graceEndsAt: string | null;
  memberDomainsUsed: number;
  memberDomainsAllowed: number | null;
}

export interface OrgFeeBilling {
  state: OrgDomainState;
  active: boolean;
  price: number;
  memberDomainPrice: number;
  currency: string;
  periodMonths: number;
  graceDays: number;
  paidUntil: string | null;
  graceEndsAt: string | null;
  renewSoon: boolean;
  memberDomainsUsed: number;
  memberDomainsAllowed: number | null;
  renewTotal: number;
  baseDomain: string | null;
  baseDomainStatus: string | null;
  organizationTypeLabel: string;
}

export interface OrgFeeDetail {
  organization: { id: string; name: string; status: string };
  billing: OrgFeeBilling;
  exempt: boolean;
  exemptReason: string;
  paidForever: boolean;
  memberSlots: number;
  entries: Array<{
    method: "stripe" | "manual" | "exempt" | "unexempt" | "cleared";
    kind?: "activate" | "renew" | "members";
    amount?: number;
    currency?: string;
    memberDomains?: number;
    from?: string;
    to?: string;
    note?: string;
    byName?: string;
    at: string;
  }>;
  memberDomains: Array<{ domain: string; status: string; assigned: boolean; createdAt: string | null }>;
}

export type OrgFeeAction = { action: "exempt" | "unexempt" | "set_paid_until" | "clear_paid"; until?: string; amount?: number; memberDomains?: number; note?: string };

export type PersonalState = "free" | "exempt" | "paid" | "active" | "grace" | "unpaid" | "expired";

export interface PersonalRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  domain: string;
  state: PersonalState;
  active: boolean;
  price: number;
  currency: string;
  paidUntil: string | null;
  graceEndsAt: string | null;
  reservedUntil: string | null;
  createdAt: string | null;
}

export interface PersonalDetail {
  id: string;
  user: { id: string; name: string; email: string; username: string };
  billing: {
    domain: string;
    state: PersonalState;
    active: boolean;
    price: number;
    currency: string;
    periodMonths: number;
    paidUntil: string | null;
    graceEndsAt: string | null;
    reservedUntil: string | null;
    createdAt: string | null;
  };
  exempt: boolean;
  exemptReason: string;
  paidForever: boolean;
  entries: OrgFeeDetail["entries"];
}

export type PersonalAction = { action: "exempt" | "unexempt" | "set_paid_until" | "clear_paid" | "release"; until?: string; amount?: number; note?: string };

const BASE = "/admin/domain-billing";

export const domainBillingAdminApi = {
  pricing: async () => (await api.get<DomainPricing>(`${BASE}/pricing`)).data,
  savePricing: async (body: DomainPricingInput) => (await api.put<DomainPricing>(`${BASE}/pricing`, body)).data,
  organizations: async (p: { search?: string; state?: string; page?: number }) =>
    (
      await api.get<{ items: OrgFeeRow[]; counts: Record<string, number>; page: number; total: number; hasMore: boolean }>(`${BASE}/organizations`, {
        params: Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== "" && v !== 1)),
      })
    ).data,
  organization: async (id: string) => (await api.get<OrgFeeDetail>(`${BASE}/organizations/${encodeURIComponent(id)}`)).data,
  personal: async (p: { search?: string; state?: string; page?: number }) =>
    (
      await api.get<{ items: PersonalRow[]; counts: Record<string, number>; page: number; total: number; hasMore: boolean }>(`${BASE}/personal`, {
        params: Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== "" && v !== 1)),
      })
    ).data,
  personalOne: async (id: string) => (await api.get<PersonalDetail>(`${BASE}/personal/${encodeURIComponent(id)}`)).data,
  personalAction: async (id: string, body: PersonalAction) => (await api.post<PersonalDetail | { released: true }>(`${BASE}/personal/${encodeURIComponent(id)}/action`, body)).data,
  action: async (id: string, body: OrgFeeAction) => (await api.post<OrgFeeDetail>(`${BASE}/organizations/${encodeURIComponent(id)}/action`, body)).data,
};
