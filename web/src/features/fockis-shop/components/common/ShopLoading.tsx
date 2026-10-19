interface ShopLoadingProps {
  label?: string;
  rows?: number;
}

/**
 * Branded loading state: a pulsing Fockis mark plus skeleton bars.
 * Product rails use their own card skeletons (see ProductRailSection).
 */
export function ShopLoading({ label = 'Loading…', rows = 3 }: ShopLoadingProps) {
  return (
    <div className="shop-loading" role="status" aria-live="polite">
      <div className="shop-loading-head">
        <img
          className="shop-loading-mark"
          src={`${import.meta.env.BASE_URL || '/'}brand/fockis-icon-96.png`}
          alt=""
          width={28}
          height={28}
        />
        <span className="shop-loading-label">{label}</span>
      </div>
      <div className="shop-loading-rows">
        {Array.from({ length: rows }).map((_, i) => (
          <div className="shop-loading-row" key={i} />
        ))}
      </div>
    </div>
  );
}
