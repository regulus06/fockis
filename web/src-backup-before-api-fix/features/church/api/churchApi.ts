/**
 * churchApi.ts
 * ---------------------------------------------------------------------------
 * Central Fockis Church API HTTP client.
 *
 * Supports:
 * - JSON requests
 * - multipart/form-data uploads through FormData
 * - JWT authentication
 * - pagination helpers
 * - Church-specific API errors
 *
 * Authentication:
 * - Reads the current Fockis access token from localStorage/sessionStorage.
 * - Supports both direct token storage and common JSON auth/session objects.
 * - Sends the token as:
 *
 *     Authorization: Bearer <JWT>
 *
 * IMPORTANT:
 * A 401 response is NOT treated as a development fallback. Authentication
 * failures must reach the UI so the user can sign in again.
 * ---------------------------------------------------------------------------
 */

import type {
  PaginatedResult,
} from "../types/church.types";

/* ============================================================================
   ENVIRONMENT
   ========================================================================== */

const env =
  typeof import.meta !== "undefined"
    ? (
        import.meta as ImportMeta & {
          env?: Record<string, string | undefined>;
        }
      ).env
    : undefined;

function normalizeBaseUrl(
  value: string,
): string {
  return value
    .trim()
    .replace(/\/+$/, "");
}

function buildChurchBaseUrl(): string {
  const explicitChurchBase =
    env?.VITE_CHURCH_API_BASE?.trim();

  if (explicitChurchBase) {
    const normalized =
      normalizeBaseUrl(
        explicitChurchBase,
      );

    return normalized.endsWith("/church")
      ? normalized
      : `${normalized}/church`;
  }

  const apiBase =
    env?.VITE_API_BASE_URL?.trim() ||
    env?.VITE_API_URL?.trim();

  if (apiBase) {
    const normalized =
      normalizeBaseUrl(apiBase);

    return normalized.endsWith("/church")
      ? normalized
      : `${normalized}/church`;
  }

  return "/api/church";
}

export const CHURCH_API_BASE =
  buildChurchBaseUrl();

console.info(
  "[church] API base:",
  CHURCH_API_BASE,
);

/* ============================================================================
   ERRORS
   ========================================================================== */

export class ChurchApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);

    this.name = "ChurchApiError";
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(
      this,
      ChurchApiError.prototype,
    );
  }
}

export class ChurchAuthError
  extends ChurchApiError
{
  constructor(
    message =
      "You must be signed in to access the Church system.",
  ) {
    super(
      message,
      401,
      "UNAUTHENTICATED",
    );

    this.name = "ChurchAuthError";
  }
}

export class ChurchForbiddenError
  extends ChurchApiError
{
  constructor(
    message =
      "You do not have permission to access this Church resource.",
  ) {
    super(
      message,
      403,
      "FORBIDDEN",
    );

    this.name = "ChurchForbiddenError";
  }
}

export class ChurchValidationError
  extends ChurchApiError
{
  constructor(
    message =
      "The Church request contains invalid information.",
    details?: unknown,
  ) {
    super(
      message,
      400,
      "VALIDATION_ERROR",
      details,
    );

    this.name =
      "ChurchValidationError";
  }
}

/* ============================================================================
   REQUEST TYPES
   ========================================================================== */

export type HttpMethod =
  | "GET"
  | "POST"
  | "PATCH"
  | "PUT"
  | "DELETE";

export interface ChurchRequestOptions {
  method?: HttpMethod;

  /**
   * JSON object OR FormData.
   *
   * FormData is used for organization cover uploads.
   */
  body?: unknown;

  query?: Record<
    string,
    string | number | boolean | undefined | null
  >;

  signal?: AbortSignal;

  /**
   * Set true only for genuinely public endpoints.
   */
  anonymous?: boolean;
}

/* ============================================================================
   AUTHENTICATION
   ========================================================================== */

/**
 * Values that may contain a directly stored JWT.
 */
const DIRECT_TOKEN_KEYS = [
  "fockis_auth_token",
  "fockis_access_token",
  "access_token",
  "accessToken",
  "authToken",
  "token",
  "jwt",
] as const;

/**
 * Keys that sometimes contain a JSON authentication/session object.
 *
 * This allows the Church client to work with auth stores that save something
 * such as:
 *
 * {
 *   accessToken: "...",
 *   refreshToken: "...",
 *   user: {...}
 * }
 */
