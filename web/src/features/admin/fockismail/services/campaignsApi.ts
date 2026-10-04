import type {
  Campaign,
  CampaignDraftInput,
  CampaignFilters,
  CampaignStats,
  CampaignStatus,
} from "../types/fockis-mail.types";

import { ENDPOINTS } from "./endpoints";
import { call } from "./httpClient";
import {
  activeBusinessId,
  db,
  findOrThrow,
  removeById,
  upsert,
} from "./mockDb";
import { rate, uid } from "../utils/format";

const EMPTY_STATS: CampaignStats = {
  recipients: 0,
  delivered: 0,
  opens: 0,
  uniqueOpens: 0,
  clicks: 0,
  uniqueClicks: 0,
  bounces: 0,
  unsubscribes: 0,
  spamComplaints: 0,
  conversions: 0,
  revenue: 0,
};

export function openRate(c: Campaign): number {
  return rate(c.stats.uniqueOpens, c.stats.delivered);
}

export function clickRate(c: Campaign): number {
  return rate(c.stats.uniqueClicks, c.stats.delivered);
}

function matches(
  c: Campaign,
  f: CampaignFilters,
): boolean {
  if (
    f.status &&
    f.status !== "all" &&
    c.status !== f.status
  ) {
    return false;
  }

  if (
    f.type &&
    f.type !== "all" &&
    c.type !== f.type
  ) {
    return false;
  }

  if (
    f.audienceId &&
    f.audienceId !== "all" &&
    c.audienceId !== f.audienceId
  ) {
    return false;
  }

  if (f.search) {
    const q = f.search.toLowerCase();

    if (
      !c.name.toLowerCase().includes(q) &&
      !c.subject.toLowerCase().includes(q)
    ) {
      return false;
    }
  }

  if (
    f.performance &&
    f.performance !== "all"
  ) {
    if (!c.stats.delivered) {
      return false;
    }

    const o = openRate(c);

    if (
      f.performance === "high" &&
      o < 40
    ) {
      return false;
    }

    if (
      f.performance === "average" &&
      (o < 25 || o >= 40)
    ) {
      return false;
    }

    if (
      f.performance === "low" &&
      o >= 25
    ) {
      return false;
    }
  }

  return true;
}

function setStatus(
  id: string,
  status: CampaignStatus,
  patch: Partial<Campaign> = {},
): Campaign {
  const c = findOrThrow(
    db.campaigns,
    id,
    "Campaign",
  );

  return upsert(db.campaigns, {
    ...c,
    ...patch,
    status,
  });
}

export const campaignsApi = {
  list: (filters: CampaignFilters = {}) =>
    call<Campaign[]>(
      () =>
        db.campaigns.filter((c) =>
          matches(c, filters),
        ),
      ENDPOINTS.campaigns,
      {
        query: {
          ...filters,
        },
      },
    ),

  get: (id: string) => {
    if (!id || id === "new") {
      return Promise.reject(
        new Error(
          "A new campaign does not have an ID yet.",
        ),
      );
    }

    return call<Campaign>(
      () =>
        findOrThrow(
          db.campaigns,
          id,
          "Campaign",
        ),
      ENDPOINTS.campaign(id),
    );
  },

  create: (input: CampaignDraftInput) =>
    call<Campaign>(
      () =>
        upsert(db.campaigns, {
          ...input,
          id: uid("cmp"),
          businessId: activeBusinessId(),
          status: "draft",
          createdAt: new Date().toISOString(),
          stats: {
            ...EMPTY_STATS,
          },
        }),
      ENDPOINTS.campaigns,
      {
        method: "POST",
        body: input,
      },
    ),

  update: (
    id: string,
    input: Partial<CampaignDraftInput>,
  ) =>
    call<Campaign>(
      () =>
        upsert(db.campaigns, {
          ...findOrThrow(
            db.campaigns,
            id,
            "Campaign",
          ),
          ...input,
        }),
      ENDPOINTS.campaign(id),
      {
        method: "PATCH",
        body: input,
      },
    ),

  duplicate: (id: string) =>
    call<Campaign>(
      () => {
        const c = findOrThrow(
          db.campaigns,
          id,
          "Campaign",
        );

        return upsert(db.campaigns, {
          ...structuredClone(c),
          id: uid("cmp"),
          businessId: activeBusinessId(),
          name: `${c.name} (copy)`,
          status: "draft",
          createdAt: new Date().toISOString(),
          scheduledAt: undefined,
          sentAt: undefined,
          stats: {
            ...EMPTY_STATS,
          },
        });
      },
      ENDPOINTS.campaignAction(
        id,
        "duplicate",
      ),
      {
        method: "POST",
      },
    ),

  schedule: (
    id: string,
    at: string,
  ) =>
    call<Campaign>(
      () =>
        setStatus(
          id,
          "scheduled",
          {
            scheduledAt: at,
          },
        ),
      ENDPOINTS.campaignAction(
        id,
        "schedule",
      ),
      {
        method: "POST",
        body: {
          scheduledAt: at,
        },
      },
    ),

  sendNow: (id: string) =>
    call<Campaign>(
      () =>
        setStatus(
          id,
          "sending",
          {
            sentAt:
              new Date().toISOString(),
          },
        ),
      ENDPOINTS.campaignAction(
        id,
        "send",
      ),
      {
        method: "POST",
      },
    ),

  pause: (id: string) =>
    call<Campaign>(
      () =>
        setStatus(
          id,
          "paused",
        ),
      ENDPOINTS.campaignAction(
        id,
        "pause",
      ),
      {
        method: "POST",
      },
    ),

  resume: (id: string) =>
    call<Campaign>(
      () =>
        setStatus(
          id,
          "scheduled",
        ),
      ENDPOINTS.campaignAction(
        id,
        "resume",
      ),
      {
        method: "POST",
      },
    ),

  archive: (id: string) =>
    call<Campaign>(
      () =>
        setStatus(
          id,
          "archived",
        ),
      ENDPOINTS.campaignAction(
        id,
        "archive",
      ),
      {
        method: "POST",
      },
    ),

  remove: (id: string) =>
    call<void>(
      () =>
        removeById(
          db.campaigns,
          id,
        ),
      ENDPOINTS.campaign(id),
      {
        method: "DELETE",
      },
    ),

  sendTest: (
    id: string,
    emails: string[],
  ) =>
    call<{ accepted: string[] }>(
      () => ({
        accepted: emails,
      }),
      ENDPOINTS.campaignAction(
        id,
        "test",
      ),
      {
        method: "POST",
        body: {
          emails,
        },
      },
    ),

  importFromHtml: (
    name: string,
    html: string,
  ) =>
    call<Campaign>(
      () =>
        upsert(db.campaigns, {
          id: uid("cmp"),
          businessId: activeBusinessId(),
          name,
          subject: name,
          fromName: db.settings.fromName,
          fromEmail: db.settings.fromEmail,
          replyTo: db.settings.replyTo,
          type: "regular",
          status: "draft",
          audienceId:
            db.settings.defaultAudienceId,
          tagIds: [],
          createdAt:
            new Date().toISOString(),
          stats: {
            ...EMPTY_STATS,
          },
          description: `Imported HTML (${html.length} characters)`,
        }),
      ENDPOINTS.campaignImport,
      {
        method: "POST",
        body: {
          name,
          html,
        },
      },
    ),
};