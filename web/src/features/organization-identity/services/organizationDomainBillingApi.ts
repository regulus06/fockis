import { apiClient } from "../../careers/services/apiClient";

/**
 * Fee for the organization's Fockis domain (springfieldchurch.fockis.com) and
 * its member domains. Prices are set by Fockis admins in the Admin Center.
 * Payment runs through the existing Fockis checkout.
 */

export type OrgDomainState = "no_domain" | "free" | "exempt" | "paid" | "active" | "grace" | "unpaid" | "expired";

export interface OrgDomainBilling {
  organizationId: string;
  organizationType: string;
  organizationTypeLabel: string;
  baseDomain: string | null;
  baseDomainStatus: string | null;
  state: OrgDomainState;
  active: boolean;
  price: number;
  memberDomainPrice: number;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  graceDays: number;
  paidUntil: string | null;
  graceEndsAt: string | null;
  renewSoon: boolean;
  memberDomainsUsed: number;
  /** null = unlimited */
  memberDomainsAllowed: number | null;
  canAddMemberDomain: boolean;
  canRenew: boolean;
  canBuyMemberDomains: boolean;
  renewTotal: number;
  note: string;
}

export interface DomainPricingPublic {
  enabled: boolean;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  graceDays: number;
  memberDomainPrice: number;
  note: string;
  prices: Record<string, number>;
}

export interface OrgDomainCheckout {
  purpose: string;
  referenceId: string;
  kind: "renew" | "members";
  amount: number;
  currency: string;
  periodMonths: number;
  periodLabel: string;
  summary: string;
  domain: string;
  organization: string;
  organizationTypeLabel: string;
  basePrice: number;
  memberDomainPrice: number;
  memberDomains: number;
  paidUntil: string | null;
  note: string;
  metadata: Record<string, string>;
}

const base = (organizationId: string) => `/organizations/${encodeURIComponent(organizationId)}/identity/domain-billing`;

export const organizationDomainBillingApi = {
  get: (organizationId: string) => apiClient.get<{ billing: OrgDomainBilling; pricing: DomainPricingPublic }>(base(organizationId)),
  checkout: (organizationId: string, body: { kind: "renew" | "members"; memberDomains?: number }) =>
    apiClient.post<OrgDomainCheckout>(`${base(organizationId)}/checkout`, body),
  claim: (organizationId: string, paymentIntentId: string) => apiClient.post<OrgDomainBilling>(`${base(organizationId)}/claim`, { paymentIntentId }),
};

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** "per year", "per month", "one-time"… */
export function perPeriod(months: number) {
  if (months === 0) return "one-time";
  if (months === 1) return "per month";
  if (months === 12) return "per year";
  if (months % 12 === 0) return `every ${months / 12} years`;
  return `every ${months} months`;
}

export default organizationDomainBillingApi;
