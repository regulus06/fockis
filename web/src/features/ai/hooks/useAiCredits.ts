import { useCallback, useEffect, useState } from "react";
import type { AiCredits } from "../types/aiTypes";
import { aiApi } from "../services/aiApi";

export function useAiCredits() {
  const [credits, setCredits] = useState<AiCredits>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCredits(await aiApi.getCredits());
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load AI credits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { credits, loading, error, refresh };
}
export default useAiCredits;
