// Plans and credit packages. The backend is the source of truth for names,
// credits, prices, and availability; nothing here is hard-coded in components.

import type { CreditChannel, CreditPackage, MarketingPlan } from "../types/platform.types";
import { PLATFORM_ENDPOINTS as EP } from "./endpoints";
import { call } from "./httpClient";
import { platformDb } from "./platformDb";
import { uid } from "../utils/format";

export const plansApi = {
  /** Public plans plus any custom/promotional plan assigned to this business. */
  listPlans: (businessId?: string) =>
    call<MarketingPlan[]>(() => {
      const assigned = platformDb.businesses.find((b) => b.id === businessId)?.planId;
      return platformDb.plans
        .filter((p) => p.status === "active" || p.planId === assigned || (businessId && p.businessId === businessId))
        .sort((a, b) => a.rank - b.rank);
    }, EP.plans, { query: { businessId } }),

  /** Agency view: every plan including hidden custom ones. */
  listAllPlans: () => call<MarketingPlan[]>(() => [...platformDb.plans].sort((a, b) => a.rank - b.rank), EP.plans, { query: { scope: "all" } }),

  getPlan: (planId: string) =>
    call<MarketingPlan>(() => {
      const p = platformDb.plans.find((x) => x.planId === planId);
      if (!p) throw new Error("Plan not found.");
      return p;
    }, `${EP.plans}/${planId}`),

  listPackages: (channel?: CreditChannel) =>
    call<CreditPackage[]>(() => platformDb.packages.filter((p) => p.status === "active" && (!channel || p.channel === channel)), EP.creditPackages, { query: { channel } }),

  /** Agency: create a custom plan for one client. */
  createCustomPlan: (businessId: string, input: { planName: string; emailCredits: number; smsCredits: number; priceDollars: number | null }) =>
    call<MarketingPlan>(() => {
      const plan: MarketingPlan = {
        planId: uid("plan"),
        planName: input.planName,
        kind: "agency_managed",
        rank: 3,
        businessId,
        description: "Custom plan managed by the Fockis agency.",
        emailCreditsIncluded: input.emailCredits,
        smsCreditsIncluded: input.smsCredits,
        price: input.priceDollars === null ? null : { amount: Math.round(input.priceDollars * 100), currency: "USD" },
        billingCycle: "monthly",
        features: [`${input.emailCredits.toLocaleString()} email credits / month`, `${input.smsCredits.toLocaleString()} SMS credits / month`, "Managed by Fockis agency"],
        limits: { contacts: null, seats: null, workspaces: 1 },
        status: "hidden",
      };
      platformDb.plans.push(plan);
      return plan;
    }, EP.plans, { method: "POST", body: { businessId, ...input } }),
};
