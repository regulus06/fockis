import { create } from "zustand";

interface SavedPropertiesStore {
  savedIds: string[];

  isSaved: (id: string) => boolean;

  toggleSaved: (id: string) => void;

  save: (id: string) => void;

  remove: (id: string) => void;
}

const STORAGE_KEY =
  "fockis-realestate-saved-properties";

const readSaved = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (ids: string[]) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(ids),
  );
};

export const useSavePropertiesStore =
  create<SavedPropertiesStore>((set, get) => ({
    savedIds: readSaved(),

    isSaved: (id) =>
      get().savedIds.includes(id),

    save: (id) => {
      const ids = get().savedIds;

      if (ids.includes(id)) {
        return;
      }

      const next = [...ids, id];

      persist(next);

      set({
        savedIds: next,
      });
    },

    remove: (id) => {
      const next = get().savedIds.filter(
        (savedId) => savedId !== id,
      );

      persist(next);

      set({
        savedIds: next,
      });
    },

    toggleSaved: (id) => {
      const ids = get().savedIds;

      const next = ids.includes(id)
        ? ids.filter((savedId) => savedId !== id)
        : [...ids, id];

      persist(next);

      set({
        savedIds: next,
      });
    },
  }));