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

  setKeyword: (
    keyword: string,
  ) => void;

  setLocation: (
    location: string,
  ) => void;

  toggleJobType: (
    type: JobType,
  ) => void;

  toggleArrangement: (
    arrangement: WorkArrangement,
  ) => void;

  toggleExperienceLevel: (
    level: ExperienceLevel,
  ) => void;

  toggleIndustry: (
    industry: string,
  ) => void;

  setMinSalary: (
    value: number | undefined,
  ) => void;

  setDatePosted: (
    value: JobFilters["datePosted"],
  ) => void;

  setSort: (
    sort: JobFilters["sort"],
  ) => void;

  setPage: (
    page: number,
  ) => void;

  setPageSize: (
    pageSize: number,
  ) => void;

  reset: () => void;
}

/* ============================================================
   DEFAULT FILTERS
============================================================ */

const defaultFilters: JobFilters = {
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
};

/* ============================================================
   HELPERS
============================================================ */

function toggleInArray<T>(
  array: T[],
  value: T,
): T[] {
  if (array.includes(value)) {
    return array.filter(
      (item) => item !== value,
    );
  }

  return [
    ...array,
    value,
  ];
}

/* ============================================================
   STORE
============================================================ */

export const useJobFilters =
  create<JobFiltersState>((set) => ({
    filters: {
      ...defaultFilters,
    },

    /* ========================================================
       KEYWORD
    ======================================================== */

    setKeyword: (
      keyword: string,
    ) => {
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

    setLocation: (
      location: string,
    ) => {
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

    toggleJobType: (
      type: JobType,
    ) => {
      set((state) => ({
        filters: {
          ...state.filters,

          jobTypes:
            toggleInArray(
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

    toggleArrangement: (
      arrangement: WorkArrangement,
    ) => {
      set((state) => ({
        filters: {
          ...state.filters,

          arrangements:
            toggleInArray(
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

    toggleExperienceLevel: (
      level: ExperienceLevel,
    ) => {
      set((state) => ({
        filters: {
          ...state.filters,

          experienceLevels:
            toggleInArray(
              state.filters
                .experienceLevels,
              level,
            ),

          page: 1,
        },
      }));
    },

    /* ========================================================
       INDUSTRY
    ======================================================== */

    toggleIndustry: (
      industry: string,
    ) => {
      set((state) => ({
        filters: {
          ...state.filters,

          industries:
            toggleInArray(
              state.filters.industries,
              industry,
            ),

          page: 1,
        },
      }));
    },

    /* ========================================================
       MINIMUM SALARY
    ======================================================== */

    setMinSalary: (
      value: number | undefined,
    ) => {
      set((state) => ({
        filters: {
          ...state.filters,

          minSalary: value,

          page: 1,
        },
      }));
    },

    /* ========================================================
       DATE POSTED
    ======================================================== */

    setDatePosted: (
      value: JobFilters["datePosted"],
    ) => {
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

    setSort: (
      sort: JobFilters["sort"],
    ) => {
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

    setPage: (
      page: number,
    ) => {
      set((state) => ({
        filters: {
          ...state.filters,

          page:
            Math.max(
              1,
              page,
            ),
        },
      }));
    },

    /* ========================================================
       PAGE SIZE
    ======================================================== */

    setPageSize: (
      pageSize: number,
    ) => {
      set((state) => ({
        filters: {
          ...state.filters,

          pageSize:
            Math.max(
              1,
              pageSize,
            ),

          page: 1,
        },
      }));
    },

    /* ========================================================
       RESET
    ======================================================== */

    reset: () => {
      set({
        filters: {
          ...defaultFilters,

          jobTypes: [],

          arrangements: [],

          experienceLevels: [],

          industries: [],

          benefits: [],
        },
      });
    },
  }));