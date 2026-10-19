import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, X } from "lucide-react";

import { useCartToastStore } from "../../store/cartToastStore";
import { useCart } from "../../hooks/useCart";
import { formatPrice } from "../../utils/currency";

const AUTO_HIDE_MS = 5000;

/**
 * "Added to Cart!" confirmation (storyboard frame 21–23s).
 * Rendered once by ShopHeader, so it is available on every Shop page.
 * Bottom sheet on phones, corner card on larger screens.
 */
export function AddedToCartToast() {
  const item = useCartToastStore((state) => state.item);
  const key = useCartToastStore((state) => state.key);
  const hide = useCartToastStore((state) => state.hide);
  const { totals } = useCart();
  const location = useLocation();
  const [imageFailed, setImageFailed] = useState(false);

  // Auto-hide; restart the timer on every new add.
  useEffect(() => {
    if (!item) return;
    setImageFailed(false);
    const timer = window.setTimeout(hide, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [item, key, hide]);

  // Close when the shopper navigates (e.g. taps View Cart).
  useEffect(() => {
    hide();
  }, [location.pathname, hide]);

  // Escape closes it.
  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, hide]);

  if (!item) return null;

  return (
    <div className="fk-added" role="status" aria-live="polite" key={key}>
      <button
        type="button"
        className="fk-added__close"
        aria-label="Close"
        onClick={hide}
      >
        <X size={18} />
      </button>

      <div className="fk-added__head">
        <span className="fk-added__check" aria-hidden="true">
          <Check size={22} strokeWidth={3} />
        </span>
        <strong>Added to Cart!</strong>
      </div>

      <div className="fk-added__item">
        <span className="fk-added__thumb">
          {item.imageUrl && !imageFailed ? (
            <img src={item.imageUrl} alt="" onError={() => setImageFailed(true)} />
          ) : (
            <span aria-hidden="true">{item.emoji || "📦"}</span>
          )}
        </span>
        <span className="fk-added__info">
          <span className="fk-added__name">{item.name}</span>
          <span className="fk-added__price">
            {formatPrice(item.unitPrice)}
            {item.quantity > 1 && <small> × {item.quantity}</small>}
          </span>
        </span>
      </div>

      <div className="fk-added__actions">
        <Link to="/shop/cart" className="fk-btn fk-btn--cart fk-btn--block">
          View Cart ({totals.itemCount})
        </Link>
        <button type="button" className="fk-btn fk-btn--outline fk-btn--block" onClick={hide}>
          Continue shopping
        </button>
      </div>
    </div>
  );
}

export default AddedToCartToast;
