import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishlistItem = {
  id: string;
  title: string;
  price: number;
  image: string;
};

interface WishlistStore {
  items: WishlistItem[];

  isWishlisted: (id: string) => boolean;

  toggleItem: (item: WishlistItem) => void;

  removeItem: (id: string) => void;

  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      isWishlisted: (id) =>
        get().items.some((item) => item.id === id),

      toggleItem: (item) =>
        set((state) => {
          const exists = state.items.some(
            (wishlistItem) => wishlistItem.id === item.id,
          );

          if (exists) {
            return {
              items: state.items.filter(
                (wishlistItem) => wishlistItem.id !== item.id,
              ),
            };
          }

          return {
            items: [...state.items, item],
          };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: "wishlist-storage",
    },
  ),
);