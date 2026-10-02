import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActiveStore {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  logo?: string;
  owner?: string;
}

interface ActiveStoreState {
  activeStore: ActiveStore | null;
  setActiveStore: (store: ActiveStore | null) => void;
  clearActiveStore: () => void;
}

export const useActiveStore = create<ActiveStoreState>()(
  persist(
    (set) => ({
      activeStore: null,

      setActiveStore: (store) => {
        set({ activeStore: store });
      },

      clearActiveStore: () => {
        set({ activeStore: null });
      },
    }),
    {
      name: "active-seller-store",
    },
  ),
);