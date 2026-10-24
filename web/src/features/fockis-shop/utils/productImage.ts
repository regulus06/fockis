
import { buildFockisUploadUrl } from "../../../config/fockisConfig";

/**
 * Converts product image paths into URLs that point to the Fockis API.
 * Supports absolute URLs, uploaded files, and legacy image paths.
 */
export function resolveProductImageUrl(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") return undefined;

  let path = value.trim();

  if (!path || path === "null" || path === "undefined") {
    return undefined;
  }

  // Remove accidental surrounding quotes.
  path = path.replace(/^["']+|["']+$/g, "");

  // Keep absolute URLs and browser-generated URLs unchanged.
  if (
    /^(https?:\/\/|data:|blob:)/i.test(path) ||
    path.startsWith("//")
  ) {
    return path;
  }

  // Normalize Windows-style separators.
  path = path.replace(/\\/g, "/");

  // Preserve query parameters and URL fragments.
  const suffixIndex = path.search(/[?#]/);
  const suffix = suffixIndex >= 0 ? path.slice(suffixIndex) : "";
  let pathname = suffixIndex >= 0 ? path.slice(0, suffixIndex) : path;

  pathname = pathname.trim().replace(/^\/+/, "");

  if (!pathname) return undefined;

  // Normalize legacy upload directory names.
  pathname = pathname.replace(/^public\/uploads\//i, "uploads/");
  pathname = pathname.replace(/^upload\//i, "uploads/");

  // Prevent duplicated uploads/uploads prefixes.
  while (/^uploads\/uploads\//i.test(pathname)) {
    pathname = pathname.replace(/^uploads\//i, "");
  }

  const resolved = buildFockisUploadUrl(pathname);

  return resolved ? `${resolved}${suffix}` : undefined;
}

/**
 * Finds the best available image URL for a cart item.
 */
export function getCartImageUrl(
  value: unknown,
): string | undefined {
  return resolveProductImageUrl(value);
}
