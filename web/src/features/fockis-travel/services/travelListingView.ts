import { travelApi, unwrapApiData } from "./travelApi";

/**
 * ============================================================================
 * FOCKIS TRAVEL — LISTING VIEW HELPERS
 * ============================================================================
 *
 * Small, read-only helpers shared by the redesigned Travel pages (home,
 * explore, stay details, my trips). They only *read* what the existing
 * backend returns from:
 *
 *   GET /travel/listings            (listings.controller → search)
 *   GET /travel/listings/:id
 *   GET /travel/partners/verified   (verified businesses)
 *
 * Nothing here invents data: ratings, prices, verification and images are
 * shown only when the API supplied them.
 * ============================================================================
 */

export interface TravelListingView {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  type?: string;
  category?: string;
  categories?: string[];
  description?: string;
  country?: string;
  state?: string;
  department?: string;
  city?: string;
  address?: string;
  images?: unknown[];
  coverImage?: string;
  currency?: string;
  price?: number;
  originalPrice?: number;
  priceUnit?: string;
  active?: boolean;
  status?: string;
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
  amenities?: string[];
  tags?: string[];
  features?: string[];
  capacity?: number;
  bedrooms?: number;
  bathrooms?: number;
  phone?: string;
  email?: string;
  website?: string;
  acceptingBookings?: boolean;
  partnerId?: unknown;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifiedBusinessView {
  _id?: string;
  id?: string;
  userId?: unknown;
  businessName?: string;
  name?: string;
  logo?: string;
  coverImage?: string;
  status?: string;
  active?: boolean;
  city?: string;
  country?: string;
  addressInfo?: { city?: string; country?: string };
  contact?: { email?: string; phone?: string; website?: string };
  email?: string;
  phone?: string;
}

/* ---------------------------------------------------------------------------
 * MEDIA
 * ------------------------------------------------------------------------- */

/** Resolve a stored media path ("/uploads/x.jpg") against the API origin. */
export function resolveTravelMedia(value: unknown): string {
  let raw = "";

  if (typeof value === "string") {
    raw = value.trim();
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = [
      record.url,
      record.src,
      record.image,
      record.imageUrl,
      record.path,
    ].find((item) => typeof item === "string" && item.trim());
    raw = typeof candidate === "string" ? candidate.trim() : "";
  }

  if (!raw || raw === "undefined" || raw.includes("/uploads/undefined")) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `${window.location.protocol}${raw}`;
  }

  const origin = travelApi.getBaseUrl().replace(/\/travel\/?$/i, "");
  return `${origin}/${raw.replace(/^\/+/, "")}`;
}

export function getListingImages(listing: TravelListingView): string[] {
  const source = Array.isArray(listing.images) ? listing.images : [];
  const resolved = source.map(resolveTravelMedia).filter(Boolean);

  if (resolved.length === 0 && listing.coverImage) {
    const cover = resolveTravelMedia(listing.coverImage);
    if (cover) resolved.push(cover);
  }

  return Array.from(new Set(resolved));
}

export function getListingImage(listing: TravelListingView): string {
  return getListingImages(listing)[0] || "";
}

/* ---------------------------------------------------------------------------
 * BASIC FIELDS
 * ------------------------------------------------------------------------- */

export function getListingId(listing: TravelListingView): string {
  return String(listing._id || listing.id || "");
}

export function getListingName(listing: TravelListingView): string {
  return String(listing.name || listing.title || "").trim() || "Untitled listing";
}

