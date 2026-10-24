import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Lock, Truck } from "lucide-react";

import type { Product } from "../../types/product.types";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import { useCartToastStore } from "../../store/cartToastStore";
import { effectivePrice } from "../../utils/pricing";
import { formatPrice } from "../../utils/currency";
import {
  getPrimaryProductImage,
} from "../../utils/productMedia";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : null;
}

function readId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const record = asRecord(value);
  if (!record) return null;

  const id = record._id ?? record.id;

  return typeof id === "string" && id.trim()
    ? id.trim()
    : null;
}

function resolveSellerId(product: Product): string | null {
  const data = asRecord(product);
  if (!data) return null;

  const directSellerId =
    readId(data.sellerId) ??
    readId(data.seller) ??
    readId(data.userId) ??
    readId(data.ownerId);

  if (directSellerId) return directSellerId;

  const store = asRecord(data.storeId) ?? asRecord(data.store);

  if (store) {
    return (
      readId(store.sellerId) ??
      readId(store.seller) ??
      readId(store.ownerId) ??
      readId(store.userId)
    );
  }

  return null;
}

/**
 * Product buy box.
 *
 * The product price is displayed by ProductInfo, so it is
 * intentionally not repeated here.
 *
 * Shipping costs are calculated during checkout. This component
 * does not assume a buyer's destination or invent delivery details.
 */
export function ProductActions({
  product,
}: {
  product: Product;
}) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const showAddedToast = useCartToastStore((state) => state.show);

  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<
    "idle" | "adding" | "added" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const unavailable =
    product.stockStatus === "out_of_stock" ||
    (typeof product.stockQuantity === "number" &&
      product.stockQuantity <= 0);

  const lowStock =
    !unavailable && product.stockStatus === "low_stock";

  const maxQuantity =
    typeof product.stockQuantity === "number" &&
    product.stockQuantity > 0
      ? Math.min(product.stockQuantity, 99)
      : 99;

  const price = effectivePrice(product);
  const hasPrice = Number(price) > 0;
  const canBuy = !unavailable && hasPrice;
  const saved = has(product.id);

  async function addToCart(): Promise<boolean> {
    if (!canBuy || status === "adding") return false;

    setStatus("adding");
    setErrorMessage("");

    const sellerId = resolveSellerId(product);

    if (!sellerId) {
      console.error(
        "[ProductActions] Seller ID missing from product data.",
        {
          productId: product.id,
          storeId: product.storeId,
          availableProductFields: Object.keys(
            asRecord(product) ?? {},
          ),
        },
      );

      setStatus("error");
      setErrorMessage(
        "Seller information is missing for this product. Please refresh the page or contact the store.",
      );

      return false;
    }

    try {
      await addItem({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productEmoji: product.emoji,
        productImageUrl: getPrimaryProductImage(product)?.src,
        sellerId,
        storeId: product.storeId,
        storeSlug: product.storeSlug,
        storeName: product.storeName,
        unitPrice: price,
        maxQuantity,
        quantity,
      });

      setStatus("added");
      return true;
    } catch (error) {
      console.error(
        "[ProductActions] Failed to add to cart:",
        error,
      );

      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not add this product to your cart. Please try again.",
      );

      return false;
    }
  }

  async function handleBuyNow() {
    if (await addToCart()) {
      navigate("/shop/checkout");
    }
  }

  return (
    <aside className="pdp-buybox" aria-label="Buy options">
      <div className="pdp-buybox__delivery">
        <Truck size={16} aria-hidden="true" />

        <span>
          Shipping calculated at checkout
          <small>
            Available delivery options and shipping costs are confirmed
            during checkout.
          </small>
        </span>
      </div>

      <div
        className={`pdp-buybox__stock${
          unavailable ? " is-out" : lowStock ? " is-low" : ""
        }`}
      >
        {unavailable
          ? "Currently unavailable"
          : lowStock
            ? `Only ${product.stockQuantity} left in stock`
            : "In stock"}
      </div>

      {canBuy && (
        <label className="pdp-buybox__qty">
          <span>Quantity</span>

          <select
            className="shop-select"
            value={quantity}
            onChange={(event) => {
              setQuantity(Number(event.target.value));
              setStatus("idle");
              setErrorMessage("");
            }}
          >
            {Array.from(
              { length: Math.min(maxQuantity, 30) },
              (_, index) => index + 1,
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      )}

      <button
        type="button"
        className="fk-btn fk-btn--cart fk-btn--block"
        onClick={async () => {
          if (await addToCart()) {
            showAddedToast({
              name: product.name,
              imageUrl: getPrimaryProductImage(product)?.src,
              emoji: product.emoji,
              unitPrice: price,
              quantity,
            });
          }
        }}
        disabled={!canBuy || status === "adding"}
      >
        {unavailable
          ? "Out of stock"
          : !hasPrice
            ? "Price unavailable"
            : status === "adding"
              ? "Adding…"
              : status === "added"
                ? "Add again"
                : "Add to Cart"}
      </button>

      {canBuy && (
        <button
          type="button"
          className="fk-btn fk-btn--buy fk-btn--block"
          onClick={() => void handleBuyNow()}
          disabled={status === "adding"}
        >
          Buy Now
        </button>
      )}

      {status === "added" && (
        <p className="pdp-buybox__feedback" role="status">
          Added to cart.{" "}
          <Link to="/shop/cart">View cart</Link>
        </p>
      )}

      {status === "error" && (
        <p
          className="pdp-buybox__feedback is-error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <dl className="pdp-buybox__meta">
        <div>
          <dt>Ships from</dt>
          <dd>{product.storeName || "Seller details unavailable"}</dd>
        </div>

        <div>
          <dt>Sold by</dt>
          <dd>
            {product.storeSlug ? (
              <Link to={`/shop/store/${product.storeSlug}`}>
                {product.storeName || "Visit store"}
              </Link>
            ) : (
              "Seller details unavailable"
            )}
          </dd>
        </div>

        <div>
          <dt>Payment</dt>
          <dd>
            <Lock size={12} aria-hidden="true" />
            Secure checkout
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className={`fk-btn fk-btn--outline fk-btn--block${
          saved ? " is-saved" : ""
        }`}
        onClick={() => toggle(product.id)}
        aria-pressed={saved}
      >
        <Heart
          size={16}
          fill={saved ? "currentColor" : "none"}
          aria-hidden="true"
        />

        {saved ? "Saved to wishlist" : "Add to wishlist"}
      </button>
    </aside>
  );
}