const AUTH_OBJECT_KEYS = [
  "fockis_auth",
  "fockis_session",
  "auth",
  "session",
  "user",
  "currentUser",
] as const;

function cleanToken(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  let token =
    value.trim();

  if (!token) {
    return null;
  }

  /**
   * Remove accidental JSON/string quotes.
   *
   * Example:
   *
   *   "\"eyJ...\""
   *
   * becomes:
   *
   *   "eyJ..."
   */
  if (
    token.length >= 2 &&
    (
      (
        token.startsWith('"') &&
        token.endsWith('"')
      ) ||
      (
        token.startsWith("'") &&
        token.endsWith("'")
      )
    )
  ) {
    token =
      token.slice(
        1,
        -1,
      ).trim();
  }

  /**
   * We expect a JWT.
   *
   * A JWT has three dot-separated sections.
   *
   * We intentionally do not decode or verify it on the client.
   */
  const jwtParts =
    token.split(".");

  if (
    jwtParts.length !== 3
  ) {
    return null;
  }

  if (
    !jwtParts[0] ||
    !jwtParts[1] ||
    !jwtParts[2]
  ) {
    return null;
  }

  return token;
}

function tokenFromObject(
  value: unknown,
): string | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const object =
    value as Record<
      string,
      unknown
    >;

  const directFields = [
    "accessToken",
    "access_token",
    "token",
    "jwt",
    "idToken",
    "id_token",
  ] as const;

  for (
    const field of directFields
  ) {
    const token =
      cleanToken(
        object[field],
      );

    if (token) {
      return token;
    }
  }

  /**
   * Some auth stores nest the token:
   *
   * {
   *   auth: {
   *     accessToken: "..."
   *   }
   * }
   */
  const nestedFields = [
    "auth",
    "session",
    "data",
    "state",
    "user",
  ] as const;

  for (
    const field of nestedFields
  ) {
    const nestedToken =
      tokenFromObject(
        object[field],
      );

    if (nestedToken) {
      return nestedToken;
    }
  }

  return null;
}

function readStorageValue(
  storage: Storage,
  key: string,
): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Returns the current JWT used by the Fockis frontend.
 *
 * We intentionally check localStorage first because the existing Fockis
 * authentication flow stores persistent sessions there.
 */
