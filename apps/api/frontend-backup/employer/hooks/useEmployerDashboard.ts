import { useCallback, useEffect, useState } from 'react';
import { employerApi } from '../services/employerApi';
import type { EmployerDashboardSummary } from '../types/Employer';

export function useEmployerDashboard() {
  const [data, setData] = useState<EmployerDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await employerApi.dashboard() as EmployerDashboardSummary;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load employer dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);
  return { data, isLoading, error, refetch };
}
