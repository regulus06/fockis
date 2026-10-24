
import { buildFockisUploadUrl } from "../../../config/fockisConfig";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://fockis.onrender.com")
).replace(/\/+$/, "");

function isLocalhostUrl(path: string): boolean {
  try {
    const url = new URL(path);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(
      url.hostname.toLowerCase(),
    );
  } catch {
    return false;
  }
}

export function resolveProductImageUrl(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") return undefined;

  let path = value.trim().replace(/^["']+|["']+$/g, "");

  if (!path || path === "null" || path === "undefined") {
    return undefined;
  }

  // Keep browser-generated image sources unchanged.
  if (/^(data:|blob:)/i.test(path)) {
    return path;
  }

  // Repair legacy absolute localhost URLs from local development.
  if (/^https?:\/\//i.test(path)) {
    if (isLocalhostUrl(path)) {
      try {
        const legacyUrl = new URL(path);
        const pathname = legacyUrl.pathname.replace(/^\/+/, "");
        const base = API_BASE_URL;
        return `${base}/${pathname}${legacyUrl.search}${legacyUrl.hash}`;
      } catch {
        return undefined;
      }
    }

    // Keep valid remote HTTPS URLs. Upgrade other HTTP URLs to HTTPS.
    return path.startsWith("http://")
      ? path.replace(/^http:\/\//i, "https://")
      : path;
  }

  if (path.startsWith("//")) {
    return `https:${path}`;
  }

  path = path.replace(/\\/g, "/");

  const suffixIndex = path.search(/[?#]/);
  const suffix = suffixIndex >= 0 ? path.slice(suffixIndex) : "";
  let pathname = suffixIndex >= 0 ? path.slice(0, suffixIndex) : path;

  pathname = pathname.trim().replace(/^\/+/, "");
  if (!pathname) return undefined;

  pathname = pathname.replace(/^public\/uploads\//i, "uploads/");
  pathname = pathname.replace(/^upload\//i, "uploads/");

  while (/^uploads\/uploads\//i.test(pathname)) {
    pathname = pathname.replace(/^uploads\//i, "");
  }

  const resolved = buildFockisUploadUrl(pathname);

  if (resolved) {
    return `${resolved}${suffix}`;
  }

  return `${API_BASE_URL}/${pathname}${suffix}`;
}

export function getCartImageUrl(
  value: unknown,
): string | undefined {
  return resolveProductImageUrl(value);
}