function getAuthToken(): string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    /* ------------------------------------------------------------------------
       1. Direct token keys
       --------------------------------------------------------------------- */

    for (
      const key of DIRECT_TOKEN_KEYS
    ) {
      const localValue =
        readStorageValue(
          window.localStorage,
          key,
        );

      const localToken =
        cleanToken(
          localValue,
        );

      if (localToken) {
        return localToken;
      }

      const sessionValue =
        readStorageValue(
          window.sessionStorage,
          key,
        );

      const sessionToken =
        cleanToken(
          sessionValue,
        );

      if (sessionToken) {
        return sessionToken;
      }
    }

    /* ------------------------------------------------------------------------
       2. JSON auth/session objects
       --------------------------------------------------------------------- */

    for (
      const key of AUTH_OBJECT_KEYS
    ) {
      const localValue =
        readStorageValue(
          window.localStorage,
          key,
        );

      if (localValue) {
        try {
          const parsed =
            JSON.parse(
              localValue,
            );

          const token =
            tokenFromObject(
              parsed,
            );

          if (token) {
            return token;
          }
        } catch {
          /* Ignore malformed JSON and continue. */
        }
      }

      const sessionValue =
        readStorageValue(
          window.sessionStorage,
          key,
        );

      if (sessionValue) {
        try {
          const parsed =
            JSON.parse(
              sessionValue,
            );

          const token =
            tokenFromObject(
              parsed,
            );

          if (token) {
            return token;
          }
        } catch {
          /* Ignore malformed JSON and continue. */
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

/* ============================================================================
   QUERY
   ========================================================================== */

export function buildQuery(
  query?: ChurchRequestOptions["query"],
): string {
  if (!query) {
    return "";
  }

  const params =
    new URLSearchParams();

  for (
    const [key, value]
      of Object.entries(query)
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    params.set(
      key,
      String(value),
    );
  }

  const result =
    params.toString();

  return result
    ? `?${result}`
    : "";
}

/* ============================================================================
   URL
   ========================================================================== */

function buildUrl(
  path: string,
  query?: ChurchRequestOptions["query"],
): string {
  const cleanPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return (
    `${CHURCH_API_BASE}` +
    `${cleanPath}` +
    `${buildQuery(query)}`
  );
}

/* ============================================================================
   RESPONSE
   ========================================================================== */

async function parseResponse(
  response: Response,
): Promise<unknown> {
  if (
    response.status === 204
  ) {
    return undefined;
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  try {
    if (
      contentType.includes(
        "application/json",
      )
    ) {
      return await response.json();
    }

    const text =
      await response.text();

    return text || null;
  } catch {
    return null;
  }
}

/* ============================================================================
   ERROR EXTRACTION
   ========================================================================== */

function extractError(
  payload: unknown,
  fallback: string,
): {
  message: string;
  code?: string;
} {
  if (
    payload &&
    typeof payload === "object"
  ) {
    const data =
      payload as Record<
        string,
        unknown
      >;

    let message =
      fallback;

    if (
      Array.isArray(
        data.message,
      )
    ) {
      message =
        data.message
          .map(String)
          .join(", ");
    } else if (
      typeof data.message ===
        "string" &&
      data.message.trim()
    ) {
      message =
        data.message;
    } else if (
      typeof data.error ===
        "string" &&
      data.error.trim()
    ) {
      message =
        data.error;
    }

    const code =
      typeof data.code ===
        "string"
        ? data.code
        : undefined;

    return {
      message,
      code,
    };
  }

  if (
    typeof payload ===
      "string" &&
    payload.trim()
  ) {
    return {
      message:
        payload,
    };
  }

  return {
    message:
      fallback,
  };
}

/* ============================================================================
   MAIN REQUEST
   ========================================================================== */

export async function churchRequest<T>(
  path: string,
  options: ChurchRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    signal,
    anonymous = false,
  } = options;

  const url =
    buildUrl(
      path,
      query,
    );

  const headers: Record<
    string,
    string
  > = {
    Accept:
      "application/json",
  };

  /* --------------------------------------------------------------------------
     AUTH
     ------------------------------------------------------------------------ */

  if (!anonymous) {
    const token =
      getAuthToken();

    if (!token) {
      throw new ChurchAuthError(
        "Your Fockis session is missing. Please sign in again.",
      );
    }

    headers.Authorization =
      `Bearer ${token}`;
  }

  /* --------------------------------------------------------------------------
     BODY
     ------------------------------------------------------------------------ */

  /**
   * FormData must NOT receive Content-Type manually.
   *
   * The browser automatically generates:
   *
   * multipart/form-data; boundary=...
   *
   * JSON requests receive application/json.
   */
  const isFormData =
    typeof FormData !==
      "undefined" &&
    body instanceof FormData;

  if (
    body !== undefined &&
    !isFormData
  ) {
    headers[
      "Content-Type"
    ] =
      "application/json";
  }

  /* --------------------------------------------------------------------------
     REQUEST
     ------------------------------------------------------------------------ */

  let response: Response;

  try {
    response =
      await fetch(
        url,
        {
          method,
          headers,
          body:
            body === undefined
              ? undefined
              : isFormData
                ? (
                    body as FormData
                  )
                : JSON.stringify(
                    body,
                  ),
          signal,

          /**
           * Keep cookies available for authentication flows that use them.
           *
           * The Bearer JWT remains the primary Church API authentication
           * mechanism.
           */
          credentials:
            "include",
        },
      );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name ===
        "AbortError"
    ) {
      throw error;
    }

    throw new ChurchApiError(
      `Unable to reach the Church backend at ${CHURCH_API_BASE}.`,
      0,
      "NETWORK_ERROR",
      error,
    );
  }

  /* --------------------------------------------------------------------------
     RESPONSE
     ------------------------------------------------------------------------ */

  const payload =
    await parseResponse(
      response,
    );

  if (response.ok) {
    return payload as T;
  }

  const extracted =
    extractError(
      payload,
      `Church API request failed with status ${response.status}.`,
    );

  /* --------------------------------------------------------------------------
     AUTHENTICATION ERROR
     ------------------------------------------------------------------------ */

  if (
    response.status === 401
  ) {
    throw new ChurchAuthError(
      extracted.message ||
        "Your Fockis session is invalid or has expired. Please sign in again.",
    );
  }

  /* --------------------------------------------------------------------------
     AUTHORIZATION ERROR
     ------------------------------------------------------------------------ */

  if (
    response.status === 403
  ) {
    throw new ChurchForbiddenError(
      extracted.message,
    );
  }

  /* --------------------------------------------------------------------------
     VALIDATION ERROR
     ------------------------------------------------------------------------ */

  if (
    response.status === 400
  ) {
    throw new ChurchValidationError(
      extracted.message,
      payload,
    );
  }

  /* --------------------------------------------------------------------------
     OTHER API ERRORS
     ------------------------------------------------------------------------ */

  throw new ChurchApiError(
    extracted.message,
    response.status,
    extracted.code ||
      (
        response.status ===
          404
          ? "NOT_FOUND"
          : undefined
      ),
    payload,
  );
}

/* ============================================================================
   PAGINATION
   ========================================================================== */

export function toPaginated<T>(
  items: T[],
  page = 1,
  pageSize = items.length,
): PaginatedResult<T> {
  return {
    items,
    total:
      items.length,
    page,
    pageSize:
      pageSize ||
      items.length ||
      1,
    hasMore:
      false,
  };
}

/* ============================================================================
   DEVELOPMENT FALLBACK
   ========================================================================== */

export async function withFallback<T>(
  request: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    const isMissingEndpoint =
      error instanceof ChurchApiError &&
      (
        error.status === 404 ||
        error.status === 501
      );

    const isDevelopment =
      Boolean(
        env?.DEV,
      );

    /**
     * IMPORTANT:
     *
     * 401 is intentionally NOT included here.
     *
     * A missing endpoint can use a development fallback.
     * An authentication failure cannot.
     */
    if (
      isDevelopment &&
      isMissingEndpoint
    ) {
      console.warn(
        "[church] Missing endpoint:",
        error.message,
      );

      return fallback();
    }

    throw error;
  }
}

/* ============================================================================
   HTTP HELPERS
   ========================================================================== */

export function churchGet<T>(
  path: string,
  query?: ChurchRequestOptions["query"],
  signal?: AbortSignal,
): Promise<T> {
  return churchRequest<T>(
    path,
    {
      method: "GET",
      query,
      signal,
    },
  );
}

export function churchPost<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return churchRequest<T>(
    path,
    {
      method: "POST",
      body,
      signal,
    },
  );
}

