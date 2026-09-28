import {
  create,
} from "zustand";

import type {
  Gift,
} from "../services/giftsApi";

/* ============================================================================
RECEIVED GIFT
============================================================================ */

export interface ReceivedGift {
  giftId: string;

  giftName: string;

  emoji: string;

  animation: string;

  sound: string;

  duration: number;

  fullScreenAnimation: boolean;

  senderId: string;

  receiverId: string;

  liveId: string;
}

/* ============================================================================
STORE
============================================================================ */

interface GiftsStore {
  /*
   * Available gifts
   */
  gifts: Gift[];

  /*
   * Gift selected before sending
   */
  selectedGift: Gift | null;

  /*
   * Gift currently being displayed
   */
  activeGift: ReceivedGift | null;

  /*
   * Set available gifts
   */
  setGifts: (
    gifts: Gift[],
  ) => void;

  /*
   * Select gift
   */
  selectGift: (
    gift: Gift | null,
  ) => void;

  /*
   * Display received gift
   */
  showGift: (
    gift: ReceivedGift,
  ) => void;

  /*
   * Clear animation
   */
  clearGift: () => void;
}

/* ============================================================================
STORE
============================================================================ */

export const useGiftsStore =
  create<GiftsStore>((set) => ({
    gifts: [],

    selectedGift: null,

    activeGift: null,

    setGifts: (
      gifts,
    ) =>
      set({
        gifts,
      }),

    selectGift: (
      gift,
    ) =>
      set({
        selectedGift: gift,
      }),

    showGift: (
      gift,
    ) =>
      set({
        activeGift: gift,
      }),

    clearGift: () =>
      set({
        activeGift: null,
      }),
  }));