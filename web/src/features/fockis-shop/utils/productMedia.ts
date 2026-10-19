import type { Product, ProductImage } from "../types/product.types";
import { resolveProductImageUrl } from "./productImage";

/**
 * ============================================================================
 * FOCKIS SHOP — PRODUCT MEDIA HELPERS
 * ============================================================================
 *
 * One place to read images and videos from a product.
 *
 * The backend stores all product media in `images: string[]`. Sellers can
 * upload video files there too, so any entry whose path looks like a video
 * file is treated as a video and never rendered inside an <img>.
 *
 * No media is invented here: when a product has no usable image or video,
 * the helpers return `undefined` and the UI shows a neutral placeholder.
 * ============================================================================
 */

const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v|ogv|ogg|m3u8)(\?.*)?(#.*)?$/i;

export function isVideoUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const path = value.trim();
  if (!path) return false;
  if (/^data:video\//i.test(path)) return true;
  return VIDEO_EXTENSION.test(path);
}

export interface ResolvedMedia {
  src: string;
  alt: string;
}

type LegacyProduct = Product & {
  imageUrl?: unknown;
  thumbnail?: unknown;
  video?: unknown;
  videoUrl?: unknown;
  videos?: unknown;
};

function sortedImages(product: Product): ProductImage[] {
  if (!Array.isArray(product.images)) return [];

  return [...product.images].sort(
    (a, b) =>
      Number(Boolean(b?.isPrimary)) - Number(Boolean(a?.isPrimary)) ||
      (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0),
  );
}

function productLabel(product: Product): string {
  return product.name?.trim() || "Product";
}

/**
 * All still images for a product, resolved to absolute URLs, de-duplicated,
 * with video files filtered out.
 */
export function getProductImages(product: Product): ResolvedMedia[] {
  const legacy = product as LegacyProduct;
  const label = productLabel(product);

  const candidates: Array<{ value: unknown; alt?: string }> = [
    ...sortedImages(product).map((image) => ({
      value: image?.url,
      alt: image?.alt,
    })),
    { value: legacy.imageUrl },
    { value: legacy.thumbnail },
    { value: product.image },
  ];

  const seen = new Set<string>();
  const result: ResolvedMedia[] = [];

  for (const candidate of candidates) {
    if (isVideoUrl(candidate.value)) continue;

    const src = resolveProductImageUrl(candidate.value);
    if (!src || seen.has(src)) continue;

    seen.add(src);
    result.push({
      src,
      alt: candidate.alt?.trim() || label,
    });
  }

  return result;
}

/** The best single image for cards, carts and thumbnails. */
export function getPrimaryProductImage(
  product: Product,
): ResolvedMedia | undefined {
  return getProductImages(product)[0];
}

/**
 * All videos attached to a product. Reads video files stored in `images`
 * plus optional `video`, `videoUrl` and `videos` fields if the API ever
 * returns them. Returns an empty array when the product has no video.
 */
export function getProductVideos(product: Product): ResolvedMedia[] {
  const legacy = product as LegacyProduct;
  const label = productLabel(product);

  const raw: unknown[] = [
    ...sortedImages(product).map((image) => image?.url),
    legacy.video,
    legacy.videoUrl,
    ...(Array.isArray(legacy.videos) ? legacy.videos : []),
  ];

  const seen = new Set<string>();
  const result: ResolvedMedia[] = [];

  for (const value of raw) {
    const url =
      typeof value === "object" && value !== null && "url" in value
        ? (value as { url?: unknown }).url
        : value;

    if (!isVideoUrl(url)) continue;

    const src = resolveProductImageUrl(url);
    if (!src || seen.has(src)) continue;

    seen.add(src);
    result.push({ src, alt: `${label} video` });
  }

  return result;
}

export function getProductVideo(
  product: Product,
): ResolvedMedia | undefined {
  return getProductVideos(product)[0];
}

/**
 * A rating is shown only when the API returned a real, non-zero average.
 * The backend defaults `rating` to 0 for unrated products, so 0 means
 * "no rating yet" and is never displayed as a score.
 */
export function getRealRating(
  product: Product,
): { average: number; count: number | null } | null {
  const average = Number(product.reviews?.averageRating ?? 0);
  if (!Number.isFinite(average) || average <= 0) return null;

  const total = Number(product.reviews?.totalReviews ?? 0);

  return {
    average: Math.min(5, average),
    count: Number.isFinite(total) && total > 0 ? total : null,
  };
}

/** Real discount percentage, or 0 when no genuine lower sale price exists. */
export function getRealDiscount(product: Product): number {
  const price = Number(product.price);
  const sale = product.salePrice == null ? NaN : Number(product.salePrice);

  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(sale) || sale <= 0 || sale >= price) return 0;

  return Math.round(((price - sale) / price) * 100);
}

/** Delivery estimate text from real shipping data, or null. */
export function getDeliveryEstimate(product: Product): string | null {
  const days = product.shipping?.estimatedDeliveryDays;
  if (!days) return null;

  const min = Number(days.min);
  const max = Number(days.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) return null;

  return min === max
    ? `Delivery in ${min} day${min === 1 ? "" : "s"}`
    : `Delivery in ${min}–${max} days`;
}
