/* ============================================================================
   FOCKIS ADS — CAMPAIGN BUILDER MODEL

   Pure state + validation for the multistep builder. The rules mirror
   CreateCampaignDto and CampaignService on the API so the advertiser sees
   problems before submitting; the API still validates everything again.
============================================================================ */

export type Objective =
  | "APP_INSTALL"
  | "PRODUCT_SALES"
  | "WEBSITE_TRAFFIC"
  | "ENGAGEMENT"
  | "BRAND_AWARENESS";

export type AdFormat = "IMAGE" | "VIDEO" | "CAROUSEL";

/* Backend CampaignPlacement values offered in the builder. */
export type Placement = "FEED" | "WAVES" | "STORY" | "MARKETPLACE_BANNER";

export type CallToAction =
  | "INSTALL_NOW"
  | "DOWNLOAD"
  | "SHOP_NOW"
  | "LEARN_MORE"
  | "SIGN_UP"
  | "GET_STARTED";

export interface BuilderState {
  name: string;
  objective: Objective | "";
  adFormat: AdFormat;
  headline: string;
  description: string;
  callToAction: CallToAction | "";
  mediaUrl: string;
  thumbnailUrl: string;
  appIconUrl: string;
  appName: string;
  appStoreUrl: string;
  googlePlayUrl: string;
  placements: Placement[];
  locations: string[];
  interests: string[];
  minimumAge: string;
  maximumAge: string;
  dailyBudget: string;
  totalBudget: string;
  startDate: string; // yyyy-mm-dd (local)
  endDate: string; // yyyy-mm-dd (local) or ""
}

