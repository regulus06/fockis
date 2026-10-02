import { apiClient } from './apiClient';
import type { Company, Job } from '../types';

export const companiesApi = {
  // GET /careers/companies/:id
  getCompanyById: (id: string) => apiClient.get<Company>(`/careers/companies/${id}`),

  // GET /careers/companies/:id/jobs
  getCompanyJobs: (id: string) => apiClient.get<Job[]>(`/careers/companies/${id}/jobs`),
};
