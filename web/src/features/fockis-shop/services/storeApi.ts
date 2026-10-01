import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type {
  Store,
  StoreListFilters,
  StoreReview,
} from "../types/store.types";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

const STORES_ENDPOINT = `${API_BASE_URL}/stores`;

export interface StoreListResult {
  items: Store[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

type UnknownRecord = Record<string, unknown>;

const AUTH_TOKEN_KEYS = [
  "access_token",
  "accessToken",
  "token",
  "authToken",
  "jwt",
  "fockis_token",
  "fockis_auth_token",
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  for (const key of AUTH_TOKEN_KEYS) {
    const value = window.localStorage.getItem(key);

    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getHeaders(
  requireAuth = false,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error(
      "You must be signed in to perform this action.",
    );
  }

  return headers;
}

function buildUrl(
  path: string,
  params?: Record<
    string,
    string | number | boolean | undefined
  >,
): string {
  const url = new URL(
    path,
    window.location.origin,
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        url.searchParams.set(
          key,
          String(value),
        );
      }
    }
  }

  return url.toString();
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const contentType =
    response.headers.get("content-type") || "";

  let payload: unknown;

  if (contentType.includes("application/json")) {
    payload = await response
      .json()
      .catch(() => null);
  } else {
    const text = await response
      .text()
      .catch(() => "");

    payload = text || null;
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    if (
      typeof payload === "string" &&
      payload.trim()
    ) {
      message = payload;
    } else if (isRecord(payload)) {
      const candidate =
        payload.message ?? payload.error;

      if (Array.isArray(candidate)) {
        message = candidate
          .map(String)
          .join(", ");
      } else if (
        candidate !== undefined
      ) {
        message = String(candidate);
      }
    }

    throw new Error(message);
  }

  return payload as T;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = false,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...getHeaders(requireAuth),
      ...(options.headers || {}),
    },
  });

  return parseResponse<T>(response);
}

function unwrapData(
  value: unknown,
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  if (value.data !== undefined) {
    return value.data;
  }

  return value;
}

function unwrapEntity(
  value: unknown,
): UnknownRecord {
  const unwrapped = unwrapData(value);

  return isRecord(unwrapped)
    ? unwrapped
    : {};
}

function toStringValue(
  value: unknown,
  fallback = "",
): string {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (isRecord(value)) {
    if (
      typeof value.$oid === "string"
    ) {
      return value.$oid;
    }

    if (
      typeof value._id === "string"
    ) {
      return value._id;
    }

    if (
      typeof value.id === "string"
    ) {
      return value.id;
    }
  }

  return fallback;
}

function getNestedRecord(
  value: unknown,
): UnknownRecord {
  return isRecord(value)
    ? value
    : {};
}

function toNumber(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toBoolean(
  value: unknown,
  fallback = false,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    if (
      [
        "true",
        "1",
        "yes",
        "active",
      ].includes(normalized)
    ) {
      return true;
    }

    if (
      [
        "false",
        "0",
        "no",
        "inactive",
      ].includes(normalized)
    ) {
      return false;
    }
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return fallback;
}

function toArray(
  value: unknown,
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeSlug(
  value: unknown,
): string {
  const raw = toStringValue(value);

  return raw
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeId(
  value: unknown,
): string {
  return toStringValue(value);
}

function normalizeCountryCode(
  value: unknown,
): string {
  const code = toStringValue(value);

  return code
    ? code.toUpperCase().slice(0, 3)
    : "";
}

function countryCodeToFlag(
  code: string,
): string {
  const normalized =
    code.toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return "";
  }

  return String.fromCodePoint(
    ...normalized
      .split("")
      .map(
        (character) =>
          127397 +
          character.charCodeAt(0),
      ),
  );
}

function normalizeCategories(
  value: unknown,
): string[] {
  const values = toArray(value);

  return values
    .map((item) => {
      if (typeof item === "string") {
        return normalizeSlug(item);
      }

      if (isRecord(item)) {
        return normalizeSlug(
          item.slug ??
            item.name ??
            item.category ??
            item.id,
        );
      }

      return "";
    })
    .filter(Boolean);
}

function normalizeTags(
  value: unknown,
): string[] {
  return toArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (isRecord(item)) {
        return toStringValue(
          item.name ??
            item.slug ??
            item.value,
        );
      }

      return "";
    })
    .filter(Boolean);
}

function normalizeDate(
  value: unknown,
  fallback = new Date().toISOString(),
): string {
  const stringValue =
    toStringValue(value);

  if (!stringValue) {
    return fallback;
  }

  const timestamp =
    Date.parse(stringValue);

  return Number.isNaN(timestamp)
    ? fallback
    : new Date(timestamp).toISOString();
}

