// ============================================================================
// BILLING & CREDITS DEMO DATA
// Plans, packages, and prices here are examples only. In production the backend
// (and Stripe) supply every value; no component hard-codes them.
// ============================================================================

import type {
  BillingSettings,
  CreditBalance,
  CreditPackage,
  CreditThresholds,
  CreditTransaction,
  Invoice,
  MarketingPlan,
  PaymentMethod,
  TransactionType,
} from "../types/platform.types";
import { daysAgo, daysAhead } from "./demoTime";
import { mockBusinesses } from "./agencyMockData";

const usd = (dollars: number) => ({ amount: Math.round(dollars * 100), currency: "USD" });

export const mockPlans: MarketingPlan[] = [
  { planId: "plan_starter", planName: "Starter", kind: "standard", rank: 1, description: "For small businesses sending a monthly newsletter and a few promotions.", emailCreditsIncluded: 2500, smsCreditsIncluded: 250, price: usd(29), billingCycle: "monthly", status: "active",
    features: ["2,500 email credits / month", "250 SMS credits / month", "Email builder and templates", "Signup forms", "Basic reports"], limits: { contacts: 2500, seats: 2, workspaces: 1 } },
  { planId: "plan_growth", planName: "Growth", kind: "standard", rank: 2, highlighted: true, description: "For growing businesses using automations and regular campaigns.", emailCreditsIncluded: 10000, smsCreditsIncluded: 1000, price: usd(79), billingCycle: "monthly", status: "active",
    features: ["10,000 email credits / month", "1,000 SMS credits / month", "Automations and journeys", "Segments and A/B testing", "Landing pages"], limits: { contacts: 10000, seats: 5, workspaces: 1 } },
  { planId: "plan_professional", planName: "Professional", kind: "standard", rank: 3, description: "For established businesses with large audiences and multiple channels.", emailCreditsIncluded: 50000, smsCreditsIncluded: 5000, price: usd(249), billingCycle: "monthly", status: "active",
    features: ["50,000 email credits / month", "5,000 SMS credits / month", "Advanced analytics", "Social campaigns", "Priority support"], limits: { contacts: 50000, seats: 15, workspaces: 3 } },
  { planId: "plan_agency", planName: "Agency", kind: "enterprise", rank: 4, creditsAreMinimum: true, description: "For agencies managing many client workspaces. Custom pricing.", emailCreditsIncluded: 100000, smsCreditsIncluded: 10000, price: null, billingCycle: "monthly", status: "active",
    features: ["100,000+ email credits / month", "10,000+ SMS credits / month", "Unlimited client workspaces", "Client approvals and reports", "Dedicated success manager"], limits: { contacts: null, seats: null, workspaces: null } },
  { planId: "plan_custom_peak", planName: "Custom Agency Plan", kind: "agency_managed", rank: 3, businessId: "biz_peak", description: "Agency-managed plan for Peak Fitness.", emailCreditsIncluded: 75000, smsCreditsIncluded: 7500, price: usd(310), billingCycle: "monthly", status: "hidden",
    features: ["75,000 email credits / month", "7,500 SMS credits / month", "Managed by Fockis agency"], limits: { contacts: 20000, seats: 10, workspaces: 1 } },
  { planId: "plan_promo_nonprofit", planName: "Nonprofit Promo", kind: "promotional", rank: 1, description: "Discounted plan for churches and nonprofits.", emailCreditsIncluded: 5000, smsCreditsIncluded: 500, price: usd(19), billingCycle: "monthly", status: "hidden",
    features: ["5,000 email credits / month", "500 SMS credits / month", "Nonprofit discount"], limits: { contacts: 5000, seats: 5, workspaces: 1 } },
];

export const mockCreditPackages: CreditPackage[] = [
  { packageId: "pkg_email_5k", channel: "email", credits: 5000, price: usd(15), status: "active" },
  { packageId: "pkg_email_10k", channel: "email", credits: 10000, price: usd(27), status: "active" },
  { packageId: "pkg_email_25k", channel: "email", credits: 25000, price: usd(60), status: "active", label: "Popular" },
  { packageId: "pkg_email_50k", channel: "email", credits: 50000, price: usd(110), status: "active" },
  { packageId: "pkg_email_100k", channel: "email", credits: 100000, price: usd(200), status: "active", bestValue: true },
  { packageId: "pkg_sms_500", channel: "sms", credits: 500, price: usd(10), status: "active" },
  { packageId: "pkg_sms_1k", channel: "sms", credits: 1000, price: usd(19), status: "active" },
  { packageId: "pkg_sms_5k", channel: "sms", credits: 5000, price: usd(85), status: "active", label: "Popular" },
  { packageId: "pkg_sms_10k", channel: "sms", credits: 10000, price: usd(160), status: "active" },
  { packageId: "pkg_sms_25k", channel: "sms", credits: 25000, price: usd(375), status: "active", bestValue: true },
];

