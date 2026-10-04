// Account-level services (integrations, settings, domains) plus a single
// aggregate export so components can import one object if they prefer.

import type {
  MarketingIntegration,
  MarketingSettings,
  SendingDomain,
} from "../types/mailchimp.types";
import { ENDPOINTS } from "./endpoints";
import { call } from "./httpClient";
import { activeBusinessId, db, findOrThrow, removeById, upsert } from "./mockDb";
import { uid } from "../utils/format";
import { campaignsApi } from "./campaignsApi";
import { audienceApi } from "./audienceApi";
import { templatesApi } from "./templatesApi";
import { automationApi } from "./automationApi";
import { analyticsApi } from "./analyticsApi";
import { contentApi } from "./contentApi";
import { channelsApi } from "./channelsApi";

export const accountApi = {
  integrations: () => call<MarketingIntegration[]>(() => db.integrations, ENDPOINTS.integrations),

  /**
   * Connecting must happen server-side (OAuth or a key stored by the backend).
   * The frontend never sends or receives provider secrets.
   */
  setIntegrationConnected: (id: string, connected: boolean) =>
    call<MarketingIntegration>(() => {
      const i = findOrThrow(db.integrations, id, "Integration");
      return upsert(db.integrations, {
        ...i,
        connected,
        connectedAccount: connected ? i.connectedAccount ?? "Connected (demo)" : undefined,
        lastSyncAt: connected ? new Date().toISOString() : undefined,
      });
    }, ENDPOINTS.integration(id), { method: "PATCH", body: { connected } }),

  settings: () => call<MarketingSettings>(() => db.settings, ENDPOINTS.settings),

  saveSettings: (patch: Partial<MarketingSettings>) =>
    call<MarketingSettings>(() => {
      db.settings = { ...db.settings, ...patch };
      return db.settings;
    }, ENDPOINTS.settings, { method: "PATCH", body: patch }),

  domains: () => call<SendingDomain[]>(() => db.domains, ENDPOINTS.domains),

  addDomain: (domain: string) =>
    call<SendingDomain>(
      () =>
        upsert(db.domains, {
          id: uid("dom"), businessId: activeBusinessId(), domain, verified: false, dkim: "pending", spf: "pending", dmarc: "missing",
          addedAt: new Date().toISOString(),
        }),
      ENDPOINTS.domains,
      { method: "POST", body: { domain } },
    ),

  verifyDomain: (id: string) =>
    call<SendingDomain>(() => {
      const d = findOrThrow(db.domains, id, "Domain");
      // Demo: verification succeeds for DKIM/SPF; DMARC stays as-is.
      return upsert(db.domains, { ...d, verified: true, dkim: "valid", spf: "valid" });
    }, `${ENDPOINTS.domain(id)}/verify`, { method: "POST" }),

  removeDomain: (id: string) => call<void>(() => removeById(db.domains, id), ENDPOINTS.domain(id), { method: "DELETE" }),
};

export const mailchimpApi = {
  campaigns: campaignsApi,
  audience: audienceApi,
  templates: templatesApi,
  automations: automationApi,
  analytics: analyticsApi,
  content: contentApi,
  channels: channelsApi,
  account: accountApi,
};

export { campaignsApi, audienceApi, templatesApi, automationApi, analyticsApi, contentApi, channelsApi };
