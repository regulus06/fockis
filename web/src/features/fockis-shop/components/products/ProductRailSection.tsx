import { Fragment } from "react";
import { Link } from "react-router-dom";

import type { Product } from "../../types/product.types";
import { Rail } from "../common/Rail";
import { ShopEmptyState } from "../common/ShopEmptyState";
import { ShopError } from "../common/ShopError";
import { ProductCard } from "./ProductCard";

/**
 * ============================================================================
 * FOCKIS SHOP — PRODUCT RAIL SECTION
 * ============================================================================
 *
 * Shared section for horizontal product collections:
 * - Recently viewed
 * - New arrivals
 * - Flash sale
 * - Recommended products
 * - Local delivery and international shipping
 *
 * Existing API and component props are preserved.
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
  hideWhenEmpty?: boolean;
  accent?: "default" | "deal" | "flash";
  eyebrow?: string;
  id?: string;
  showActions?: boolean;
  cardVariant?: "rail" | "compact";
  emptyIcon?: React.ReactNode;
  sectionRef?: React.Ref<HTMLElement>;
}

interface ProductCardSkeletonProps {
  variant?: "rail" | "compact";
}

interface RailSkeletonProps {
  count?: number;
  variant?: "rail" | "compact";
}

export function ProductCardSkeleton({
  variant = "rail",
}: ProductCardSkeletonProps) {
  return (
    <div
      className={`fk-card fk-card--${variant} fk-card--skeleton`}
      aria-hidden="true"
    >
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
  count = 5,
  variant = "rail",
}: RailSkeletonProps) {
  return (
    <div
      className={`rail-wrap rail-wrap--${variant}`}
      role="status"
      aria-label="Loading products"
      aria-busy="true"
    >
      <div className="rail-scroll">
        {Array.from({ length: count }, (_, index) => (
          <ProductCardSkeleton
            key={`${variant}-skeleton-${index}`}
            variant={variant}
          />
        ))}
      </div>

      <span className="fk-sr-only">Loading products…</span>
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
  const hasProducts = products.length > 0;

  if (!loading && !error && !hasProducts && hideWhenEmpty) {
    return null;
  }

  const sectionClassName = [
    "fk-section",
    "fk-rail-section",
    `fk-rail-section--${accent}`,
    `fk-rail-section--cards-${cardVariant}`,
  ].join(" ");

  return (
    <section
      className={sectionClassName}
      id={id}
      ref={sectionRef}
      aria-label={title}
      aria-busy={loading}
    >
      <header className="fk-section__head">
        <div className="fk-section__heading">
          {eyebrow && (
            <span className="fk-section__eyebrow">{eyebrow}</span>
          )}

          <h2>{title}</h2>

          {subtitle && (
            <p className="fk-section__subtitle">{subtitle}</p>
          )}
        </div>

        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="fk-section__link"
            aria-label={`${seeAllLabel}: ${title}`}
          >
            <span>{seeAllLabel}</span>
            <span aria-hidden="true">›</span>
          </Link>
        )}
      </header>

      {loading ? (
        <RailSkeleton
          count={cardVariant === "compact" ? 4 : 5}
          variant={cardVariant}
        />
      ) : error ? (
        <ShopError
          title={`${title} couldn’t load`}
          message={error}
        />
      ) : hasProducts ? (
        <Rail ariaLabel={title}>
          {products.map((product) => (
            <Fragment key={product.id}>
              <ProductCard
                product={product}
                variant={cardVariant}
                showActions={showActions}
              />
            </Fragment>
          ))}
        </Rail>
      ) : (
        <ShopEmptyState
          compact
          icon={emptyIcon ?? "🛍️"}
          title={emptyTitle}
          message={emptyMessage}
        />
      )}
    </section>
  );
}