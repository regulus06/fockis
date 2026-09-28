import type { ProductShippingInfo } from '../types/product.types';

export function shippingBadges(shipping: ProductShippingInfo): string[] {
  const badges: string[] = [];
  if (shipping.localDelivery) badges.push('🚚 Local delivery');
  if (shipping.nationalDelivery) badges.push('🚚 National delivery');
  if (shipping.internationalShipping) badges.push('🌎 Ships internationally');
  if (shipping.pickupAvailable) badges.push('📍 Pickup available');
  return badges;
}

export function estimatedDeliveryLabel(shipping: ProductShippingInfo): string | null {
  if (!shipping.estimatedDeliveryDays) return null;
  const { min, max } = shipping.estimatedDeliveryDays;
  return min === max ? `${min} day${min === 1 ? '' : 's'}` : `${min}–${max} days`;
}
