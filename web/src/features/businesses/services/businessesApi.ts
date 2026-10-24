import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  Business,
  BusinessDeal,
  BusinessHoursEntry,
  BusinessImageUploadResponse,
  BusinessInput,
  BusinessListQuery,
  BusinessStoreSummary,
} from "../types/business.types";

/* ============================================================================
   API CONFIG
============================================================================ */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");


/* ============================================================================
   AUTH
============================================================================ */

function getToken(): string | null {
  try {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      null
    );
  } catch {
    return null;
  }
}

function requireToken(
  message = "You must be logged in.",
): string {
  const token = getToken();

  if (!token) {
    throw new Error(message);
  }

  return token;
}

function authHeaders(
  includeJson = false,
): Headers {
  const headers = new Headers();

  headers.set("Accept", "application/json");

  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (includeJson) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}


/* ============================================================================
   MEDIA URL

   Uploaded files are stored as "/uploads/..." paths; they are expanded to
   absolute API URLs for display only.
============================================================================ */

function normalizeMediaUrl(
  value: unknown,
): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const url = value.trim();

  if (/^(https?:\/\/|data:image\/|blob:)/i.test(url)) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  // Only API-relative paths are expanded. Anything else (for example a
  // javascript: value) is dropped.
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) {
    return undefined;
  }

  return url.startsWith("/")
    ? `${API_URL}${url}`
    : `${API_URL}/${url}`;
}


/* ============================================================================
   SAFE VALUES
============================================================================ */

function stringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function optionalString(value: unknown): string | undefined {
  const text = stringValue(value).trim();

  return text || undefined;
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = numberValue(value, Number.NaN);

  return Number.isFinite(parsed) ? parsed : undefined;
}


/* ============================================================================
   RESPONSE ERROR
============================================================================ */