export const creditThresholds: CreditThresholds = { lowFraction: 0.15, lowAbsolute: { email: 1000, sms: 100 } };

/** [emailRemaining, smsRemaining] per business. Included values come from the plan. */
const REMAINING: Record<string, [number, number]> = {
  biz_fockis: [61200, 7340],
  biz_abc: [7450, 820],
  biz_joes: [450, 35],
  biz_smith: [42300, 4100],
  biz_xyz: [2500, 250],
  biz_bloom: [0, 640],
  biz_peak: [51200, 5900],
  biz_grace: [3900, 410],
};

export const mockBalances: CreditBalance[] = mockBusinesses.map((b) => {
  const plan = mockPlans.find((p) => p.planId === b.planId) ?? mockPlans[0];
  const [email, sms] = REMAINING[b.id] ?? [plan.emailCreditsIncluded, plan.smsCreditsIncluded];
  return {
    businessId: b.id,
    workspaceId: b.workspaceId,
    planId: plan.planId,
    emailCreditsIncluded: plan.emailCreditsIncluded,
    emailCreditsRemaining: email,
    emailCreditsUsed: Math.max(0, plan.emailCreditsIncluded - email),
    smsCreditsIncluded: plan.smsCreditsIncluded,
    smsCreditsRemaining: sms,
    smsCreditsUsed: Math.max(0, plan.smsCreditsIncluded - sms),
    emailCreditsBonus: 0,
    smsCreditsBonus: 0,
    billingCycle: plan.billingCycle,
    renewalDate: daysAhead(12 + (b.name.length % 9)),
    status: "active",
    billingStatus: b.id === "biz_joes" ? "past_due" : "active",
  };
});

const TXN_TEMPLATES: Array<[TransactionType, "email" | "sms", string, number]> = [
  ["plan_renewal", "email", "Monthly plan credits", 1],
  ["plan_renewal", "sms", "Monthly plan credits", 1],
  ["email_campaign", "email", "Newsletter", -0.25],
  ["sms_campaign", "sms", "Promotion", -0.18],
  ["automation", "email", "Welcome automation", -0.06],
  ["purchase", "email", "Email credits", 0.5],
  ["email_campaign", "email", "Weekend promotion", -0.2],
  ["automation", "sms", "Appointment reminders", -0.05],
  ["promotional", "email", "Welcome bonus credits", 0.1],
  ["adjustment", "email", "Correction: duplicate send", 0.02],
  ["refund", "sms", "Refunded: failed delivery batch", 0.01],
];

export const mockTransactions: CreditTransaction[] = mockBalances.flatMap((bal) =>
  TXN_TEMPLATES.map(([type, channel, description, factor], i) => {
    const base = channel === "email" ? bal.emailCreditsIncluded : bal.smsCreditsIncluded;
    const credits = Math.round(base * factor);
    const pkg = mockCreditPackages.find((p) => p.channel === channel && p.credits >= Math.abs(credits));
    return {
      id: `txn_${bal.businessId}_${i}`,
      businessId: bal.businessId,
      workspaceId: bal.workspaceId,
      type,
      channel,
      description: type === "purchase" ? `${description} package` : description,
      credits,
      amount: type === "purchase" && pkg?.price ? pkg.price : undefined,
      status: "completed" as const,
      createdAt: daysAgo(i * 2.6 + 0.4),
    };
  }),
);

export const mockInvoices: Invoice[] = mockBusinesses.flatMap((b) => {
  const plan = mockPlans.find((p) => p.planId === b.planId);
  if (!plan?.price) return [];
  return [0, 1, 2, 3].map((m) => ({
    id: `inv_${b.id}_${m}`,
    businessId: b.id,
    number: `FM-${b.id.slice(4, 7).toUpperCase()}-${String(1040 - m)}`,
    description: `${plan.planName} plan, monthly`,
    amount: plan.price ?? usd(0),
    status: b.id === "biz_joes" && m === 0 ? ("failed" as const) : ("paid" as const),
    issuedAt: daysAgo(m * 30 + 3),
  }));
});

export const mockPaymentMethods: PaymentMethod[] = mockBusinesses.map((b, i) => ({
  id: `pm_${b.id}`,
  businessId: b.id,
  brand: ["Visa", "Mastercard", "Amex"][i % 3],
  last4: String(4242 + i * 111).slice(-4),
  expMonth: (i % 12) + 1,
  expYear: 2028,
  isDefault: true,
}));

export const mockBillingSettings: BillingSettings[] = mockBusinesses.map((b) => ({
  businessId: b.id,
  billingEmail: b.profile.email,
  companyName: b.name,
  taxId: "",
  address: b.profile.address,
  autoRecharge: { enabled: false, channel: "email", threshold: 1000, packageId: "pkg_email_10k" },
  lowCreditAlerts: true,
}));
