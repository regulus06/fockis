import { useShopStore } from '../store/shopStore';

export function useShop() {
  const deliverToCountryCode = useShopStore((s) => s.deliverToCountryCode);
  const deliverToCountryLabel = useShopStore((s) => s.deliverToCountryLabel);
  const setDeliverTo = useShopStore((s) => s.setDeliverTo);

  return { deliverToCountryCode, deliverToCountryLabel, setDeliverTo };
}