export const STEPS = [
  { id: "goal", label: "Goal" },
  { id: "creative", label: "Creative" },
  { id: "placements", label: "Placements" },
  { id: "audience", label: "Audience" },
  { id: "budget", label: "Budget" },
  { id: "review", label: "Review" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export const OBJECTIVES: { id: Objective; title: string; text: string; cta: CallToAction }[] = [
  { id: "BRAND_AWARENESS", title: "Awareness", text: "Show your brand to as many relevant people as possible.", cta: "LEARN_MORE" },
  { id: "ENGAGEMENT", title: "Engagement", text: "Get more likes, comments, shares and follows.", cta: "LEARN_MORE" },
  { id: "WEBSITE_TRAFFIC", title: "Website traffic", text: "Send people to your website or landing page.", cta: "LEARN_MORE" },
  { id: "PRODUCT_SALES", title: "Product sales", text: "Promote products from your Fockis store.", cta: "SHOP_NOW" },
  { id: "APP_INSTALL", title: "App installs", text: "Get people to install your app.", cta: "INSTALL_NOW" },
];

export const CTA_LABELS: Record<CallToAction, string> = {
  INSTALL_NOW: "Install now",
  DOWNLOAD: "Download",
  SHOP_NOW: "Shop now",
  LEARN_MORE: "Learn more",
  SIGN_UP: "Sign up",
  GET_STARTED: "Get started",
};

export const PLACEMENTS: { id: Placement; title: string; text: string; videoOnly?: boolean }[] = [
  { id: "FEED", title: "Home feed", text: "Between posts in the feed. Never two ads in a row." },
  { id: "WAVES", title: "Waves", text: "One sponsored video after every two Waves watched.", videoOnly: true },
  { id: "STORY", title: "Stories", text: "Full screen between stories." },
  { id: "MARKETPLACE_BANNER", title: "Marketplace", text: "Banner placements while people shop." },
];

export const HEADLINE_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const NAME_MAX = 120;

function todayLocal(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function emptyState(now: Date = new Date()): BuilderState {
  return {
    name: "",
    objective: "",
    adFormat: "IMAGE",
    headline: "",
    description: "",
    callToAction: "",
    mediaUrl: "",
    thumbnailUrl: "",
    appIconUrl: "",
    appName: "",
    appStoreUrl: "",
    googlePlayUrl: "",
    placements: ["FEED"],
    locations: [],
    interests: [],
    minimumAge: "",
    maximumAge: "",
    dailyBudget: "",
    totalBudget: "",
    startDate: todayLocal(now),
    endDate: "",
  };
}

const OBJECTIVE_IDS = OBJECTIVES.map((o) => o.id);
const FORMAT_IDS: AdFormat[] = ["IMAGE", "VIDEO", "CAROUSEL"];
const PLACEMENT_IDS = PLACEMENTS.map((p) => p.id);
const CTA_IDS = Object.keys(CTA_LABELS) as CallToAction[];

/* Accepts the UI aliases used by templates (?placement=MARKETPLACE). */
export function normalizePlacement(value: string): Placement | null {
  if (value === "MARKETPLACE") return "MARKETPLACE_BANNER";

  return (PLACEMENT_IDS as string[]).includes(value) ? (value as Placement) : null;
}

/* Builds builder state from an API campaign document (edit flow). */
export function stateFromCampaign(
  raw: Record<string, unknown>,
  now: Date = new Date(),
): BuilderState {
  const base = emptyState(now);
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  const list = (key: string) =>
    Array.isArray(raw[key])
      ? (raw[key] as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
  const numStr = (key: string) =>
    typeof raw[key] === "number" && Number.isFinite(raw[key]) ? String(raw[key]) : "";
  const dateStr = (key: string) => {
    const value = str(key);
    const time = Date.parse(value);

    return Number.isNaN(time) ? "" : todayLocal(new Date(time));
  };

  const objective = str("objective");
  const format = str("adFormat");
  const cta = str("callToAction");

  const placements = list("placements")
    .map(normalizePlacement)
    .filter((p): p is Placement => p !== null);

  return {
    ...base,
    name: str("name"),
    objective: (OBJECTIVE_IDS as string[]).includes(objective) ? (objective as Objective) : "",
    adFormat: (FORMAT_IDS as string[]).includes(format) ? (format as AdFormat) : "IMAGE",
    headline: str("headline"),
    description: str("description"),
    callToAction: (CTA_IDS as string[]).includes(cta) ? (cta as CallToAction) : "",
    mediaUrl: str("mediaUrl"),
    thumbnailUrl: str("thumbnailUrl"),
    appIconUrl: str("appIconUrl"),
    appName: str("appName"),
    appStoreUrl: str("appStoreUrl"),
    googlePlayUrl: str("googlePlayUrl"),
    placements: placements.length ? placements : base.placements,
    locations: list("locations"),
    interests: list("interests"),
    minimumAge: numStr("minimumAge"),
    maximumAge: numStr("maximumAge"),
    dailyBudget: numStr("dailyBudget"),
    totalBudget: numStr("totalBudget"),
    startDate: dateStr("startDate") || base.startDate,
    endDate: dateStr("endDate"),
  };
}

/* Applies ?objective=&format=&placement= presets. */
export function applyPreset(
  state: BuilderState,
  preset: { objective?: string; adFormat?: string; placements?: string[] },
): BuilderState {
  const next = { ...state };

  if (preset.objective && (OBJECTIVE_IDS as string[]).includes(preset.objective)) {
    next.objective = preset.objective as Objective;
  }

  if (preset.adFormat && (FORMAT_IDS as string[]).includes(preset.adFormat)) {
    next.adFormat = preset.adFormat as AdFormat;
  }

  const placements = (preset.placements ?? [])
    .map(normalizePlacement)
    .filter((p): p is Placement => p !== null);

  if (placements.length) {
    next.placements = placements;
  }

  if (next.placements.includes("WAVES")) {
    next.adFormat = "VIDEO";
  }

  return next;
}

/* ============================================================================
   VALIDATION
============================================================================ */

export type Errors = Partial<Record<keyof BuilderState | "media", string>>;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseMoney(value: string): number {
  if (!value.trim()) return NaN;

  return Number(value);
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateStep(step: StepId, s: BuilderState): Errors {
  const e: Errors = {};

  if (step === "goal") {
    if (!s.objective) e.objective = "Choose what you want this campaign to achieve.";
    if (!s.name.trim()) e.name = "Give the campaign a name only you will see.";
    else if (s.name.trim().length > NAME_MAX) e.name = `Keep the name under ${NAME_MAX} characters.`;
  }

  if (step === "creative") {
    if (!s.headline.trim()) e.headline = "Add a headline.";
    else if (s.headline.trim().length > HEADLINE_MAX) e.headline = `Headlines can be up to ${HEADLINE_MAX} characters.`;

    if (s.description.length > DESCRIPTION_MAX) e.description = `Descriptions can be up to ${DESCRIPTION_MAX} characters.`;

    if (!s.mediaUrl.trim()) e.media = s.adFormat === "VIDEO" ? "Upload a video." : "Upload an image.";
    else if (!isHttpUrl(s.mediaUrl.trim())) e.media = "The media link must start with http:// or https://.";

    if (s.thumbnailUrl.trim() && !isHttpUrl(s.thumbnailUrl.trim())) e.thumbnailUrl = "Enter a full http(s) link.";

    if (s.objective === "APP_INSTALL") {
      if (!s.appName.trim()) e.appName = "App name is required for app install campaigns.";
      if (!isHttpUrl(s.appStoreUrl.trim())) e.appStoreUrl = "Enter the App Store link.";
      if (!isHttpUrl(s.googlePlayUrl.trim())) e.googlePlayUrl = "Enter the Google Play link.";
      if (s.appIconUrl.trim() && !isHttpUrl(s.appIconUrl.trim())) e.appIconUrl = "Enter a full http(s) link.";
    }
  }

  if (step === "placements") {
    if (s.placements.length === 0) e.placements = "Choose at least one placement.";
    else if (s.placements.includes("WAVES") && s.adFormat !== "VIDEO") {
      e.placements = "Waves shows video only. Switch the creative to video or remove Waves.";
    }
  }

  if (step === "audience") {
    const min = s.minimumAge.trim() ? Number(s.minimumAge) : null;
    const max = s.maximumAge.trim() ? Number(s.maximumAge) : null;

    if (min !== null && (!Number.isInteger(min) || min < 13 || min > 100)) e.minimumAge = "Use a whole number from 13 to 100.";
    if (max !== null && (!Number.isInteger(max) || max < 13 || max > 100)) e.maximumAge = "Use a whole number from 13 to 100.";
    if (min !== null && max !== null && !e.minimumAge && !e.maximumAge && min > max) e.maximumAge = "Maximum age must be at least the minimum age.";
  }

  if (step === "budget") {
    const daily = parseMoney(s.dailyBudget);
    const total = parseMoney(s.totalBudget);

    if (!(daily >= 0.01)) e.dailyBudget = "Daily budget must be at least $0.01.";
    if (!(total >= 0.01)) e.totalBudget = "Total budget must be at least $0.01.";
    if (!e.dailyBudget && !e.totalBudget && total < daily) e.totalBudget = "Total budget can't be less than the daily budget.";

    const start = parseLocalDate(s.startDate);
    const end = s.endDate ? parseLocalDate(s.endDate) : null;

    if (!start) e.startDate = "Choose a start date.";
    if (s.endDate && !end) e.endDate = "Choose a valid end date.";
    if (start && end && end.getTime() <= start.getTime()) e.endDate = "End date must be after the start date.";
  }

  return e;
}

export function validateAll(s: BuilderState): { step: StepId; errors: Errors } | null {
  for (const step of STEPS) {
    if (step.id === "review") continue;

    const errors = validateStep(step.id, s);

    if (Object.keys(errors).length > 0) {
      return { step: step.id, errors };
    }
  }

  return null;
}

/* ============================================================================
   PAYLOAD (CreateCampaignDto / UpdateCampaignDto)
============================================================================ */

export function toPayload(s: BuilderState): Record<string, unknown> {
  const start = parseLocalDate(s.startDate);
  const end = s.endDate ? parseLocalDate(s.endDate) : null;

  if (end) {
    /* Run through the whole end day. */
    end.setHours(23, 59, 59, 999);
  }

  const optional = (value: string) => (value.trim() ? value.trim() : undefined);
  const age = (value: string) => (value.trim() ? Number(value) : undefined);
  const isApp = s.objective === "APP_INSTALL";

  const payload: Record<string, unknown> = {
    name: s.name.trim(),
    objective: s.objective,
    adFormat: s.adFormat,
    placements: Array.from(new Set(s.placements)),
    headline: s.headline.trim(),
    description: optional(s.description),
    /* Send the goal's default explicitly so the preview matches delivery. */
    callToAction:
      s.callToAction ||
      OBJECTIVES.find((o) => o.id === s.objective)?.cta ||
      undefined,
    mediaUrl: optional(s.mediaUrl),
    thumbnailUrl: optional(s.thumbnailUrl),
    appIconUrl: isApp ? optional(s.appIconUrl) : undefined,
    appName: isApp ? optional(s.appName) : undefined,
    appStoreUrl: isApp ? optional(s.appStoreUrl) : undefined,
    googlePlayUrl: isApp ? optional(s.googlePlayUrl) : undefined,
    locations: s.locations.length ? s.locations : undefined,
    interests: s.interests.length ? s.interests : undefined,
    minimumAge: age(s.minimumAge),
    maximumAge: age(s.maximumAge),
    dailyBudget: Number(s.dailyBudget),
    totalBudget: Number(s.totalBudget),
    startDate: start ? start.toISOString() : undefined,
    endDate: end ? end.toISOString() : undefined,
  };

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  return payload;
}

/* Adds a tag once, trimmed, case-insensitively unique, max 30 tags. */
export function addTag(list: string[], value: string): string[] {
  const tag = value.trim().replace(/\s+/g, " ").slice(0, 60);

  if (!tag || list.length >= 30) return list;
  if (list.some((item) => item.toLowerCase() === tag.toLowerCase())) return list;

  return [...list, tag];
}
