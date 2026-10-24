import {
  Briefcase,
  Building2,
  Car,
  Clapperboard,
  Cpu,
  Dumbbell,
  GraduationCap,
  Hammer,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import type {
  Business,
  BusinessCategory,
  BusinessDeal,
  BusinessHoursEntry,
  BusinessPrimaryAction,
  BusinessSize,
  BusinessSocialLinks,
  BusinessStoreSummary,
} from "../types/business.types";


/* ============================================================================
   CATEGORIES

   Single source of truth for the business categories defined by the
   backend enum (apps/api/src/businesses/enums/business-category.enum.ts).
============================================================================ */

export interface BusinessCategoryOption {
  value: BusinessCategory;
  label: string;
  icon: LucideIcon;
}

export const BUSINESS_CATEGORIES: BusinessCategoryOption[] = [
  { value: "AUTOMOTIVE", label: "Automotive", icon: Car },
  { value: "RESTAURANT", label: "Restaurant", icon: UtensilsCrossed },
  { value: "REAL_ESTATE", label: "Real Estate", icon: Home },
  { value: "RETAIL", label: "Retail", icon: ShoppingBag },
  { value: "BEAUTY", label: "Beauty", icon: Sparkles },
  { value: "HEALTH", label: "Health", icon: HeartPulse },
  { value: "FITNESS", label: "Fitness", icon: Dumbbell },
  { value: "TECHNOLOGY", label: "Technology", icon: Cpu },
  { value: "PROFESSIONAL_SERVICES", label: "Professional Services", icon: Briefcase },
  { value: "HOME_SERVICES", label: "Home Services", icon: Hammer },
  { value: "ENTERTAINMENT", label: "Entertainment", icon: Clapperboard },
  { value: "TRAVEL", label: "Travel", icon: Plane },
  { value: "EDUCATION", label: "Education", icon: GraduationCap },
  { value: "FINANCE", label: "Finance", icon: Landmark },
  { value: "OTHER", label: "Other / Company", icon: Building2 },
];

const CATEGORY_BY_VALUE = new Map(
  BUSINESS_CATEGORIES.map((category) => [category.value, category]),
);

export function isBusinessCategory(
  value: unknown,
): value is BusinessCategory {
  return (
    typeof value === "string" &&
    CATEGORY_BY_VALUE.has(value as BusinessCategory)
  );
}

export function getCategoryOption(
  category?: string,
): BusinessCategoryOption {
  return (
    CATEGORY_BY_VALUE.get(category as BusinessCategory) ??
    BUSINESS_CATEGORIES[BUSINESS_CATEGORIES.length - 1]
  );
}

export function getCategoryLabel(category?: string): string {
  return getCategoryOption(category).label;
}


/* ============================================================================
   BUSINESS SIZE
============================================================================ */

export const BUSINESS_SIZES: Array<{
  value: BusinessSize;
  label: string;
}> = [
  { value: "SOLO", label: "Self-employed" },
  { value: "SMALL", label: "2–10 employees" },
  { value: "MEDIUM", label: "11–50 employees" },
  { value: "LARGE", label: "51–200 employees" },
  { value: "ENTERPRISE", label: "200+ employees" },
];

export function getBusinessSizeLabel(size?: string): string | null {
  return BUSINESS_SIZES.find((option) => option.value === size)?.label ?? null;
}


/* ============================================================================
   ROUTES

   Routes registered in App.tsx and features/fockis-shop/routes/shopRoutes.tsx.
============================================================================ */

export function getBusinessRoute(businessId: string): string {
  return `/businesses/${encodeURIComponent(businessId)}`;
}

export const BUSINESS_MANAGER_ROUTE = "/business/manager";

export const CREATE_BUSINESS_ROUTE = "/businesses/create";

export function getStoreRoute(slug: string): string {
  return `/shop/store/${encodeURIComponent(slug)}`;
}

export function getProductRoute(productId: string): string {
  return `/shop/product/${encodeURIComponent(productId)}`;
}


/* ============================================================================
   SAFE EXTERNAL URLS
============================================================================ */

/*
 * Returns a normalized http(s) URL, or null when the value is not a safe,
 * well-formed web address. Values without a scheme ("example.com") are
 * treated as https. javascript:, data:, file: and similar are rejected.
 */
export function toSafeExternalUrl(value?: string | null): string | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(raw);

  if (hasScheme && !/^https?:\/\//i.test(raw)) {
    return null;
  }

  const candidate = hasScheme ? raw : `https://${raw.replace(/^\/+/, "")}`;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    const host = url.hostname;

    if (!host || (!host.includes(".") && host !== "localhost")) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

/*
 * True when the value is empty or a valid http(s) URL. Used by forms.
 */
export function isValidOptionalUrl(value?: string | null): boolean {
  const raw = value?.trim();

  if (!raw) {
    return true;
  }

  return /^https?:\/\//i.test(raw) && toSafeExternalUrl(raw) !== null;
}

/*
 * "https://www.example.com/shop/" -> "example.com/shop"
 */
export function getDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");

    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}


