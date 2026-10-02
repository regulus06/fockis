import { useNavigate } from "react-router-dom";

import { useWishlistStore } from "../store/WishlistStore";
import { useCartStore } from "../../marketplace/store/cartStore";

import styles from "../styles/WhishlistPage.module.scss";

export interface WishlistPageProps {
  onContinueShopping?: () => void;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export default function WishlistPage({
  onContinueShopping,
}: WishlistPageProps) {
  const navigate = useNavigate();

  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);

  const cartAddItem = useCartStore((state) => state.addItem);

  const isEmpty = items.length === 0;

  function continueShopping() {
    if (onContinueShopping) {
      onContinueShopping();
      return;
    }

    navigate("/marketplace");
  }

  function moveToCart(item: (typeof items)[number]) {
    cartAddItem({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.image,
    });

    removeItem(item.id);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Your Wishlist</h1>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>♡</span>

          <h2>Your wishlist is empty</h2>

          <p>Tap the heart on any product to save it here for later.</p>

          <button
            type="button"
            className={styles.shopBtn}
            onClick={continueShopping}
          >
            Start Browsing
          </button>
        </div>
      ) : (
        <>
          <div className={styles.itemsHeader}>
            <span>
              {items.length} item{items.length === 1 ? "" : "s"} saved
            </span>

            <button
              type="button"
              className={styles.continueLink}
              onClick={continueShopping}
            >
              Continue shopping
            </button>
          </div>

          <div className={styles.grid}>
            {items.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.title} from wishlist`}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.body}>
                  <span className={styles.name}>{item.title}</span>

                  <span className={styles.price}>
                    {formatPrice(item.price)}
                  </span>

                  <button
                    type="button"
                    className={styles.moveBtn}
                    onClick={() => moveToCart(item)}
                  >
                    Move to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}