import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export interface EmployerApplicantsQuery {
  search?: string;
  jobId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const useEmployerApplicants = (params: EmployerApplicantsQuery = {}) =>
  useEmployerQuery(
    () => employerApi.listApplicants(params),
    [params.search, params.jobId, params.status, params.page, params.limit],
  );

export default useEmployerApplicants;