/* ============================================================================
   CONTACT LINKS
============================================================================ */

export function getPhoneHref(phone?: string | null): string | null {
  const digits = phone?.replace(/[^\d+]/g, "") ?? "";

  if (digits.replace(/\D/g, "").length < 5) {
    return null;
  }

  return `tel:${digits}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email?: string | null): boolean {
  return Boolean(email && EMAIL_PATTERN.test(email.trim()));
}

export function getEmailHref(email?: string | null): string | null {
  return isValidEmail(email) ? `mailto:${email!.trim()}` : null;
}


/* ============================================================================
   IMAGES
============================================================================ */

const PLACEHOLDER_IMAGE_HOSTS = [
  "placehold.co",
  "placehold.it",
  "placeholder.com",
  "via.placeholder.com",
  "dummyimage.com",
  "fakeimg.pl",
];

/*
 * Generic placeholder-service images ("https://placehold.co/400x400?text=…")
 * are treated as "no image" so the consistent local fallback is shown.
 * The stored value is left untouched.
 */
export function isPlaceholderImage(url?: string | null): boolean {
  if (!url) {
    return false;
  }

  try {
    const host = new URL(url).hostname.toLowerCase();

    return PLACEHOLDER_IMAGE_HOSTS.some(
      (placeholderHost) =>
        host === placeholderHost || host.endsWith(`.${placeholderHost}`),
    );
  } catch {
    return false;
  }
}

export function getUsableImageUrl(url?: string | null): string | undefined {
  const value = url?.trim();

  if (!value || isPlaceholderImage(value)) {
    return undefined;
  }

  return value;
}

/*
 * "ABC Auto Repair" -> "AA"
 */
export function getInitials(name?: string | null): string {
  const words = (name ?? "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "B";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}


/* ============================================================================
   LOCATION
============================================================================ */

export function formatLocation(
  business: Pick<Business, "city" | "state" | "country">,
  options: { withCountry?: boolean } = {},
): string {
  return [
    business.city,
    business.state,
    options.withCountry ? business.country : undefined,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export function formatAddressLines(business: Business): string[] {
  const zip = business.zipCode || business.postalCode;
  const cityLine = [
    [business.city, business.state].filter(Boolean).join(", "),
    zip,
  ]
    .filter(Boolean)
    .join(" ");

  return [business.address, cityLine, business.country]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line));
}

export function hasCoordinates(
  business: Pick<Business, "latitude" | "longitude">,
): boolean {
  return (
    typeof business.latitude === "number" &&
    typeof business.longitude === "number" &&
    Number.isFinite(business.latitude) &&
    Number.isFinite(business.longitude)
  );
}

export function getDirectionsUrl(business: Business): string | null {
  if (hasCoordinates(business)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`;
  }

  const lines = formatAddressLines(business);

  if (!business.address || !lines.length) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    lines.join(", "),
  )}`;
}

/*
 * Great-circle distance in kilometres.
 */
export function distanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`;
  }

  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}


/* ============================================================================
   SOCIAL LINKS
============================================================================ */

export const SOCIAL_PLATFORMS: Array<{
  key: keyof BusinessSocialLinks;
  label: string;
  placeholder: string;
}> = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourbusiness" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourbusiness" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourbusiness" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourbusiness" },
];

export function getSocialLinks(business: Business): Array<{
  key: keyof BusinessSocialLinks;
  label: string;
  url: string;
}> {
  return SOCIAL_PLATFORMS.flatMap((platform) => {
    const url = toSafeExternalUrl(business.socialLinks?.[platform.key]);

    return url ? [{ key: platform.key, label: platform.label, url }] : [];
  });
}


/* ============================================================================
   BUSINESS CARD DESTINATIONS

   The same rules are used by every card, the profile hero and the
   manager preview.
============================================================================ */

export interface BusinessDestinations {
  websiteUrl: string | null;
  store: BusinessStoreSummary | null;
  primary: BusinessPrimaryAction | null;
}

export function getBusinessDestinations(
  business: Pick<Business, "websiteUrl" | "store" | "primaryAction">,
): BusinessDestinations {
  const websiteUrl = toSafeExternalUrl(business.websiteUrl);
  const store = business.store?.slug ? business.store : null;

  let primary: BusinessPrimaryAction | null = null;

  if (business.primaryAction === "STORE" && store) {
    primary = "STORE";
  } else if (business.primaryAction === "WEBSITE" && websiteUrl) {
    primary = "WEBSITE";
  } else if (websiteUrl) {
    primary = "WEBSITE";
  } else if (store) {
    primary = "STORE";
  }

  return {
    websiteUrl,
    store,
    primary,
  };
}


/* ============================================================================
   DEALS
============================================================================ */

export function isDealActive(
  deal: BusinessDeal,
  now: number = Date.now(),
): boolean {
  if (deal.active === false || deal.isActive === false) {
    return false;
  }

  if (!deal.expiresAt) {
    return true;
  }

  const expires = new Date(deal.expiresAt).getTime();

  return Number.isFinite(expires) ? expires > now : true;
}

