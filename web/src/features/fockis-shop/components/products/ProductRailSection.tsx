import { Link } from "react-router-dom";

import type { Product } from "../../types/product.types";
import { Rail } from "../common/Rail";
import { ShopEmptyState } from "../common/ShopEmptyState";
import { ShopError } from "../common/ShopError";
import { ProductCard } from "./ProductCard";

/**
 * ============================================================================
 * PRODUCT RAIL SECTION
 * ============================================================================
 * One reusable block for every horizontal product row on the Shop:
 * heading · optional subtitle · optional "See all" · rail · skeleton ·
 * empty state · error state.
 * ============================================================================
 */

export interface ProductRailSectionProps {
  title: string;
  subtitle?: string;
  seeAllTo?: string;
  seeAllLabel?: string;
  products: Product[];
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Hide the whole section instead of showing an empty state. */
  hideWhenEmpty?: boolean;
  /** Visual accent for the section heading. */
  accent?: "default" | "deal" | "flash";
  eyebrow?: string;
  id?: string;
  showActions?: boolean;
  /** Card layout used inside the rail. */
  cardVariant?: "rail" | "compact";
  /** Icon shown in the empty state (lucide icon element or emoji). */
  emptyIcon?: React.ReactNode;
  /** Ref used for lazy-loading (from useInView). */
  sectionRef?: React.Ref<HTMLElement>;
}

export function ProductCardSkeleton({ variant = "rail" }: { variant?: "rail" | "compact" }) {
  return (
    <div className={`fk-card fk-card--${variant} fk-card--skeleton`} aria-hidden="true">
      <div className="fk-card__media fk-skel" />
      <div className="fk-card__body">
        <div className="fk-skel fk-skel--line" />
        <div className="fk-skel fk-skel--line fk-skel--short" />
        <div className="fk-skel fk-skel--price" />
        <div className="fk-skel fk-skel--btn" />
      </div>
    </div>
  );
}

export function RailSkeleton({
  count = 6,
  variant = "rail",
}: {
  count?: number;
  variant?: "rail" | "compact";
}) {
  return (
    <div className="rail-wrap" role="status" aria-label="Loading products">
      <div className="rail-scroll">
        {Array.from({ length: count }).map((_, index) => (
          <ProductCardSkeleton key={index} variant={variant} />
        ))}
      </div>
    </div>
  );
}

export function ProductRailSection({
  title,
  subtitle,
  seeAllTo,
  seeAllLabel = "See all",
  products,
  loading = false,
  error = null,
  emptyTitle = "Nothing here yet",
  emptyMessage = "Products will appear here as sellers add them.",
  hideWhenEmpty = false,
  accent = "default",
  eyebrow,
  id,
  showActions = true,
  cardVariant = "rail",
  emptyIcon,
  sectionRef,
}: ProductRailSectionProps) {
  if (!loading && !error && products.length === 0 && hideWhenEmpty) {
    return null;
  }

  return (
    <section
      className={`fk-section fk-rail-section fk-rail-section--${accent} fk-rail-section--cards-${cardVariant}`}
      id={id}
      ref={sectionRef}
      aria-label={title}
    >
      <div className="fk-section__head">
        <div>
          {eyebrow && <span className="fk-section__eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {seeAllTo && (
          <Link to={seeAllTo} className="fk-section__link">
            {seeAllLabel} <span aria-hidden="true">›</span>
          </Link>
        )}
      </div>

      {loading ? (
        <RailSkeleton variant={cardVariant} />
      ) : error ? (
        <ShopError title={`${title} couldn’t load`} message={error} />
      ) : products.length === 0 ? (
        <ShopEmptyState
          compact
          icon={emptyIcon ?? "🛍️"}
          title={emptyTitle}
          message={emptyMessage}
        />
      ) : (
        <Rail ariaLabel={title}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant={cardVariant}
              showActions={showActions}
            />
          ))}
        </Rail>
      )}
    </section>
  );
}
