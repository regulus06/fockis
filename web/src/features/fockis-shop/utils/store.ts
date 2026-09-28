import type { Store } from '../types/store.types';

export function storeShippingBadges(store: Store): string[] {
  const badges: string[] = [];
  if (store.shipping.localDelivery) badges.push('🚚 Local Delivery');
  if (store.shipping.pickupAvailable) badges.push('📍 Pickup');
  if (store.shipping.internationalShipping) badges.push('🌎 International');
  return badges;
}

export function storeLocationLabel(store: Store): string {
  return `${store.location.countryFlag} ${store.location.city}, ${store.location.country}`;
}
