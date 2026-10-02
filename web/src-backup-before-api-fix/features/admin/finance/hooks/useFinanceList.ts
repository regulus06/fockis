import { useCallback, useEffect, useState } from "react";

export function useFinanceList<T>(loader: () => Promise<T[]>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await loader()); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load finance data."); }
    finally { setLoading(false); }
  }, [loader]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}
