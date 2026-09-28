import { create } from "zustand";

import type {
  FockisProfile,
  ProfileTab,
} from "../types/fockisprofiletypes";

interface FockisProfileStore {
  profile: FockisProfile | null;

  activeTab: ProfileTab;

  loading: boolean;

  error: string | null;

  setProfile: (
    profile: FockisProfile | null,
  ) => void;

  setActiveTab: (
    tab: ProfileTab,
  ) => void;

  setLoading: (
    loading: boolean,
  ) => void;

  setError: (
    error: string | null,
  ) => void;

  clearProfile: () => void;
}

export const useFockisProfileStore =
  create<FockisProfileStore>((set) => ({
    profile: null,

    activeTab: "posts",

    loading: false,

    error: null,

    setProfile: (profile) =>
      set({
        profile,
      }),

    setActiveTab: (activeTab) =>
      set({
        activeTab,
      }),

    setLoading: (loading) =>
      set({
        loading,
      }),

    setError: (error) =>
      set({
        error,
      }),

    clearProfile: () =>
      set({
        profile: null,
        activeTab: "posts",
        loading: false,
        error: null,
      }),
  }));