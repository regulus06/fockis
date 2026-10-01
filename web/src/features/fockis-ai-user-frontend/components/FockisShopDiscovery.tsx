import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "../../styles/fockis-shop-ai.scss";

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image?: string;
  brand?: string;
  category?: string;
  storeName?: string;
  storeSlug?: string;
  rating?: number;
  reviews?: number;
};

type Store = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  city?: string;
  state?: string;
  rating?: number;
  verified?: boolean;
};

type Props = {
  query: string;
  enabled?: boolean;
  maxProducts?: number;
  maxStores?: number;
};

const API = String(
  import.meta.env.VITE_API_URL || FOCKIS_API_URL,
).replace(/\/+$/, "");

const SHOP_WORDS = [
  "product",
  "products",
  "buy",
  "purchase",
  "price",
  "cost",
  "shop",
  "shopping",
  "store",
  "stores",
  "seller",
  "sellers",
  "marketplace",
  "available",
  "in stock",
  "shoes",
  "clothes",
  "phone",
  "laptop",
  "computer",
  "dress",
  "shirt",
  "bag",
  "furniture",
  "electronics",
];

function isShopQuery(value: string) {
  const q = value.toLowerCase();
  return SHOP_WORDS.some((word) => q.includes(word));
}

function readArray(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of keys) {
      if (Array.isArray(record[key])) {
        return record[key] as unknown[];
      }
    }

    const data = record.data;
    if (data && typeof data === "object") {
      const nested = data as Record<string, unknown>;
      for (const key of keys) {
        if (Array.isArray(nested[key])) {
          return nested[key] as unknown[];
        }
      }
    }
  }

  return [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== "object") return null;

  const p = value as Record<string, unknown>;
  const id = asString(p.id || p._id);

  if (!id) return null;

  const images = Array.isArray(p.images) ? p.images : [];
  const store =
    p.store && typeof p.store === "object"
      ? (p.store as Record<string, unknown>)
      : undefined;

  return {
    id,
    name: asString(p.name) || "Fockis product",
    description: asString(p.description),
    price: asNumber(p.price),
    stock: asNumber(p.stock, 0),
    image:
      asString(p.image) ||
      asString(images[0]) ||
      asString(
        images[0] &&
          typeof images[0] === "object"
          ? (images[0] as Record<string, unknown>).url
          : "",
      ),
    brand: asString(p.brand),
    category: asString(p.category),
    storeName:
      asString(p.storeName) ||
      asString(store?.name) ||
      asString(
        p.seller &&
          typeof p.seller === "object"
          ? (p.seller as Record<string, unknown>).name
          : "",
      ),
    storeSlug:
      asString(p.storeSlug) ||
      asString(store?.slug),
    rating: asNumber(p.rating, 0),
    reviews: asNumber(p.reviews, 0),
  };
}

function normalizeStore(value: unknown): Store | null {
  if (!value || typeof value !== "object") return null;

  const s = value as Record<string, unknown>;
  const id = asString(s.id || s._id);
  const slug = asString(s.slug);

  if (!id && !slug) return null;

  return {
    id: id || slug,
    name: asString(s.name) || "Fockis Store",
    slug,
    description: asString(s.description),
    logo: asString(s.logo) || asString(s.logoUrl),
    city: asString(s.city),
    state: asString(s.state),
    rating: asNumber(s.rating, 0),
    verified: Boolean(s.verified),
  };
}

function parseMaxPrice(query: string): number | null {
  const patterns = [
    /(?:under|below|less than|max(?:imum)?|up to)\s*\$?\s*(\d+(?:\.\d+)?)/i,
    /\$\s*(\d+(?:\.\d+)?)\s*(?:or less|and under)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match?.[1]) {
      const price = Number(match[1]);
      if (Number.isFinite(price)) return price;
    }
  }

  return null;
}

