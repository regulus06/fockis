import apiClient from '../../careers/services/apiClient';

import type {
  ApplicationStatus,
  EmployerAnalytics,
  EmployerApplicantDetail,
  EmployerApplicantList,
  EmployerBilling,
  EmployerChoosePlanResult,
  EmployerCandidate,
  EmployerDashboard,
  EmployerInterview,
  EmployerInterviewList,
  EmployerJob,
  EmployerJobDetail,
  EmployerJobList,
  EmployerMe,
  EmployerProfileInput,
  EmployerProfileResponse,
  EmployerCompany,
  EmployerSettings,
  EmployerTeam,
  EmployerTeamRole,
  EmployerVerification,
  InterviewRecommendation,
  JobPayload,
  Paginated,
  ScheduleInterviewPayload,
  SubmitVerificationPayload,
} from '../types';

/**
 * Employer Center API.
 *
 * - /employer/*                      Employer Center endpoints (careers module)
 * - /careers, /careers/:id           existing job create / update / delete
 * - /careers/applications/:id/status existing application status update
 * - /uploads                         existing media upload
 */

type Params = Record<string, string | number | boolean | undefined | null>;

function query(params?: Params): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'all') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

const id = (value: string) => encodeURIComponent(value.trim());

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export const employerApi = {
  /* account */
  me: () => apiClient.get<EmployerMe>('/employer/me'),
  acceptInvitation: (companyId: string) =>
    apiClient.post<EmployerMe>(`/employer/invitations/${id(companyId)}/accept`),

  /* dashboard */
  dashboard: (days = 30) => apiClient.get<EmployerDashboard>(`/employer/dashboard${query({ days })}`),

  /* jobs */
  listJobs: (params?: { search?: string; type?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<EmployerJobList>(`/employer/jobs${query(params)}`),
  getJob: (jobId: string) => apiClient.get<EmployerJobDetail>(`/employer/jobs/${id(jobId)}`),
  setJobActive: (jobId: string, isActive: boolean) =>
    apiClient.patch<EmployerJob>(`/employer/jobs/${id(jobId)}/status`, { isActive }),
  createJob: (payload: JobPayload) => apiClient.post<{ _id: string }>('/careers', payload),
  updateJob: (jobId: string, payload: Partial<JobPayload>) =>
    apiClient.patch<{ _id: string }>(`/careers/${id(jobId)}`, payload),
  deleteJob: (jobId: string) => apiClient.delete<{ message: string }>(`/careers/${id(jobId)}`),

  /* applicants */
  listApplicants: (params?: { search?: string; jobId?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<EmployerApplicantList>(`/employer/applicants${query(params)}`),
  getApplicant: (applicationId: string) =>
    apiClient.get<EmployerApplicantDetail>(`/employer/applicants/${id(applicationId)}`),
  updateApplicantStatus: (applicationId: string, status: ApplicationStatus) =>
    apiClient.patch(`/careers/applications/${id(applicationId)}/status`, { status }),
  addApplicantNote: (applicationId: string, body: string) =>
    apiClient.post<EmployerApplicantDetail>(`/employer/applicants/${id(applicationId)}/notes`, { body }),

  /* candidates */
  listCandidates: (params?: {
    search?: string;
    location?: string;
    experience?: string;
    education?: string;
    availability?: string;
    saved?: boolean;
    page?: number;
    limit?: number;
  }) => apiClient.get<Paginated<EmployerCandidate>>(`/employer/candidates${query(params)}`),
  saveCandidate: (userId: string) => apiClient.post(`/employer/candidates/${id(userId)}/save`),
  unsaveCandidate: (userId: string) => apiClient.delete(`/employer/candidates/${id(userId)}/save`),

  /* interviews */
  listInterviews: (view?: string) =>
    apiClient.get<EmployerInterviewList>(`/employer/interviews${query({ view })}`),
  scheduleInterview: (payload: ScheduleInterviewPayload) =>
    apiClient.post<EmployerInterview>('/employer/interviews', payload),
  rescheduleInterview: (interviewId: string, payload: Partial<Omit<ScheduleInterviewPayload, 'applicationId'>>) =>
    apiClient.patch<EmployerInterview>(`/employer/interviews/${id(interviewId)}`, payload),
  cancelInterview: (interviewId: string) =>
    apiClient.patch<EmployerInterview>(`/employer/interviews/${id(interviewId)}/cancel`),
  submitInterviewFeedback: (
    interviewId: string,
    payload: { rating: number; recommendation: InterviewRecommendation; comments?: string },
  ) => apiClient.patch<EmployerInterview>(`/employer/interviews/${id(interviewId)}/feedback`, payload),

  /* company */
  getProfile: () => apiClient.get<EmployerProfileResponse>('/employer/profile'),
  updateProfile: (payload: EmployerProfileInput) =>
    apiClient.put<{ company: EmployerCompany }>('/employer/profile', payload),
  getVerification: () => apiClient.get<EmployerVerification>('/employer/verification'),
  submitVerification: (payload: SubmitVerificationPayload) =>
    apiClient.post<EmployerVerification>('/employer/verification', payload),

  /* team */
  getTeam: () => apiClient.get<EmployerTeam>('/employer/team'),
  inviteTeamMember: (payload: { email: string; name?: string; role: EmployerTeamRole }) =>
    apiClient.post<EmployerTeam>('/employer/team', payload),
  updateTeamMember: (memberId: string, role: EmployerTeamRole) =>
    apiClient.patch<EmployerTeam>(`/employer/team/${id(memberId)}`, { role }),
  removeTeamMember: (memberId: string) => apiClient.delete<EmployerTeam>(`/employer/team/${id(memberId)}`),

  /* analytics */
  analytics: (params: { from: string; to: string }) =>
    apiClient.get<EmployerAnalytics>(`/employer/analytics${query(params)}`),

  /* billing */
  billing: () => apiClient.get<EmployerBilling>('/employer/billing'),
  requestUpgrade: (plan: 'growth' | 'enterprise') =>
    apiClient.post<EmployerBilling>('/employer/billing/upgrade-requests', { plan }),
  cancelUpgradeRequest: () => apiClient.delete<EmployerBilling>('/employer/billing/upgrade-requests/pending'),
  /** Free plans switch at once; paid plans return a checkout (existing Fockis checkout). */
  choosePlan: (plan: string) => apiClient.post<EmployerChoosePlanResult>('/employer/billing/plan', { plan }),
  /** After the checkout succeeded: verify the payment and apply the plan. */
  claimPlanPayment: (paymentIntentId: string) => apiClient.post<EmployerBilling>('/employer/billing/claim', { paymentIntentId }),

  /* settings */
  getSettings: () => apiClient.get<EmployerSettings>('/employer/settings'),
  updateSettings: (payload: Partial<Omit<EmployerSettings, 'canManage'>>) =>
    apiClient.put<EmployerSettings>('/employer/settings', payload),

  /**
   * Upload an image through the existing POST /uploads endpoint.
   * That endpoint accepts images, audio and video (not PDF).
   */
  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<{ media?: string }>('/uploads?context=employer', form);
    if (!response?.media) {
      throw new Error('The upload did not return a file URL.');
    }
    return absoluteUrl(response.media);
  },
};

export type EmployerApi = typeof employerApi;
export default employerApi;
