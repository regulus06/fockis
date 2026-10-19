import { useState } from "react";
import { Link } from "react-router-dom";

import type { Product } from "../../types/product.types";
import type { Category } from "../../types/category.types";
import { getPrimaryProductImage, getRealDiscount } from "../../utils/productMedia";
import { resolveProductImageUrl } from "../../utils/productImage";
import { FockisLogo } from "../common/FockisLogo";
import { Rail } from "../common/Rail";

/**
 * ============================================================================
 * HOME PROMO TILES — the deals-first band at the top of the Shop
 * ============================================================================
 * Colourful tiles, each holding a 2×2 grid of real products or categories
 * (the pattern from the reference screenshots). Tiles slide horizontally on
 * phones and sit side by side on desktop. A tile with no data shows a neutral
 * message instead of placeholder products.
 * ============================================================================
 */

function TileProduct({ product, showDiscount }: { product: Product; showDiscount?: boolean }) {
  const [failed, setFailed] = useState(false);
  const image = getPrimaryProductImage(product);
  const discount = showDiscount ? getRealDiscount(product) : 0;

  return (
    <Link
      to={`/shop/product/${product.slug || product.id}`}
      className="fk-tile__item"
      title={product.name}
    >
      {image && !failed ? (
        <img src={image.src} alt={image.alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="fk-tile__emoji" aria-hidden="true">{product.emoji || "📦"}</span>
      )}
      {discount > 0 && <span className="fk-tile__pct">-{discount}%</span>}
      <span className="sr-only">{product.name}</span>
    </Link>
  );
}

interface TileProps {
  title: string;
  to: string;
  linkLabel: string;
  tone: "orange" | "blue" | "navy" | "white";
  children: React.ReactNode;
}

function Tile({ title, to, linkLabel, tone, children }: TileProps) {
  return (
    <article className={`fk-tile fk-tile--${tone}`}>
      <h2>{title}</h2>
      <div className="fk-tile__content">{children}</div>
      <Link to={to} className="fk-tile__link">
        {linkLabel} <span aria-hidden="true">›</span>
      </Link>
    </article>
  );
}

function ProductQuad({
  products,
  showDiscount,
  emptyText,
}: {
  products: Product[];
  showDiscount?: boolean;
  emptyText: string;
}) {
  if (products.length === 0) {
    return <p className="fk-tile__empty">{emptyText}</p>;
  }

  return (
    <div className="fk-tile__grid">
      {products.slice(0, 4).map((product) => (
        <TileProduct key={product.id} product={product} showDiscount={showDiscount} />
      ))}
    </div>
  );
}

interface HomePromoTilesProps {
  deals: Product[];
  newest: Product[];
  topRated: Product[];
  categories: Category[];
  loading: boolean;
}

export function HomePromoTiles({
  deals,
  newest,
  topRated,
  categories,
  loading,
}: HomePromoTilesProps) {
  if (loading) {
    return (
      <div className="fk-tiles" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="fk-tile fk-tile--white fk-tile--skeleton">
            <div className="fk-skel fk-skel--line" />
            <div className="fk-tile__grid">
              {Array.from({ length: 4 }).map((__, cell) => (
                <div key={cell} className="fk-tile__item fk-skel" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const topCategories = categories.filter((c) => !c.parentSlug).slice(0, 4);

  return (
    <Rail ariaLabel="Featured deals and collections" className="fk-tiles-rail">
      <Tile title="Today's deals" to="/shop/deals" linkLabel="Shop all deals" tone="orange">
        <ProductQuad
          products={deals}
          showDiscount
          emptyText="No active deals right now. New offers appear here as sellers add them."
        />
      </Tile>

      <Tile title="New arrivals" to="/shop/products?sort=newest" linkLabel="See what's new" tone="blue">
        <ProductQuad
          products={newest}
          emptyText="New products will show up here as sellers list them."
        />
      </Tile>

      {topRated.length > 0 ? (
        <Tile title="Top rated by shoppers" to="/shop/products?sort=rating" linkLabel="Explore top rated" tone="white">
          <ProductQuad products={topRated} emptyText="" />
        </Tile>
      ) : (
        <Tile title="Shop by category" to="/shop/categories" linkLabel="See all categories" tone="white">
          {topCategories.length === 0 ? (
            <p className="fk-tile__empty">Categories are on their way.</p>
          ) : (
            <div className="fk-tile__grid">
              {topCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/shop/category/${category.slug}`}
                  className="fk-tile__item fk-tile__item--cat"
                >
                  {category.imageUrl ? (
                    <img src={resolveProductImageUrl(category.imageUrl)} alt="" loading="lazy" />
                  ) : (
                    <span className="fk-tile__emoji" aria-hidden="true">{category.icon}</span>
                  )}
                  <span className="fk-tile__caption">{category.name}</span>
                </Link>
              ))}
            </div>
          )}
        </Tile>
      )}

      <article className="fk-tile fk-tile--navy fk-tile--sell">
        <FockisLogo size={56} />
        <h2>Sell on Fockis</h2>
        <p>Open a storefront, list your products and reach shoppers locally and worldwide.</p>
        <Link to="/shop/sell" className="fk-btn fk-btn--cart">
          Start selling
        </Link>
        <Link to="/shop/stores" className="fk-tile__link">
          Browse stores <span aria-hidden="true">›</span>
        </Link>
      </article>
    </Rail>
  );
}
