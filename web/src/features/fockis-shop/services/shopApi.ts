/**
 * ============================================================================
 * FOCKIS SHOP — STORE API
 * ============================================================================
 *
 * Public marketplace store API.
 *
 * Backend:
 * GET /stores
 * GET /stores/slug/:slug
 *
 * Authentication is NOT required for public store browsing.
 *
 * Authenticated:
 * GET /stores/me
 * POST /stores
 * PUT /stores/:id
 * DELETE /stores/:id
 * ============================================================================
 */

import type {
  Store,
  StoreListFilters,
  StoreReview,
} from "../types/store.types";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const STORES_BASE = "/stores";

export interface StorePaginatedResult {
  items: Store[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// URL
// ============================================================================

function buildUrl(
  path: string,
  params?: Record<
    string,
    string | number | boolean | undefined
  >,
): string {
  const url = new URL(
    `${API_BASE_URL}${path}`,
    window.location.origin,
  );

  if (params) {
    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          url.searchParams.set(
            key,
            String(value),
          );
        }
      },
    );
  }

  return url.toString();
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

function normalizeStatus(
  value: unknown,
): Store["status"] {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    status === "pending" ||
    status === "pending_review"
  ) {
    return "pending_review";
  }

  if (
    status === "suspended"
  ) {
    return "suspended";
  }

  if (
    status === "closed"
  ) {
    return "closed";
  }

  return "active";
}

function normalizeStore(
  value: any,
): Store {
  const source =
    value?.store ??
    value?.data ??
    value;

  return {
    ...source,

    id: String(
      source?._id ??
      source?.id ??
      "",
    ),

    _id: source?._id,

    name: String(
      source?.name ??
      "",
    ),

    slug: String(
      source?.slug ??
      "",
    ),

    ownerId:
      source?.ownerId ??
      source?.sellerId,

    sellerId:
      source?.sellerId ??
      source?.ownerId,

    fockisStoreId:
      source?.fockisStoreId,

    domainName:
      source?.domainName,

    country:
      source?.country,

    countryCode:
      source?.countryCode,

    city:
      source?.city,

    state:
      source?.state,

    address:
      source?.address,

    zipCode:
      source?.zipCode,

    logoUrl:
      source?.logoUrl ??
      source?.logo ??
      source?.logoURL,

    bannerUrl:
      source?.bannerUrl ??
      source?.banner ??
      source?.bannerURL,

    description:
      source?.description,

    category:
      source?.category,

    status:
      normalizeStatus(
        source?.status,
      ),

    active:
      source?.active !== undefined
        ? Boolean(source.active)
        : true,

    rating:
      Number(
        source?.rating ??
        source?.averageRating ??
        source?.ratingAverage ??
        0,
      ),

    reviewCount:
      Number(
        source?.reviewCount ??
        source?.reviewsCount ??
        source?.totalReviews ??
        0,
      ),

    productCount:
      Number(
        source?.productCount ??
        source?.totalProducts ??
        source?.analytics
          ?.totalProducts ??
        0,
      ),

    createdAt:
      source?.createdAt,

    updatedAt:
      source?.updatedAt,
  } as Store;
}

function extractStores(
  payload: any,
): any[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    payload &&
    Array.isArray(payload.items)
  ) {
    return payload.items;
  }

  if (
    payload &&
    Array.isArray(payload.stores)
  ) {
    return payload.stores;
  }

  if (
    payload &&
    Array.isArray(payload.results)
  ) {
    return payload.results;
  }

  if (
    payload?.data &&
    Array.isArray(payload.data)
  ) {
    return payload.data;
  }

  if (
    payload?.data?.items &&
    Array.isArray(
      payload.data.items,
    )
  ) {
    return payload.data.items;
  }

  if (
    payload?.data?.stores &&
    Array.isArray(
      payload.data.stores,
    )
  ) {
    return payload.data.stores;
  }

  return [];
}

