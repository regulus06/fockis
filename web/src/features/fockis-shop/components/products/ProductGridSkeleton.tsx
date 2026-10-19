/** Card-shaped placeholders shown while a product grid loads. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" role="status" aria-label="Loading products">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="fk-card fk-card--grid fk-card--skeleton" aria-hidden="true">
          <div className="fk-card__media fk-skel" />
          <div className="fk-card__body">
            <div className="fk-skel fk-skel--line" />
            <div className="fk-skel fk-skel--line fk-skel--short" />
            <div className="fk-skel fk-skel--price" />
            <div className="fk-skel fk-skel--btn" />
          </div>
        </div>
      ))}
    </div>
  );
}
