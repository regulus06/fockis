import { useCallback, useEffect, useState } from "react";
import { financeAdminApi } from "../api/financeAdminApi";
import type { FinanceOverview } from "../types/finance.types";

export function useFinanceOverview(period = "30d") {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await financeAdminApi.getOverview(period)); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load finance overview."); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
