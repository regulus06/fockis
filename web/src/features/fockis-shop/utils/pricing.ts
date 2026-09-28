import type { Product } from '../types/product.types';
import type { CartLineItem, CartSellerGroup, CartTotals } from '../types/cart.types';

export function effectivePrice(product: Pick<Product, 'price' | 'salePrice'>): number {
  return product.salePrice != null && product.salePrice < product.price ? product.salePrice : product.price;
}

export function discountPercent(product: Pick<Product, 'price' | 'salePrice'>): number {
  if (product.salePrice == null || product.salePrice >= product.price) return 0;
  return Math.round(((product.price - product.salePrice) / product.price) * 100);
}

export function lineItemTotal(item: CartLineItem): number {
  return item.unitPrice * item.quantity;
}

export function groupSubtotal(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + lineItemTotal(item), 0);
}

/**
 * Groups cart items by seller/store. This is the single source of truth
 * for "cart items grouped by seller" used across CartPage and Checkout.
 */
export function groupItemsBySeller(
  items: CartLineItem[],
  shippingByStore: Record<string, { freeDeliveryThreshold?: number | null; flatRate: number }> = {}
): CartSellerGroup[] {
  const map = new Map<string, CartSellerGroup>();
  for (const item of items) {
    if (!map.has(item.storeId)) {
      map.set(item.storeId, {
        storeId: item.storeId,
        storeSlug: item.storeSlug,
        storeName: item.storeName,
        items: [],
        subtotal: 0,
        freeDeliveryThreshold: shippingByStore[item.storeId]?.freeDeliveryThreshold ?? null,
        estimatedShipping: shippingByStore[item.storeId]?.flatRate ?? 0,
      });
    }
    map.get(item.storeId)!.items.push(item);
  }
  for (const group of map.values()) {
    group.subtotal = groupSubtotal(group.items);
    if (group.freeDeliveryThreshold != null && group.subtotal >= group.freeDeliveryThreshold) {
      group.estimatedShipping = 0;
    }
  }
  return Array.from(map.values());
}

export function computeCartTotals(groups: CartSellerGroup[], taxRate = 0): CartTotals {
  const subtotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const estimatedShipping = groups.reduce((sum, g) => sum + g.estimatedShipping, 0);
  const itemCount = groups.reduce((sum, g) => sum + g.items.reduce((c, i) => c + i.quantity, 0), 0);
  const estimatedTax = Math.round(subtotal * taxRate * 100) / 100;
  return {
    itemCount,
    subtotal,
    estimatedShipping,
    estimatedTax,
    total: subtotal + estimatedShipping + estimatedTax,
  };
}
