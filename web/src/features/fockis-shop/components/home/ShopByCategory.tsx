import { Link } from "react-router-dom";

import type { Category } from "../../types/category.types";
import type { Product } from "../../types/product.types";

/**
 * "Shop by category" — a row of soft pastel tiles, each with the category's
 * own icon and name (real categories from the API). Categories that
 * currently have products come first.
 */

const MAX_TILES = 8;

const FALLBACK_ICONS: Array<[RegExp, string]> = [
  [/fashion|cloth|apparel|wear/i, "👗"],
  [/electronic|tech|phone|computer/i, "🎧"],
  [/home|kitchen|living|furniture/i, "🏠"],
  [/tool|construction|hardware|diy/i, "🔧"],
  [/beauty|health|personal|cosmetic/i, "🧴"],
  [/sport|outdoor|fitness/i, "🏀"],
  [/book/i, "📚"],
  [/toy|kid|baby/i, "🧸"],
  [/food|grocery/i, "🛒"],
  [/car|auto|vehicle/i, "🚗"],
];

function iconFor(category: Category): string {
  if (category.icon?.trim()) return category.icon;
  const match = FALLBACK_ICONS.find(
    ([pattern]) => pattern.test(category.slug) || pattern.test(category.name),
  );
  return match ? match[1] : "🛍️";
}

export function ShopByCategory({
  categories,
  products,
  loading,
}: {
  categories: Category[];
  products: Product[];
  loading: boolean;
}) {
  const topLevel = categories.filter((c) => !c.parentSlug);

  const withProducts = new Set(products.map((p) => p.categorySlug));
  const ordered = [
    ...topLevel.filter((c) => withProducts.has(c.slug)),
    ...topLevel.filter((c) => !withProducts.has(c.slug)),
  ].slice(0, MAX_TILES);

  if (!loading && ordered.length === 0) return null;

  return (
    <section className="fk-section fk-catgrid-section" aria-label="Shop by category">
      <div className="fk-section__head">
        <div>
          <h2>Shop by category</h2>
        </div>
        <Link to="/shop/categories" className="fk-section__link">
          See all categories <span aria-hidden="true">›</span>
        </Link>
      </div>

      <div className="fk-catgrid" role="list">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="fk-catgrid__tile fk-skel" aria-hidden="true" />
            ))
          : ordered.map((category, index) => (
              <Link
                key={category.id}
                to={`/shop/category/${category.slug}`}
                className={`fk-catgrid__tile fk-catgrid__tile--tone-${index % 6}`}
                role="listitem"
              >
                <span className="fk-catgrid__icon" aria-hidden="true">
                  {iconFor(category)}
                </span>
                <span className="fk-catgrid__name">{category.name}</span>
              </Link>
            ))}
      </div>
    </section>
  );
}

export default ShopByCategory;
