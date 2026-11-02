import { create } from "zustand";

import { discoveryApi, type SuggestedPerson, type TrendingTag } from "./discoveryApi";

/* Shared by the desktop sidebar and the mobile in-feed cards, so the data is
   fetched once and following someone updates every card at once. */

type Load = "idle" | "loading" | "ready" | "error";

interface DiscoveryState {
  trending: TrendingTag[];
  trendingState: Load;
  trendingAt: number;
  people: SuggestedPerson[];
  peopleState: Load;
  /** The server had no more people to suggest last time. */
  peopleExhausted: boolean;
  /** Ids already suggested this session — never suggested again. */
  shownIds: string[];
  following: Record<string, "pending" | "yes">;
  dismissed: string[];
  loadTrending: (force?: boolean) => Promise<void>;
  loadPeople: (count?: number) => Promise<void>;
  follow: (person: SuggestedPerson) => Promise<void>;
  dismiss: (id: string) => void;
}

const TRENDING_TTL = 5 * 60_000;

export const useDiscovery = create<DiscoveryState>((set, get) => ({
  trending: [],
  trendingState: "idle",
  trendingAt: 0,
  people: [],
  peopleState: "idle",
  peopleExhausted: false,
  shownIds: [],
  following: {},
  dismissed: [],

  async loadTrending(force = false) {
    const s = get();
    if (s.trendingState === "loading") return;
    if (!force && s.trendingState === "ready" && Date.now() - s.trendingAt < TRENDING_TTL) return;
    set({ trendingState: "loading" });
    try {
      set({ trending: await discoveryApi.trending(8), trendingState: "ready", trendingAt: Date.now() });
    } catch {
      set({ trendingState: "error" });
    }
  },

  async loadPeople(count = 6) {
    if (get().peopleState === "loading" || get().peopleExhausted) return;
    set({ peopleState: "loading" });
    try {
      const fresh = await discoveryApi.people(count, [...get().shownIds, ...get().dismissed]);
      set((s) => {
        // Keep everyone already shown (so every card stays filled); add new.
        const added = fresh.filter((p) => !s.people.some((q) => q.id === p.id) && !s.dismissed.includes(p.id));
        return {
          people: [...s.people, ...added],
          shownIds: Array.from(new Set([...s.shownIds, ...fresh.map((p) => p.id)])),
          peopleState: "ready",
          peopleExhausted: added.length === 0,
        };
      });
    } catch {
      set({ peopleState: "error" });
    }
  },

  async follow(person) {
    if (get().following[person.id]) return;
    // Optimistic: the button flips at once; rolled back if the API refuses.
    set((s) => ({ following: { ...s.following, [person.id]: "yes" } }));
    try {
      await discoveryApi.follow(person.id);
    } catch {
      set((s) => {
        const next = { ...s.following };
        delete next[person.id];
        return { following: next };
      });
      throw new Error(`Couldn't follow ${person.name}. Try again.`);
    }
  },

  dismiss(id) {
    set((s) => ({ dismissed: [...s.dismissed, id], people: s.people.filter((p) => p.id !== id) }));
  },
}));
