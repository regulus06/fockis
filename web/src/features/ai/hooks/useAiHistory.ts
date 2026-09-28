import { useCallback, useEffect, useState } from "react";
import type { AiJob } from "../types/aiTypes";
import { aiApi } from "../services/aiApi";

export function useAiHistory() {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await aiApi.getHistory());
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load AI history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { jobs, loading, error, refresh };
}
export default useAiHistory;
