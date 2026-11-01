import { careersApi } from '../services/careersApi';
import { useEmployerQuery } from '../../employer/hooks/useEmployerQuery';

/** Loads one public job (GET /careers/:id). */
export function useJobDetails(jobId: string | undefined) {
  const query = useEmployerQuery(() => careersApi.getJobById(jobId ?? ''), [jobId], { enabled: Boolean(jobId) });
  return { job: query.data, isLoading: query.loading, error: query.error, refetch: query.refetch };
}

export default useJobDetails;
