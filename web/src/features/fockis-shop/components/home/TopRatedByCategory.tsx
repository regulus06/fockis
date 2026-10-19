import { useState } from "react";
import { Star } from "lucide-react";

import type { Category } from "../../types/category.types";
import { useProducts } from "../../hooks/useProducts";
import { useInView } from "../../hooks/useInView";
import { getRealRating } from "../../utils/productMedia";
import { ProductRailSection } from "../products/ProductRailSection";

/**
 * "Top rated" rail with category tabs (the Best Sellers layout from the
 * references). Ordering comes from the API's rating sort; only products
 * with a real rating are listed.
 */
export function TopRatedByCategory({ categories }: { categories: Category[] }) {
  const [active, setActive] = useState<string>("");
  const { ref, inView } = useInView<HTMLDivElement>();

  const tabs = categories.filter((c) => !c.parentSlug).slice(0, 8);

  const { data, loading, error } = useProducts(
    {
      sort: "rating",
      page: 1,
      pageSize: 16,
      ...(active ? { categorySlug: active } : {}),
    },
    { enabled: inView },
  );

  const rated = (data?.items ?? []).filter((product) => getRealRating(product));

  return (
    <div ref={ref} className="fk-toprated">
      {tabs.length > 0 && (rated.length > 0 || active !== "") && (
        <div className="fk-pills" role="tablist" aria-label="Top rated categories">
          <button
            type="button"
            role="tab"
            aria-selected={active === ""}
            className={active === "" ? "fk-pill is-active" : "fk-pill"}
            onClick={() => setActive("")}
          >
            All
          </button>
          {tabs.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active === category.slug}
              className={active === category.slug ? "fk-pill is-active" : "fk-pill"}
              onClick={() => setActive(category.slug)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <ProductRailSection
        title="Top rated"
        subtitle="Highest-rated products from Fockis shoppers"
        seeAllTo={active ? `/shop/category/${active}` : "/shop/products?sort=rating"}
        products={rated}
        loading={!inView || loading}
        error={error}
        emptyTitle="No rated products here yet"
        emptyMessage="Products appear here once shoppers start leaving ratings."
        emptyIcon={<Star size={30} strokeWidth={1.6} />}
        cardVariant="compact"
      />
    </div>
  );
}