function normalizeStatus(
  value: unknown,
  activeValue: unknown,
): Store["status"] {
  const status =
    toStringValue(value).toLowerCase();

  if (
    status === "pending" ||
    status === "pending_review" ||
    status === "pending-review"
  ) {
    return "pending_review";
  }

  if (
    status === "suspended" ||
    status === "disabled"
  ) {
    return "suspended";
  }

  if (
    status === "closed" ||
    status === "inactive"
  ) {
    return "closed";
  }

  if (
    status === "active" ||
    status === "approved"
  ) {
    return "active";
  }

  return toBoolean(
    activeValue,
    true,
  )
    ? "active"
    : "closed";
}

function normalizeStore(
  rawValue: unknown,
): Store {
  const raw =
    unwrapEntity(rawValue);

  const user =
    getNestedRecord(raw.user);

  const business =
    getNestedRecord(raw.business);

  const location =
    getNestedRecord(raw.location);

  const ratingSource =
    getNestedRecord(raw.rating);

  const shipping =
    getNestedRecord(raw.shipping);

  const policies =
    getNestedRecord(raw.policies);

  const analytics =
    getNestedRecord(raw.analytics);

  const id = normalizeId(
    raw._id ?? raw.id,
  );

  const name =
    toStringValue(raw.name) ||
    "Fockis Store";

  const slug =
    normalizeSlug(raw.slug) ||
    normalizeSlug(name) ||
    normalizeSlug(id);

  const ownerId =
    normalizeId(
      raw.ownerId ??
        raw.owner ??
        raw.userId ??
        user._id ??
        user.id,
    );

  const businessId =
    normalizeId(
      raw.businessId ??
        business._id ??
        business.id ??
        ownerId,
    );

  const country =
    toStringValue(
      raw.country ??
        location.country,
    );

  const countryCode =
    normalizeCountryCode(
      raw.countryCode ??
        location.countryCode,
    );

  const countryFlag =
    toStringValue(
      raw.countryFlag ??
        location.countryFlag,
    ) ||
    countryCodeToFlag(
      countryCode,
    );

  const city =
    toStringValue(
      raw.city ??
        location.city,
    );

  const state =
    toStringValue(
      raw.state ??
        location.state,
    );

  const averageRating =
    toNumber(
      raw.averageRating ??
        raw.ratingAverage ??
        ratingSource.average ??
        (
          typeof raw.rating ===
          "number"
            ? raw.rating
            : undefined
        ),
      0,
    );

  const totalReviews =
    toNumber(
      raw.reviewCount ??
        raw.totalReviews ??
        ratingSource.totalReviews ??
        ratingSource.count,
      0,
    );

  const categories =
    normalizeCategories(
      raw.categories ??
        raw.categorySlugs ??
        raw.category,
    );

  const tags =
    normalizeTags(raw.tags);

  const productCount =
    toNumber(
      raw.productCount ??
        raw.totalProducts ??
        analytics.totalProducts,
      0,
    );

  const orderCount =
    toNumber(
      raw.orderCount ??
        raw.totalOrders ??
        analytics.totalOrders,
      0,
    );

  const createdAt =
    normalizeDate(
      raw.createdAt,
    );

  const updatedAt =
    normalizeDate(
      raw.updatedAt,
      createdAt,
    );

  const verified =
    toBoolean(
      raw.verified,
      false,
    );

  const active =
    raw.active !== undefined
      ? toBoolean(
          raw.active,
          true,
        )
      : raw.status !== undefined
        ? normalizeStatus(
            raw.status,
            true,
          ) === "active"
        : true;

  const freeDeliveryValue =
    raw.freeDeliveryThreshold ??
    shipping.freeDeliveryThreshold;

  const store: Store = {
    id,
    slug,
    businessId,

    name,

    description:
      toStringValue(
        raw.description,
      ),

    logoUrl:
      toStringValue(
        raw.logoUrl ??
          raw.logo ??
          raw.logoURL,
      ) || undefined,

    bannerUrl:
      toStringValue(
        raw.bannerUrl ??
          raw.banner ??
          raw.bannerURL,
      ) || undefined,

    emoji:
      toStringValue(
        raw.emoji,
      ) || undefined,

    verified,

    status:
      normalizeStatus(
        raw.status,
        active,
      ),

    location: {
      country,
      countryCode,
      countryFlag,
      city,
      ...(state
        ? { state }
        : {}),
    },

    categories,

    tags,

    rating: {
      average: Math.max(
        0,
        Math.min(
          5,
          averageRating,
        ),
      ),

      totalReviews:
        Math.max(
          0,
          totalReviews,
        ),
    },

    shipping: {
      localDelivery:
        toBoolean(
          raw.localDelivery ??
            shipping.localDelivery,
          false,
        ),

      nationalDelivery:
        toBoolean(
          raw.nationalDelivery ??
            shipping.nationalDelivery,
          false,
        ),

      internationalShipping:
        toBoolean(
          raw.internationalShipping ??
            shipping.internationalShipping,
          false,
        ),

      pickupAvailable:
        toBoolean(
          raw.pickupAvailable ??
            shipping.pickupAvailable,
          false,
        ),

      freeDeliveryThreshold:
        freeDeliveryValue !==
        undefined
          ? toNumber(
              freeDeliveryValue,
              0,
            )
          : null,
    },

    policies: {
      returns:
        toStringValue(
          raw.returnsPolicy ??
            policies.returns,
        ),

      refunds:
        toStringValue(
          raw.refundPolicy ??
            raw.refundsPolicy ??
            policies.refunds,
        ),

      cancellations:
        toStringValue(
          raw.cancellationPolicy ??
            raw.cancellationsPolicy ??
            policies.cancellations,
        ),

      shipping:
        toStringValue(
          raw.shippingPolicy ??
            policies.shipping,
        ),

      customerSupport:
        toStringValue(
          raw.customerSupportPolicy ??
            raw.supportPolicy ??
            policies.customerSupport,
        ),
    },

    productCount:
      Math.max(
        0,
        productCount,
      ),

    ...(orderCount > 0
      ? {
          orderCount:
            Math.max(
              0,
              orderCount,
            ),
        }
      : {}),

    createdAt,
    updatedAt,
  };

  return store;
}

