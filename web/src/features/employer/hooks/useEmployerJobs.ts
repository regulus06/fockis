import { employerApi } from '../services/employerApi';
import { useEmployerQuery } from './useEmployerQuery';

export interface EmployerJobsQuery {
  search?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const useEmployerJobs = (params: EmployerJobsQuery = {}) =>
  useEmployerQuery(
    () => employerApi.listJobs(params),
    [params.search, params.type, params.status, params.page, params.limit],
  );

export default useEmployerJobs;
