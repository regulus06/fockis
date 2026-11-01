
import { create } from "zustand";

import type {
  JobFilters,
  JobType,
  WorkArrangement,
  ExperienceLevel,
} from "../types";

/* ============================================================
   STATE
============================================================ */

interface JobFiltersState {
  filters: JobFilters;

  setKeyword: (keyword: string) => void;
  setLocation: (location: string) => void;

  toggleJobType: (type: JobType) => void;
  toggleArrangement: (arrangement: WorkArrangement) => void;
  toggleExperienceLevel: (level: ExperienceLevel) => void;
  toggleIndustry: (industry: string) => void;

  setMinSalary: (value: number | undefined) => void;
  setDatePosted: (value: JobFilters["datePosted"]) => void;
  setSort: (sort: JobFilters["sort"]) => void;

  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;

  reset: () => void;
}

/* ============================================================
   DEFAULT FILTERS
============================================================ */

const createDefaultFilters = (): JobFilters => ({
  keyword: "",
  location: "",
  jobTypes: [],
  arrangements: [],
  experienceLevels: [],
  industries: [],
  minSalary: undefined,
  datePosted: "any",
  benefits: [],
  sort: "recommended",
  page: 1,
  pageSize: 20,
});

/* ============================================================
   HELPERS
============================================================ */

function toggleInArray<T>(
  array: T[],
  value: T,
): T[] {
  return array.includes(value)
    ? array.filter((item) => item !== value)
    : [...array, value];
}

function normalizePage(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function normalizePageSize(value: number): number {
  if (!Number.isFinite(value)) {
    return 20;
  }

  return Math.min(100, Math.max(1, Math.floor(value)));
}

/* ============================================================
   STORE
============================================================ */

export const useJobFilters = create<JobFiltersState>(
  (set) => ({
    filters: createDefaultFilters(),

    /* ========================================================
       KEYWORD
    ======================================================== */

    setKeyword: (keyword) => {
      set((state) => ({
        filters: {
          ...state.filters,
          keyword,
          page: 1,
        },
      }));
    },

    /* ========================================================
       LOCATION
    ======================================================== */

    setLocation: (location) => {
      set((state) => ({
        filters: {
          ...state.filters,
          location,
          page: 1,
        },
      }));
    },

    /* ========================================================
       JOB TYPE
    ======================================================== */

    toggleJobType: (type) => {
      set((state) => ({
        filters: {
          ...state.filters,
          jobTypes: toggleInArray(
            state.filters.jobTypes,
            type,
          ),
          page: 1,
        },
      }));
    },

    /* ========================================================
       WORK ARRANGEMENT
    ======================================================== */

    toggleArrangement: (arrangement) => {
      set((state) => ({
        filters: {
          ...state.filters,
          arrangements: toggleInArray(
            state.filters.arrangements,
            arrangement,
          ),
          page: 1,
        },
      }));
    },

    /* ========================================================
       EXPERIENCE LEVEL
    ======================================================== */

    toggleExperienceLevel: (level) => {
      set((state) => ({
        filters: {
          ...state.filters,
          experienceLevels: toggleInArray(
            state.filters.experienceLevels,
            level,
          ),
          page: 1,
        },
      }));
    },

    /* ========================================================
       INDUSTRY
    ======================================================== */

    toggleIndustry: (industry) => {
      const normalizedIndustry = industry.trim();

      if (!normalizedIndustry) {
        return;
      }

      set((state) => ({
        filters: {
          ...state.filters,
          industries: toggleInArray(
            state.filters.industries,
            normalizedIndustry,
          ),
          page: 1,
        },
      }));
    },

    /* ========================================================
       MINIMUM SALARY
    ======================================================== */

    setMinSalary: (value) => {
      const normalizedValue =
        value === undefined || !Number.isFinite(value)
          ? undefined
          : Math.max(0, value);

      set((state) => ({
        filters: {
          ...state.filters,
          minSalary: normalizedValue,
          page: 1,
        },
      }));
    },

    /* ========================================================
       DATE POSTED
    ======================================================== */

    setDatePosted: (value) => {
      set((state) => ({
        filters: {
          ...state.filters,
          datePosted: value,
          page: 1,
        },
      }));
    },

    /* ========================================================
       SORT
    ======================================================== */

    setSort: (sort) => {
      set((state) => ({
        filters: {
          ...state.filters,
          sort,
          page: 1,
        },
      }));
    },

    /* ========================================================
       PAGE
    ======================================================== */

    setPage: (page) => {
      set((state) => ({
        filters: {
          ...state.filters,
          page: normalizePage(page),
        },
      }));
    },

    /* ========================================================
       PAGE SIZE
    ======================================================== */

    setPageSize: (pageSize) => {
      set((state) => ({
        filters: {
          ...state.filters,
          pageSize: normalizePageSize(pageSize),
          page: 1,
        },
      }));
    },

    /* ========================================================
       RESET
    ======================================================== */

    reset: () => {
      set({
        filters: createDefaultFilters(),
      });
    },
  }),
);
