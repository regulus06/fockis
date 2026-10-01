import axios from "axios";

import {
  getToken,
  logout,
} from "../utils/auth";

/* ============================================================
   API CONFIGURATION
============================================================ */

/*
 * Supports both:
 *
 * VITE_API_URL
 * VITE_API_BASE_URL
 *
 * Production:
 *   https://fockis.onrender.com
 *
 * Local development:
 *   http://localhost:3000
 */

const configuredApiUrl =
  String(
    import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "",
  )
    .trim()
    .replace(/\/+$/, "");

const isLocalBrowser =
  typeof window !== "undefined" &&
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );

const API_BASE_URL =
  configuredApiUrl ||
  (isLocalBrowser
    ? "http://localhost:3000"
    : "https://fockis.onrender.com");

/* ============================================================
   TOKEN HELPER
============================================================ */

function getAuthToken(): string {
  /*
   * First use the application's official auth helper.
   */

  try {
    const token = getToken();

    if (
      token &&
      typeof token === "string"
    ) {
      return token.trim();
    }
  } catch (error) {
    console.warn(
      "getToken() failed:",
      error,
    );
  }

  /*
   * Fallback storage keys.
   */

  if (
    typeof window !== "undefined"
  ) {
    const storageKeys = [
      "access_token",
      "token",
      "authToken",
    ];

    for (const key of storageKeys) {
      try {
        const value =
          localStorage.getItem(key);

        if (
          value &&
          value.trim()
        ) {
          return value.trim();
        }
      } catch {
        // Ignore storage errors.
      }
    }

    /*
     * Some authentication flows store
     * the token inside `user`.
     */

    try {
      const storedUser =
        localStorage.getItem("user");

      if (storedUser) {
        const parsed =
          JSON.parse(storedUser);

        const userToken =
          parsed?.access_token ||
          parsed?.accessToken ||
          parsed?.token ||
          parsed?.jwt;

        if (
          typeof userToken === "string" &&
          userToken.trim()
        ) {
          return userToken.trim();
        }
      }
    } catch {
      // Ignore invalid stored user data.
    }
  }

  return "";
}

/* ============================================================
   AXIOS INSTANCE
============================================================ */

export const api = axios.create({
  baseURL: API_BASE_URL,

  timeout: 15000,

  headers: {
    "Content-Type": "application/json",
  },
});

/* ============================================================
   REQUEST INTERCEPTOR
============================================================ */

api.interceptors.request.use(
  (config) => {
    const token =
      getAuthToken();

    /*
     * Attach JWT to authenticated requests.
     */

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * Development debugging.
     */

    if (
      import.meta.env.DEV
    ) {
      console.log(
        "API REQUEST:",
        {
          method:
            config.method?.toUpperCase(),

          url:
            `${config.baseURL || ""}${config.url || ""}`,

          authenticated:
            Boolean(token),
        },
      );
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

/* ============================================================
   RESPONSE INTERCEPTOR
============================================================ */

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error?.response?.status;

    const url =
      error?.config?.url;

    const responseData =
      error?.response?.data;

    console.error(
      "API ERROR:",
      {
        status,
        url,
        data: responseData,
      },
    );

    /* ========================================================
       AUTHENTICATION FAILURE
    ======================================================== */

    if (status === 401) {
      console.error(
        "Authentication failed: JWT expired, invalid, or missing.",
      );

      /*
       * Clear the local authentication state.
       */

      try {
        logout();
      } catch (logoutError) {
        console.error(
          "Logout error:",
          logoutError,
        );
      }

      /*
       * Redirect to login only when the
       * user is not already on an auth page.
       */

      if (
        typeof window !== "undefined"
      ) {
        const pathname =
          window.location.pathname;

        const isAuthPage =
          pathname.startsWith(
            "/login",
          ) ||
          pathname.startsWith(
            "/register",
          );

        if (!isAuthPage) {
          window.location.href =
            "/login";
        }
      }
    }

    return Promise.reject(
      error,
    );
  },
);

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default api;