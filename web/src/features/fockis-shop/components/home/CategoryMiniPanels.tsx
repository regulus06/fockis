import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Dumbbell,
  Headphones,
  House,
  Shirt,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { Category } from "../../types/category.types";
import type { Product } from "../../types/product.types";
import { useProducts } from "../../hooks/useProducts";
import { useInView } from "../../hooks/useInView";
import { effectivePrice } from "../../utils/pricing";
import { formatPrice } from "../../utils/currency";
import { getPrimaryProductImage } from "../../utils/productMedia";

/**
 * ============================================================================
 * CATEGORY MINI PANELS — six small category boxes side by side
 * ============================================================================
 * Electronics · Home · Beauty · Fashion · Sports · Books (whichever exist).
 * Each box loads its newest products when it scrolls into view and shows
 * up to four of them, or a friendly empty message.
 * ============================================================================
 */

const ICONS: Array<[RegExp, LucideIcon]> = [
  [/electronic|tech/i, Headphones],
  [/home|kitchen/i, House],
  [/beauty|personal|health/i, Sparkles],
  [/fashion|cloth|apparel/i, Shirt],
  [/sport|outdoor/i, Dumbbell],
  [/book/i, BookOpen],
];

function iconFor(category: Category): LucideIcon {
  const match = ICONS.find(
    ([pattern]) => pattern.test(category.slug) || pattern.test(category.name),
  );
  return match ? match[1] : ShoppingBag;
}

/** "Home & Kitchen" → "Home" for the compact panel heading. */
function shortName(name: string): string {
  return name.split(/\s*(?:&|,| and )\s*/i)[0] || name;
}

function MiniProduct({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const image = getPrimaryProductImage(product);
  const price = effectivePrice(product);

  return (
    <Link
      to={`/shop/product/${product.slug || product.id}`}
      className="fk-mini__item"
      title={product.name}
    >
      <span className="fk-mini__thumb">
        {image && !failed ? (
          <img src={image.src} alt={image.alt} loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <span aria-hidden="true">{product.emoji || "📦"}</span>
        )}
      </span>
      {Number(price) > 0 && <span className="fk-mini__price">{formatPrice(price)}</span>}
    </Link>
  );
}

function MiniPanel({ category }: { category: Category }) {
  const { ref, inView } = useInView<HTMLElement>();
  const { data, loading } = useProducts(
    { categorySlug: category.slug, sort: "newest", page: 1, pageSize: 4 },
    { enabled: inView },
  );

  const Icon = iconFor(category);
  const label = shortName(category.name);
  const items = data?.items ?? [];

  return (
    <section ref={ref} className="fk-mini" aria-label={category.name}>
      <div className="fk-mini__head">
        <h3>{label}</h3>
        <Link to={`/shop/category/${category.slug}`} className="fk-mini__link">
          See all <span aria-hidden="true">›</span>
        </Link>
      </div>

      {!inView || loading ? (
        <div className="fk-mini__grid">
          {Array.from({ length: 2 }).map((_, index) => (
            <span key={index} className="fk-mini__thumb fk-skel" aria-hidden="true" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="fk-mini__empty">
          <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
          <strong>No {label.toLowerCase()} products yet</strong>
          <span>Check back soon — sellers are adding new items.</span>
        </div>
      ) : (
        <div className="fk-mini__grid">
          {items.slice(0, 4).map((product) => (
            <MiniProduct key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

export function CategoryMiniPanels({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="fk-minis" aria-label="Shop by department">
      {categories.slice(0, 6).map((category) => (
        <MiniPanel key={category.id} category={category} />
      ))}
    </div>
  );
}

export default CategoryMiniPanels;
