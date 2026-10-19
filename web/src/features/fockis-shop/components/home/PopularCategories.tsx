import { Link } from "react-router-dom";

import type { Category } from "../../types/category.types";
import { resolveProductImageUrl } from "../../utils/productImage";

/** Round category shortcuts (the "Explore popular brands" row pattern). */
export function PopularCategories({
  categories,
  loading,
}: {
  categories: Category[];
  loading: boolean;
}) {
  const items = categories.filter((c) => !c.parentSlug).slice(0, 14);

  if (!loading && items.length === 0) return null;

  return (
    <section className="fk-section" aria-label="Popular categories">
      <div className="fk-section__head">
        <div>
          <h2>Popular categories</h2>
        </div>
        <Link to="/shop/categories" className="fk-section__link">
          All categories <span aria-hidden="true">›</span>
        </Link>
      </div>

      <div className="fk-catcircles" role="list">
        {loading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="fk-catcircle" aria-hidden="true">
                <span className="fk-catcircle__icon fk-skel" />
                <span className="fk-skel fk-skel--line fk-skel--short" />
              </div>
            ))
          : items.map((category) => (
              <Link
                key={category.id}
                to={`/shop/category/${category.slug}`}
                className="fk-catcircle"
                role="listitem"
              >
                <span className="fk-catcircle__icon">
                  {category.imageUrl ? (
                    <img src={resolveProductImageUrl(category.imageUrl)} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{category.icon || "🛍️"}</span>
                  )}
                </span>
                <span className="fk-catcircle__name">{category.name}</span>
                {typeof category.productCount === "number" && category.productCount > 0 && (
                  <span className="fk-catcircle__count">
                    {category.productCount.toLocaleString()} items
                  </span>
                )}
              </Link>
            ))}
      </div>
    </section>
  );
}
