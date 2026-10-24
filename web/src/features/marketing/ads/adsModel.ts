/* ============================================================================
   FOCKIS ADS — VIEW MODEL

   Pure helpers used by the Fockis Ads dashboard. Nothing in this file
   talks to the network and nothing invents numbers: every metric is read
   from campaign documents returned by the existing NestJS marketing API
   (GET /marketing/campaigns and GET /marketing/dashboard).

   The server stays authoritative for campaign state. campaignActions()
   only decides which buttons to show; the backend re-checks every
   transition (submit / pause / resume / delete) and rejects invalid ones.
============================================================================ */

import type {
  Campaign,
  CampaignStatus,
} from "../types/marketingTypes";

/* ============================================================================
   ROUTES
============================================================================ */

export const ADS_BASE = "/ads";

export const adsPaths = {
  overview: ADS_BASE,
  campaigns: `${ADS_BASE}/campaigns`,
  create: `${ADS_BASE}/campaigns/create`,
  campaign: (id: string) =>
    `${ADS_BASE}/campaigns/${encodeURIComponent(id)}`,
  campaignEdit: (id: string) =>
    `${ADS_BASE}/campaigns/${encodeURIComponent(id)}/edit`,
  campaignAnalytics: (id: string) =>
    `${ADS_BASE}/campaigns/${encodeURIComponent(id)}/analytics`,
  campaignBudget: (id: string) =>
    `${ADS_BASE}/campaigns/${encodeURIComponent(id)}/budget`,
  creatives: `${ADS_BASE}/creatives`,
  analytics: `${ADS_BASE}/analytics`,
  billing: `${ADS_BASE}/billing`,
} as const;

/* ============================================================================
   CAMPAIGN VIEW

   The backend campaign schema has fields (headline, adFormat, mediaUrl,
   videoViews, installs…) that the shared frontend Campaign type does not
   declare. AdsCampaign reads them defensively.
============================================================================ */

export type AdsCampaignStatus = CampaignStatus;

export interface AdsCampaign {
  id: string;
  name: string;
  headline: string;
  description: string;
  status: AdsCampaignStatus;
  objective: string;
  adFormat: string;
  placements: string[];
  mediaUrl: string;
  thumbnailUrl: string;
  dailyBudget: number;
  totalBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  videoViews: number;
  installs: number;
  conversions: number;
  revenue: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const KNOWN_STATUSES: AdsCampaignStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "PAUSED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
];

function num(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function dateOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value) {
    return null;
  }

  return Number.isNaN(Date.parse(value)) ? null : value;
}

export function normalizeCampaign(
  raw: Campaign | Record<string, unknown>,
): AdsCampaign | null {
  const source = raw as Record<string, unknown>;

  const rawId = source._id ?? source.id;

  if (rawId == null || rawId === "") {
    return null;
  }

  const rawStatus = str(source.status).toUpperCase();

  const status = (
    KNOWN_STATUSES.includes(rawStatus as AdsCampaignStatus)
      ? rawStatus
      : "DRAFT"
  ) as AdsCampaignStatus;

  return {
    id: String(rawId),
    name: str(source.name).trim() || "Untitled campaign",
    headline: str(source.headline),
    description: str(source.description),
    status,
    objective: str(source.objective),
    adFormat: str(source.adFormat),
    placements: Array.isArray(source.placements)
      ? source.placements.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    mediaUrl: str(source.mediaUrl),
    thumbnailUrl: str(source.thumbnailUrl),
    dailyBudget: num(source.dailyBudget),
    totalBudget: num(source.totalBudget ?? source.budget),
    spent: num(source.spent ?? source.spend),
    impressions: num(source.impressions),
    clicks: num(source.clicks),
    videoViews: num(source.videoViews),
    installs: num(source.installs),
    conversions: num(source.conversions),
    revenue: num(source.revenue),
    startDate: dateOrNull(source.startDate),
    endDate: dateOrNull(source.endDate),
    createdAt: dateOrNull(source.createdAt),
    updatedAt: dateOrNull(source.updatedAt),
  };
}

export function normalizeCampaigns(
  list: unknown,
): AdsCampaign[] {
  if (!Array.isArray(list)) {
    return [];
  }

  const seen = new Set<string>();
  const result: AdsCampaign[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const campaign = normalizeCampaign(
      item as Record<string, unknown>,
    );

    if (campaign && !seen.has(campaign.id)) {
      seen.add(campaign.id);
      result.push(campaign);
    }
  }

  return result;
}

/* ============================================================================
   TOTALS
============================================================================ */

export interface AdsTotals {
  campaignCount: number;
  activeCount: number;
  impressions: number;
  clicks: number;
  videoViews: number;
  installs: number;
  conversions: number;
  spent: number;
  revenue: number;
  /* Ratios (0–1). null when the denominator is zero. */
  ctr: number | null;
  conversionRate: number | null;
  roas: number | null;
}