function getPagination(
  payload: any,
  fallbackCount: number,
  filters: StoreListFilters,
) {
  const page =
    Number(
      payload?.page ??
      payload?.data?.page ??
      filters.page ??
      1,
    );

  const pageSize =
    Number(
      payload?.pageSize ??
      payload?.data?.pageSize ??
      filters.pageSize ??
      24,
    );

  const total =
    Number(
      payload?.total ??
      payload?.data?.total ??
      fallbackCount,
    );

  const totalPages =
    Number(
      payload?.totalPages ??
      payload?.data?.totalPages ??
      Math.max(
        1,
        Math.ceil(
          total /
            Math.max(
              pageSize,
              1,
            ),
        ),
      ),
    );

  return {
    total,
    page,
    pageSize,
    totalPages,
  };
}

// ============================================================================
// REQUEST
// ============================================================================

async function request<T>(
  path: string,
  params?: Record<
    string,
    string | number | boolean | undefined
  >,
): Promise<T> {
  const response =
    await fetch(
      buildUrl(
        path,
        params,
      ),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
        },
        credentials: "include",
      },
    );

  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  if (!response.ok) {
    if (
      response.status === 404
    ) {
      throw new Error(
        "STORE_NOT_FOUND",
      );
    }

    let message =
      `Request failed with status ${response.status}`;

    if (
      contentType.includes(
        "application/json",
      )
    ) {
      try {
        const body =
          await response.json();

        if (
          typeof body?.message ===
          "string"
        ) {
          message =
            body.message;
        } else if (
          Array.isArray(
            body?.message,
          )
        ) {
          message =
            body.message.join(
              ", ",
            );
        } else if (
          typeof body?.error ===
          "string"
        ) {
          message =
            body.error;
        }
      } catch {
        // Ignore invalid JSON.
      }
    } else {
      try {
        const text =
          await response.text();

        if (text) {
          message = text;
        }
      } catch {
        // Ignore response parsing errors.
      }
    }

    throw new Error(
      message,
    );
  }

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    const text =
      await response.text();

    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(
        text,
      ) as T;
    } catch {
      return text as T;
    }
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// LIST PUBLIC STORES
// ============================================================================

export async function listStores(
  filters: StoreListFilters = {},
): Promise<StorePaginatedResult> {
  const payload =
    await request<any>(
      STORES_BASE,
      {
        categorySlug:
          filters.categorySlug,

        countryCode:
          filters.countryCode,

        query:
          filters.query,

        location:
          filters.location,

        minRating:
          filters.minRating,

        verifiedOnly:
          filters.verifiedOnly,

        sort:
          filters.sort,

        page:
          filters.page ?? 1,

        pageSize:
          filters.pageSize ?? 24,
      },
    );

  const rawStores =
    extractStores(
      payload,
    );

  const stores =
    rawStores
      .map(normalizeStore)
      .filter(
        (store) =>
          Boolean(store.id) &&
          Boolean(store.name),
      );

  const pagination =
    getPagination(
      payload,
      stores.length,
      filters,
    );

  return {
    items: stores,
    total:
      pagination.total,
    page:
      pagination.page,
    pageSize:
      pagination.pageSize,
    totalPages:
      pagination.totalPages,
  };
}

// ============================================================================
// GET PUBLIC STORE BY SLUG
// ============================================================================

export async function getStoreBySlug(
  slug: string,
): Promise<Store | null> {
  if (
    !slug ||
    !slug.trim()
  ) {
    return null;
  }

  try {
    const payload =
      await request<any>(
        `${STORES_BASE}/slug/${encodeURIComponent(
          slug.trim(),
        )}`,
      );

    const store =
      payload?.store ??
      payload?.data ??
      payload;

    if (
      !store
    ) {
      return null;
    }

    return normalizeStore(
      store,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "STORE_NOT_FOUND"
    ) {
      return null;
    }

    throw error;
  }
}

// ============================================================================
// STORE REVIEWS
// ============================================================================

export async function getStoreReviews(
  storeId: string,
): Promise<StoreReview[]> {
  /*
   * The current StoresController does not expose:
   *
   * GET /stores/:storeId/reviews
   *
   * Keep this safe until the reviews endpoint is implemented.
   */

  if (
    !storeId ||
    !storeId.trim()
  ) {
    return [];
  }

  return [];
}

// ============================================================================
// OBJECT API
// ============================================================================

export const storeApi = {
  listStores,
  getStoreBySlug,
  getStoreReviews,
};

export default storeApi;