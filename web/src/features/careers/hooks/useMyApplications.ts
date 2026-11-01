
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { applicationsApi } from "../services/applicationsApi";

import type { Application } from "../types";

interface UseMyApplicationsResult {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyApplications(): UseMyApplicationsResult {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const loadApplications = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const data = await applicationsApi.getMyApplications();

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid applications response from server.");
      }

      setApplications(data);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load applications.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadApplications();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadApplications]);

  return {
    applications,
    isLoading,
    error,
    refetch: loadApplications,
  };
}
