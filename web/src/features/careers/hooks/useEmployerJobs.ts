import {
  useEffect,
  useState,
} from "react";

import { employerApi } from "../services/employerApi";

import type {
  EmployerJobSummary,
  EmployerStats,
} from "../types";

interface UseEmployerJobsResult {
  jobs: EmployerJobSummary[];
  stats: EmployerStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEmployerJobs(): UseEmployerJobsResult {
  const [jobs, setJobs] =
    useState<EmployerJobSummary[]>([]);

  const [stats, setStats] =
    useState<EmployerStats | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadEmployerData =
    async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const [
          jobsData,
          statsData,
        ] = await Promise.all([
          employerApi.getEmployerJobs(),
          employerApi.getEmployerStats(),
        ]);

        setJobs(
          Array.isArray(jobsData)
            ? jobsData
            : [],
        );

        setStats(
          statsData ?? null,
        );
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load employer data",
        );
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!mounted) {
        return;
      }

      await loadEmployerData();
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    jobs,
    stats,
    isLoading,
    error,
    refetch: loadEmployerData,
  };
}