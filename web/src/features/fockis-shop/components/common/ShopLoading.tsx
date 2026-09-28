interface ShopLoadingProps {
  label?: string;
  rows?: number;
}

/**
 * Simple, dependency-free loading state that matches the existing design's
 * quiet, understated tone (no spinners/skeleton shimmer libraries).
 */
export function ShopLoading({ label = 'Loading…', rows = 3 }: ShopLoadingProps) {
  return (
    <div className="shop-loading" role="status" aria-live="polite">
      <div className="shop-loading-label mono">{label}</div>
      <div className="shop-loading-rows">
        {Array.from({ length: rows }).map((_, i) => (
          <div className="shop-loading-row" key={i} />
        ))}
      </div>
    </div>
  );
}
