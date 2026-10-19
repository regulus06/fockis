import { create } from "zustand";

/**
 * "Added to Cart!" confirmation shown after a successful Add to Cart.
 * Holds a snapshot of what was just added; the cart itself stays in
 * cartStore (this store never changes cart contents).
 */
export interface AddedToCartItem {
  name: string;
  imageUrl?: string;
  emoji?: string;
  unitPrice: number;
  quantity: number;
}

interface CartToastState {
  item: AddedToCartItem | null;
  /** Increments on every show so repeated adds restart the timer. */
  key: number;
  show: (item: AddedToCartItem) => void;
  hide: () => void;
}

export const useCartToastStore = create<CartToastState>()((set, get) => ({
  item: null,
  key: 0,
  show: (item) => set({ item, key: get().key + 1 }),
  hide: () => set({ item: null }),
}));