function extractStoreArray(
  payload: unknown,
): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.stores)) {
    return payload.stores;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (isRecord(payload.data)) {
    return extractStoreArray(
      payload.data,
    );
  }

  return [];
}

function getPagination(
  payload: unknown,
  fallbackPage: number,
  fallbackPageSize: number,
  fallbackTotal: number,
): {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
} {
  const root = isRecord(payload)
    ? payload
    : {};

  const nested =
    isRecord(root.data)
      ? root.data
      : {};

  const page =
    Math.max(
      1,
      toNumber(
        root.page ??
          nested.page,
        fallbackPage,
      ),
    );

  const pageSize =
    Math.max(
      1,
      toNumber(
        root.pageSize ??
          root.limit ??
          nested.pageSize ??
          nested.limit,
        fallbackPageSize,
      ),
    );

  const total =
    Math.max(
      0,
      toNumber(
        root.total ??
          root.totalItems ??
          nested.total ??
          nested.totalItems,
        fallbackTotal,
      ),
    );

  const calculatedPages =
    Math.max(
      1,
      Math.ceil(
        total / pageSize,
      ),
    );

  const pages =
    Math.max(
      1,
      toNumber(
        root.pages ??
          root.totalPages ??
          nested.pages ??
          nested.totalPages,
        calculatedPages,
      ),
    );

  return {
    page,
    pageSize,
    total,
    pages,
  };
}

function filterStores(
  stores: Store[],
  filters: StoreListFilters = {},
): Store[] {
  const query =
    filters.query
      ?.trim()
      .toLowerCase();

  const categorySlug =
    filters.categorySlug
      ?.trim()
      .toLowerCase();

  const countryCode =
    filters.countryCode
      ?.trim()
      .toUpperCase();

  return stores.filter(
    (store) => {
      if (
        categorySlug &&
        !store.categories.includes(
          normalizeSlug(
            categorySlug,
          ),
        )
      ) {
        return false;
      }

      if (
        countryCode &&
        store.location
          .countryCode !==
          countryCode
      ) {
        return false;
      }

      if (
        filters.minRating !==
          undefined &&
        store.rating.average <
          filters.minRating
      ) {
        return false;
      }

      if (
        filters.verifiedOnly &&
        !store.verified
      ) {
        return false;
      }

      if (query) {
        const searchable = [
          store.name,
          store.description,
          store.location.city,
          store.location.state ||
            "",
          store.location.country,
          ...store.categories,
          ...store.tags,
        ]
          .join(" ")
          .toLowerCase();

        if (
          !searchable.includes(
            query,
          )
        ) {
          return false;
        }
      }

      return true;
    },
  );
}

function sortStores(
  stores: Store[],
  sort: StoreListFilters["sort"],
): Store[] {
  const result = [
    ...stores,
  ];

  switch (sort) {
    case "rating":
      return result.sort(
        (a, b) =>
          b.rating.average -
          a.rating.average,
      );

    case "newest":
      return result.sort(
        (a, b) =>
          Date.parse(
            b.createdAt,
          ) -
          Date.parse(
            a.createdAt,
          ),
      );

    case "most_orders":
      return result.sort(
        (a, b) =>
          (b.orderCount || 0) -
          (a.orderCount || 0),
      );

    case "relevance":
    default:
      return result;
  }
}

