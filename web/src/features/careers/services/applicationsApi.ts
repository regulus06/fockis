import { apiClient } from './apiClient';
import { normalizeJob, type BackendJob } from './careersApi';
import type { ApplicationPayload, ApplicationStatus, MyApplication } from '../types';

/**
 * FOCKIS CAREERS — APPLICATIONS (job seeker)
 *
 * GET  /careers/applications       my applications
 * GET  /careers/applications/:id   one of my applications
 * POST /careers/applications       apply (Fockis jobs only)
 */

interface BackendApplication {
  _id?: string;
  id?: string;
  jobId?: BackendJob | string | null;
  status?: ApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
  resumeFileName?: string;
  coverLetter?: string;
  statusHistory?: { status: ApplicationStatus; changedAt: string }[];
}

function normalize(raw: BackendApplication): MyApplication {
  const job = raw.jobId && typeof raw.jobId === 'object' ? normalizeJob(raw.jobId) : null;
  return {
    id: String(raw._id ?? raw.id ?? ''),
    status: raw.status ?? 'applied',
    appliedAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? raw.createdAt ?? '',
    job,
    resumeFileName: raw.resumeFileName ?? null,
    coverLetter: raw.coverLetter ?? null,
    statusHistory: raw.statusHistory ?? [],
  };
}

export const applicationsApi = {
  getMyApplications: async (): Promise<MyApplication[]> => {
    const response = await apiClient.get<BackendApplication[]>('/careers/applications');
    if (!Array.isArray(response)) throw new Error('Invalid applications response from server.');
    return response.map(normalize);
  },

  getApplicationById: async (id: string): Promise<MyApplication> =>
    normalize(await apiClient.get<BackendApplication>(`/careers/applications/${encodeURIComponent(id.trim())}`)),

  submitApplication: async (payload: ApplicationPayload): Promise<MyApplication> =>
    normalize(await apiClient.post<BackendApplication>('/careers/applications', payload)),
};

export default applicationsApi;
