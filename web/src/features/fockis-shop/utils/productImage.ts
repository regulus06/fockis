import { buildFockisUploadUrl } from "../../../config/fockisConfig";

/**
 * Converts product image paths into URLs that point to the Fockis API.
 * Supports absolute URLs, uploaded files, and legacy image paths.
 */
export function resolveProductImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const path = value.trim();
  if (!path) return undefined;

  // Keep absolute URLs and browser-generated URLs unchanged.
  if (
    /^(https?:\/\/|data:|blob:)/i.test(path) ||
    path.startsWith("//")
  ) {
    return path;
  }

  // Resolve relative uploads through the shared Fockis API configuration.
  return buildFockisUploadUrl(path);
}

/**
 * Finds the best available image URL for a product.
 */
export function getCartImageUrl(value: unknown): string | undefined {
  return resolveProductImageUrl(value);
}