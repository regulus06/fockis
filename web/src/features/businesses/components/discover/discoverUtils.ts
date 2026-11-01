import type { Business } from "../../types/business.types";
import { formatTime, getHoursForDay, getOpenNowStatus, isBusinessVerified } from "../../utils/businessUtils";

/* ============================================================================
   DISCOVER HELPERS
   Small display helpers for the redesigned directory. Everything is derived
   from fields the API already returns (hours, timeZone, coordinates…).
============================================================================ */

/** Day index (0 = Sunday) right now in the business's own time zone. */
function todayIn(timeZone?: string): number {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date());

    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  } catch {
    return new Date().getDay();
  }
}

export interface OpenLabel {
  status: "open" | "closed";
  text: string;
}

/** "Open · Closes 9:00 PM", "Open · 24 Hours", "Closed" — or null without hours. */
export function openLabel(business: Pick<Business, "hours" | "timeZone">): OpenLabel | null {
  const status = getOpenNowStatus(business);

  if (!status) return null;

  if (status === "closed") return { status, text: "" };

  const entry = getHoursForDay(business.hours, todayIn(business.timeZone));

  if (entry?.open === "00:00" && (entry.close === "23:59" || entry.close === "00:00")) {
    return { status, text: "24 Hours" };
  }

  return { status, text: entry?.close ? `Closes ${formatTime(entry.close)}` : "" };
}

/** Miles for US-style locales, kilometres elsewhere. */
export function shortDistance(km: number): string {
  const imperial = typeof navigator !== "undefined" && /^en-(US|LR|MM)$/i.test(navigator.language);

  if (imperial) {
    const miles = km * 0.621371;

    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
  }

  return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export type BusinessBadge = { kind: "spotlight" | "verified" | "deal"; label: string } | null;

/** One badge per card, strongest real signal first. */
export function businessBadge(business: Business, activeDeals: number): BusinessBadge {
  if (business.spotlightEnabled) return { kind: "spotlight", label: "Spotlight" };
  if (isBusinessVerified(business)) return { kind: "verified", label: "Verified" };
  if (activeDeals > 0) return { kind: "deal", label: activeDeals === 1 ? "Deal" : `${activeDeals} Deals` };

  return null;
}

export const CATEGORY_TONES: Record<string, string> = {
  AUTOMOTIVE: "#2563eb",
  RESTAURANT: "#dc2626",
  REAL_ESTATE: "#1d4ed8",
  RETAIL: "#ea580c",
  BEAUTY: "#c026d3",
  HEALTH: "#16a34a",
  FITNESS: "#0d9488",
  TECHNOLOGY: "#4f46e5",
  PROFESSIONAL_SERVICES: "#334155",
  HOME_SERVICES: "#b45309",
  ENTERTAINMENT: "#9333ea",
  TRAVEL: "#0284c7",
  EDUCATION: "#0891b2",
  FINANCE: "#15803d",
  OTHER: "#475569",
};
