import type { StoreRatingSummary } from '../../types/store.types';

export function StoreRating({ rating }: { rating: StoreRatingSummary }) {
  return (
    <div className="rating">
      <span className="star">★</span>
      {rating.average.toFixed(1)}
      <span className="count mono">({rating.totalReviews.toLocaleString()})</span>
    </div>
  );
}
