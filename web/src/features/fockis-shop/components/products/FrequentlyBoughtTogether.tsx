import { useState } from "react";
import type { Product } from "../../types/product.types";
import { useCart } from "../../hooks/useCart";
import { effectivePrice } from "../../utils/pricing";
import { formatPrice } from "../../utils/currency";
import { getPrimaryProductImage } from "../../utils/productMedia";

interface FrequentlyBoughtTogetherProps {
  mainProduct: Product;
  addOnProducts: Product[];
}

function getProductImage(product: Product): string | undefined {
  // Shared helper: skips video files stored alongside product images.
  return getPrimaryProductImage(product)?.src;
}

function BundleItem({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getProductImage(product);

  return (
    <div className="fbt-item">
      <div className="bundle-thumb fbt-item__image">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span role="img" aria-label={`No image for ${product.name}`}>
            {product.emoji || "📦"}
          </span>
        )}
      </div>

      <div className="fbt-item__name" title={product.name}>
        {product.name}
      </div>

      <div className="mono fbt-item__price">
        {formatPrice(effectivePrice(product))}
      </div>
    </div>
  );
}

export function FrequentlyBoughtTogether({
  mainProduct,
  addOnProducts,
}: FrequentlyBoughtTogetherProps) {
  const { addItem } = useCart();

  const allProducts = [
    mainProduct,
    ...addOnProducts.filter(
      (product) => product.id !== mainProduct.id,
    ),
  ];

  const total = allProducts.reduce(
    (sum, product) => sum + effectivePrice(product),
    0,
  );

  function handleAddAll() {
    for (const product of allProducts) {
      addItem({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        productEmoji: product.emoji,
        productImageUrl: getProductImage(product),
        storeId: product.storeId,
        storeSlug: product.storeSlug,
        storeName: product.storeName,
        unitPrice: effectivePrice(product),
        maxQuantity: product.stockQuantity,
      });
    }
  }

  return (
    <div className="bundle-card fbt-card">
      <div className="bundle-items fbt-items">
        {allProducts.map((product, index) => (
          <div className="fbt-entry" key={product.id}>
            <BundleItem product={product} />

            {index < allProducts.length - 1 && (
              <span className="bundle-plus" aria-hidden="true">
                +
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="bundle-summary">
        <div className="bundle-total">
          {formatPrice(total)}{" "}
          <span>
            total for all {allProducts.length} items
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
  );
}