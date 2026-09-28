import { useCallback, useEffect, useState } from "react";
import type { AiJob } from "../types/aiTypes";
import { aiApi } from "../services/aiApi";

export function useAiJob(jobId?: string, pollMs = 2500) {
  const [job, setJob] = useState<AiJob | undefined>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!jobId) return;
    try {
      setJob(await aiApi.getJob(jobId));
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load AI job.");
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setJob(undefined);
      return;
    }
    void refresh();
    const timer = window.setInterval(() => {
      if (job?.status === "completed" || job?.status === "failed" || job?.status === "cancelled") return;
      void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [jobId, pollMs, refresh, job?.status]);

  return { job, error, refresh };
}
export default useAiJob;
