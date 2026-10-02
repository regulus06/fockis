import { create } from "zustand";

import type { Property } from "../types/Property";
import {
  propertyApi,
  type PropertySearchParams,
} from "../services/propertyApi";

interface PropertyStore {
  properties: Property[];
  selectedProperty: Property | null;

  loading: boolean;
  error: string | null;

  searchParams: PropertySearchParams;

  loadProperties: (
    params?: PropertySearchParams,
  ) => Promise<void>;

  selectProperty: (
    property: Property | null,
  ) => void;

  setSearchParams: (
    params: Partial<PropertySearchParams>,
  ) => void;

  clearSearch: () => void;
}

export const usePropertyStore =
  create<PropertyStore>((set, get) => ({
    properties: [],
    selectedProperty: null,

    loading: false,
    error: null,

    searchParams: {},

    loadProperties: async (params) => {
      const merged = {
        ...get().searchParams,
        ...(params || {}),
      };

      set({
        loading: true,
        error: null,
        searchParams: merged,
      });

      try {
        const properties =
          await propertyApi.getProperties(merged);

        set({
          properties,
          loading: false,
        });
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load properties",
        });
      }
    },

    selectProperty: (property) => {
      set({
        selectedProperty: property,
      });
    },

    setSearchParams: (params) => {
      set({
        searchParams: {
          ...get().searchParams,
          ...params,
        },
      });
    },

    clearSearch: () => {
      set({
        searchParams: {},
      });
    },
  }));