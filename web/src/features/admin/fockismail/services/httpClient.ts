// ============================================================================
// FOCKIS MAIL HTTP CLIENT
// ----------------------------------------------------------------------------
// Real backend communication for Fockis Mail.
//
// The frontend does NOT contain Mailchimp, SMTP, Stripe, or other secrets.
// Those integrations remain on the NestJS backend.
//
// Backend URL priority:
//   1. VITE_MARKETING_API_URL
//   2. VITE_API_URL
//   3. VITE_API_BASE_URL
//
// Mock mode is ONLY enabled when:
//   VITE_MARKETING_USE_MOCKS=true
// ============================================================================

const env = import.meta.env as Record<string, string | undefined>;

// ============================================================================
// Environment
// ============================================================================

function cleanUrl(value?: string): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

export const MARKETING_API_URL = cleanUrl(
  env.VITE_MARKETING_API_URL ??
    env.VITE_API_URL ??
    env.VITE_API_BASE_URL,
);

export const MAILCHIMP_AUDIENCE_ID =
  env.VITE_MAILCHIMP_AUDIENCE_ID ?? "";

export const USE_MOCKS =
  env.VITE_MARKETING_USE_MOCKS === "true";

// ============================================================================
// Errors
// ============================================================================

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "ApiError";
    this.status = status;
  }
}

// ============================================================================
// Request types
// ============================================================================

type QueryValue =
  | string
  | number
  | boolean
  | undefined;

type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?:
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE";

  body?: unknown;

  query?: Query;

  headers?: Record<string, string>;
}

// ============================================================================
// Authentication
// ============================================================================

function getAuthToken(): string {
  const keys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "authToken",
    "fockis_token",
    "fockis_access_token",
  ];

  for (const key of keys) {
    try {
      const value = window.localStorage.getItem(key);

      if (value?.trim()) {
        return value.trim();
      }
    } catch {
      // Ignore localStorage errors.
    }
  }

  return "";
}

// ============================================================================
// URL builder
// ============================================================================

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function buildUrl(
  path: string,
  query?: Query,
): string {
  if (!MARKETING_API_URL) {
    throw new ApiError(
      "Fockis Mail backend URL is not configured. Set VITE_MARKETING_API_URL, VITE_API_URL, or VITE_API_BASE_URL.",
      0,
    );
  }

  const normalizedPath = normalizePath(path);

  const url = new URL(
    `${MARKETING_API_URL}${normalizedPath}`,
  );

  if (query) {
    Object.entries(query).forEach(
      ([key, value]) => {
        if (
          value === undefined ||
          value === "" ||
          value === "all"
        ) {
          return;
        }

        url.searchParams.set(
          key,
          String(value),
        );
      },
    );
  }

  return url.toString();
}

// ============================================================================
// Response parsing
// ============================================================================

async function readResponseBody(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (
    contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  try {
    const text = await response.text();

    return text || undefined;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Real network request
// ============================================================================

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(
    path,
    options.query,
  );

  const token = getAuthToken();

  const headers: Record<string, string> = {
    Accept: "application/json",

    // Prevent browser/proxy caching of API responses.
    "Cache-Control": "no-cache, no-store, max-age=0",
    Pragma: "no-cache",

    ...(options.headers ?? {}),
  };

  if (
    options.body !== undefined &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",

    credentials: "include",

    // Prevent cached 304 responses for Fockis Mail API calls.
    cache: "no-store",

    headers,

    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(
              options.body,
            ),
  });

  const data =
    await readResponseBody(response);

  // --------------------------------------------------------------------------
  // HTTP errors
  // --------------------------------------------------------------------------

  if (!response.ok) {
    let message =
      `Request failed (${response.status})`;

    if (
      typeof data === "object" &&
      data !== null
    ) {
      const body = data as {
        message?: unknown;
        error?: unknown;
      };

      if (
        typeof body.message === "string"
      ) {
        message = body.message;
      } else if (
        typeof body.error === "string"
      ) {
        message = body.error;
      }
    } else if (
      typeof data === "string" &&
      data.trim()
    ) {
      message = data.trim();
    }

    throw new ApiError(
      message,
      response.status,
    );
  }

  // --------------------------------------------------------------------------
  // No content
  // --------------------------------------------------------------------------

  if (response.status === 204) {
    return undefined as T;
  }

  // --------------------------------------------------------------------------
  // Successful JSON response
  // --------------------------------------------------------------------------

  return data as T;
}

// ============================================================================
// Mock helper
// ----------------------------------------------------------------------------
// IMPORTANT:
// The producer may return either T or PromiseLike<T>.
// Promise.resolve() flattens the result to Promise<T>.
// This prevents:
//   Promise<Promise<T>>
// ============================================================================

export function mock<T>(
  produce: () => T | PromiseLike<T>,
  delay = 320,
): Promise<T> {
  return new Promise<void>((resolve) => {
    window.setTimeout(
      resolve,
      delay,
    );
  })
    .then(() => {
      return Promise.resolve(
        produce(),
      );
    })
    .then((value) => {
      if (value === undefined) {
        return value as T;
      }

      if (
        typeof structuredClone ===
        "function"
      ) {
        return structuredClone(
          value,
        ) as T;
      }

      return JSON.parse(
        JSON.stringify(value),
      ) as T;
    });
}

// ============================================================================
// API call wrapper
// ============================================================================

export function call<T>(
  mockImpl: () => T,
  path: string,
  options?: RequestOptions,
): Promise<T> {
  if (USE_MOCKS) {
    return mock<T>(
      () => mockImpl(),
    );
  }

  return request<T>(
    path,
    options,
  );
}

// ============================================================================
// Async API call wrapper
// ----------------------------------------------------------------------------
// Explicitly wraps the async mock in a callback returning PromiseLike<T>.
// This prevents TypeScript from inferring Promise<Promise<T>>.
// ============================================================================

export function callAsync<T>(
  mockImpl: () => Promise<T>,
  path: string,
  options?: RequestOptions,
): Promise<T> {
  if (USE_MOCKS) {
    return mock<T>(
      () => mockImpl(),
    );
  }

  return request<T>(
    path,
    options,
  );
}

// ============================================================================
// Configuration helpers
// ============================================================================

export function isMarketingBackendConfigured(): boolean {
  return Boolean(
    MARKETING_API_URL,
  );
}

export function isMockMode(): boolean {
  return USE_MOCKS;
}

export function getMarketingApiUrl(): string {
  return MARKETING_API_URL;
}