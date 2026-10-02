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

export const FOCKIS_API_URL =
  configuredUrl ||
  (isLocal
    ? "http://localhost:3000"
    : "https://fockis.onrender.com");

export const FOCKIS_SOCKET_URL =
  FOCKIS_API_URL.replace(/^http/, "ws");

export function buildFockisUrl(
  path: string,
): string {
  if (!path) {
    return FOCKIS_API_URL;
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  const cleanPath = path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  return `${FOCKIS_API_URL}/${cleanPath}`;
}

export function buildFockisUploadUrl(
  path: string,
): string {
  if (!path) {
    return "";
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  const cleanPath = path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (cleanPath.startsWith("uploads/")) {
    return `${FOCKIS_API_URL}/${cleanPath}`;
  }

  return `${FOCKIS_API_URL}/uploads/${cleanPath}`;
}