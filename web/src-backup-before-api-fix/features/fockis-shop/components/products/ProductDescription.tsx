import type { Product } from '../../types/product.types';

export function ProductDescription({ product }: { product: Product }) {
  return (
    <section className="pdp-description">
      <h2>Description</h2>
      <p>{product.description}</p>
      {product.tags.length > 0 && (
        <div className="tag-row" style={{ marginTop: 14 }}>
          {product.tags.map((t) => (
            <span className="tag" key={t}>{t}</span>
          ))}
        </div>
      )}
    </section>
  );
}
