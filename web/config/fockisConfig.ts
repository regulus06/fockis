/// <reference types="vite/client" />

/**
 * ============================================================
 * FOCKIS CONNECTION CONFIGURATION
 * ============================================================
 *
 * One source of truth for:
 *
 * - REST API
 * - uploads/media
 * - Socket.IO
 * - WebSockets
 *
 * Local:
 *   http://localhost:3000
 *
 * Production:
 *   https://fockis.onrender.com
 */

const configuredUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "",
)
  .trim()
  .replace(/\/+$/, "");

const hostname =
  typeof window !== "undefined"
    ? window.location.hostname
    : "";

const isLocal =
  hostname === "localhost" ||
  hostname === "127.0.0.1";

/**
 * When the frontend is running locally, always use the
 * local NestJS API.
 *
 * This prevents a production VITE_API_URL from accidentally
 * sending local story/feed/media requests to Render.
 */
export const FOCKIS_API_URL =
  isLocal
    ? "http://localhost:3000"
    : configuredUrl || "https://fockis.onrender.com";

export const FOCKIS_SOCKET_URL =
  FOCKIS_API_URL.replace(/^http/, "ws");

/**
 * Build a normal Fockis URL.
 */
export function buildFockisUrl(
  path: string,
): string {
  if (!path) {
    return FOCKIS_API_URL;
  }

  const cleanPath = String(path)
    .trim()
    .replace(/\\/g, "/");

  if (
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://") ||
    cleanPath.startsWith("blob:") ||
    cleanPath.startsWith("data:")
  ) {
    return cleanPath;
  }

  const normalizedPath = cleanPath.replace(
    /^\/+/,
    "",
  );

  if (!normalizedPath) {
    return FOCKIS_API_URL;
  }

  return `${FOCKIS_API_URL}/${normalizedPath}`;
}

/**
 * Build an upload/media URL.
 *
 * Supports:
 *
 * /uploads/photo.jpg
 * uploads/photo.jpg
 * photo.jpg
 * http://...
 * https://...
 * blob:...
 * data:...
 */
export function buildFockisUploadUrl(
  path: string,
): string {
  if (!path) {
    return "";
  }

  const cleanPath = String(path)
    .trim()
    .replace(/\\/g, "/");

  if (
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://") ||
    cleanPath.startsWith("blob:") ||
    cleanPath.startsWith("data:")
  ) {
    return cleanPath;
  }

  const normalizedPath = cleanPath.replace(
    /^\/+/,
    "",
  );

  if (!normalizedPath) {
    return "";
  }

  if (
    normalizedPath.startsWith("uploads/") ||
    normalizedPath.startsWith("media/") ||
    normalizedPath.startsWith("public/uploads/") ||
    normalizedPath.startsWith("upload/")
  ) {
    return `${FOCKIS_API_URL}/${normalizedPath}`;
  }

  return `${FOCKIS_API_URL}/uploads/${normalizedPath}`;
}