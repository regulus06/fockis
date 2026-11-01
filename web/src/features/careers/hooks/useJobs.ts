
import {
  useCallback,
  useEffect,
  useRef,
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

type Mode = "jobs" | "internships" | "coops";

/* ============================================================
   HOOK
============================================================ */

export function useJobs(
  mode: Mode = "jobs",
): UseJobsResult {
  const filters = useJobFilters(
    (state) => state.filters,
  );

  const [result, setResult] = useState<JobSearchResult | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  /* ==========================================================
     FETCH JOBS
  ========================================================== */

  const fetchJobs = useCallback(
    async (currentFilters: JobFilters) => {
      const requestId = ++requestIdRef.current;

      setIsLoading(true);
      setError(null);

      try {
        let data: JobSearchResult;

        if (mode === "internships") {
          data = await careersApi.searchInternships(
            currentFilters,
          );
        } else if (mode === "coops") {
          data = await careersApi.searchCoops(
            currentFilters,
          );
        } else {
          data = await careersApi.searchJobs(
            currentFilters,
          );
        }

        // Ignore responses from older requests.
        if (requestId !== requestIdRef.current) {
          return;
        }

        setResult(data);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load jobs.",
        );

        setResult(null);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [mode],
  );

  /* ==========================================================
     LOAD WHEN FILTERS CHANGE
  ========================================================== */

  useEffect(() => {
    void fetchJobs(filters);

    return () => {
      // Invalidate any request still running after cleanup.
      requestIdRef.current += 1;
    };
  }, [filters, fetchJobs]);

  /* ==========================================================
     REFETCH
  ========================================================== */

  const refetch = useCallback(() => {
    void fetchJobs(filters);
  }, [fetchJobs, filters]);

  /* ==========================================================
     RESULT
  ========================================================== */

  return {
    jobs: result?.items ?? [],
    total: result?.total ?? 0,
    isLoading,
    error,
    refetch,
  };
}
