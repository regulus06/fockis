import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export interface EmployerQueryResult<T> {
  data: T | null;
  setData: (value: T | null | ((current: T | null) => T | null)) => void;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

/**
 * Loads data for an Employer Center page and ignores stale responses
 * when inputs change quickly (e.g. while typing in a search box).
 */
export function useEmployerQuery<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  options: { enabled?: boolean } = {},
): EmployerQueryResult<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    const current = ++requestId.current;
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (current === requestId.current) setData(result);
    } catch (err) {
      if (current === requestId.current) setError(getErrorMessage(err));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  return { data, setData, loading, error, refetch };
}

/** Debounce a fast-changing value such as a search box. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default useEmployerQuery;
