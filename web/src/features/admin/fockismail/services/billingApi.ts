// ============================================================================
// BILLING — Stripe-ready
// ----------------------------------------------------------------------------
// Real mode: the frontend asks the backend to create a Stripe Checkout session
// and redirects to the returned URL. The backend confirms payment via Stripe
// webhooks and only then adds credits / changes the plan. No Stripe secret key
// ever reaches the browser.
// Mock mode: purchases and plan changes complete instantly so the UI can be
// exercised. They are clearly labeled as demo.
// ============================================================================

import type { BillingSettings, CheckoutSession, CreditBalance, Invoice, MarketingPlan, PaymentMethod } from "../types/platform.types";
import { PLATFORM_ENDPOINTS as EP } from "./endpoints";
import { USE_MOCKS, call } from "./httpClient";
import { findOrThrow } from "./mockDb";
import { platformDb } from "./platformDb";
import { applyCredits } from "./creditsApi";
import { pushNotification } from "./notificationsApi";
import { formatMoney } from "../utils/credits";
import { uid } from "../utils/format";

export type CheckoutRequest =
  | { kind: "credits"; packageId: string; paymentMethodId?: string }
  | { kind: "plan"; planId: string; paymentMethodId?: string };

function completeMock(businessId: string, req: CheckoutRequest): CreditBalance {
  const bal = platformDb.balances.find((b) => b.businessId === businessId);
  const business = platformDb.businesses.find((b) => b.id === businessId);
  if (!bal || !business) throw new Error("Workspace not found.");
  const now = new Date().toISOString();
  if (req.kind === "credits") {
    const pkg = findOrThrow(platformDb.packages.map((p) => ({ ...p, id: p.packageId })), req.packageId, "Package");
    applyCredits(bal, pkg.channel, pkg.credits);
    platformDb.transactions.unshift({ id: uid("txn"), businessId, workspaceId: bal.workspaceId, type: "purchase", channel: pkg.channel, description: `${pkg.channel === "email" ? "Email" : "SMS"} credits package`, credits: pkg.credits, amount: pkg.price ?? undefined, status: "completed", createdAt: now });
    if (pkg.price) platformDb.invoices.unshift({ id: uid("inv"), businessId, number: `FM-${uid("").slice(-5).toUpperCase()}`, description: `${pkg.credits.toLocaleString()} ${pkg.channel === "email" ? "email" : "SMS"} credits`, amount: pkg.price, status: "paid", issuedAt: now });
    pushNotification({ type: "CREDIT_PURCHASE_COMPLETED", businessId, title: "Credits added", body: `${pkg.credits.toLocaleString()} ${pkg.channel === "email" ? "email" : "SMS"} credits were added to ${business.name}.`, link: "/marketing/billing/transactions" });
    return bal;
  }
  const plan = findOrThrow(platformDb.plans.map((p) => ({ ...p, id: p.planId })), req.planId, "Plan");
  const prev = platformDb.plans.find((p) => p.planId === bal.planId);
  // Keep usage; remaining = new allotment − used + any purchased bonus.
  bal.planId = plan.planId;
  bal.emailCreditsIncluded = plan.emailCreditsIncluded;
  bal.smsCreditsIncluded = plan.smsCreditsIncluded;
  bal.emailCreditsRemaining = Math.max(0, plan.emailCreditsIncluded - bal.emailCreditsUsed) + bal.emailCreditsBonus;
  bal.smsCreditsRemaining = Math.max(0, plan.smsCreditsIncluded - bal.smsCreditsUsed) + bal.smsCreditsBonus;
  bal.billingCycle = plan.billingCycle;
  bal.status = "active";
  business.planId = plan.planId;
  platformDb.transactions.unshift({ id: uid("txn"), businessId, workspaceId: bal.workspaceId, type: "adjustment", channel: "email", description: `Plan changed: ${prev?.planName ?? "previous"} → ${plan.planName}`, credits: 0, status: "completed", createdAt: now });
  if (plan.price) platformDb.invoices.unshift({ id: uid("inv"), businessId, number: `FM-${uid("").slice(-5).toUpperCase()}`, description: `${plan.planName} plan (prorated)`, amount: plan.price, status: "paid", issuedAt: now });
  pushNotification({ type: "PLAN_CHANGED", businessId, title: "Plan changed", body: `${business.name} is now on ${plan.planName} (${formatMoney(plan.price)}).`, link: "/marketing/billing/plans" });
  return bal;
}

