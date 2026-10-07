import { FOCKIS_API_URL } from "../../../config/fockisConfig";

// web/src/features/careers/services/apiClient.ts

/*
 * ============================================================
 * FOCKIS API CLIENT
 *
 * Shared frontend API client used by:
 *   - Careers
 *   - Music
 *   - Organization Identity
 *   - Other frontend features
 *
 * Supports:
 *   - JSON requests
 *   - FormData / file uploads
 *   - JWT authentication
 *   - Cookie authentication
 *   - NestJS validation errors
 *   - Multiple legacy JWT storage keys
 * ============================================================
 */

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL
)
  .trim()
  .replace(/\/+$/, "");

/* ============================================================
   TOKEN HELPERS
============================================================ */

/**
 * Get the currently stored JWT.
 *
 * Fockis has used multiple authentication storage keys.
 *
 * We check:
 *   1. access_token
 *   2. token
 *   3. jwt
 *   4. authToken
 *   5. auth_token
 *
 * The token itself is NEVER logged.
 */
function getAuthToken(): string | null {
  if (
    typeof window === "undefined" ||
    typeof localStorage === "undefined"
  ) {
    return null;
  }

  const tokenKeys = [
    "access_token",
    "token",
    "jwt",
    "authToken",
    "auth_token",
  ];

  for (const key of tokenKeys) {
    try {
      const value =
        localStorage.getItem(key);

      if (
        typeof value === "string" &&
        value.trim().length > 0
      ) {
        return value.trim();
      }
    } catch {
      // Ignore localStorage access errors.
    }
  }

  return null;
}

/* ============================================================
   REQUEST HELPER
============================================================ */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    getAuthToken();

  const headers =
    new Headers(options.headers);

  /*
   * ==========================================================
   * CONTENT TYPE
   *
   * For FormData uploads we MUST NOT manually set
   * Content-Type.
   *
   * The browser automatically creates:
   *
   * multipart/form-data; boundary=...
   *
   * NestJS/Multer needs that boundary.
   * ==========================================================
   */

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (
    !isFormData &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  /*
   * ==========================================================
   * JWT AUTHENTICATION
   * ==========================================================
   *
   * NestJS JwtAuthGuard expects:
   *
   * Authorization: Bearer <JWT>
   *
   * Never send:
   *
   * Authorization: Bearer null
   * Authorization: Bearer undefined
   */

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  } else {
    headers.delete(
      "Authorization",
    );
  }

  /*
   * ==========================================================
   * DEBUG INFORMATION
   *
   * We intentionally DO NOT print the JWT.
   *
   * This only tells us whether a token was found.
   * ==========================================================
   */

  if (
    import.meta.env.DEV &&
    path.includes("/music/studio/upload")
  ) {
    console.log(
      "[FOCKIS API] Music Studio upload auth:",
      {
        hasToken: Boolean(token),
        hasAuthorizationHeader:
          headers.has("Authorization"),
        apiBase: API_BASE,
      },
    );
  }

  /*
   * ==========================================================
   * REQUEST
   * ==========================================================
   */

  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers,

        /*
         * Keep cookies enabled for authentication flows
         * that use cookies in addition to JWT.
         */
        credentials: "include",
      },
    );

  /* ==========================================================
     ERROR HANDLING
  ========================================================== */

  if (!response.ok) {
    const body =
      await response
        .text()
        .catch(() => "");

    let message =
      body ||
      response.statusText ||
      "Unknown error";

    /*
     * NestJS commonly returns:
     *
     * {
     *   "statusCode": 401,
     *   "message": "Unauthorized"
     * }
     *
     * Validation errors may return:
     *
     * {
     *   "message": [
     *     "field must be ..."
     *   ]
     * }
     */

    try {
      const parsed =
        JSON.parse(body);

      if (
        parsed &&
        parsed.message !== undefined
      ) {
        message =
          Array.isArray(
            parsed.message,
          )
            ? parsed.message.join(", ")
            : String(
                parsed.message,
              );
      }
    } catch {
      /*
       * Response was not JSON.
       * Keep the original response body.
       */
    }

    /*
     * Make authentication failures clearer.
     */
    if (response.status === 401) {
      message =
        message ||
        "Authentication required. Please sign in again.";
    }

    /*
     * Helpful producer authorization message.
     *
     * The Music Studio backend separately checks whether
     * the authenticated account is an approved producer.
     */
    if (response.status === 403) {
      message =
        message ||
        "You are authenticated, but your account is not authorized for this Music Studio action.";
    }

    throw new Error(
      `API error ${response.status}: ${message}`,
    );
  }

  /* ==========================================================
     EMPTY RESPONSE
  ========================================================== */

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  const text =
    await response.text();

  if (!text) {
    return undefined as T;
  }

  /* ==========================================================
     JSON RESPONSE
  ========================================================== */

  try {
    return JSON.parse(
      text,
    ) as T;
  } catch {
    throw new Error(
      "API returned an invalid JSON response.",
    );
  }
}

/* ============================================================
   API CLIENT
============================================================ */

export const apiClient = {
  /* ==========================================================
     GET
  ========================================================== */

  get: <T>(
    path: string,
  ): Promise<T> =>
    request<T>(
      path,
      {
        method: "GET",
      },
    ),

  /* ==========================================================
     POST
  ========================================================== */

  post: <T>(
    path: string,
    body?: unknown,
  ): Promise<T> =>
    request<T>(
      path,
      {
        method: "POST",

        body:
          body instanceof FormData
            ? body
            : body !== undefined
              ? JSON.stringify(body)
              : undefined,
      },
    ),

  /* ==========================================================
     PATCH
  ========================================================== */

  patch: <T>(
    path: string,
    body?: unknown,
  ): Promise<T> =>
    request<T>(
      path,
      {
        method: "PATCH",

        body:
          body instanceof FormData
            ? body
            : body !== undefined
              ? JSON.stringify(body)
              : undefined,
      },
    ),

  /* ==========================================================
     DELETE
  ========================================================== */

  delete: <T>(
    path: string,
  ): Promise<T> =>
    request<T>(
      path,
      {
        method: "DELETE",
      },
    ),
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default apiClient;