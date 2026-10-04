// Transactional email, SMS, and social campaign services.
// SMS and social publishing are UI-only until a backend provider exists.

import type {
  SmsCampaign,
  SocialCampaign,
  TransactionalTemplate,
} from "../types/mailchimp.types";
import { ENDPOINTS } from "./endpoints";
import { call } from "./httpClient";
import { activeBusinessId, db, findOrThrow, upsert } from "./mockDb";
import { uid } from "../utils/format";

export const channelsApi = {
  transactional: () => call<TransactionalTemplate[]>(() => db.transactional, ENDPOINTS.transactional),

  setTransactionalStatus: (id: string, status: TransactionalTemplate["status"]) =>
    call<TransactionalTemplate>(
      () => upsert(db.transactional, { ...findOrThrow(db.transactional, id, "Template"), status }),
      ENDPOINTS.transactionalItem(id),
      { method: "PATCH", body: { status } },
    ),

  smsCampaigns: () => call<SmsCampaign[]>(() => db.sms, ENDPOINTS.smsCampaigns),

  createSms: (name: string, message: string, scheduledAt?: string) =>
    call<SmsCampaign>(
      () =>
        upsert(db.sms, {
          id: uid("sms"), businessId: activeBusinessId(), name, message, status: scheduledAt ? "scheduled" : "draft",
          recipients: 0, delivered: 0, clicks: 0, scheduledAt,
        }),
      ENDPOINTS.smsCampaigns,
      { method: "POST", body: { name, message, scheduledAt } },
    ),

  socialCampaigns: () => call<SocialCampaign[]>(() => db.social, ENDPOINTS.socialCampaigns),

  saveSocial: (input: Omit<SocialCampaign, "id" | "businessId" | "reach" | "engagement">) =>
    call<SocialCampaign>(
      () => upsert(db.social, { ...input, id: uid("soc"), businessId: activeBusinessId(), reach: 0, engagement: 0 }),
      ENDPOINTS.socialCampaigns,
      { method: "POST", body: input },
    ),
};