async function getErrorMessage(response: Response): Promise<string> {
  let text = "";

  try {
    text = await response.text();
  } catch {
    return `Request failed with status ${response.status}`;
  }

  if (!text) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const data = JSON.parse(text);

    if (Array.isArray(data?.message)) {
      return data.message
        .map((item: unknown) => (typeof item === "string" ? item : JSON.stringify(item)))
        .join(", ");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (typeof data?.error === "string") {
      return data.error;
    }

    return `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}


/*
 * Errors carry the HTTP status so pages can tell "not found" apart from
 * network or server failures.
 */
export class BusinessApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BusinessApiError";
    this.status = status;
  }
}


async function requestJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await getErrorMessage(response);

    throw new BusinessApiError(response.status, message);
  }

  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Server returned invalid JSON.");
  }
}


/* ============================================================================
   RESPONSE ARRAY
============================================================================ */

function extractArray(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of ["businesses", "data", "items", "results"]) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}


function extractBusiness(data: any): Business {
  return normalizeBusiness(data?.business ?? data?.data ?? data);
}


/* ============================================================================
   NORMALIZE DEAL
============================================================================ */

function normalizeDeal(raw: any): BusinessDeal {
  const source = raw?.deal ?? raw?.data ?? raw ?? {};

  const id = stringValue(source?.id ?? source?._id ?? source?.dealId);

  const businessId = stringValue(
    source?.businessId ?? source?.business?._id ?? source?.business?.id,
  );

  const active = source?.active ?? source?.isActive ?? true;

  return {
    ...source,

    id,

    _id: source?._id ? stringValue(source._id) : id,

    businessId,

    title: stringValue(source?.title ?? source?.name),

    description: stringValue(source?.description),

    discount: stringValue(source?.discount),

    couponCode: stringValue(source?.couponCode),

    expiresAt: stringValue(source?.expiresAt ?? source?.expirationDate),

    active: Boolean(active),

    isActive: Boolean(active),

    imageUrl: normalizeMediaUrl(source?.imageUrl ?? source?.image),

    clicks: numberValue(source?.clicks),

    createdAt: source?.createdAt ?? undefined,

    updatedAt: source?.updatedAt ?? undefined,
  };
}


/* ============================================================================
   NORMALIZE STORE SUMMARY
============================================================================ */

function normalizeStoreSummary(raw: any): BusinessStoreSummary | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = stringValue(raw.id ?? raw._id);
  const slug = stringValue(raw.slug).trim();

  if (!id || !slug) {
    return null;
  }

  return {
    id,
    slug,
    name: stringValue(raw.name) || "Fockis Store",
    logo: normalizeMediaUrl(raw.logo ?? raw.logoUrl),
    banner: normalizeMediaUrl(raw.banner ?? raw.bannerUrl),
    verified: Boolean(raw.verified),
  };
}


/* ============================================================================
   NORMALIZE HOURS
============================================================================ */

function normalizeHours(raw: unknown): BusinessHoursEntry[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const entries = raw
    .map((entry: any) => ({
      day: numberValue(entry?.day, -1),
      open: optionalString(entry?.open),
      close: optionalString(entry?.close),
      closed: Boolean(entry?.closed),
    }))
    .filter((entry) => entry.day >= 0 && entry.day <= 6);

  return entries.length ? entries : undefined;
}


/* ============================================================================
   NORMALIZE BUSINESS
============================================================================ */

function normalizeBusiness(raw: any): Business {
  const source = raw?.business ?? raw ?? {};

  const id = stringValue(source?.id ?? source?._id ?? source?.businessId);

  const ownerId = stringValue(
    source?.ownerId ?? source?.owner?._id ?? source?.owner?.id,
  );

  const rawSocial = source?.socialLinks ?? {};

  const socialLinks = {
    facebook: optionalString(rawSocial.facebook ?? source?.facebookUrl),
    instagram: optionalString(rawSocial.instagram ?? source?.instagramUrl),
    tiktok: optionalString(rawSocial.tiktok ?? source?.tiktokUrl),
    youtube: optionalString(rawSocial.youtube ?? source?.youtubeUrl),
    linkedin: optionalString(rawSocial.linkedin ?? source?.linkedinUrl),
  };

  const verified = Boolean(source?.verified ?? source?.isVerified ?? false);

  const primaryAction =
    source?.primaryAction === "WEBSITE" || source?.primaryAction === "STORE"
      ? source.primaryAction
      : undefined;

  return {
    ...source,

    id,

    _id: source?._id ? stringValue(source._id) : id,

    ownerId,

    name: stringValue(source?.name ?? source?.businessName),

    description: stringValue(source?.description),

    category: source?.category ?? "OTHER",

    tagline: optionalString(source?.tagline),

    foundedYear: optionalNumber(source?.foundedYear),

    businessSize: optionalString(source?.businessSize) as Business["businessSize"],

    logoUrl: normalizeMediaUrl(source?.logoUrl ?? source?.logo),

    coverImageUrl: normalizeMediaUrl(source?.coverImageUrl ?? source?.coverImage),

    websiteUrl: optionalString(source?.websiteUrl ?? source?.website),

    phone: optionalString(source?.phone ?? source?.phoneNumber),

    email: optionalString(source?.email),

    storeId: optionalString(source?.storeId),

    store: normalizeStoreSummary(source?.store),

    primaryAction,

    address: stringValue(source?.address),

    city: stringValue(source?.city),

    state: stringValue(source?.state),

    zipCode: stringValue(source?.zipCode ?? source?.postalCode),

    postalCode: stringValue(source?.postalCode ?? source?.zipCode),

    country: stringValue(source?.country),

    latitude: optionalNumber(source?.latitude),

    longitude: optionalNumber(source?.longitude),

    hours: normalizeHours(source?.hours),

    byAppointmentOnly: Boolean(source?.byAppointmentOnly),

    timeZone: optionalString(source?.timeZone),

    facebookUrl: socialLinks.facebook,

    instagramUrl: socialLinks.instagram,

    tiktokUrl: socialLinks.tiktok,

    youtubeUrl: socialLinks.youtube,

    linkedinUrl: socialLinks.linkedin,

    socialLinks,

    status: source?.status ?? "DRAFT",

    feedEnabled: Boolean(source?.feedEnabled),

    spotlightEnabled: Boolean(source?.spotlightEnabled ?? source?.spotlight ?? false),

    spotlightPriority: numberValue(source?.spotlightPriority),

    views: numberValue(source?.views),

    websiteClicks: numberValue(source?.websiteClicks),

    storeClicks: numberValue(source?.storeClicks),

    verified,

    isVerified: verified,

    deals: Array.isArray(source?.deals) ? source.deals.map(normalizeDeal) : [],

    createdAt: source?.createdAt ?? "",

    updatedAt: source?.updatedAt ?? "",
  };
}

function normalizeList(data: any): Business[] {
  const seen = new Set<string>();

  return extractArray(data)
    .map(normalizeBusiness)
    .filter((business) => {
      if (!business.id || seen.has(business.id)) {
        return false;
      }

      seen.add(business.id);

      return true;
    });
}


/* ============================================================================
   PAYLOADS
============================================================================ */

const TEXT_FIELDS = [
  "name",
  "description",
  "tagline",
  "logoUrl",
  "coverImageUrl",
  "websiteUrl",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "zipCode",
  "country",
  "timeZone",
] as const;

/*
 * create: empty values are omitted.
 * update: empty values are sent as "" / null so the backend clears them.
 */
function buildBusinessPayload(
  input: BusinessInput,
  mode: "create" | "update",
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    const value = input[field];

    if (value === undefined) {
      continue;
    }

    const text = stringValue(value).trim();

    if (text || mode === "update") {
      payload[field] = text;
    }
  }

  if (input.category) {
    payload.category = input.category;
  }

  const nullableFields = [
    "foundedYear",
    "businessSize",
    "storeId",
    "primaryAction",
    "latitude",
    "longitude",
  ] as const;

  for (const field of nullableFields) {
    const value = input[field];

    if (value === undefined) {
      continue;
    }

    const empty = value === null || value === "";

    if (empty) {
      if (mode === "update") {
        payload[field] = null;
      }

      continue;
    }

    payload[field] = value;
  }

  if (input.hours !== undefined) {
    payload.hours = input.hours;
  }

  if (input.byAppointmentOnly !== undefined) {
    payload.byAppointmentOnly = input.byAppointmentOnly;
  }

  if (input.socialLinks !== undefined) {
    const links: Record<string, string> = {};

    for (const [key, value] of Object.entries(input.socialLinks)) {
      const text = stringValue(value).trim();

      if (text || mode === "update") {
        links[key] = text;
      }
    }

    payload.socialLinks = links;
  }

  if (mode === "update" && typeof input.spotlightEnabled === "boolean") {
    payload.spotlightEnabled = input.spotlightEnabled;
  }

  return payload;
}


function buildDealPayload(data: Partial<BusinessDeal>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: stringValue(data?.title).trim(),
  };

  for (const field of ["description", "discount", "couponCode"] as const) {
    if (data?.[field] !== undefined) {
      payload[field] = stringValue(data[field]).trim();
    }
  }

  if (data?.expiresAt) {
    // A date-only value ("2026-10-31") means "valid through the end of that
    // day" in the owner's local time.
    payload.expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(data.expiresAt)
      ? new Date(`${data.expiresAt}T23:59:59`).toISOString()
      : data.expiresAt;
  }

  if (typeof data?.active === "boolean") {
    payload.active = data.active;
  }

  return payload;
}


/* ============================================================================
   REQUEST HELPERS
============================================================================ */

function businessUrl(id: string, suffix = ""): string {
  if (!id) {
    throw new Error("Business ID is required.");
  }

  return `${API_URL}/businesses/${encodeURIComponent(id)}${suffix}`;
}

async function sendJson<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: authHeaders(body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return requestJson<T>(response);
}

/*
 * Fire-and-forget analytics. Never throws.
 */
function track(url: string): void {
  try {
    void fetch(url, {
      method: "POST",
      headers: authHeaders(),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

async function uploadImage(
  businessId: string,
  file: File,
  endpoint: "logo" | "cover-image",
): Promise<BusinessImageUploadResponse> {
  requireToken("You must be logged in to upload a business image.");

  if (!file) {
    throw new Error("Please choose an image.");
  }

  const formData = new FormData();
  formData.append("file", file);

  // Content-Type is set by the browser (multipart boundary).
  const response = await fetch(businessUrl(businessId, `/${endpoint}`), {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  const result = await requestJson<any>(response);

  return {
    success: Boolean(result?.success ?? true),
    business: {
      id: stringValue(result?.business?.id ?? businessId),
      logoUrl: normalizeMediaUrl(result?.business?.logoUrl),
      coverImageUrl: normalizeMediaUrl(result?.business?.coverImageUrl),
    },
  };
}


/* ============================================================================
   BUSINESSES API
============================================================================ */

export const businessesApi = {

  /* ==========================================================================
     LIST PUBLIC BUSINESSES
     GET /businesses?q=&category=&city=&sort=&page=&limit=
  ========================================================================== */

  async list(query: BusinessListQuery = {}): Promise<Business[]> {
    const url = new URL(`${API_URL}/businesses`);

    const params: Record<string, string | number | undefined> = {
      q: query.q?.trim() || undefined,
      category: query.category,
      city: query.city?.trim() || undefined,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    };

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(),
    });

    return normalizeList(await requestJson<any>(response));
  },


  /* ==========================================================================
     GET ALL PUBLIC BUSINESSES
     GET /businesses
  ========================================================================== */

  async getAll(): Promise<Business[]> {
    return businessesApi.list();
  },


  /* ==========================================================================
     GET SPOTLIGHT BUSINESSES
     GET /businesses/spotlight
  ========================================================================== */

  async getSpotlight(): Promise<Business[]> {
    const response = await fetch(`${API_URL}/businesses/spotlight`, {
      method: "GET",
      headers: authHeaders(),
    });

    return normalizeList(await requestJson<any>(response));
  },


  /* ==========================================================================
     GET MY BUSINESSES
     GET /businesses/mine
  ========================================================================== */

  async getMine(): Promise<Business[]> {
    requireToken("You must be logged in to manage businesses.");

    const response = await fetch(`${API_URL}/businesses/mine`, {
      method: "GET",
      headers: authHeaders(),
    });

    return normalizeList(await requestJson<any>(response));
  },


  /* ==========================================================================
     GET BUSINESS BY ID
     GET /businesses/:id
  ========================================================================== */

  async getById(id: string): Promise<Business> {
    const response = await fetch(businessUrl(id), {
      method: "GET",
      headers: authHeaders(),
    });

    return extractBusiness(await requestJson<any>(response));
  },


  /* ==========================================================================
     CREATE BUSINESS
     POST /businesses
  ========================================================================== */

  async create(data: BusinessInput): Promise<Business> {
    requireToken("You must be logged in to create a business.");

    const result = await sendJson<any>(
      `${API_URL}/businesses`,
      "POST",
      buildBusinessPayload(data, "create"),
    );

    return extractBusiness(result);
  },


  /* ==========================================================================
     UPDATE BUSINESS
     PATCH /businesses/:id

     Only the fields present in `data` are sent. Image URLs are never
     re-sent unless the caller changes them, so uploaded images keep their
     stored path.
  ========================================================================== */

  async update(id: string, data: BusinessInput): Promise<Business> {
    requireToken("You must be logged in to update a business.");

    const result = await sendJson<any>(
      businessUrl(id),
      "PATCH",
      buildBusinessPayload(data, "update"),
    );

    return extractBusiness(result);
  },


  /* ==========================================================================
     PUBLISH / UNPUBLISH
     POST   /businesses/:id/publish
     DELETE /businesses/:id/publish
  ========================================================================== */

  async publish(id: string): Promise<Business> {
    requireToken("You must be logged in to publish a business.");

    return extractBusiness(await sendJson<any>(businessUrl(id, "/publish"), "POST"));
  },

  async unpublish(id: string): Promise<Business> {
    requireToken("You must be logged in to unpublish a business.");

    return extractBusiness(await sendJson<any>(businessUrl(id, "/publish"), "DELETE"));
  },


  /* ==========================================================================
     IMAGE UPLOADS
     POST /businesses/:id/logo
     POST /businesses/:id/cover-image
  ========================================================================== */

  async uploadLogo(businessId: string, file: File): Promise<BusinessImageUploadResponse> {
    return uploadImage(businessId, file, "logo");
  },

  async uploadCoverImage(businessId: string, file: File): Promise<BusinessImageUploadResponse> {
    return uploadImage(businessId, file, "cover-image");
  },


  /* ==========================================================================
     DELETE BUSINESS
     DELETE /businesses/:id
  ========================================================================== */

  async remove(id: string): Promise<{ success: boolean }> {
    requireToken("You must be logged in to delete a business.");

    return sendJson<{ success: boolean }>(businessUrl(id), "DELETE");
  },


  /* ==========================================================================
     DEALS
     POST   /businesses/:id/deals
     PATCH  /businesses/:id/deals/:dealId
     DELETE /businesses/:id/deals/:dealId
  ========================================================================== */

  async createDeal(businessId: string, data: Partial<BusinessDeal>): Promise<BusinessDeal> {
    requireToken("You must be logged in to create a deal.");

    const result = await sendJson<any>(
      businessUrl(businessId, "/deals"),
      "POST",
      buildDealPayload(data),
    );

    return normalizeDeal(result);
  },

  async updateDeal(
    businessId: string,
    dealId: string,
    data: Partial<BusinessDeal>,
  ): Promise<BusinessDeal> {
    requireToken("You must be logged in to update a deal.");

    if (!dealId) {
      throw new Error("Deal ID is required.");
    }

    const result = await sendJson<any>(
      businessUrl(businessId, `/deals/${encodeURIComponent(dealId)}`),
      "PATCH",
      buildDealPayload(data),
    );

    return normalizeDeal(result);
  },

  async deleteDeal(businessId: string, dealId: string): Promise<{ success: boolean }> {
    requireToken("You must be logged in to delete a deal.");

    if (!dealId) {
      throw new Error("Deal ID is required.");
    }

    return sendJson<{ success: boolean }>(
      businessUrl(businessId, `/deals/${encodeURIComponent(dealId)}`),
      "DELETE",
    );
  },


  /* ==========================================================================
     ANALYTICS
     POST /businesses/:id/view
     POST /businesses/:id/website-click
     POST /businesses/:id/store-click
  ========================================================================== */

  async trackView(id: string): Promise<void> {
    if (id) {
      track(businessUrl(id, "/view"));
    }
  },

  async trackWebsiteClick(id: string): Promise<void> {
    if (id) {
      track(businessUrl(id, "/website-click"));
    }
  },

  async trackStoreClick(id: string): Promise<void> {
    if (id) {
      track(businessUrl(id, "/store-click"));
    }
  },
};
