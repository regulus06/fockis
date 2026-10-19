import { useState } from "react";
import { Link } from "react-router-dom";
import type { CartLineItem } from "../../types/cart.types";
import { formatPrice } from "../../utils/currency";
import { resolveProductImageUrl } from "../../utils/productImage";
import { useCart } from "../../hooks/useCart";

export function CartItem({ item }: { item: CartLineItem }) {
  const {
    setQuantity,
    removeItem,
    selectedLineIds,
    toggleItemSelection,
  } = useCart();

  const [imageFailed, setImageFailed] = useState(false);

  const isSelected = selectedLineIds.includes(item.id);

  const imageUrl = resolveProductImageUrl(item.productImageUrl);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div className={`cart-item ${isSelected ? "is-selected" : ""}`}>
      {/* CHECKBOX */}
      <div className="cart-item-select">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleItemSelection(item.id)}
          aria-label={`Select ${item.productName} for checkout`}
        />
      </div>

      {/* PRODUCT IMAGE */}
      <Link
        to={`/shop/product/${item.productSlug}`}
        className="cart-item-thumb"
        aria-label={`View ${item.productName}`}
      >
        {showImage ? (
          <img
            src={imageUrl}
            alt={item.productName}
            loading="lazy"
            onError={() => setImageFailed(true)}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <span role="img" aria-label="Product image unavailable">
            {item.productEmoji || "📦"}
          </span>
        )}
      </Link>

      {/* PRODUCT DETAILS */}
      <div className="cart-item-body">
        <Link
          to={`/shop/product/${item.productSlug}`}
          className="cart-item-name"
        >
          {item.productName}
        </Link>

        {item.variant && (
          <div className="cart-item-variant mono">
            {item.variant.optionsLabel}
          </div>
        )}

        <div className="cart-item-price mono">
          {formatPrice(item.unitPrice)}
        </div>
      </div>

      {/* QUANTITY */}
      <div className="cart-item-qty">
        <div className="pdp-qty-stepper">
          <button
            type="button"
            onClick={() => setQuantity(item.id, item.quantity - 1)}
            aria-label="Decrease quantity"
            disabled={item.quantity <= 1}
          >
            −
          </button>

          <span className="mono">{item.quantity}</span>

          <button
            type="button"
            onClick={() => setQuantity(item.id, item.quantity + 1)}
            aria-label="Increase quantity"
            disabled={item.quantity >= item.maxQuantity}
          >
            +
          </button>
        </div>

        <button
          type="button"
          className="cart-item-remove"
          onClick={() => removeItem(item.id)}
        >
          Remove
        </button>
      </div>

      {/* LINE TOTAL */}
      <div className="cart-item-line-total mono">
        {formatPrice(item.unitPrice * item.quantity)}
      </div>
    </div>
  );
}