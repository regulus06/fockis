import { create } from "zustand";

import type {
  ContentAccess,
  ContentPurchase,
} from "../types/contentMonetization.types";

interface ContentMonetizationState {
  access: Record<string, ContentAccess>;

  purchases: ContentPurchase[];

  unlockContent: (
    contentId: string,
    purchaseType: "watch" | "listen" | "download",
  ) => void;

  isUnlocked: (
    contentId: string,
    purchaseType: "watch" | "listen" | "download",
  ) => boolean;

  addPurchase: (
    purchase: ContentPurchase,
  ) => void;

  resetContent: (
    contentId: string,
  ) => void;

  clearAll: () => void;
}

const createDefaultAccess = (
  contentId: string,
): ContentAccess => ({
  contentId,

  watchUnlocked: false,
  listenUnlocked: false,
  downloadUnlocked: false,

  purchasedWatch: false,
  purchasedListen: false,
  purchasedDownload: false,
});

export const useContentMonetizationStore =
  create<ContentMonetizationState>((set, get) => ({
    access: {},

    purchases: [],

    unlockContent: (
      contentId,
      purchaseType,
    ) => {
      set((state) => {
        const current =
          state.access[contentId] ??
          createDefaultAccess(contentId);

        const updated: ContentAccess = {
          ...current,
        };

        if (purchaseType === "watch") {
          updated.watchUnlocked = true;
          updated.purchasedWatch = true;
        }

        if (purchaseType === "listen") {
          updated.listenUnlocked = true;
          updated.purchasedListen = true;
        }

        if (purchaseType === "download") {
          updated.downloadUnlocked = true;
          updated.purchasedDownload = true;
        }

        return {
          access: {
            ...state.access,
            [contentId]: updated,
          },
        };
      });
    },

    isUnlocked: (
      contentId,
      purchaseType,
    ) => {
      const current =
        get().access[contentId];

      if (!current) {
        return false;
      }

      if (purchaseType === "watch") {
        return current.watchUnlocked;
      }

      if (purchaseType === "listen") {
        return current.listenUnlocked;
      }

      return current.downloadUnlocked;
    },

    addPurchase: (purchase) => {
      set((state) => ({
        purchases: [
          purchase,
          ...state.purchases,
        ],
      }));
    },

    resetContent: (contentId) => {
      set((state) => {
        const next = {
          ...state.access,
        };

        delete next[contentId];

        return {
          access: next,
          purchases: state.purchases.filter(
            (purchase) =>
              purchase.contentId !== contentId,
          ),
        };
      });
    },

    clearAll: () => {
      set({
        access: {},
        purchases: [],
      });
    },
  }));