import { memo, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  ShoppingBag,
} from "lucide-react";

import { FOCKIS_API_URL, buildFockisUrl } from "../../config/fockisConfig";

import {
  getFeedProductId,
  type FeedProduct,
} from "../../pages/FockisFeedPage/feedProductPlacement";

/* ============================================================================
   FOCKIS SHOP PRODUCT POST
   A Fockis Shop product rendered inside the main feed with the same card
   frame as normal posts. Product actions (view / shop) are kept separate
   from post interactions: products have no likes, comments or shares.
============================================================================ */

const MAX_THUMBNAILS = 8;
const DESCRIPTION_LIMIT = 280;
const LOW_STOCK_THRESHOLD = 5;

const LOCAL_ORIGIN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?=\/|$)/i;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function readImageSource(item: unknown): string {
  if (typeof item === "string") {
    return item.trim();
  }

  if (item && typeof item === "object") {
    const value = item as Record<string, unknown>;
    const src =
      value.url ??
      value.src ??
      value.path ??
      value.secure_url ??
      value.imageUrl;

    return typeof src === "string" ? src.trim() : "";
  }

  return "";
}

function normalizeImageUrl(src: string): string {
  if (!src || src === "undefined" || src === "null") {
    return "";
  }

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  if (/^https?:\/\//i.test(src)) {
    // Uploads saved while developing locally point at localhost.
    return src.replace(LOCAL_ORIGIN, FOCKIS_API_URL);
  }

  return buildFockisUrl(src);
}

function getProductImages(product: FeedProduct): string[] {
  const raw: unknown[] = Array.isArray(product.images)
    ? product.images
    : [product.image ?? product.imageUrl ?? product.thumbnail];

  const unique = new Set<string>();

  for (const item of raw) {
    const url = normalizeImageUrl(readImageSource(item));

    if (url) {
      unique.add(url);
    }
  }

  return Array.from(unique);
}

function toAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

interface ProductPricing {
  current: number | null;
  compareAt: number | null;
  percentOff: number;
}

/**
 * Matches Product.getDiscountedPrice(): `discount` is a percentage of
 * `price`. A `salePrice` field, when present, wins.
 */
function getPricing(product: FeedProduct): ProductPricing {
  const base = toAmount(product.price ?? product.amount);
  const sale = toAmount(product.salePrice);
  const discount = Math.min(
    100,
    Math.max(0, toAmount(product.discount) ?? 0),
  );

  let current = base;

  if (sale !== null && (base === null || sale < base)) {
    current = sale;
  } else if (base !== null && discount > 0) {
    current = Math.round(base * (1 - discount / 100) * 100) / 100;
  }

  const compareAt =
    base !== null && current !== null && current < base ? base : null;

  const percentOff =
    compareAt && current !== null
      ? Math.round((1 - current / compareAt) * 100)
      : 0;

  return { current, compareAt, percentOff };
}

