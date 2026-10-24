import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { ArrowRight, BadgeCheck, Package, ShoppingBag } from "lucide-react";

import { listStoreProducts } from "../../fockis-shop/services/productApi";
import { resolveProductImageUrl } from "../../fockis-shop/utils/productImage";

import type { Product } from "../../fockis-shop/types/product.types";
import type { Business } from "../types/business.types";

import { businessesApi } from "../services/businessesApi";

import { ErrorState, RailNav, useRailScroll } from "./BusinessUi";

import {
  getProductRoute,
  getStoreRoute,
  getUsableImageUrl,
} from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/BusinessShopRail.scss";


/* ============================================================================
   BUSINESS SHOP RAIL

   Shows the Fockis Shop store the owner connected to this business and its
   active products (GET /fockis-shop/products/store/:storeId).

   Renders nothing when no store is connected. Cart and checkout stay in
   Fockis Shop; products link to the existing product route.
============================================================================ */

interface Props {
  business: Business;
  /*
   * Number of products to show.
   */
  limit?: number;
  title?: string;
}

const STOCK_LABELS: Record<string, { label: string; tone: string }> = {
  in_stock: { label: "In stock", tone: "success" },
  low_stock: { label: "Low stock", tone: "warning" },
  out_of_stock: { label: "Out of stock", tone: "danger" },
  backorder: { label: "Backorder", tone: "neutral" },
};

function formatPrice(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${currency ? `${currency} ` : "$"}${amount.toFixed(2)}`;
  }
}

function getProductImage(product: Product): string | undefined {
  const primary =
    product.images?.find((image) => image.isPrimary) ?? product.images?.[0];

  return resolveProductImageUrl(product.image || primary?.url);
}

export default function BusinessShopRail({
  business,
  limit = 8,
  title,
}: Props) {
  const store = business.store;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(Boolean(store));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { trackRef, canPrev, canNext, scrollBy } = useRailScroll();

  useEffect(() => {
    if (!store?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    listStoreProducts(store.id)
      .then((items) => {
        if (!cancelled) {
          setProducts(
            items.filter((product) => product.status !== "archived" && product.status !== "draft"),
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Products could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [store?.id, attempt]);

  if (!store) {
    return null;
  }

  const storeRoute = getStoreRoute(store.slug);
  const visible = products.slice(0, limit);
  const trackStore = () => {
    void businessesApi.trackStoreClick(business.id);
  };

  return (
    <section className="fkb fkb-shop" aria-labelledby="fkb-shop-title">
      <div className="fkb-section-head">
        <div>
          <span className="fkb-eyebrow">Fockis Shop</span>
          <h2 id="fkb-shop-title">{title ?? `Shop ${store.name}`}</h2>
        </div>

        <div className="fkb-section-head__actions">
          <RailNav label="products" canPrev={canPrev} canNext={canNext} onScroll={scrollBy} />
        </div>
      </div>

      <Link to={storeRoute} className="fkb-shop__store" onClick={trackStore}>
        <span className="fkb-shop__store-logo" aria-hidden="true">
          {getUsableImageUrl(store.logo) ? (
            <img src={store.logo} alt="" loading="lazy" />
          ) : (
            <ShoppingBag size={22} />
          )}
        </span>

        <span className="fkb-shop__store-text">
          <strong>
            {store.name}
            {store.verified && (
              <BadgeCheck size={16} aria-label="Verified store" role="img" />
            )}
          </strong>
          <span>Official store on Fockis Shop</span>
        </span>

        <span className="fkb-btn fkb-btn--primary fkb-btn--sm fkb-shop__store-cta">
          Visit Store
          <ArrowRight size={15} aria-hidden="true" />
        </span>
      </Link>

      {loading ? (
        <div className="fkb-rail" role="status" aria-label="Loading products">
          <div className="fkb-rail__track fkb-shop__track">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="fkb-product fkb-product--skeleton" aria-hidden="true">
                <div className="fkb-skeleton fkb-product__image" />
                <div className="fkb-skeleton" style={{ height: 14, margin: "12px" }} />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState
          compact
          title="Products unavailable"
          message="The store is open, but its products could not be loaded right now."
          onRetry={() => setAttempt((value) => value + 1)}
        />
      ) : visible.length === 0 ? (
        <div className="fkb-shop__empty">
          <Package size={20} aria-hidden="true" />
          <span>This store has no products listed yet.</span>
        </div>
      ) : (
        <div className="fkb-rail">
          <div ref={trackRef} role="list" className="fkb-rail__track fkb-shop__track">
            {visible.map((product) => {
              const image = getProductImage(product);
              const onSale =
                typeof product.salePrice === "number" &&
                product.salePrice > 0 &&
                product.salePrice < product.price;
              const stock = STOCK_LABELS[product.stockStatus];

              return (
                <div key={product.id} role="listitem" className="fkb-product">
                  <Link to={getProductRoute(product.id)} className="fkb-product__link">
                    <span className="fkb-product__image">
                      {image ? (
                        <img src={image} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <Package size={28} aria-hidden="true" />
                      )}
                    </span>

                    <span className="fkb-product__body">
                      <span className="fkb-product__name">{product.name}</span>

                      <span className="fkb-product__price">
                        {onSale ? (
                          <>
                            <strong>{formatPrice(product.salePrice as number, product.currency)}</strong>
                            <s>{formatPrice(product.price, product.currency)}</s>
                          </>
                        ) : (
                          <strong>{formatPrice(product.price, product.currency)}</strong>
                        )}
                      </span>

                      {stock && (
                        <span className={`fkb-badge fkb-badge--${stock.tone}`}>{stock.label}</span>
                      )}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && products.length > limit && (
        <Link to={storeRoute} className="fkb-link fkb-shop__more" onClick={trackStore}>
          See all {products.length} products
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
