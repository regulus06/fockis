
import type { Product, ProductImage } from "../types/product.types";
import { resolveProductImageUrl } from "./productImage";

const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v|ogv|ogg|m3u8)(\?.*)?(#.*)?$/i;

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

type RawImage = {
  url?: unknown;
  src?: unknown;
  path?: unknown;
  filename?: unknown;
  alt?: unknown;
  id?: unknown;
  isPrimary?: unknown;
  sortOrder?: unknown;
};

function isRecord(value: unknown): value is RawImage {
  return typeof value === "object" && value !== null;
}

function imageValue(value: unknown): unknown {
  if (typeof value === "string") return value;

  if (!isRecord(value)) return undefined;

  return value.url ?? value.src ?? value.path ?? value.filename;
}

export function isVideoUrl(value: unknown): boolean {
  const path = imageValue(value);

  if (typeof path !== "string" || !path.trim()) return false;

  return (
    /^data:video\//i.test(path.trim()) ||
    VIDEO_EXTENSION.test(path.trim())
  );
}

function productLabel(product: Product): string {
  return product.name?.trim() || "Product";
}

function rawImages(product: Product): unknown[] {
  return Array.isArray(product.images) ? [...product.images] : [];
}

function sortedImages(product: Product): unknown[] {
  return rawImages(product).sort((left, right) => {
    const a = isRecord(left) ? left : {};
    const b = isRecord(right) ? right : {};

    return (
      Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) ||
      (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
    );
  });
}

/** Resolve product images from strings, objects, and legacy fields. */
export function getProductImages(product: Product): ResolvedMedia[] {
  const legacy = product as LegacyProduct;
  const label = productLabel(product);

  const candidates: Array<{ value: unknown; alt?: string }> = [
    ...sortedImages(product).map((item) => ({
      value: imageValue(item),
      alt: isRecord(item) && typeof item.alt === "string" ? item.alt : undefined,
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

export function getPrimaryProductImage(
  product: Product,
): ResolvedMedia | undefined {
  return getProductImages(product)[0];
}

/** Return product videos without treating them as still images. */
export function getProductVideos(product: Product): ResolvedMedia[] {
  const legacy = product as LegacyProduct;
  const label = productLabel(product);

  const raw: unknown[] = [
    ...sortedImages(product).map(imageValue),
    legacy.video,
    legacy.videoUrl,
    ...(Array.isArray(legacy.videos) ? legacy.videos : []),
  ];

  const seen = new Set<string>();
  const result: ResolvedMedia[] = [];

  for (const value of raw) {
    const url = imageValue(value);

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

export function getRealDiscount(product: Product): number {
  const price = Number(product.price);
  const sale = product.salePrice == null ? NaN : Number(product.salePrice);

  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(sale) || sale <= 0 || sale >= price) return 0;

  return Math.round(((price - sale) / price) * 100);
}

export function getDeliveryEstimate(product: Product): string | null {
  const days = product.shipping?.estimatedDeliveryDays;
  if (!days) return null;

  const min = Number(days.min);
  const max = Number(days.max);

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min < 0 ||
    max <= 0
  ) {
    return null;
  }

  return min === max
    ? `Delivery in ${min} day${min === 1 ? "" : "s"}`
    : `Delivery in ${min}–${max} days`;
}