export function computeTotals(
  campaigns: AdsCampaign[],
): AdsTotals {
  const totals = campaigns.reduce(
    (acc, campaign) => {
      acc.impressions += campaign.impressions;
      acc.clicks += campaign.clicks;
      acc.videoViews += campaign.videoViews;
      acc.installs += campaign.installs;
      acc.conversions += campaign.conversions;
      acc.spent += campaign.spent;
      acc.revenue += campaign.revenue;

      if (campaign.status === "ACTIVE") {
        acc.activeCount += 1;
      }

      return acc;
    },
    {
      activeCount: 0,
      impressions: 0,
      clicks: 0,
      videoViews: 0,
      installs: 0,
      conversions: 0,
      spent: 0,
      revenue: 0,
    },
  );

  return {
    campaignCount: campaigns.length,
    ...totals,
    ctr: ratio(totals.clicks, totals.impressions),
    conversionRate: ratio(totals.conversions, totals.clicks),
    roas: ratio(totals.revenue, totals.spent),
  };
}

export function ratio(
  numerator: number,
  denominator: number,
): number | null {
  if (!(denominator > 0)) {
    return null;
  }

  return numerator / denominator;
}

/* ============================================================================
   CAMPAIGN ACTIONS

   Mirrors the transitions enforced by CampaignService on the server:
   - submitForReview: DRAFT | REJECTED  → PENDING_REVIEW
   - pause:           ACTIVE            → PAUSED
   - resume:          PAUSED            → ACTIVE
   - update:          not ACTIVE, not PENDING_REVIEW
   - remove:          not ACTIVE, not PENDING_REVIEW
============================================================================ */

export type CampaignActionId =
  | "view"
  | "edit"
  | "submit"
  | "pause"
  | "resume"
  | "analytics"
  | "duplicate"
  | "delete";

export function campaignActions(
  status: AdsCampaignStatus,
): CampaignActionId[] {
  switch (status) {
    case "DRAFT":
      return ["view", "edit", "submit", "duplicate", "delete"];
    case "REJECTED":
      return ["view", "edit", "submit", "duplicate", "delete"];
    case "PENDING_REVIEW":
      return ["view", "duplicate"];
    case "ACTIVE":
      return ["view", "pause", "analytics", "duplicate"];
    case "PAUSED":
      return ["view", "resume", "edit", "analytics", "duplicate", "delete"];
    case "COMPLETED":
    case "CANCELLED":
      return ["view", "analytics", "duplicate", "delete"];
    default:
      return ["view"];
  }
}

export const STATUS_LABEL: Record<AdsCampaignStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "In review",
  ACTIVE: "Running",
  PAUSED: "Paused",
  REJECTED: "Needs changes",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/*
 * Builds a create payload for "Duplicate". The copy always starts as a
 * DRAFT on the server (CampaignService.create forces DRAFT), carries no
 * metrics, and has no dates so the advertiser must re-schedule it.
 */
export function duplicatePayload(
  raw: Record<string, unknown>,
  now: Date = new Date(),
): Record<string, unknown> {
  const copyKeys = [
    "objective",
    "adFormat",
    "placements",
    "headline",
    "description",
    "mediaUrl",
    "thumbnailUrl",
    "appIconUrl",
    "appName",
    "appStoreUrl",
    "googlePlayUrl",
    "callToAction",
    "locations",
    "interests",
    "categories",
    "keywords",
    "minimumAge",
    "maximumAge",
    "dailyBudget",
    "totalBudget",
    "storeId",
  ];

  const payload: Record<string, unknown> = {};

  for (const key of copyKeys) {
    const value = raw[key];

    if (value !== undefined && value !== null && value !== "") {
      payload[key] = value;
    }
  }

  const name = str(raw.name).trim() || "Campaign";

  payload.name = `${name} (copy)`.slice(0, 120);

  /*
   * CreateCampaignDto requires startDate. The copy starts now and has no
   * end date; the advertiser re-schedules it before submitting.
   */
  payload.startDate = now.toISOString();

  return payload;
}

/* ============================================================================
   INSIGHTS

   Insights are rules over real numbers. Each one cites the metric it was
   built from. When there is not enough data, we say so instead of
   guessing.
============================================================================ */

export type InsightTone = "positive" | "warning" | "info";

export interface AdsInsight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  campaignId?: string;
}

/* Below this many impressions a CTR comparison is noise. */
export const MIN_IMPRESSIONS_FOR_CTR = 500;