export async function listStores(
  filters: StoreListFilters = {},
): Promise<StoreListResult> {
  const page =
    Math.max(
      1,
      filters.page || 1,
    );

  const pageSize =
    Math.max(
      1,
      filters.pageSize || 20,
    );

  const params: Record<
    string,
    string | number | boolean | undefined
  > = {
    page,
    pageSize,
  };

  if (filters.categorySlug) {
    params.categorySlug =
      filters.categorySlug;
  }

  if (filters.countryCode) {
    params.countryCode =
      filters.countryCode;
  }

  if (filters.query) {
    params.query =
      filters.query;
  }

  if (
    filters.minRating !==
    undefined
  ) {
    params.minRating =
      filters.minRating;
  }

  if (
    filters.verifiedOnly !==
    undefined
  ) {
    params.verifiedOnly =
      filters.verifiedOnly;
  }

  if (filters.location) {
    params.location =
      filters.location;
  }

  if (filters.sort) {
    params.sort =
      filters.sort;
  }

  const url = buildUrl(
    STORES_ENDPOINT,
    params,
  );

  const payload =
    await request<unknown>(
      url,
      {
        method: "GET",
      },
    );

  const rawItems =
    extractStoreArray(
      payload,
    );

  const stores =
    rawItems.map(
      normalizeStore,
    );

  const filtered =
    filterStores(
      stores,
      filters,
    );

  const sorted =
    sortStores(
      filtered,
      filters.sort,
    );

  const pagination =
    getPagination(
      payload,
      page,
      pageSize,
      sorted.length,
    );

  const wasFiltered =
    filtered.length !==
    stores.length;

  return {
    items: sorted,

    total: wasFiltered
      ? filtered.length
      : pagination.total,

    page:
      pagination.page,

    pageSize:
      pagination.pageSize,

    pages: wasFiltered
      ? Math.max(
          1,
          Math.ceil(
            filtered.length /
              pagination.pageSize,
          ),
        )
      : pagination.pages,
  };
}

export async function getStoreBySlug(
  slug: string,
): Promise<Store> {
  const normalizedSlug =
    normalizeSlug(slug);

  if (!normalizedSlug) {
    throw new Error(
      "A store slug is required.",
    );
  }

  const url =
    `${STORES_ENDPOINT}/slug/${encodeURIComponent(
      normalizedSlug,
    )}`;

  const payload =
    await request<unknown>(
      url,
      {
        method: "GET",
      },
    );

  return normalizeStore(
    payload,
  );
}

export async function getMyStores(): Promise<
  Store[]
> {
  const payload =
    await request<unknown>(
      `${STORES_ENDPOINT}/me`,
      {
        method: "GET",
      },
      true,
    );

  return extractStoreArray(
    payload,
  ).map(normalizeStore);
}

export async function createStore(
  input: Record<string, unknown>,
): Promise<Store> {
  const payload =
    await request<unknown>(
      STORES_ENDPOINT,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          input,
        ),
      },
      true,
    );

  return normalizeStore(
    payload,
  );
}

export async function updateStore(
  storeId: string,
  input: Record<string, unknown>,
): Promise<Store> {
  if (!storeId.trim()) {
    throw new Error(
      "A store ID is required.",
    );
  }

  const url =
    `${STORES_ENDPOINT}/${encodeURIComponent(
      storeId,
    )}`;

  const payload =
    await request<unknown>(
      url,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          input,
        ),
      },
      true,
    );

  return normalizeStore(
    payload,
  );
}

export async function deleteStore(
  storeId: string,
): Promise<void> {
  if (!storeId.trim()) {
    throw new Error(
      "A store ID is required.",
    );
  }

  const url =
    `${STORES_ENDPOINT}/${encodeURIComponent(
      storeId,
    )}`;

  await request<unknown>(
    url,
    {
      method: "DELETE",
    },
    true,
  );
}

export async function followStore(
  storeId: string,
): Promise<unknown> {
  if (!storeId.trim()) {
    throw new Error(
      "A store ID is required.",
    );
  }

  const url =
    `${STORES_ENDPOINT}/${encodeURIComponent(
      storeId,
    )}/follow`;

  return request<unknown>(
    url,
    {
      method: "POST",
    },
    true,
  );
}

export async function getStoreReviews(
  _storeId: string,
): Promise<StoreReview[]> {
  /*
   * The current backend StoresController
   * does not expose a store-review endpoint.
   *
   * Keep this function for frontend
   * compatibility without making a request
   * to an endpoint that does not exist.
   */
  return [];
}

const storeApi = {
  listStores,
  getStoreBySlug,
  getMyStores,
  createStore,
  updateStore,
  deleteStore,
  followStore,
  getStoreReviews,
};

export default storeApi;