import {
  create,
} from "zustand";

export type FockisProfileTab =
  | "posts"
  | "about"
  | "photos"
  | "videos"
  | "music"
  | "friends";

interface FockisProfileStore {
  activeTab: FockisProfileTab;

  setActiveTab: (
    tab: FockisProfileTab,
  ) => void;

  resetProfile: () => void;
}

export const useFockisProfileStore =
  create<FockisProfileStore>(
    (set) => ({
      activeTab: "posts",

      setActiveTab: (
        tab,
      ) => {
        set({
          activeTab: tab,
        });
      },

      resetProfile: () => {
        set({
          activeTab: "posts",
        });
      },
    }),
  );