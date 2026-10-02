const DEFAULT_API_URL = "http://localhost:3000";

function removeTrailingSlashes(value: string): string {
  let result = value.trim();

  while (result.endsWith("/")) {
    result = result.slice(0, -1);
  }

  return result;
}

const API_BASE_URL = removeTrailingSlashes(
  String(
    import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      DEFAULT_API_URL,
  ),
);

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

function getAuthToken(): string | null {
  const possibleKeys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "authToken",
    "fockis_token",
  ];

  for (const key of possibleKeys) {
    try {
      const value = localStorage.getItem(key);

      if (!value) {
        continue;
      }

      const trimmed = value.trim();

      if (!trimmed) {
        continue;
      }

      return trimmed;
    } catch {
      return null;
    }
  }

  return null;
}

function isAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function buildUrl(
  path: string,
  query?: Record<string, unknown>,
): string {
  const url = isAbsoluteUrl(path)
    ? new URL(path)
    : new URL(
        path.startsWith("/")
          ? API_BASE_URL + path
          : API_BASE_URL + "/" + path,
      );

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (
            item !== undefined &&
            item !== null &&
            item !== ""
          ) {
            url.searchParams.append(
              key,
              String(item),
            );
          }
        });

        return;
      }

      url.searchParams.set(
        key,
        String(value),
      );
    });
  }

  return url.toString();
}

async function parseResponse(
  response: Response,
): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();

    if (!text) {
      return null;
    }

    return text;
  } catch {
    return null;
  }
}

export function unwrapApiData<T>(
  response: T,
): T {
  if (
    response !== null &&
    response !== undefined &&
    typeof response === "object" &&
    "data" in
      (response as Record<string, unknown>)
  ) {
    return (
      (
        response as Record<string, unknown>
      ).data as T
    );
  }

  return response;
}

function prepareBody(
  body: unknown,
): BodyInit | undefined {
  if (
    body === undefined ||
    body === null
  ) {
    return undefined;
  }

  if (
    typeof FormData !== "undefined" &&
    body instanceof FormData
  ) {
    return body;
  }

  if (
    typeof Blob !== "undefined" &&
    body instanceof Blob
  ) {
    return body;
  }

  if (
    typeof ArrayBuffer !== "undefined" &&
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  if (
    typeof URLSearchParams !== "undefined" &&
    body instanceof URLSearchParams
  ) {
    return body;
  }

  if (typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}

function extractErrorMessage(
  data: unknown,
): string | null {
  if (
    data === null ||
    data === undefined ||
    typeof data !== "object"
  ) {
    return null;
  }

  const errorBody =
    data as Record<string, unknown>;

  if (
    typeof errorBody.message === "string"
  ) {
    return errorBody.message;
  }

  if (
    Array.isArray(errorBody.message)
  ) {
    return errorBody.message
      .map(String)
      .join(", ");
  }

  if (
    typeof errorBody.error === "string"
  ) {
    return errorBody.error;
  }

  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, unknown>,
): Promise<T> {
  const url = buildUrl(
    path,
    query,
  );

  const token = getAuthToken();

  const headers = new Headers(
    options.headers,
  );

  headers.set(
    "Accept",
    "application/json",
  );

  const body = options.body;

  const isFormDataBody =
    typeof FormData !== "undefined" &&
    body instanceof FormData;

  if (
    body !== undefined &&
    body !== null &&
    !isFormDataBody &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  let response: Response;

  try {
    response = await fetch(
      url,
      {
        ...options,
        headers,
        credentials: "include",
      },
    );
  } catch (error) {
    const networkError: ApiError = {
      message:
        "Unable to connect to the Fockis Travel API. Make sure the backend server is running and the API URL is correct.",
      details: error,
    };

    throw networkError;
  }

  const data =
    await parseResponse(response);

  if (!response.ok) {
    let message =
      extractErrorMessage(data) ||
      (
        "Fockis Travel API request failed with status " +
        response.status
      );

    if (response.status === 401) {
      message =
        "Authentication required. Please sign in again.";
    } else if (response.status === 403) {
      message =
        "You do not have permission to perform this action.";
    } else if (response.status === 404) {
      message =
        "The requested Travel resource was not found.";
    } else if (response.status === 400) {
      message =
        extractErrorMessage(data) ||
        message;
    } else if (response.status >= 500) {
      message =
        "The Fockis Travel server encountered an error. Please try again.";
    }

    const apiError: ApiError = {
      message,
      status: response.status,
      details: data,
    };

    throw apiError;
  }

  return data as T;
}

export const travelApi = {
  baseUrl: API_BASE_URL,

  get<T>(
    path: string,
    query?: Record<string, unknown>,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "GET",
      },
      query,
    );
  },

  post<T>(
    path: string,
    body?: unknown,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "POST",
        body: prepareBody(body),
      },
    );
  },

  patch<T>(
    path: string,
    body?: unknown,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "PATCH",
        body: prepareBody(body),
      },
    );
  },

  put<T>(
    path: string,
    body?: unknown,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "PUT",
        body: prepareBody(body),
      },
    );
  },

  delete<T>(
    path: string,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "DELETE",
      },
    );
  },

  hasAuthToken(): boolean {
    return Boolean(
      getAuthToken(),
    );
  },

  getAuthState(): {
    authenticated: boolean;
  } {
    return {
      authenticated:
        Boolean(
          getAuthToken(),
        ),
    };
  },

  getBaseUrl(): string {
    return API_BASE_URL;
  },

  resolveUrl(
    path: string | null | undefined,
  ): string {
    if (!path) {
      return "";
    }

    if (isAbsoluteUrl(path)) {
      return path;
    }

    return (
      API_BASE_URL +
      (path.startsWith("/")
        ? path
        : "/" + path)
    );
  },
};