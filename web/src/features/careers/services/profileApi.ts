import { apiClient } from './apiClient';
import type { CareerProfile, CareerProfileInput, FockisUser, JobAlert } from '../types';

/**
 * CAREER PROFILE (job seeker)
 *
 * GET/PUT /careers/profile
 * POST/DELETE /careers/profile/resume, GET /careers/profile/resume/url
 * GET/POST /careers/profile/alerts, PATCH …/alerts/:id/viewed, DELETE …/alerts/:id
 * GET /users/me (existing Fockis account)
 */
export const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function validateResumeFile(file: File): string | null {
  const okType = RESUME_TYPES.includes(file.type) || /\.(pdf|docx?)$/i.test(file.name);
  if (!okType) return 'Upload a PDF, DOC or DOCX file.';
  if (file.size <= 0) return 'This file is empty.';
  if (file.size > 10 * 1024 * 1024) return 'Your resume must be 10 MB or smaller.';
  return null;
}

export const profileApi = {
  me: async (): Promise<FockisUser> => {
    const data = await apiClient.get<FockisUser & { user?: FockisUser }>('/users/me');
    return data?.user ?? data;
  },
  get: () => apiClient.get<CareerProfile>('/careers/profile'),
  update: (input: CareerProfileInput) => apiClient.put<CareerProfile>('/careers/profile', input),

  uploadResume: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<CareerProfile>('/careers/profile/resume', form);
  },
  deleteResume: () => apiClient.delete<CareerProfile>('/careers/profile/resume'),
  resumeUrl: () => apiClient.get<{ fileName: string; url: string }>('/careers/profile/resume/url'),

  alerts: () => apiClient.get<JobAlert[]>('/careers/profile/alerts'),
  createAlert: (input: { keywords?: string; location?: string; type?: string; remoteOnly?: boolean }) =>
    apiClient.post<JobAlert[]>('/careers/profile/alerts', input),
  markAlertViewed: (id: string) => apiClient.patch<JobAlert[]>(`/careers/profile/alerts/${encodeURIComponent(id)}/viewed`),
  deleteAlert: (id: string) => apiClient.delete<JobAlert[]>(`/careers/profile/alerts/${encodeURIComponent(id)}`),
};

export default profileApi;
