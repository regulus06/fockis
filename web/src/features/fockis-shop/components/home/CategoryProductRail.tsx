import type { Category } from "../../types/category.types";
import { useProducts } from "../../hooks/useProducts";
import { useInView } from "../../hooks/useInView";
import { ProductRailSection } from "../products/ProductRailSection";

/** Lazy-loaded product rail for one real category. */
export function CategoryProductRail({ category }: { category: Category }) {
  const { ref, inView } = useInView<HTMLDivElement>();

  const { data, loading, error } = useProducts(
    { categorySlug: category.slug, sort: "newest", page: 1, pageSize: 16 },
    { enabled: inView },
  );

  return (
    <div ref={ref}>
      <ProductRailSection
        title={category.name}
        seeAllTo={`/shop/category/${category.slug}`}
        products={data?.items ?? []}
        loading={!inView || loading}
        error={error}
        emptyTitle={`No ${category.name.toLowerCase()} products yet`}
        emptyMessage="Check back soon — sellers are adding new items."
      />
    </div>
  );
}

const PREFERRED: RegExp[] = [
  /electronic/i,
  /home|kitchen/i,
  /beauty|personal/i,
  /fashion|cloth|apparel/i,
  /sport|outdoor/i,
  /book/i,
];

/**
 * Picks the homepage category rails from the real category list:
 * Electronics, Home & Kitchen, Beauty, Fashion, Sports, Books — whichever
 * exist. Falls back to the first top-level categories otherwise.
 */
export function pickHomeCategories(categories: Category[]): Category[] {
  const topLevel = categories.filter((c) => !c.parentSlug);
  const picked: Category[] = [];

  for (const pattern of PREFERRED) {
    const match = topLevel.find(
      (c) =>
        !picked.includes(c) && (pattern.test(c.slug) || pattern.test(c.name)),
    );
    if (match) picked.push(match);
  }

  if (picked.length === 0) return topLevel.slice(0, 4);
  return picked;
}
