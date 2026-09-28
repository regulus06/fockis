import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { careersApi } from "../services/careersApi";

import type {
  Job,
  JobFilters,
  JobSearchResult,
} from "../types";

import { useJobFilters } from "./useJobFilters";

/* ============================================================
   TYPES
============================================================ */

interface UseJobsResult {
  jobs: Job[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

type Mode =
  | "jobs"
  | "internships"
  | "coops";

/* ============================================================
   HOOK
============================================================ */

export function useJobs(
  mode: Mode = "jobs",
): UseJobsResult {
  const filters =
    useJobFilters(
      (state) => state.filters,
    );

  const [result, setResult] =
    useState<JobSearchResult | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  /* ==========================================================
     FETCH JOBS
  ========================================================== */

  const fetchJobs =
    useCallback(
      async (
        currentFilters: JobFilters,
      ) => {
        setIsLoading(true);
        setError(null);

        try {
          let data: JobSearchResult;

          /*
           * ----------------------------------------------------
           * INTERNSHIPS
           * ----------------------------------------------------
           */

          if (
            mode === "internships"
          ) {
            data =
              await careersApi.searchInternships(
                currentFilters,
              );
          }

          /*
           * ----------------------------------------------------
           * CO-OPS
           * ----------------------------------------------------
           */

          else if (
            mode === "coops"
          ) {
            data =
              await careersApi.searchCoops(
                currentFilters,
              );
          }

          /*
           * ----------------------------------------------------
           * NORMAL JOBS
           * ----------------------------------------------------
           */

          else {
            data =
              await careersApi.searchJobs(
                currentFilters,
              );
          }

          setResult(data);
        } catch (
          err: unknown
        ) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load jobs",
          );
        } finally {
          setIsLoading(false);
        }
      },
      [mode],
    );

  /* ==========================================================
     LOAD WHEN FILTERS CHANGE
  ========================================================== */

  useEffect(() => {
    void fetchJobs(filters);
  }, [
    filters,
    fetchJobs,
  ]);

  /* ==========================================================
     REFETCH
  ========================================================== */

  const refetch =
    useCallback(() => {
      void fetchJobs(filters);
    }, [
      fetchJobs,
      filters,
    ]);

  /* ==========================================================
     RESULT
  ========================================================== */

  return {
    jobs:
      result?.items ?? [],

    total:
      result?.total ?? 0,

    isLoading,

    error,

    refetch,
  };
}