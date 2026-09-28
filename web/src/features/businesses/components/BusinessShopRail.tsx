import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listStores } from "../../fockis-shop/services/storeApi";
import { useProducts } from "../../fockis-shop/hooks/useProducts";

import type { Store } from "../../fockis-shop/types/store.types";
import type { Business } from "../types/business.types";

import "../styles/BusinessShopRail.scss";

interface BusinessShopRailProps {
  business: Business;
}

export default function BusinessShopRail({
  business,
}: BusinessShopRailProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      try {
        setLoading(true);
        setError(null);
        setStore(null);

        /*
         * The existing Fockis Shop API exposes stores through listStores()
         * and each normalized Store contains businessId.
         *
         * We intentionally reuse that existing API instead of creating a
         * second store/business relationship or changing the backend.
         */
        const firstPage = await listStores({
          page: 1,
          pageSize: 100,
        });

        if (cancelled) {
          return;
        }

        const matchingStore =
          firstPage.items.find(
            (candidate) =>
              candidate.businessId === business.id &&
              candidate.status === "active",
          ) ?? null;

        setStore(matchingStore);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "[BusinessShopRail] Failed to load store:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this business shop.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStore();

    return () => {
      cancelled = true;
    };
  }, [business.id]);

  if (loading) {
    return (
      <section className="business-shop-rail">
        <div className="business-shop-rail__header">
          <div>
            <span className="business-shop-rail__eyebrow">
              FOCKIS SHOP
            </span>
            <h2>🛍️ Shop from {business.name}</h2>
          </div>
        </div>

        <div className="business-shop-rail__loading">
          <div className="business-shop-rail__skeleton business-shop-rail__skeleton--banner" />
          <div className="business-shop-rail__skeleton business-shop-rail__skeleton--text" />
          <div className="business-shop-rail__skeleton business-shop-rail__skeleton--products" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="business-shop-rail">
        <div className="business-shop-rail__header">
          <div>
            <span className="business-shop-rail__eyebrow">
              FOCKIS SHOP
            </span>
            <h2>🛍️ Fockis Shop</h2>
          </div>
        </div>

        <div className="business-shop-rail__error">
          <strong>Shop unavailable</strong>
          <span>{error}</span>
        </div>
      </section>
    );
  }

  if (!store) {
    return null;
  }

  return <BusinessShopStoreContent store={store} />;
}

function BusinessShopStoreContent({
  store,
}: {
  store: Store;
}) {
  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
  } = useProducts({
    storeSlug: store.slug,
    page: 1,
    pageSize: 6,
  });

  const products = productsData?.items ?? [];

  return (
    <section className="business-shop-rail">
      <div className="business-shop-rail__header">
        <div>
          <span className="business-shop-rail__eyebrow">
            FOCKIS SHOP
          </span>

          <h2>🛍️ Shop from this business</h2>

          <p>
            Products and services available from {store.name}.
          </p>
        </div>

        <Link
          className="business-shop-rail__view-all"
          to={`/shop/stores/${encodeURIComponent(store.slug)}`}
        >
          View Shop →
        </Link>
      </div>

      <Link
        to={`/shop/stores/${encodeURIComponent(store.slug)}`}
        className="business-shop-rail__store"
      >
        <div className="business-shop-rail__banner">
          {store.bannerUrl ? (
            <img
              src={store.bannerUrl}
              alt=""
            />
          ) : (
            <div className="business-shop-rail__banner-placeholder">
              {store.emoji || "🛍️"}
            </div>
          )}
        </div>

        <div className="business-shop-rail__store-info">
          <div className="business-shop-rail__logo">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
              />
            ) : (
              <span>{store.emoji || "🛍️"}</span>
            )}
          </div>

          <div className="business-shop-rail__store-copy">
            <div className="business-shop-rail__store-name">
              <strong>{store.name}</strong>

              {store.verified && (
                <span
                  className="business-shop-rail__verified"
                  aria-label="Verified store"
                  title="Verified store"
                >
                  ✓
                </span>
              )}
            </div>

            <span className="business-shop-rail__location">
              {[
                store.location.city,
                store.location.state,
                store.location.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>

            <span className="business-shop-rail__stats">
              {store.productCount}{" "}
              {store.productCount === 1
                ? "product"
                : "products"}
              {store.rating.totalReviews > 0 && (
                <>
                  {" • "}
                  ⭐ {store.rating.average.toFixed(1)}
                </>
              )}
            </span>
          </div>
        </div>
      </Link>

      {productsLoading ? (
        <div className="business-shop-rail__products-loading">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="business-shop-rail__product-skeleton"
              key={index}
            />
          ))}
        </div>
      ) : productsError ? (
        <div className="business-shop-rail__products-message">
          <span>
            The shop is available, but products could not be
            loaded right now.
          </span>
        </div>
      ) : products.length === 0 ? (
        <div className="business-shop-rail__products-message">
          <span>
            This shop is open, but there are no products
            available right now.
          </span>
        </div>
      ) : (
        <div className="business-shop-rail__products">
          {products.map((product: any) => {
            const productId =
              String(
                product?.id ??
                  product?._id ??
                  "",
              );

            const productName =
              product?.name ||
              product?.title ||
              "Product";

            const productImage =
              product?.imageUrl ||
              product?.image ||
              product?.thumbnail ||
              product?.images?.[0];

            const price =
              product?.price ??
              product?.salePrice ??
              product?.regularPrice;

            return (
              <Link
                key={productId || productName}
                to={
                  productId
                    ? `/shop/products/${encodeURIComponent(
                        productId,
                      )}`
                    : `/shop/stores/${encodeURIComponent(
                        store.slug,
                      )}`
                }
                className="business-shop-rail__product"
              >
                <div className="business-shop-rail__product-image">
                  {productImage ? (
                    <img
                      src={String(productImage)}
                      alt={productName}
                    />
                  ) : (
                    <span>📦</span>
                  )}
                </div>

                <div className="business-shop-rail__product-body">
                  <strong>{productName}</strong>

                  {price !== undefined &&
                    price !== null && (
                      <span>
                        $
                        {Number(price).toFixed(2)}
                      </span>
                    )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