export function getListingLocation(listing: TravelListingView): string {
  const parts = [
    listing.city,
    listing.department || listing.state,
    listing.country,
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  // Show "City, Country" on cards; the details page shows the full address.
  if (parts.length >= 3) {
    return [parts[0], parts[parts.length - 1]].join(", ");
  }

  return parts.join(", ");
}

export function getListingType(listing: TravelListingView): string {
  return String(listing.type || "").trim().toLowerCase();
}

/** Rating is only meaningful when the backend has a real value (> 0). */
export function getListingRating(
  listing: TravelListingView,
): { average: number; count: number } | null {
  const average = Number(listing.rating);
  if (!Number.isFinite(average) || average <= 0) return null;
  const count = Number(listing.reviewCount);
  return {
    average: Math.min(5, average),
    count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
  };
}

export function getListingPrice(listing: TravelListingView): number | null {
  const price = Number(listing.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function getPriceUnitLabel(listing: TravelListingView): string {
  const unit = String(listing.priceUnit || "").trim().toLowerCase();

  switch (unit) {
    case "":
      return getListingType(listing) === "experience" ? "per person" : "per night";
    case "night":
      return "per night";
    case "day":
      return "per day";
    case "hour":
      return "per hour";
    case "person":
      return "per person";
    case "trip":
      return "per trip";
    default:
      return `per ${unit}`;
  }
}

export function formatTravelPrice(amount: number, currency?: string): string {
  const code = String(currency || "USD").toUpperCase();
  const whole = Number.isInteger(amount);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(whole ? 0 : 2)}`;
  }
}

/* ---------------------------------------------------------------------------
 * FILTERS
 * ------------------------------------------------------------------------- */

export function isPublicListing(listing: TravelListingView): boolean {
  if (listing.active === false) return false;
  const status = String(listing.status || "").trim().toLowerCase();
  return !status || ["published", "active", "verified"].includes(status);
}

function foldText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function listingMatchesQuery(listing: TravelListingView, query: string): boolean {
  const needle = foldText(query.trim());
  if (!needle) return true;

  const haystack = [
    listing.name,
    listing.title,
    listing.city,
    listing.state,
    listing.department,
    listing.country,
    listing.address,
    listing.category,
    ...(Array.isArray(listing.categories) ? listing.categories : []),
    ...(Array.isArray(listing.tags) ? listing.tags : []),
  ]
    .filter(Boolean)
    .join(" ");

  const folded = foldText(haystack);

  // Every word must match somewhere ("Paris France" → paris AND france).
  return needle
    .split(/[\s,]+/)
    .filter(Boolean)
    .every((word) => folded.includes(word));
}

export function sortFeaturedFirst(a: TravelListingView, b: TravelListingView): number {
  return (
    Number(b.featured === true) - Number(a.featured === true) ||
    Number(b.rating || 0) - Number(a.rating || 0) ||
    Number(b.reviewCount || 0) - Number(a.reviewCount || 0)
  );
}

/* ---------------------------------------------------------------------------
 * RESPONSE SHAPES
 * ------------------------------------------------------------------------- */

export function extractListingArray(value: unknown): TravelListingView[] {
  const data = unwrapApiData(value);

  if (Array.isArray(data)) return data as TravelListingView[];

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["items", "listings", "results", "data"]) {
      if (Array.isArray(record[key])) return record[key] as TravelListingView[];
    }
  }

  return [];
}

export function extractBusinessArray(value: unknown): VerifiedBusinessView[] {
  const data = unwrapApiData(value);

  if (Array.isArray(data)) return data as VerifiedBusinessView[];

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["items", "businesses", "partners", "data"]) {
      if (Array.isArray(record[key])) return record[key] as VerifiedBusinessView[];
    }
  }

  return [];
}

/* ---------------------------------------------------------------------------
 * API CALLS (existing endpoints only)
 * ------------------------------------------------------------------------- */

export async function fetchTravelListings(
  query: Record<string, unknown> = {},
): Promise<TravelListingView[]> {
  const response = await travelApi.get<unknown>("/travel/listings", {
    limit: 100,
    ...query,
  });

  return extractListingArray(response).filter(isPublicListing);
}

export async function fetchTravelListing(id: string): Promise<TravelListingView | null> {
  const response = await travelApi.get<unknown>(
    `/travel/listings/${encodeURIComponent(id)}`,
  );
  const data = unwrapApiData(response);

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (record.listing && typeof record.listing === "object") {
      return record.listing as TravelListingView;
    }
    return data as TravelListingView;
  }

  return null;
}

export async function fetchVerifiedBusinesses(): Promise<VerifiedBusinessView[]> {
  const response = await travelApi.get<unknown>("/travel/partners/verified");

  return extractBusinessArray(response).filter((business) => {
    const status = String(business.status || "").toLowerCase();
    return business.active !== false && (!status || status === "verified");
  });
}

/* ---------------------------------------------------------------------------
 * VERIFIED PARTNER MATCHING
 * ------------------------------------------------------------------------- */

function idOf(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record._id || record.id || "");
  }
  return String(value);
}

/**
 * Listings store `partnerId` = the partner's user id. A listing is shown as
 * "Verified" only when that user owns a business returned by
 * GET /travel/partners/verified.
 */
export function buildVerifiedPartnerIndex(
  businesses: VerifiedBusinessView[],
): Map<string, VerifiedBusinessView> {
  const index = new Map<string, VerifiedBusinessView>();

  businesses.forEach((business) => {
    [idOf(business.userId), idOf(business._id), idOf(business.id)]
      .filter(Boolean)
      .forEach((key) => index.set(key, business));
  });

  return index;
}

export function findListingPartner(
  listing: TravelListingView,
  index: Map<string, VerifiedBusinessView>,
): VerifiedBusinessView | null {
  const key = idOf(listing.partnerId);
  return (key && index.get(key)) || null;
}

export function getBusinessDisplayName(business: VerifiedBusinessView): string {
  return String(business.businessName || business.name || "").trim() || "Travel business";
}
