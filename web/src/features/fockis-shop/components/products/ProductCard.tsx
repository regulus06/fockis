import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Play, ShoppingCart, Truck } from "lucide-react";

import type { Product } from "../../types/product.types";
import { effectivePrice } from "../../utils/pricing";
import { formatPrice } from "../../utils/currency";
import { shippingBadges } from "../../utils/shipping";
import {
  getDeliveryEstimate,
  getPrimaryProductImage,
  getProductVideo,
  getRealDiscount,
  getRealRating,
} from "../../utils/productMedia";
import { useWishlist } from "../../hooks/useWishlist";
import { useCart } from "../../hooks/useCart";
import { useCartToastStore } from "../../store/cartToastStore";
import { Stars } from "../common/Stars";

/**
 * ============================================================================
 * FOCKIS SHOP — PRODUCT CARD
 * ============================================================================
 *
 * Shared by grids, horizontal rails, wishlist, store pages and related items.
 * Everything shown comes from the product record:
 *   - rating only when the API returned one, count only when > 0
 *   - discount only when a real lower sale price exists
 *   - delivery text only from real shipping data
 *
 * Add to Cart and Buy Now both go through the existing Zustand cart store
 * (useCart → cartStore → cartApi). Buy Now then opens the existing checkout.
 * ============================================================================
 */

interface ProductCardProps {
  product: Product;
  /**
   * "grid"    listing pages
   * "rail"    horizontal scrollers
   * "deal"    big card inside the pink "Today's deals" panel
   * "compact" image-left card (Recently viewed / New arrivals rows)
   */
  variant?: "grid" | "rail" | "deal" | "compact";
  /** Hide the action buttons (e.g. compact recommendation strips). */
  showActions?: boolean;
}

