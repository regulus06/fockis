import {
  useEffect,
  useState,
} from "react";

import { careersApi } from "../services/careersApi";

import type {
  Job,
} from "../types";

export function useJobDetails(
  jobId: string | undefined,
) {
  const [job, setJob] =
    useState<Job | null>(null);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    /*
     * ============================================================
     * MISSING JOB ID
     * ============================================================
     */

    if (!jobId) {
      setJob(null);
      setIsLoading(false);
      setError("Job ID is missing");

      return;
    }

    let cancelled = false;

    /*
     * ============================================================
     * LOAD JOB
     * ============================================================
     */

    const loadJob = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data =
          await careersApi.getJobById(
            jobId,
          );

        if (cancelled) {
          return;
        }

        setJob(data);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        setJob(null);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load job",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadJob();

    /*
     * ============================================================
     * CLEANUP
     * ============================================================
     */

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return {
    job,
    isLoading,
    error,
  };
}