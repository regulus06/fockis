import { apiClient } from './apiClient';
import { normalizeJob, type BackendJob } from './careersApi';
import type { Company, CompanySummary } from '../types';

/**
 * PUBLIC COMPANY PAGES
 *
 * GET /careers/companies
 * GET /careers/companies/:id
 */
export const companiesApi = {
  list: (search?: string) =>
    apiClient.get<CompanySummary[]>(`/careers/companies${search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`),

  getCompanyById: async (id: string): Promise<Company> => {
    const raw = await apiClient.get<Omit<Company, 'jobs'> & { jobs: BackendJob[] }>(
      `/careers/companies/${encodeURIComponent(id.trim())}`,
    );
    const logos = new Map([[id, raw.logoUrl]]);
    return {
      ...raw,
      jobs: (raw.jobs ?? []).map((job) => {
        const normalized = normalizeJob(job, logos);
        normalized.company.verified = raw.verified;
        return normalized;
      }),
    };
  },
};

export default companiesApi;
