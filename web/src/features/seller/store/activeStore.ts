
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../../../api/api";

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
  loadActiveStore: () => Promise<ActiveStore | null>;
}

function normalizeStores(response: unknown): ActiveStore[] {
  if (Array.isArray(response)) {
    return response.filter(
      (store): store is ActiveStore =>
        !!store &&
        typeof store === "object" &&
        typeof (store as ActiveStore)._id === "string",
    );
  }

  if (response && typeof response === "object") {
    const result = response as {
      _id?: string;
      items?: unknown;
      stores?: unknown;
      data?: unknown;
    };

    if (typeof result._id === "string") {
      return [result as ActiveStore];
    }

    return normalizeStores(
      result.items ?? result.stores ?? result.data ?? [],
    );
  }

  return [];
}

export const useActiveStore = create<ActiveStoreState>()(
  persist(
    (set, get) => ({
      activeStore: null,

      setActiveStore: (store) => {
        set({ activeStore: store });

        if (store?._id) {
          localStorage.setItem("activeStoreId", store._id);
        } else {
          localStorage.removeItem("activeStoreId");
        }
      },

      clearActiveStore: () => {
        set({ activeStore: null });
        localStorage.removeItem("activeStoreId");
      },

      loadActiveStore: async () => {
        try {
          const response = await api.get("/stores/me");
          const stores = normalizeStores(response.data);

          if (stores.length === 0) {
            return get().activeStore;
          }

          const savedId = localStorage.getItem("activeStoreId");
          const currentId = get().activeStore?._id;

          const selectedStore =
            stores.find((store) => store._id === savedId) ??
            stores.find((store) => store._id === currentId) ??
            stores[0];

          set({ activeStore: selectedStore });
          localStorage.setItem("activeStoreId", selectedStore._id);

          return selectedStore;
        } catch (error) {
          console.error("Failed to load active seller store:", error);
          return get().activeStore;
        }
      },
    }),
    {
      name: "active-seller-store",
    },
  ),
);