export function churchPatch<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return churchRequest<T>(
    path,
    {
      method: "PATCH",
      body,
      signal,
    },
  );
}

export function churchPut<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return churchRequest<T>(
    path,
    {
      method: "PUT",
      body,
      signal,
    },
  );
}

export function churchDelete<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  return churchRequest<T>(
    path,
    {
      method: "DELETE",
      signal,
    },
  );
}

/* ============================================================================
   FILE UPLOAD
   ========================================================================== */

/**
 * POST multipart/form-data.
 *
 * Do NOT manually set Content-Type.
 */
export function churchUpload<T>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<T> {
  return churchRequest<T>(
    path,
    {
      method: "POST",
      body: formData,
      signal,
    },
  );
}

/**
 * PATCH multipart/form-data.
 */
export function churchUploadPatch<T>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<T> {
  return churchRequest<T>(
    path,
    {
      method: "PATCH",
      body: formData,
      signal,
    },
  );
}

/* ============================================================================
   CURRENT USER — CHURCH ORGANIZATIONS
   ========================================================================== */

export interface MyChurchOrganization {
  id: string;

  name?: string;

  slug?: string;

  /**
   * Permanent Fockis organization namespace.
   *
   * Example:
   *
   *   springfieldchurch.fockis.com
   */
  domain?: string;

  organizationType?: string;

  logoUrl?: string | null;

  bannerUrl?: string | null;

  bannerMediaType?:
    | "image"
    | "video"
    | null;

  bannerMediaSource?:
    | "upload"
    | "url"
    | null;

  description?: string;

  status?: string;

  memberCount?: number;

  currentUserMembershipStatus?:
    | string
    | null;
}

export interface MyChurchOrganizationsResponse {
  organizations?:
    MyChurchOrganization[];

  organizationIds?:
    string[];

  items?:
    MyChurchOrganization[];

  total?: number;

  page?: number;

  pageSize?: number;

  hasMore?: boolean;
}

/**
 * Get the Church organizations associated with
 * the currently authenticated user.
 *
 * GET /church/organizations?mine=true
 */
export async function getMyChurchOrganizations(
  signal?: AbortSignal,
): Promise<MyChurchOrganizationsResponse> {
  return churchGet<MyChurchOrganizationsResponse>(
    "/organizations",
    {
      mine: true,
    },
    signal,
  );
}