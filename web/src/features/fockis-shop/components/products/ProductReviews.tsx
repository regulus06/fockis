import { useEffect, useState } from "react";
import type {
Product,
ProductReview,
} from "../../types/product.types";
import { getProductReviews } from "../../services/productApi";
import { Stars } from "../common/Stars";
import { ShopLoading } from "../common/ShopLoading";
import { ShopEmptyState } from "../common/ShopEmptyState";

export function ProductReviews({
product,
}: {
product: Product;
}) {
const [reviews, setReviews] = useState<ProductReview[] | null>(null);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
let cancelled = false;

setReviews(null);
setError(null);

getProductReviews(product.id)
  .then((result: ProductReview[]) => {
    if (cancelled) {
      return;
    }

    setReviews(Array.isArray(result) ? result : []);
  })
  .catch((err: unknown) => {
    if (cancelled) {
      return;
    }

    console.error(
      "[FOCKIS SHOP] Failed to load product reviews:",
      err,
    );

    setReviews([]);
    setError(
      err instanceof Error
        ? err.message
        : "Unable to load reviews.",
    );
  });

return () => {
  cancelled = true;
};

}, [product.id]);

return ( <section className="pdp-reviews"> <div className="section-head"> <div> <h2>Reviews</h2>

      <Stars
        rating={product.reviews.averageRating}
        reviews={product.reviews.totalReviews}
      />
    </div>
  </div>

  <div className="review-breakdown">
    {([5, 4, 3, 2, 1] as const).map((star) => {
      const count =
        product.reviews.ratingBreakdown[star] ?? 0;

      const totalReviews =
        product.reviews.totalReviews;

      const pct =
        totalReviews > 0
          ? (count / totalReviews) * 100
          : 0;

      return (
        <div
          className="review-breakdown-row"
          key={star}
        >
          <span className="mono">
            {star}★
          </span>

          <div className="review-breakdown-track">
            <div
              className="review-breakdown-fill"
              style={{
                width: `${pct}%`,
              }}
            />
          </div>

          <span className="mono count">
            {count}
          </span>
        </div>
      );
    })}
  </div>

  {reviews === null ? (
    <ShopLoading
      label="Loading reviews…"
      rows={2}
    />
  ) : error ? (
    <ShopEmptyState
      icon="⚠️"
      title="Reviews unavailable"
      message="We could not load the written reviews for this product right now."
    />
  ) : reviews.length === 0 ? (
    <ShopEmptyState
      icon="⭐"
      title="No written reviews yet"
      message="Be the first to review this product after your purchase."
    />
  ) : (
    <div className="review-list">
      {reviews.map((review) => (
        <div
          className="review-item"
          key={review.id}
        >
          <div className="review-item-head">
            <Stars rating={review.rating} />

            <span className="review-author mono">
              {review.authorName}
            </span>

            {review.verifiedPurchase && (
              <span className="review-verified">
                Verified Purchase
              </span>
            )}
          </div>

          {review.title && (
            <h5>{review.title}</h5>
          )}

          {review.body && (
            <p>{review.body}</p>
          )}

          {review.sellerReply && (
            <div className="review-seller-reply">
              <strong>
                Seller response:
              </strong>{" "}
              {review.sellerReply.body}
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</section>

);
}

export default ProductReviews;
