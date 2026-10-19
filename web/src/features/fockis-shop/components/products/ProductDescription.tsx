import type { Product } from '../../types/product.types';

export function ProductDescription({ product }: { product: Product }) {
  const text = product.description?.trim();

  return (
    <div className="pdp-description">
      {text ? (
        <p>{text}</p>
      ) : (
        <p className="pdp-muted">The seller hasn’t added a description for this product yet.</p>
      )}
      {product.tags.length > 0 && (
        <div className="tag-row">
          {product.tags.map((t) => (
            <span className="tag" key={t}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
