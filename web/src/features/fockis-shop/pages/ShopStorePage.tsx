import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopEmptyState } from "../components/common/ShopEmptyState";
import { ShopError } from "../components/common/ShopError";
import { ProductGridSkeleton } from "../components/products/ProductGridSkeleton";

import { StoreHeader } from "../components/stores/StoreHeader";
import { StoreInfo } from "../components/stores/StoreInfo";
import { StoreProducts } from "../components/stores/StoreProducts";
import { StorePolicies } from "../components/stores/StorePolicies";
import { StoreShipping } from "../components/stores/StoreShipping";
import { StoreReviews } from "../components/stores/StoreReviews";

import { useStore } from "../hooks/useStore";
import { useProducts } from "../hooks/useProducts";

function StatePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />
      <main className="fk-container fk-page">{children}</main>
      <ShopFooter />
    </div>
  );
}

export default function ShopStorePage() {
  const { slug } = useParams<{ slug: string }>();
  const normalizedSlug = slug?.trim() || undefined;

  const { store, loading, error, notFound } = useStore(normalizedSlug);

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
  } = useProducts(
    normalizedSlug
      ? { storeSlug: normalizedSlug, page: 1, pageSize: 100 }
      : undefined,
    { enabled: Boolean(normalizedSlug) },
  );

  // The products endpoint does not filter by store, so keep only this
  // store's products (matched by slug or store ID).
  const products = useMemo(() => {
    const items = productsData?.items ?? [];
    if (!store) return [];
    return items.filter(
      (product) =>
        (product.storeSlug && product.storeSlug === store.slug) ||
        (product.storeId && String(product.storeId) === String(store.id)),
    );
  }, [productsData, store]);

  if (!normalizedSlug) {
    return (
      <StatePage>
        <ShopEmptyState icon="🏪" title="Store not found" message="No store was specified." />
      </StatePage>
    );
  }

  if (loading) {
    return (
      <StatePage>
        <ShopLoading label="Loading store…" rows={4} />
      </StatePage>
    );
  }

  if (error) {
    return (
      <StatePage>
        <ShopError message={error} />
      </StatePage>
    );
  }

  if (notFound || !store) {
    return (
      <StatePage>
        <ShopEmptyState
          icon="🏪"
          title="Store not found"
          message="This store may have been closed, renamed, or does not exist."
        />
      </StatePage>
    );
  }

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main>
        <StoreHeader store={store} />

        <div className="fk-container fk-page">
          <ShopBreadcrumbs
            items={[
              { label: "Shop", to: "/shop" },
              { label: "Stores", to: "/shop/stores" },
              { label: store.name },
            ]}
          />

          <div className="store-page-layout">
            <div className="store-page-main">
              {productsLoading ? (
                <ProductGridSkeleton />
              ) : productsError ? (
                <ShopError message={productsError} />
              ) : products.length === 0 ? (
                <ShopEmptyState
                  icon="📦"
                  title="No products yet"
                  message="This store does not have any products available right now."
                />
              ) : (
                <StoreProducts products={products} />
              )}
            </div>

            <aside className="store-page-aside">
              <StoreInfo store={store} />
              <StoreShipping store={store} />
              <StorePolicies store={store} />
            </aside>
          </div>

          <div className="store-page-reviews">
            <StoreReviews store={store} />
          </div>
        </div>
      </main>

      <ShopFooter />
    </div>
  );
}
