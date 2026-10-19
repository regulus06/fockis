import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Tag } from "lucide-react";

import type { Product } from "../../types/product.types";
import { getPrimaryProductImage } from "../../utils/productMedia";
import { ProductCard } from "../products/ProductCard";

/**
 * ============================================================================
 * HOME DEALS PANELS — pink "Today's deals" + purple "New arrivals"
 * ============================================================================
 * Sits right under the flash banner. Deals show as three big cards with an
 * Add to cart button; new arrivals show as a 2×2 picture grid.
 * Everything comes from real products. Empty panels say so.
 * ============================================================================
 */

function ArrivalTile({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const image = getPrimaryProductImage(product);

  return (
    <Link
      to={`/shop/product/${product.slug || product.id}`}
      className="fk-panel__tile"
      title={product.name}
    >
      {image && !failed ? (
        <img src={image.src} alt={image.alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="fk-panel__emoji" aria-hidden="true">{product.emoji || "📦"}</span>
      )}
      <span className="sr-only">{product.name}</span>
    </Link>
  );
}

function PanelHead({ title, to }: { title: string; to: string }) {
  return (
    <div className="fk-panel__head">
      <h2>{title}</h2>
      <Link to={to} className="fk-panel__link">
        See all <span aria-hidden="true">›</span>
      </Link>
    </div>
  );
}

interface HomeDealsPanelsProps {
  deals: Product[];
  newest: Product[];
  loading: boolean;
}

export function HomeDealsPanels({ deals, newest, loading }: HomeDealsPanelsProps) {
  return (
    <div className="fk-panels">
      <section className="fk-panel fk-panel--deals" aria-label="Today's deals">
        <PanelHead title="Today’s deals" to="/shop/deals" />

        {loading ? (
          <div className="fk-panel__deals">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="fk-card fk-card--deal fk-card--skeleton" aria-hidden="true">
                <div className="fk-card__media fk-skel" />
                <div className="fk-card__body">
                  <div className="fk-skel fk-skel--line" />
                  <div className="fk-skel fk-skel--price" />
                  <div className="fk-skel fk-skel--btn" />
                </div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="fk-panel__empty">
            <Tag size={30} aria-hidden="true" />
            <strong>No active deals right now</strong>
            <span>New offers appear here as sellers add them.</span>
          </div>
        ) : (
          <div className="fk-panel__deals" role="list">
            {deals.slice(0, 3).map((product) => (
              <ProductCard key={product.id} product={product} variant="deal" />
            ))}
          </div>
        )}
      </section>

      <section className="fk-panel fk-panel--arrivals" aria-label="New arrivals">
        <PanelHead title="New arrivals" to="/shop/products?sort=newest" />

        {loading ? (
          <div className="fk-panel__grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="fk-panel__tile fk-skel" aria-hidden="true" />
            ))}
          </div>
        ) : newest.length === 0 ? (
          <div className="fk-panel__empty">
            <Sparkles size={30} aria-hidden="true" />
            <strong>Nothing new yet</strong>
            <span>New products show up here as sellers list them.</span>
          </div>
        ) : (
          <div className="fk-panel__grid">
            {newest.slice(0, 4).map((product) => (
              <ArrivalTile key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomeDealsPanels;