export const billingApi = {
  /** Starts a purchase. In real mode, redirect the browser to session.url. */
  createCheckoutSession: (businessId: string, req: CheckoutRequest) =>
    call<CheckoutSession>(() => ({ mode: "mock", sessionId: uid("cs_demo") }), EP.checkoutSession(businessId), {
      method: "POST",
      body: { ...req, successUrl: `${window.location.origin}/marketing/billing?checkout=success`, cancelUrl: window.location.href },
    }),

  /** Mock only: finishes a demo checkout. Real credits arrive via Stripe webhooks. */
  completeMockCheckout: (businessId: string, req: CheckoutRequest) => {
    if (!USE_MOCKS) return Promise.reject(new Error("Purchases complete on the server after Stripe confirms payment."));
    return call<CreditBalance>(() => completeMock(businessId, req), "");
  },

  /** Downgrades may not need payment; the backend decides and may return a session. */
  changePlan: (businessId: string, plan: MarketingPlan) =>
    call<CheckoutSession>(() => ({ mode: "mock", sessionId: uid("cs_demo") }), EP.planChange(businessId), { method: "POST", body: { planId: plan.planId } }),

  getInvoices: (businessId: string) =>
    call<Invoice[]>(() => platformDb.invoices.filter((i) => i.businessId === businessId).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)), EP.invoices(businessId)),

  getPaymentMethods: (businessId: string) => call<PaymentMethod[]>(() => platformDb.paymentMethods.filter((p) => p.businessId === businessId), EP.paymentMethods(businessId)),

  /**
   * Real mode: backend returns a Stripe SetupIntent client secret; card details
   * are collected by Stripe Elements, never by this app. Mock adds a demo card.
   */
  addPaymentMethod: (businessId: string) =>
    call<PaymentMethod>(() => {
      const pm: PaymentMethod = { id: uid("pm"), businessId, brand: "Visa", last4: "4242", expMonth: 12, expYear: 2029, isDefault: !platformDb.paymentMethods.some((p) => p.businessId === businessId) };
      platformDb.paymentMethods.push(pm);
      return pm;
    }, EP.setupIntent(businessId), { method: "POST" }),

  setDefaultPaymentMethod: (businessId: string, id: string) =>
    call<void>(() => {
      platformDb.paymentMethods.forEach((p) => {
        if (p.businessId === businessId) p.isDefault = p.id === id;
      });
    }, EP.paymentMethod(businessId, id), { method: "PATCH", body: { isDefault: true } }),

  removePaymentMethod: (businessId: string, id: string) =>
    call<void>(() => {
      const i = platformDb.paymentMethods.findIndex((p) => p.id === id && p.businessId === businessId);
      if (i !== -1) platformDb.paymentMethods.splice(i, 1);
    }, EP.paymentMethod(businessId, id), { method: "DELETE" }),

  getSettings: (businessId: string) => call<BillingSettings>(() => findOrThrow(platformDb.billingSettings.map((s) => ({ ...s, id: s.businessId })), businessId, "Billing settings"), EP.billingSettings(businessId)),

  saveSettings: (businessId: string, patch: Partial<BillingSettings>) =>
    call<BillingSettings>(() => {
      const i = platformDb.billingSettings.findIndex((s) => s.businessId === businessId);
      platformDb.billingSettings[i] = { ...platformDb.billingSettings[i], ...patch, businessId };
      return platformDb.billingSettings[i];
    }, EP.billingSettings(businessId), { method: "PATCH", body: patch }),
};