export function ProductCard({
  product,
  variant = "grid",
  showActions = true,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { has, toggle } = useWishlist();
  const { addItem } = useCart();
  const showAddedToast = useCartToastStore((state) => state.show);

  const [imageFailed, setImageFailed] = useState(false);
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">(
    "idle",
  );
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const title = product.name?.trim() || "Product details unavailable";
  const storeName = product.storeName?.trim() || "Seller details unavailable";
  const productHref = `/shop/product/${product.slug || product.id}`;

  const image = getPrimaryProductImage(product);
  const hasVideo = Boolean(getProductVideo(product));
  const showImage = Boolean(image) && !imageFailed;

  const price = effectivePrice(product);
  const hasPrice = Number.isFinite(Number(price)) && Number(price) > 0;
  const discount = getRealDiscount(product);
  const rating = getRealRating(product);
  // shippingBadges() prefixes an emoji; the card shows its own truck icon.
  const delivery =
    getDeliveryEstimate(product) ??
    (product.shipping
      ? shippingBadges(product.shipping)[0]?.replace(/^\P{L}+/u, "")
      : undefined) ??
    null;

  const saved = has(product.id);
  const outOfStock =
    product.stockStatus === "out_of_stock" ||
    (typeof product.stockQuantity === "number" && product.stockQuantity <= 0);
  const lowStock =
    !outOfStock &&
    (product.stockStatus === "low_stock" ||
      (typeof product.stockQuantity === "number" && product.stockQuantity <= 5));
  const isDeal = variant === "deal";
  const isCompact = variant === "compact";
  const canBuy = !outOfStock && hasPrice;

  async function addToCart(): Promise<boolean> {
    if (!canBuy) return false;

    setStatus("adding");

    try {
      await addItem({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productEmoji: product.emoji,
        productImageUrl: image?.src,
        sellerId: product.sellerId,
        storeId: product.storeId,
        storeSlug: product.storeSlug,
        storeName: product.storeName,
        unitPrice: price,
        maxQuantity: product.stockQuantity,
      });

      setStatus("added");
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setStatus("idle"), 2200);
      return true;
    } catch (error) {
      console.error("[ProductCard] Failed to add to cart:", error);
      setStatus("error");
      return false;
    }
  }

  async function handleAddToCart(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (await addToCart()) {
      showAddedToast({
        name: title,
        imageUrl: image?.src,
        emoji: product.emoji,
        unitPrice: price,
        quantity: 1,
      });
    }
  }

  async function handleBuyNow(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const added = await addToCart();
    if (added) navigate("/shop/checkout");
  }

  function handleToggleWishlist(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    toggle(product.id);
  }

  return (
    <article
      className={`fk-card fk-card--${variant}${outOfStock ? " is-unavailable" : ""}`}
      role={variant === "grid" ? undefined : "listitem"}
    >
      <Link to={productHref} className="fk-card__media" aria-label={title}>
        {showImage ? (
          <img
            src={image!.src}
            alt={image!.alt}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="fk-card__placeholder" role="img" aria-label="No product image available">
            <span aria-hidden="true">{product.emoji || "📦"}</span>
            <small>No image</small>
          </span>
        )}

        {discount > 0 && (
          <span className="fk-card__discount">-{discount}%</span>
        )}

        {hasVideo && (
          <span className="fk-card__video-flag">
            <Play size={11} fill="currentColor" aria-hidden="true" /> Video
          </span>
        )}
      </Link>

      {!isCompact && (
      <button
        type="button"
        className={`fk-card__wish${saved ? " is-saved" : ""}`}
        aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
        aria-pressed={saved}
        onClick={handleToggleWishlist}
      >
        <Heart size={17} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      )}

      <div className="fk-card__body">
        <Link to={productHref} className="fk-card__title">
          {title}
        </Link>

        {rating && !isDeal && !isCompact && (
          <Stars rating={rating.average} reviews={rating.count ?? undefined} />
        )}

        <div className="fk-card__price-row">
          {hasPrice ? (
            <>
              <span className="fk-card__price">{formatPrice(price)}</span>
              {discount > 0 && (
                <span className="fk-card__was">
                  {isDeal || isCompact ? null : "List: "}
                  <s>{formatPrice(product.price)}</s>
                </span>
              )}
            </>
          ) : (
            <span className="fk-card__price fk-card__price--na">Price unavailable</span>
          )}
        </div>

        {delivery && !isDeal && !isCompact && (
          <div className="fk-card__delivery">
            <Truck size={13} aria-hidden="true" /> {delivery}
          </div>
        )}

        {!isDeal && (isCompact ? outOfStock || lowStock : true) && (
        <div
          className={`fk-card__stock${
            outOfStock ? " is-out" : lowStock ? " is-low" : " is-in"
          }`}
        >
          {outOfStock
            ? "Out of stock"
            : lowStock
              ? typeof product.stockQuantity === "number"
                ? `Only ${product.stockQuantity} left`
                : "Low stock"
              : "In stock"}
        </div>
        )}

        {!isDeal && (
        <Link
          to={`/shop/store/${product.storeSlug}`}
          className="fk-card__seller"
          onClick={(event) => {
            if (!product.storeSlug) event.preventDefault();
          }}
        >
          {product.storeCountryFlag && (
            <span aria-hidden="true">{product.storeCountryFlag} </span>
          )}
          {storeName}
        </Link>
        )}

        {showActions && isDeal && (
          <div className="fk-card__actions">
            <button
              type="button"
              className="fk-btn fk-btn--cart"
              disabled={!canBuy || status === "adding"}
              onClick={handleAddToCart}
            >
              <ShoppingCart size={16} aria-hidden="true" />
              {outOfStock
                ? "Out of stock"
                : status === "adding"
                  ? "Adding…"
                  : status === "added"
                    ? "Added ✓"
                    : "Add to cart"}
            </button>
          </div>
        )}

        {showActions && !isDeal && (
          <div className="fk-card__actions">
            <button
              type="button"
              className="fk-btn fk-btn--cart"
              disabled={!canBuy || status === "adding"}
              onClick={handleAddToCart}
            >
              {isCompact && canBuy && status === "idle" && (
                <ShoppingCart size={13} aria-hidden="true" />
              )}
              {outOfStock
                ? "Out of stock"
                : status === "adding"
                  ? "Adding…"
                  : status === "added"
                    ? "Added ✓"
                    : "Add to Cart"}
            </button>

            {canBuy && (
              <button
                type="button"
                className="fk-btn fk-btn--buy"
                disabled={status === "adding"}
                onClick={handleBuyNow}
              >
                Buy Now
              </button>
            )}
          </div>
        )}

        {status === "error" && (
          <p className="fk-card__error" role="alert">
            Couldn’t add to cart. Please try again.
          </p>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
