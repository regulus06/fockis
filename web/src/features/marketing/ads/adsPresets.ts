/* ============================================================================
   FOCKIS ADS — PRESETS

   Starting points for the campaign builder. These are guidance only:
   they pre-fill objective, format and placement in CampaignForm and carry
   no statistics.
============================================================================ */

import { adsPaths } from "./adsModel";

export type PresetObjective =
  | "APP_INSTALL"
  | "PRODUCT_SALES"
  | "WEBSITE_TRAFFIC"
  | "ENGAGEMENT"
  | "BRAND_AWARENESS";

export type PresetFormat = "VIDEO" | "IMAGE" | "CAROUSEL";

/* UI placement ids understood by CampaignForm. */
export type PresetPlacement = "FEED" | "WAVES" | "STORY" | "MARKETPLACE";

export const PRESET_OBJECTIVES: PresetObjective[] = [
  "APP_INSTALL",
  "PRODUCT_SALES",
  "WEBSITE_TRAFFIC",
  "ENGAGEMENT",
  "BRAND_AWARENESS",
];

export const PRESET_FORMATS: PresetFormat[] = ["VIDEO", "IMAGE", "CAROUSEL"];

export const PRESET_PLACEMENTS: PresetPlacement[] = [
  "FEED",
  "WAVES",
  "STORY",
  "MARKETPLACE",
];

export function createUrl(preset: {
  objective?: PresetObjective;
  format?: PresetFormat;
  placement?: PresetPlacement;
}): string {
  const params = new URLSearchParams();

  if (preset.objective) params.set("objective", preset.objective);
  if (preset.format) params.set("format", preset.format);
  if (preset.placement) params.set("placement", preset.placement);

  const query = params.toString();

  return query ? `${adsPaths.create}?${query}` : adsPaths.create;
}

/*
 * Reads ?objective=&format=&placement= safely. Unknown values are
 * dropped so a hand-edited URL can never push an invalid enum to the API.
 */
export function readPreset(search: string): {
  objective?: PresetObjective;
  adFormat?: PresetFormat;
  placements?: PresetPlacement[];
} {
  const params = new URLSearchParams(search);
  const objective = params.get("objective") as PresetObjective | null;
  const format = params.get("format") as PresetFormat | null;
  const placement = params.get("placement") as PresetPlacement | null;

  const result: {
    objective?: PresetObjective;
    adFormat?: PresetFormat;
    placements?: PresetPlacement[];
  } = {};

  if (objective && PRESET_OBJECTIVES.includes(objective)) {
    result.objective = objective;
  }

  if (format && PRESET_FORMATS.includes(format)) {
    result.adFormat = format;
  }

  if (placement && PRESET_PLACEMENTS.includes(placement)) {
    result.placements = [placement];

    /* Waves only plays video. */
    if (placement === "WAVES") {
      result.adFormat = "VIDEO";
    }
  }

  return result;
}

export interface TemplatePreset {
  id: string;
  title: string;
  text: string;
  objective: PresetObjective;
  format: PresetFormat;
  placement: PresetPlacement;
}

export const TEMPLATES: TemplatePreset[] = [
  {
    id: "installs",
    title: "Get app installs",
    text: "Short vertical video with an Install button, shown between Waves.",
    objective: "APP_INSTALL",
    format: "VIDEO",
    placement: "WAVES",
  },
  {
    id: "sales",
    title: "Sell products",
    text: "Product image with Shop now, shown in Marketplace.",
    objective: "PRODUCT_SALES",
    format: "IMAGE",
    placement: "MARKETPLACE",
  },
  {
    id: "traffic",
    title: "Drive website visits",
    text: "Feed post that links to your site.",
    objective: "WEBSITE_TRAFFIC",
    format: "IMAGE",
    placement: "FEED",
  },
  {
    id: "engagement",
    title: "Grow engagement",
    text: "Video in the home feed built for likes, comments and shares.",
    objective: "ENGAGEMENT",
    format: "VIDEO",
    placement: "FEED",
  },
  {
    id: "awareness",
    title: "Build awareness",
    text: "Full-screen story between the stories people follow.",
    objective: "BRAND_AWARENESS",
    format: "VIDEO",
    placement: "STORY",
  },
];

export interface FormatPreset {
  placement: PresetPlacement;
  title: string;
  text: string;
  spec: string;
}

export const FORMATS: FormatPreset[] = [
  {
    placement: "FEED",
    title: "Feed",
    text: "Appears between posts in the home feed, never two ads in a row.",
    spec: "Image, video or carousel · 1:1 or 4:5",
  },
  {
    placement: "WAVES",
    title: "Waves",
    text: "One sponsored video after every two Waves people watch.",
    spec: "Vertical video · 9:16",
  },
  {
    placement: "STORY",
    title: "Stories",
    text: "Full-screen between stories, clearly labeled Sponsored.",
    spec: "Image or video · 9:16",
  },
  {
    placement: "MARKETPLACE",
    title: "Marketplace",
    text: "Banner and product placements while people shop.",
    spec: "Image · 16:9 or 1:1",
  },
];
