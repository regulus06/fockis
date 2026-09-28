interface StarsProps {
  rating: number;
  reviews?: number;
}

export function Stars({ rating, reviews }: StarsProps) {
  return (
    <div className="stars">
      <span>★★★★★</span>
      <span className="mono">{rating.toFixed(1)}</span>
      {reviews != null && <span className="count">({reviews.toLocaleString()})</span>}
    </div>
  );
}
