
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { employerApi } from "../services/employerApi";

import type {
  EmployerJobSummary,
  EmployerStats,
} from "../services/employerApi";

/* ============================================================
   USE EMPLOYER JOBS
============================================================ */

interface UseEmployerJobsResult {
  jobs: EmployerJobSummary[];
  stats: EmployerStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEmployerJobs(): UseEmployerJobsResult {
  const [jobs, setJobs] = useState<EmployerJobSummary[]>([]);
  const [stats, setStats] = useState<EmployerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  /* ============================================================
     LOAD EMPLOYER JOBS AND STATISTICS
  ============================================================ */

  const loadEmployerData = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const jobsData = await employerApi.getEmployerJobs();

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!Array.isArray(jobsData)) {
        throw new Error(
          "Invalid employer jobs response from server.",
        );
      }

      const openJobs = jobsData.filter(
        (job) => job.status === "live",
      ).length;

      const totalApplicants = jobsData.reduce(
        (total, job) =>
          total + Number(job.applicantCount ?? 0),
        0,
      );

      const statsData: EmployerStats = {
        openJobs,
        totalApplicants,
        inInterview: 0,
        hireRate: 0,
      };

      setJobs(jobsData);
      setStats(statsData);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load employer data.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /* ============================================================
     INITIAL LOAD AND CLEANUP
  ============================================================ */

  useEffect(() => {
    void loadEmployerData();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadEmployerData]);

  /* ============================================================
     RETURN DATA
  ============================================================ */

  return {
    jobs,
    stats,
    isLoading,
    error,
    refetch: loadEmployerData,
  };
}