export function deriveInsights(
  campaigns: AdsCampaign[],
  now: Date = new Date(),
): AdsInsight[] {
  const insights: AdsInsight[] = [];

  if (campaigns.length === 0) {
    return insights;
  }

  const totals = computeTotals(campaigns);

  /* Campaigns that need the advertiser. */

  const rejected = campaigns.filter((c) => c.status === "REJECTED");

  if (rejected.length > 0) {
    insights.push({
      id: "rejected",
      tone: "warning",
      title:
        rejected.length === 1
          ? `"${rejected[0].name}" needs changes`
          : `${rejected.length} campaigns need changes`,
      detail:
        "Review the moderation feedback, edit the campaign, and resubmit it.",
      campaignId: rejected.length === 1 ? rejected[0].id : undefined,
    });
  }

  const pending = campaigns.filter((c) => c.status === "PENDING_REVIEW");

  if (pending.length > 0) {
    insights.push({
      id: "pending",
      tone: "info",
      title: `${pending.length} ${pending.length === 1 ? "campaign is" : "campaigns are"} in review`,
      detail:
        "Campaigns start delivering only after a Fockis reviewer approves them.",
    });
  }

  /* Budget pacing: active campaigns that have used ≥ 85% of total budget. */

  for (const campaign of campaigns) {
    if (
      campaign.status === "ACTIVE" &&
      campaign.totalBudget > 0 &&
      campaign.spent / campaign.totalBudget >= 0.85
    ) {
      const pct = Math.min(
        100,
        Math.round((campaign.spent / campaign.totalBudget) * 100),
      );

      insights.push({
        id: `budget-${campaign.id}`,
        tone: "warning",
        title: `"${campaign.name}" has used ${pct}% of its budget`,
        detail:
          "Delivery stops when the total budget is spent. Raise the budget in Billing to keep it running.",
        campaignId: campaign.id,
      });
    }
  }

  /* Ending soon: active campaigns ending in the next 3 days. */

  const threeDays = 3 * 24 * 60 * 60 * 1000;

  for (const campaign of campaigns) {
    if (campaign.status !== "ACTIVE" || !campaign.endDate) {
      continue;
    }

    const remaining = Date.parse(campaign.endDate) - now.getTime();

    if (remaining > 0 && remaining <= threeDays) {
      const days = Math.max(1, Math.ceil(remaining / (24 * 60 * 60 * 1000)));

      insights.push({
        id: `ending-${campaign.id}`,
        tone: "info",
        title: `"${campaign.name}" ends in ${days} ${days === 1 ? "day" : "days"}`,
        detail: "Extend the end date if you want it to keep delivering.",
        campaignId: campaign.id,
      });
    }
  }

  /* Best CTR among campaigns with a meaningful number of impressions. */

  const measurable = campaigns.filter(
    (c) => c.impressions >= MIN_IMPRESSIONS_FOR_CTR,
  );

  if (measurable.length >= 2 && totals.ctr !== null) {
    const best = [...measurable].sort(
      (a, b) => b.clicks / b.impressions - a.clicks / a.impressions,
    )[0];

    const bestCtr = best.clicks / best.impressions;

    if (bestCtr > totals.ctr * 1.2) {
      insights.push({
        id: `best-ctr-${best.id}`,
        tone: "positive",
        title: `"${best.name}" leads on click-through rate`,
        detail: `${formatPercent(bestCtr)} CTR vs. ${formatPercent(totals.ctr)} across all campaigns. Consider reusing its creative.`,
        campaignId: best.id,
      });
    }
  }

  /* Running but not delivering. */

  const silent = campaigns.filter(
    (c) => c.status === "ACTIVE" && c.impressions === 0,
  );

  if (silent.length > 0) {
    insights.push({
      id: "silent",
      tone: "info",
      title:
        silent.length === 1
          ? `"${silent[0].name}" has no impressions yet`
          : `${silent.length} running campaigns have no impressions yet`,
      detail:
        "New campaigns can take time to deliver. Broad targeting and more placements help them reach people sooner.",
      campaignId: silent.length === 1 ? silent[0].id : undefined,
    });
  }

  const drafts = campaigns.filter((c) => c.status === "DRAFT");

  if (drafts.length > 0) {
    insights.push({
      id: "drafts",
      tone: "info",
      title: `${drafts.length} ${drafts.length === 1 ? "draft is" : "drafts are"} waiting`,
      detail: "Finish and submit drafts so they can be reviewed.",
    });
  }

  return insights;
}

/* ============================================================================
   RAILS
============================================================================ */

export function sortByRecent(campaigns: AdsCampaign[]): AdsCampaign[] {
  const time = (c: AdsCampaign) =>
    Date.parse(c.updatedAt ?? c.createdAt ?? "") || 0;

  return [...campaigns].sort(
    (a, b) => time(b) - time(a) || a.id.localeCompare(b.id),
  );
}

export function topPerforming(
  campaigns: AdsCampaign[],
  limit = 8,
): AdsCampaign[] {
  return campaigns
    .filter((c) => c.impressions >= MIN_IMPRESSIONS_FOR_CTR)
    .sort(
      (a, b) =>
        b.clicks / b.impressions - a.clicks / a.impressions ||
        b.impressions - a.impressions ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}

/* ============================================================================
   FORMATTING
============================================================================ */

const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatCount(value: number): string {
  return value >= 10000 ? compact.format(value) : value.toLocaleString();
}

export function formatMoney(value: number): string {
  return money.format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  const pct = value * 100;

  return `${pct >= 10 ? pct.toFixed(1) : pct.toFixed(2)}%`;
}

export function humanize(value: string): string {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
