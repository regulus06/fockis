import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ShopState {
  deliverToCountryCode: string;
  deliverToCountryLabel: string;
  setDeliverTo: (countryCode: string, label: string) => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      deliverToCountryCode: 'US',
      deliverToCountryLabel: '🇺🇸 United States',
      setDeliverTo: (countryCode, label) => set({ deliverToCountryCode: countryCode, deliverToCountryLabel: label }),
    }),
    { name: 'fockis-shop-prefs' }
  )
);
