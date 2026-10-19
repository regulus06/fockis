import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Recently viewed products for this browser.
 *
 * Only identifiers are stored (id + slug + category). Product details are always
 * fetched fresh from the API so prices and stock are never stale.
 */

export interface RecentlyViewedEntry {
  id: string;
  slug: string;
  categorySlug?: string;
  viewedAt: number;
}

interface RecentlyViewedState {
  entries: RecentlyViewedEntry[];
  record: (entry: { id: string; slug: string; categorySlug?: string }) => void;
  clear: () => void;
}

const MAX_ENTRIES = 20;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      entries: [],
      record: ({ id, slug, categorySlug }) => {
        if (!id) return;
        const rest = get().entries.filter((entry) => entry.id && entry.id !== id);
        set({
          entries: [{ id, slug, categorySlug, viewedAt: Date.now() }, ...rest].slice(
            0,
            MAX_ENTRIES,
          ),
        });
      },
      clear: () => set({ entries: [] }),
    }),
    { name: "fockis-shop-recently-viewed" },
  ),
);
