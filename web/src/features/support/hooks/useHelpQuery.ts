import { useCallback, useEffect, useRef, useState } from "react";

import { supportErrorMessage } from "../services/supportApi";

export interface HelpQuery<T> {
  data: T | null;
  setData: (value: T | null | ((current: T | null) => T | null)) => void;
  loading: boolean;
  error: string | null;
  errorRaw: unknown;
  refetch: () => Promise<void>;
}

/** Loads data for a Help page and ignores stale responses. */
export function useHelpQuery<T>(load: () => Promise<T>, deps: unknown[], options: { enabled?: boolean } = {}): HelpQuery<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [errorRaw, setErrorRaw] = useState<unknown>(null);
  const request = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const refetch = useCallback(async () => {
    const id = ++request.current;
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorRaw(null);
    try {
      const result = await loader.current();
      if (id === request.current) setData(result);
    } catch (error) {
      if (id === request.current) setErrorRaw(error);
    } finally {
      if (id === request.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    setData,
    loading,
    error: errorRaw ? supportErrorMessage(errorRaw) : null,
    errorRaw,
    refetch,
  };
}
