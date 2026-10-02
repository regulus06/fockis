import { useState } from 'react';
import type { Product } from '../../types/product.types';

export function ProductGallery({ product }: { product: Product }) {
  const images = product.images.length > 0 ? product.images : null;
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images) {
    // Demo-data fallback: render the emoji as a large tile, matching the
    // visual language used everywhere else in the design.
    return (
      <div className="pdp-gallery">
        <div className="pdp-gallery-main pdp-gallery-emoji" aria-hidden="true">
          {product.emoji ?? '📦'}
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-gallery">
      <div className="pdp-gallery-main">
        <img src={images[activeIdx].url} alt={images[activeIdx].alt || product.name} />
      </div>
      {images.length > 1 && (
        <div className="pdp-gallery-thumbs">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={i === activeIdx ? 'active' : undefined}
              onClick={() => setActiveIdx(i)}
              aria-label={`Show image ${i + 1}`}
            >
              <img src={img.url} alt={img.alt || product.name} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
