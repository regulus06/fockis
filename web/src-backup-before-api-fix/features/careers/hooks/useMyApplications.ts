import { useCallback, useEffect, useState } from "react";

import { applicationsApi } from "../services/applicationsApi";

import type { Application } from "../types";

interface UseMyApplicationsResult {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyApplications(): UseMyApplicationsResult {
  const [applications, setApplications] =
    useState<Application[]>([]);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadApplications = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data =
          await applicationsApi.getMyApplications();

        setApplications(data);
      } catch (err: unknown) {
        setApplications([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load applications",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  return {
    applications,
    isLoading,
    error,
    refetch: loadApplications,
  };
}