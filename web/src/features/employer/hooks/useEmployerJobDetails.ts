import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export const useEmployerJobDetails = (jobId?: string) =>
  useEmployerQuery(() => employerApi.getJob(jobId ?? ''), [jobId], { enabled: Boolean(jobId) });

export default useEmployerJobDetails;
