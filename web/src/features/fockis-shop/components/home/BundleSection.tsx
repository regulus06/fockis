import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../../types/product.types";
import { useCart } from "../../hooks/useCart";
import { useProducts } from "../../hooks/useProducts";
import { effectivePrice } from "../../utils/pricing";
import { formatPrice } from "../../utils/currency";
import { resolveProductImageUrl } from "../../utils/productImage";
import { ShopLoading } from "../common/ShopLoading";
import { ShopError } from "../common/ShopError";

export function BundleSection() {
  const { addItem } = useCart();

  const { data, loading, error } = useProducts({
    sort: "bestselling",
    page: 1,
    pageSize: 4,
  });

  const items = useMemo(
    () =>
      (data?.items ?? [])
        .filter((product) => {
          const price = Number(effectivePrice(product));

          return (
            Boolean(product.id) &&
            Boolean(product.slug) &&
            Boolean(product.name) &&
            Number.isFinite(price) &&
            price >= 0
          );
        })
        .slice(0, 4),
    [data],
  );

  const total = useMemo(
    () =>
      items.reduce(
        (sum, product) => sum + effectivePrice(product),
        0,
      ),
    [items],
  );

  function handleAddAll() {
    for (const product of items) {
      addItem({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productEmoji: product.emoji,
        productImageUrl: getBundleProductImage(product),
        storeId: product.storeId,
        storeSlug: product.storeSlug,
        storeName: product.storeName,
        unitPrice: effectivePrice(product),
        maxQuantity: product.stockQuantity,
      });
    }
  }

  return (
    <section className="shaded">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="sec-label">
              <span className="num">10</span>
              BUNDLE &amp; SAVE
            </div>

            <h2 style={{ fontSize: 26 }}>
              Build a marketplace bundle
            </h2>

            <p>
              Add several popular products to your cart together.
            </p>
          </div>
        </div>

        {loading && <ShopLoading rows={1} />}

        {!loading && error && <ShopError message={error} />}

        {!loading && !error && items.length === 0 && (
          <div className="empty-state">
            No products are available for a bundle right now.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="bundle-card">
            <div className="bundle-items">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <BundleProductThumbnail product={item} />

                    <Link
                      to={`/shop/product/${item.slug}`}
                      style={{
                        display: "block",
                        fontSize: 12,
                        marginTop: 6,
                        maxWidth: 90,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.name}
                    </Link>

                    <div
                      className="mono"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 2,
                      }}
                    >
                      {formatPrice(effectivePrice(item))}
                    </div>
                  </div>

                  {index < items.length - 1 && (
                    <span className="bundle-plus">+</span>
                  )}
                </div>
              ))}
            </div>

            <div className="bundle-summary">
              <div className="bundle-total">
                {formatPrice(total)}{" "}
                <span>
                  total for all {items.length} items
                </span>
              </div>

              <button
                type="button"
                className="btn btn-navy"
                onClick={handleAddAll}
              >
                Add all to cart
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function getBundleProductImage(product: Product): string | undefined {
  const legacy = product as Product & {
    imageUrl?: unknown;
    thumbnail?: unknown;
  };

  const images = Array.isArray(product.images)
    ? [...product.images].sort(
        (a, b) =>
          Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) ||
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      )
    : [];

  const candidates: unknown[] = [
    ...images.map((image) => image.url),
    legacy.imageUrl,
    legacy.thumbnail,
    product.image,
  ];

  for (const candidate of candidates) {
    const url = resolveProductImageUrl(candidate);

    if (url) return url;
  }

  return undefined;
}

function BundleProductThumbnail({
  product,
}: {
  product: Product;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getBundleProductImage(product);

  return (
    <div
      className="bundle-thumb"
      style={{
        width: 74,
        height: 74,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <span role="img" aria-label={`No image for ${product.name}`}>
          {product.emoji || "📦"}
        </span>
      )}
    </div>
  );
}