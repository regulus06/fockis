import { apiClient } from '../../services/apiClient';

/**
 * Employer Center API client.
 * These endpoints are the contract to implement in the NestJS backend.
 * Do not expose privileged operations until the matching backend guards exist.
 */
const ROOT = '/employer';

export const employerApi = {
  dashboard: () => apiClient.get(`${ROOT}/dashboard`),
  getProfile: () => apiClient.get(`${ROOT}/profile`),
  createProfile: (payload: unknown) => apiClient.post(`${ROOT}/profile`, payload),
  updateProfile: (payload: unknown) => apiClient.patch(`${ROOT}/profile`, payload),
  getVerification: () => apiClient.get(`${ROOT}/verification`),
  submitVerification: (payload: unknown) => apiClient.post(`${ROOT}/verification`, payload),
  listJobs: (params?: Record<string, string | number | boolean>) =>
    apiClient.get(`${ROOT}/jobs${params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : ''}`),
  createJob: (payload: unknown) => apiClient.post(`${ROOT}/jobs`, payload),
  getJob: (id: string) => apiClient.get(`${ROOT}/jobs/${encodeURIComponent(id)}`),
  updateJob: (id: string, payload: unknown) => apiClient.patch(`${ROOT}/jobs/${encodeURIComponent(id)}`, payload),
  closeJob: (id: string) => apiClient.patch(`${ROOT}/jobs/${encodeURIComponent(id)}/close`, {}),
  listApplicants: (params?: Record<string, string>) =>
    apiClient.get(`${ROOT}/applicants${params ? `?${new URLSearchParams(params)}` : ''}`),
  updateApplicantStatus: (id: string, status: string) =>
    apiClient.patch(`${ROOT}/applicants/${encodeURIComponent(id)}/status`, { status }),
  listInterviews: () => apiClient.get(`${ROOT}/interviews`),
  createInterview: (payload: unknown) => apiClient.post(`${ROOT}/interviews`, payload),
  listTeam: () => apiClient.get(`${ROOT}/team`),
  inviteTeamMember: (payload: unknown) => apiClient.post(`${ROOT}/team/invitations`, payload),
  analytics: (params?: Record<string, string>) =>
    apiClient.get(`${ROOT}/analytics${params ? `?${new URLSearchParams(params)}` : ''}`),
  billing: () => apiClient.get(`${ROOT}/billing`),
};