export function getActiveDeals(business: Pick<Business, "deals">): BusinessDeal[] {
  return (business.deals ?? []).filter((deal) => isDealActive(deal));
}

export function formatDealExpiry(expiresAt?: string): string | null {
  if (!expiresAt) {
    return null;
  }

  const timestamp = new Date(expiresAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const remaining = timestamp - Date.now();

  if (remaining <= 0) {
    return "Expired";
  }

  const hours = Math.floor(remaining / 3_600_000);

  if (hours < 1) {
    return "Ends within the hour";
  }

  if (hours < 24) {
    return `Ends in ${hours}h`;
  }

  const days = Math.floor(hours / 24);

  if (days <= 14) {
    return `Ends in ${days} day${days === 1 ? "" : "s"}`;
  }

  return `Ends ${new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}


/* ============================================================================
   LISTS
============================================================================ */

/*
 * Removes duplicate records by stable ID, keeping the first occurrence.
 */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);

    return true;
  });
}

export function isBusinessVerified(business: Pick<Business, "verified" | "isVerified">): boolean {
  return Boolean(business.verified ?? business.isVerified);
}

export function isBusinessPublished(
  business: Pick<Business, "status" | "feedEnabled">,
): boolean {
  return business.status === "ACTIVE" && business.feedEnabled;
}

export function getStatusLabel(
  business: Pick<Business, "status" | "feedEnabled">,
): { label: string; tone: "success" | "warning" | "neutral" | "danger" } {
  if (isBusinessPublished(business)) {
    return { label: "Published", tone: "success" };
  }

  switch (business.status) {
    case "REJECTED":
      return { label: "Rejected", tone: "danger" };
    case "SUSPENDED":
      return { label: "Suspended", tone: "danger" };
    case "PAUSED":
      return { label: "Paused", tone: "warning" };
    case "PENDING_REVIEW":
      return { label: "Not published", tone: "warning" };
    case "ACTIVE":
      return { label: "Unpublished", tone: "neutral" };
    default:
      return { label: "Draft", tone: "neutral" };
  }
}


/* ============================================================================
   OPENING HOURS
============================================================================ */

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/*
 * Monday-first display order.
 */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function formatTime(value?: string): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return "";
  }

  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function hasHours(business: Pick<Business, "hours">): boolean {
  return Boolean(
    business.hours?.some((entry) => entry.closed || (entry.open && entry.close)),
  );
}

export function getHoursForDay(
  hours: BusinessHoursEntry[] | undefined,
  day: number,
): BusinessHoursEntry | undefined {
  return hours?.find((entry) => entry.day === day);
}

export function formatHoursEntry(entry?: BusinessHoursEntry): string {
  if (!entry) {
    return "Not listed";
  }

  if (entry.closed) {
    return "Closed";
  }

  if (entry.open && entry.close) {
    return `${formatTime(entry.open)} – ${formatTime(entry.close)}`;
  }

  return "Not listed";
}

/*
 * "Open now" is only computed when the business has saved its time zone,
 * so visitors in other zones are not shown a wrong status.
 */
export function getOpenNowStatus(
  business: Pick<Business, "hours" | "timeZone">,
): "open" | "closed" | null {
  if (!business.timeZone || !hasHours(business)) {
    return null;
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: business.timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

    if (day < 0) {
      return null;
    }

    const entry = getHoursForDay(business.hours, day);

    if (!entry || entry.closed || !entry.open || !entry.close) {
      return entry ? "closed" : null;
    }

    const now = `${hour}:${minute}`;

    // Overnight hours (e.g. 18:00 – 02:00) are treated as open past midnight
    // on the same listed day only.
    if (entry.close <= entry.open) {
      return now >= entry.open || now < entry.close ? "open" : "closed";
    }

    return now >= entry.open && now < entry.close ? "open" : "closed";
  } catch {
    return null;
  }
}

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}


/* ============================================================================
   PROFILE COMPLETENESS

   Computed from fields that actually exist on the business record.
============================================================================ */

export function getProfileCompleteness(business: Business): {
  percent: number;
  missing: string[];
} {
  const checks: Array<[string, boolean]> = [
    ["Description", Boolean(business.description?.trim())],
    ["Logo", Boolean(getUsableImageUrl(business.logoUrl))],
    ["Cover image", Boolean(getUsableImageUrl(business.coverImageUrl))],
    ["Website or Fockis Shop store", Boolean(toSafeExternalUrl(business.websiteUrl) || business.storeId)],
    ["Phone or email", Boolean(business.phone?.trim() || business.email?.trim())],
    ["Address", Boolean(business.city?.trim() || business.address?.trim())],
    ["Opening hours", hasHours(business) || Boolean(business.byAppointmentOnly)],
    ["Social links", getSocialLinks(business).length > 0],
  ];

  const done = checks.filter(([, ok]) => ok).length;

  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}