function getInitials(name: string): string {
  const letters = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return letters || "F";
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

interface FockisFeedProductPostProps {
  product: FeedProduct;
}

function FockisFeedProductPost({ product }: FockisFeedProductPostProps) {
  const productId = getFeedProductId(product);
  const productHref = `/shop/product/${encodeURIComponent(productId)}`;

  const images = useMemo(() => getProductImages(product), [product]);
  const pricing = useMemo(() => getPricing(product), [product]);

  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const activeIndex = Math.min(activeImage, Math.max(0, images.length - 1));
  const imageUrl = images[activeIndex] ?? "";
  const imageFailed = !imageUrl || failedImages.has(imageUrl);
  const hasGallery = images.length > 1;

  const productName =
    cleanText(product.name) || cleanText(product.title) || "Fockis product";

  const description = cleanText(product.description);
  const shortDescription =
    description.length > DESCRIPTION_LIMIT
      ? `${description.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`
      : description;

  const sellerLabel =
    cleanText(product.storeName) ||
    cleanText(product.store?.name) ||
    cleanText(product.sellerStoreName) ||
    cleanText(product.seller?.username) ||
    cleanText(product.sellerUsername);

  const storeName = sellerLabel || "Fockis Shop";

  const storeLogo = normalizeImageUrl(
    readImageSource(product.store?.logo ?? product.storeLogo),
  );

  const category = cleanText(product.category);
  const brand = cleanText(product.brand);

  const stock = toAmount(product.stock);
  const soldOut = stock === 0;
  const lowStock =
    stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD;

  const markFailed = (url: string) => {
    setFailedImages((previous) => {
      if (previous.has(url)) {
        return previous;
      }

      const next = new Set(previous);
      next.add(url);
      return next;
    });
  };

  const stepImage = (direction: 1 | -1) => {
    setActiveImage(
      (activeIndex + direction + images.length) % images.length,
    );
  };

  return (
    <article
      className="fk-post fk-product-post"
      aria-label={`Fockis Shop product: ${productName}`}
      data-product-id={productId}
    >
      <header className="fk-product-post__header">
        <div className="fk-product-post__avatar" aria-hidden="true">
          {storeLogo ? (
            <img src={storeLogo} alt="" loading="lazy" />
          ) : (
            <span>{getInitials(storeName)}</span>
          )}
        </div>

        <div className="fk-product-post__identity">
          <strong>
            {storeName}
            <BadgeCheck size={15} aria-hidden="true" />
          </strong>
          <span>
            <ShoppingBag size={12} aria-hidden="true" />
            {sellerLabel ? "Fockis Shop" : "Shop product"}
            {category && (
              <>
                <i aria-hidden="true">·</i>
                {category}
              </>
            )}
          </span>
        </div>

        <span className="fk-product-post__tag">Shop</span>
      </header>

      <div className="fk-product-post__stage">
        <Link
          to={productHref}
          className="fk-product-post__media"
          aria-label={`View ${productName} in Fockis Shop`}
        >
          {!imageFailed && (
            <img
              className="fk-product-post__backdrop"
              src={imageUrl}
              alt=""
              aria-hidden="true"
            />
          )}

          {imageFailed ? (
            <span className="fk-product-post__no-image">
              <ImageOff size={28} aria-hidden="true" />
              Image unavailable
            </span>
          ) : (
            <img
              key={imageUrl}
              className="fk-product-post__image"
              src={imageUrl}
              alt={productName}
              loading="lazy"
              decoding="async"
              onError={() => markFailed(imageUrl)}
            />
          )}
        </Link>

        <div className="fk-product-post__badges">
          {pricing.percentOff > 0 && (
            <span className="fk-product-post__badge fk-product-post__badge--deal">
              −{pricing.percentOff}%
            </span>
          )}
          {soldOut && (
            <span className="fk-product-post__badge fk-product-post__badge--out">
              Sold out
            </span>
          )}
          {lowStock && (
            <span className="fk-product-post__badge fk-product-post__badge--low">
              Only {stock} left
            </span>
          )}
        </div>

        {hasGallery && (
          <>
            <span className="fk-product-post__counter" aria-hidden="true">
              {activeIndex + 1}/{images.length}
            </span>
            <button
              type="button"
              className="fk-product-post__nav fk-product-post__nav--prev"
              onClick={() => stepImage(-1)}
              aria-label="Previous product image"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="fk-product-post__nav fk-product-post__nav--next"
              onClick={() => stepImage(1)}
              aria-label="Next product image"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {hasGallery && (
        <div
          className="fk-product-post__thumbs"
          role="group"
          aria-label={`${productName} images`}
        >
          {images.slice(0, MAX_THUMBNAILS).map((src, index) => (
            <button
              key={src}
              type="button"
              className={index === activeIndex ? "is-active" : undefined}
              onClick={() => setActiveImage(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-pressed={index === activeIndex}
            >
              {failedImages.has(src) ? (
                <ImageOff size={16} aria-hidden="true" />
              ) : (
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => markFailed(src)}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="fk-product-post__body">
        <h3 className="fk-product-post__title">
          <Link to={productHref}>{productName}</Link>
        </h3>

        {shortDescription && (
          <p className="fk-product-post__description">{shortDescription}</p>
        )}

        {brand && (
          <div className="fk-product-post__chips">
            <span>{brand}</span>
          </div>
        )}
      </div>

      <footer className="fk-product-post__footer">
        <div className="fk-product-post__price">
          {pricing.current !== null ? (
            <>
              <strong>{usd.format(pricing.current)}</strong>
              {pricing.compareAt !== null && (
                <s aria-label={`Was ${usd.format(pricing.compareAt)}`}>
                  {usd.format(pricing.compareAt)}
                </s>
              )}
            </>
          ) : (
            <strong className="is-muted">See price in shop</strong>
          )}
        </div>

        <Link to={productHref} className="fk-product-post__shop-button">
          {soldOut ? "View product" : "Shop now"}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}

export default memo(FockisFeedProductPost);
