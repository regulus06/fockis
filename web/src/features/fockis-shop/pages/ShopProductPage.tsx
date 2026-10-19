import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopEmptyState } from "../components/common/ShopEmptyState";

import { ProductGallery } from "../components/products/ProductGallery";
import { ProductInfo } from "../components/products/ProductInfo";
import { ProductActions } from "../components/products/ProductActions";
import { ProductDescription } from "../components/products/ProductDescription";
import { ProductSpecs } from "../components/products/ProductSpecs";
import { ProductReviews } from "../components/products/ProductReviews";
import { FrequentlyBoughtTogether } from "../components/products/FrequentlyBoughtTogether";
import { ProductRailSection } from "../components/products/ProductRailSection";

import { useProduct } from "../hooks/useProduct";
import { useCategories } from "../hooks/useCategories";
import {
  useRecentlyViewedProducts,
  useRecordProductView,
} from "../hooks/useRecentlyViewed";
import { listProducts } from "../services/productApi";

import type { Product, ProductListFilters } from "../types/product.types";

function getProductCategory(product: Product): string {
  return product.categorySlug || product.categoryId || "";
}

export default function ShopProductPage() {
  const { productId } = useParams<{ productId: string }>();

  const { product, loading, error, notFound } = useProduct(productId);
  const { categories } = useCategories();

  useRecordProductView(product);

  const recent = useRecentlyViewedProducts({
    excludeId: product?.id,
    limit: 12,
    enabled: Boolean(product),
  });

  const [related, setRelated] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

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
        const categorySlug = getProductCategory(product);

        const filters: ProductListFilters = {
          page: 1,
          pageSize: 16,
          ...(categorySlug ? { categorySlug } : {}),
        };

        const result = await listProducts(filters);
        if (cancelled) return;

        setRelated(
          result.items
            .filter((item) => String(item.id) !== String(product.id))
            .slice(0, 14),
        );
      } catch (err: unknown) {
        if (cancelled) return;
        setRelated([]);
        setRelatedError(
          err instanceof Error ? err.message : "Failed to load related products.",
        );
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    };

    void loadRelatedProducts();

    return () => {
      cancelled = true;
    };
  }, [product]);

  const category = useMemo(
    () =>
      product
        ? categories.find((c) => c.slug === getProductCategory(product))
        : undefined,
    [categories, product],
  );

  if (loading) {
    return (
      <div className="shop-page-root fk-shop">
        <ShopHeader />
        <main className="fk-container fk-page">
          <ShopLoading label="Loading product…" rows={4} />
        </main>
        <ShopFooter />
      </div>
    );
  }

  if (error || notFound || !product) {
    return (
      <div className="shop-page-root fk-shop">
        <ShopHeader />
        <main className="fk-container fk-page">
          <ShopEmptyState
            icon={error ? "⚠️" : "📦"}
            title={error ? "This product couldn’t load" : "Product not found"}
            message={
              error ??
              "This product may have been removed or unpublished by the seller."
            }
          />
        </main>
        <ShopFooter />
      </div>
    );
  }

  const categorySlug = getProductCategory(product);

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main className="fk-container fk-page pdp">
        <ShopBreadcrumbs
          items={[
            { label: "Shop", to: "/shop" },
            ...(categorySlug
              ? [
                  {
                    label: category?.name ?? categorySlug,
                    to: `/shop/category/${categorySlug}`,
                  },
                ]
              : []),
            { label: product.name || "Product" },
          ]}
        />

        <div className="pdp-layout">
          <div className="pdp-layout__gallery">
            <ProductGallery product={product} />
          </div>

          <div className="pdp-layout__info">
            <ProductInfo product={product} />
          </div>

          <div className="pdp-layout__buy">
            <ProductActions product={product} />
          </div>

          <section className="pdp-layout__about pdp-block" aria-labelledby="pdp-about">
            <h2 id="pdp-about">About this item</h2>
            <ProductDescription product={product} />
          </section>
        </div>

        {!relatedLoading && !relatedError && related.length >= 2 && (
          <section className="pdp-section" aria-labelledby="pdp-fbt">
            <h2 id="pdp-fbt">Frequently bought together</h2>
            <p className="pdp-muted">
              Suggested from the same category — not based on purchase history.
            </p>
            <FrequentlyBoughtTogether
              mainProduct={product}
              addOnProducts={related.slice(0, 2)}
            />
          </section>
        )}

        <ProductRailSection
          title="Related products"
          subtitle={category ? `More in ${category.name}` : "More from Fockis sellers"}
          seeAllTo={categorySlug ? `/shop/category/${categorySlug}` : "/shop/products"}
          products={related}
          loading={relatedLoading}
          error={relatedError}
          hideWhenEmpty
        />

        <section className="pdp-section" aria-labelledby="pdp-specs">
          <h2 id="pdp-specs">Product details</h2>
          <ProductSpecs product={product} categoryName={category?.name} />
        </section>

        <section className="pdp-section" id="reviews">
          <ProductReviews product={product} />
        </section>

        {recent.hasHistory && (
          <ProductRailSection
            title="Your recently viewed items"
            products={recent.products}
            loading={recent.loading}
            hideWhenEmpty
          />
        )}
      </main>

      <ShopFooter />
    </div>
  );
}
