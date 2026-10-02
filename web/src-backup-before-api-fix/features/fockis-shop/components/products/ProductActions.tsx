import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, ProductVariant } from '../../types/product.types';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { effectivePrice } from '../../utils/pricing';

export function ProductActions({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();

  const variantGroups = useMemo(() => {
    if (!product.variants) return [];
    const groups = new Map<string, Set<string>>();
    for (const v of product.variants) {
      for (const opt of v.options) {
        if (!groups.has(opt.name)) groups.set(opt.name, new Set());
        groups.get(opt.name)!.add(opt.value);
      }
    }
    return Array.from(groups.entries()).map(([name, values]) => ({ name, values: Array.from(values) }));
  }, [product.variants]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const selectedVariant: ProductVariant | undefined = useMemo(() => {
    if (!product.variants) return undefined;
    return product.variants.find((v) => v.options.every((opt) => selectedOptions[opt.name] === opt.value));
  }, [product.variants, selectedOptions]);

  const outOfStock =
    product.stockStatus === 'out_of_stock' || (product.hasVariants && selectedVariant && selectedVariant.stockQuantity === 0);
  const needsVariantChoice = product.hasVariants && !selectedVariant;

  function handleAddToCart() {
    if (needsVariantChoice) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productEmoji: product.emoji,
      storeId: product.storeId,
      storeSlug: product.storeSlug,
      storeName: product.storeName,
      unitPrice: selectedVariant ? selectedVariant.salePrice ?? selectedVariant.price : effectivePrice(product),
      quantity,
      maxQuantity: selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity,
      variant: selectedVariant
        ? {
            variantId: selectedVariant.id,
            optionsLabel: selectedVariant.options.map((o) => `${o.name}: ${o.value}`).join(' / '),
          }
        : undefined,
    });
    openCart();
  }

  function handleBuyNow() {
    handleAddToCart();
    navigate('/shop/cart');
  }

  return (
    <div className="pdp-actions">
      {variantGroups.map((group) => (
        <div className="pdp-variant-group" key={group.name}>
          <div className="pdp-variant-label mono">{group.name}</div>
          <div className="pdp-variant-options">
            {group.values.map((value) => (
              <button
                key={value}
                type="button"
                className={selectedOptions[group.name] === value ? 'active' : undefined}
                onClick={() => setSelectedOptions((prev) => ({ ...prev, [group.name]: value }))}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="pdp-qty-row">
        <div className="pdp-qty-stepper">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
          <span className="mono">{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">+</button>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={has(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
          onClick={() => toggle(product.id)}
        >
          {has(product.id) ? '♥' : '♡'}
        </button>
      </div>

      {needsVariantChoice && <div className="pdp-variant-hint">Select options above to continue.</div>}

      <button className="add-btn" type="button" onClick={handleAddToCart} disabled={outOfStock || needsVariantChoice}>
        {outOfStock ? 'Out of Stock' : 'Add to Cart'}
      </button>
      <button className="btn btn-navy" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} type="button" onClick={handleBuyNow} disabled={outOfStock || needsVariantChoice}>
        Buy Now
      </button>
    </div>
  );
}
