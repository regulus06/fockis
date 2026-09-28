import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopEmptyState } from "../components/common/ShopEmptyState";
import { ShopError } from "../components/common/ShopError";

import { ProductGallery } from "../components/products/ProductGallery";
import { ProductInfo } from "../components/products/ProductInfo";
import { ProductActions } from "../components/products/ProductActions";
import { ProductInventory } from "../components/products/ProductInventory";
import { ProductShipping } from "../components/products/ProductShipping";
import { ProductDescription } from "../components/products/ProductDescription";
import { ProductReviews } from "../components/products/ProductReviews";
import { RelatedProducts } from "../components/products/RelatedProducts";
import { FrequentlyBoughtTogether } from "../components/products/FrequentlyBoughtTogether";

import { useProduct } from "../hooks/useProduct";
import { listProducts } from "../services/productApi";

import type {
Product,
ProductListFilters,
} from "../types/product.types";

function getProductCategory(product: Product): string {
return (
product.categorySlug ||
product.categoryId ||
""
);
}

function getProductId(product: Product): string {
return String(product.id ?? "");
}

export default function ShopProductPage() {
const { productId } = useParams<{
productId: string;
}>();

const {
product,
loading,
notFound,
} = useProduct(productId);

const [related, setRelated] = useState<Product[]>([]);
const [relatedLoading, setRelatedLoading] =
useState(false);
const [relatedError, setRelatedError] =
useState<string | null>(null);

useEffect(() => {
if (!product) {
setRelated([]);
setRelatedError(null);
return;
}
let cancelled = false;

const loadRelatedProducts = async () => {
  setRelatedLoading(true);
  setRelatedError(null);

  try {
    const categorySlug =
      getProductCategory(product);

    const filters: ProductListFilters = {
      page: 1,
      pageSize: 8,
      ...(categorySlug
        ? {
            categorySlug,
          }
        : {}),
    };

    const result =
      await listProducts(filters);

    if (cancelled) {
      return;
    }

    const currentProductId =
      getProductId(product);

    const relatedProducts =
      result.items.filter(
        (item) =>
          getProductId(item) !==
          currentProductId,
      );

    setRelated(
      relatedProducts.slice(0, 8),
    );
  } catch (error: unknown) {
    if (cancelled) {
      return;
    }

    setRelated([]);

    setRelatedError(
      error instanceof Error
        ? error.message
        : "Failed to load related products.",
    );
  } finally {
    if (!cancelled) {
      setRelatedLoading(false);
    }
  }
};

void loadRelatedProducts();

return () => {
  cancelled = true;
};

}, [product]);

if (loading) {
return ( <div className="shop-page-root"> <ShopHeader />

    <div
      className="wrap"
      style={{
        padding: "60px 32px",
      }}
    >
      <ShopLoading
        label="Loading product…"
        rows={4}
      />
    </div>

    <ShopFooter />
  </div>
);


}

if (notFound || !product) {
return ( <div className="shop-page-root"> <ShopHeader />
    <div
      className="wrap"
      style={{
        padding: "60px 32px",
      }}
    >
      <ShopEmptyState
        icon="📦"
        title="Product not found"
        message="This product may have been removed or unpublished by the seller."
      />
    </div>

    <ShopFooter />
  </div>
);


}

const categorySlug =
product.categorySlug ||
product.categoryId ||
"";

return ( <div className="shop-page-root"> <ShopHeader />

  <div
    className="wrap"
    style={{
      paddingTop: 32,
    }}
  >
    <ShopBreadcrumbs
      items={[
        {
          label: "Shop",
          to: "/shop",
        },
        ...(categorySlug
          ? [
              {
                label: categorySlug,
                to: `/shop/category/${categorySlug}`,
              },
            ]
          : []),
        {
          label: product.name,
        },
      ]}
    />
  </div>

  <section className="tight">
    <div className="wrap">
      <div className="pdp-layout">
        <ProductGallery
          product={product}
        />

        <div>
          <ProductInfo
            product={product}
          />

          <ProductInventory
            product={product}
          />

          <ProductActions
            product={product}
          />

          <ProductShipping
            product={product}
          />
        </div>
      </div>
    </div>
  </section>

  <section className="shaded">
    <div className="wrap">
      <ProductDescription
        product={product}
      />
    </div>
  </section>

  {relatedLoading && (
    <section className="tight">
      <div className="wrap">
        <ShopLoading
          label="Loading related products…"
          rows={2}
        />
      </div>
    </section>
  )}

  {!relatedLoading &&
    relatedError && (
      <section className="tight">
        <div className="wrap">
          <ShopError
            message={relatedError}
          />
        </div>
      </section>
    )}

  {!relatedLoading &&
    !relatedError &&
    related.length > 0 && (
      <section className="tight">
        <div className="wrap">
          <FrequentlyBoughtTogether
            mainProduct={product}
            addOnProducts={related.slice(
              0,
              2,
            )}
          />
        </div>
      </section>
    )}

  <section>
    <div className="wrap">
      <ProductReviews
        product={product}
      />
    </div>
  </section>

  {!relatedLoading &&
    related.length > 0 && (
      <section className="shaded">
        <div className="wrap">
          <RelatedProducts
            products={related}
          />
        </div>
      </section>
    )}

  <ShopFooter />
</div>

);
}
