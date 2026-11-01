import { apiClient } from './apiClient';
import { normalizeJob, type BackendJob } from './careersApi';
import type { Job } from '../types';

/**
 * SAVED JOBS
 *
 * GET    /careers/saved-jobs
 * POST   /careers/saved-jobs/:jobId
 * DELETE /careers/saved-jobs/:jobId
 */

export interface SavedJobEntry {
  id: string;
  jobId: string;
  savedAt: string;
  /** null when the job was removed or is no longer public. */
  job: Job | null;
}

interface BackendSavedJob {
  _id?: string;
  jobId?: BackendJob | string | null;
  createdAt?: string;
}

const path = (jobId: string) => {
  const id = jobId?.trim();
  if (!id) throw new Error('Job ID is required.');
  return encodeURIComponent(id);
};

export const savedJobsApi = {
  getSavedJobs: async (): Promise<SavedJobEntry[]> => {
    const response = await apiClient.get<BackendSavedJob[]>('/careers/saved-jobs');
    if (!Array.isArray(response)) throw new Error('Invalid saved jobs response from server.');
    return response.map((item) => {
      const populated = item.jobId && typeof item.jobId === 'object' ? item.jobId : null;
      return {
        id: String(item._id ?? ''),
        jobId: populated ? String(populated._id ?? '') : String(item.jobId ?? ''),
        savedAt: item.createdAt ?? '',
        job: populated ? normalizeJob(populated) : null,
      };
    });
  },
  saveJob: (jobId: string) => apiClient.post(`/careers/saved-jobs/${path(jobId)}`),
  unsaveJob: (jobId: string) => apiClient.delete<void>(`/careers/saved-jobs/${path(jobId)}`),
};

export default savedJobsApi;
