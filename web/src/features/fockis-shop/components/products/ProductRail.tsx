import type { Product } from "../../types/product.types";
import { Rail } from "../common/Rail";
import { ProductCard } from "./ProductCard";

interface ProductRailProps {
  products: Product[];
  ariaLabel: string;
  showActions?: boolean;
}

/** Horizontal rail of the shared product card. */
export function ProductRail({
  products,
  ariaLabel,
  showActions = true,
}: ProductRailProps) {
  if (products.length === 0) return null;

  return (
    <Rail ariaLabel={ariaLabel}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant="rail"
          showActions={showActions}
        />
      ))}
    </Rail>
  );
}