export default function FockisShopDiscovery({
  query,
  enabled = true,
  maxProducts = 6,
  maxStores = 4,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const active = enabled && Boolean(query.trim()) && isShopQuery(query);

  useEffect(() => {
    if (!active) {
      setProducts([]);
      setStores([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();

    async function searchShop() {
      setLoading(true);
      setFailed(false);

      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: String(Math.max(maxProducts, 12)),
          search: query.trim(),
          sort: "relevance",
        });

        const productResponse = await fetch(
          `${API}/marketplace/products?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
          },
        );

        if (!productResponse.ok) {
          throw new Error(`Product search failed: ${productResponse.status}`);
        }

        const productPayload = await productResponse.json();

        const maxPrice = parseMaxPrice(query);

        const nextProducts = readArray(productPayload, [
          "items",
          "products",
          "results",
        ])
          .map(normalizeProduct)
          .filter((item): item is Product => Boolean(item))
          .filter((item) =>
            maxPrice === null ? true : item.price <= maxPrice,
          )
          .slice(0, maxProducts);

        setProducts(nextProducts);

        // Store search uses the existing public Fockis Shop /stores API.
        const storeParams = new URLSearchParams({
          page: "1",
          pageSize: String(Math.max(maxStores, 12)),
          query: query.trim(),
          sort: "relevance",
        });

        const storeResponse = await fetch(
          `${API}/stores?${storeParams.toString()}`,
          {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
          },
        );

        if (storeResponse.ok) {
          const storePayload = await storeResponse.json();

          const nextStores = readArray(storePayload, [
            "items",
            "stores",
            "results",
          ])
            .map(normalizeStore)
            .filter((item): item is Store => Boolean(item))
            .filter((item) => Boolean(item.slug))
            .slice(0, maxStores);

          setStores(nextStores);
        } else {
          setStores([]);
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;

        console.error("[FockisShopDiscovery]", error);
        setProducts([]);
        setStores([]);
        setFailed(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void searchShop();

    return () => controller.abort();
  }, [active, query, maxProducts, maxStores]);

  const hasResults = products.length > 0 || stores.length > 0;

  const shopSearchUrl = useMemo(
    () => `/shop?search=${encodeURIComponent(query.trim())}`,
    [query],
  );

  if (!active || (!loading && !hasResults && failed)) {
    return null;
  }

  if (!loading && !hasResults) {
    return null;
  }

  return (
    <section className="fockis-shop-ai">
      <div className="fockis-shop-ai__header">
        <div>
          <span className="fockis-shop-ai__eyebrow">FOCKIS SHOP</span>
          <h3>
            {loading
              ? "Searching Fockis Shop…"
              : "Shop results from Fockis"}
          </h3>
        </div>

        {!loading && (
          <Link className="fockis-shop-ai__all" to={shopSearchUrl}>
            View all
          </Link>
        )}
      </div>

      {loading ? (
        <div className="fockis-shop-ai__loading">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <>
          {products.length > 0 && (
            <div className="fockis-shop-ai__section">
              <div className="fockis-shop-ai__section-title">
                Products
              </div>

              <div className="fockis-shop-ai__products">
                {products.map((product) => (
                  <article
                    className="fockis-shop-ai__product"
                    key={product.id}
                  >
                    <Link
                      className="fockis-shop-ai__image"
                      to={`/shop/products/${encodeURIComponent(product.id)}`}
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <span>🛍️</span>
                      )}
                    </Link>

                    <div className="fockis-shop-ai__product-body">
                      <Link
                        className="fockis-shop-ai__product-name"
                        to={`/shop/products/${encodeURIComponent(product.id)}`}
                      >
                        {product.name}
                      </Link>

                      {product.brand && (
                        <span className="fockis-shop-ai__muted">
                          {product.brand}
                        </span>
                      )}

                      <div className="fockis-shop-ai__price">
                        ${product.price.toFixed(2)}
                      </div>

                      <div className="fockis-shop-ai__meta">
                        {product.stock > 0 ? (
                          <span className="fockis-shop-ai__stock">
                            In stock
                          </span>
                        ) : (
                          <span className="fockis-shop-ai__out">
                            Out of stock
                          </span>
                        )}

                        {product.storeSlug && (
                          <Link
                            to={`/shop/store/${encodeURIComponent(
                              product.storeSlug,
                            )}`}
                          >
                            {product.storeName || "View store"}
                          </Link>
                        )}
                      </div>

                      <Link
                        className="fockis-shop-ai__button"
                        to={`/shop/products/${encodeURIComponent(product.id)}`}
                      >
                        View product
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {stores.length > 0 && (
            <div className="fockis-shop-ai__section">
              <div className="fockis-shop-ai__section-title">
                Stores
              </div>

              <div className="fockis-shop-ai__stores">
                {stores.map((store) => (
                  <Link
                    className="fockis-shop-ai__store"
                    key={store.id}
                    to={`/shop/store/${encodeURIComponent(store.slug)}`}
                  >
                    <span className="fockis-shop-ai__store-logo">
                      {store.logo ? (
                        <img src={store.logo} alt="" loading="lazy" />
                      ) : (
                        "🏪"
                      )}
                    </span>

                    <span>
                      <strong>{store.name}</strong>
                      <small>
                        {store.city || store.state
                          ? [store.city, store.state]
                              .filter(Boolean)
                              .join(", ")
                          : store.verified
                            ? "Verified Fockis Store"
                            : "Fockis Shop Store"}
                      </small>
                    </span>

                    <span className="fockis-shop-ai__arrow">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
