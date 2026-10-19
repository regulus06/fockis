interface StarsProps {
  rating: number;
  reviews?: number;
  /** Show "No ratings yet" instead of rendering nothing when rating is 0. */
  showEmpty?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Star rating driven only by real data.
 * A rating of 0 (the backend default for unrated items) renders nothing,
 * or a neutral "No ratings yet" label when `showEmpty` is set.
 */
export function Stars({ rating, reviews, showEmpty = false, size = "sm" }: StarsProps) {
  const value = Number(rating);

  if (!Number.isFinite(value) || value <= 0) {
    return showEmpty ? (
      <div className={`fk-stars fk-stars--${size} fk-stars--empty`}>No ratings yet</div>
    ) : null;
  }

  const clamped = Math.min(5, value);
  const percent = (clamped / 5) * 100;
  const count = Number(reviews);

  return (
    <div
      className={`fk-stars fk-stars--${size}`}
      aria-label={`${clamped.toFixed(1)} out of 5 stars${
        Number.isFinite(count) && count > 0 ? `, ${count} reviews` : ""
      }`}
    >
      <span className="fk-stars__value">{clamped.toFixed(1)}</span>
      <span className="fk-stars__track" aria-hidden="true">
        ★★★★★
        <span className="fk-stars__fill" style={{ width: `${percent}%` }}>
          ★★★★★
        </span>
      </span>
      {Number.isFinite(count) && count > 0 && (
        <span className="fk-stars__count">({count.toLocaleString()})</span>
      )}
    </div>
  );
}
