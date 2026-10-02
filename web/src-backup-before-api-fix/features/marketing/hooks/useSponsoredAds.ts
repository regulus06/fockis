import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAds,
} from "../services/marketingApi";

import type {
  Advertisement,
} from "../types/marketingTypes";

export function useSponsoredAds() {
  const [
    ads,
    setAds,
  ] = useState<Advertisement[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const load =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const result =
          await getAds();

        setAds(
          Array.isArray(result)
            ? result
            : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load ads.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ads,
    loading,
    error,
    reload: load,
  };
}