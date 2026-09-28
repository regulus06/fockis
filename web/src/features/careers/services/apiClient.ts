// web/src/features/careers/services/apiClient.ts

/*
 * ============================================================
 * FOCKIS API CLIENT
 *
 * Shared frontend API client used by Careers, Music,
 * Organization Identity, and other frontend features.
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

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

/* ============================================================
   TOKEN HELPERS
============================================================ */

/**
 * Get the currently stored JWT.
 *
 * Fockis has used more than one localStorage key across
 * different authentication flows. Check them in priority order
 * so older sessions continue to work.
 *
 * IMPORTANT:
 * We only return the token itself. We never log it.
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
    const value =
      localStorage.getItem(key);

    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
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
   * JSON:
   *   Content-Type: application/json
   *
   * FormData:
   *   DO NOT manually set Content-Type.
   *
   * The browser automatically creates:
   *
   *   multipart/form-data; boundary=...
   *
   * Setting it manually can prevent NestJS/Multer from parsing
   * the upload correctly.
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
   * Send the JWT using the standard:
   *
   * Authorization: Bearer <token>
   *
   * This is required by NestJS JwtAuthGuard.
   */

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  } else {
    /*
     * Do not send an empty Authorization header.
     *
     * This allows public endpoints to continue working and
     * avoids sending:
     *
     * Authorization: Bearer null
     */
    headers.delete(
      "Authorization",
    );
  }

  /*
   * ==========================================================
   * REQUEST
   * ==========================================================
   */

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,

      /*
       * Keep cookies enabled in case authentication or another
       * backend feature also uses cookies.
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
     *   "statusCode": 400,
     *   "message": "..."
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

      if (parsed?.message) {
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
     * If the backend rejects the token, give the frontend
     * a clear authentication error.
     */
    if (response.status === 401) {
      message =
        message ||
        "Authentication required. Please sign in again.";
    }

    throw new Error(
      `API error ${response.status}: ${message}`,
    );
  }

  /* ==========================================================
     EMPTY RESPONSE
  ========================================================== */

  if (response.status === 204) {
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
    return JSON.parse(text) as T;
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