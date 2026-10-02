import api from "../../../../api/api";
import type {
  MarketingActionRequest, MarketingAdAdmin, MarketingAuditEvent,
  MarketingCampaignAdmin, MarketingOverview, MarketingPermissionResponse,
  MarketingStatusResponse, MarketingWorkflowResponse, MarketingWorkflowSettings,
} from "../types/marketingAdmin.types";

const unwrap = <T,>(response: { data: T }) => response.data;
const id = (value: string) => encodeURIComponent(value);

export const marketingAdminControlApi = {
  getOverview: () => api.get<MarketingOverview>("/admin/marketing-admin/overview").then(unwrap),
  listCampaigns: (params?: { status?: string; search?: string }) => api.get<MarketingCampaignAdmin[]>("/admin/marketing-admin/campaigns", { params }).then(unwrap),
  getCampaign: (campaignId: string) => api.get<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}`).then(unwrap),
  approveCampaign: (campaignId: string, body: MarketingActionRequest = {}) => api.post<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}/approve`, body).then(unwrap),
  publishCampaign: (campaignId: string, body: MarketingActionRequest = {}) => api.post<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}/publish`, body).then(unwrap),
  rejectCampaign: (campaignId: string, body: MarketingActionRequest) => api.post<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}/reject`, body).then(unwrap),
  pauseCampaign: (campaignId: string, body: MarketingActionRequest = {}) => api.post<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}/pause`, body).then(unwrap),
  resumeCampaign: (campaignId: string, body: MarketingActionRequest = {}) => api.post<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}/resume`, body).then(unwrap),
  blockCampaign: (campaignId: string, body: MarketingActionRequest) => api.post<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}/block`, body).then(unwrap),
  unblockCampaign: (campaignId: string, body: MarketingActionRequest = {}) => api.post<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}/unblock`, body).then(unwrap),
  archiveCampaign: (campaignId: string, body: MarketingActionRequest = {}) => api.post<MarketingCampaignAdmin>(`/admin/marketing-admin/campaigns/${id(campaignId)}/archive`, body).then(unwrap),
  listAds: (params?: { status?: string; search?: string }) => api.get<MarketingAdAdmin[]>("/admin/marketing-admin/ads", { params }).then(unwrap),
  approveAd: (adId: string, body: MarketingActionRequest = {}) => api.post<MarketingAdAdmin>(`/admin/marketing-admin/ads/${id(adId)}/approve`, body).then(unwrap),
  publishAd: (adId: string, body: MarketingActionRequest = {}) => api.post<MarketingAdAdmin>(`/admin/marketing-admin/ads/${id(adId)}/publish`, body).then(unwrap),
  rejectAd: (adId: string, body: MarketingActionRequest) => api.post<MarketingAdAdmin>(`/admin/marketing-admin/ads/${id(adId)}/reject`, body).then(unwrap),
  pauseAd: (adId: string, body: MarketingActionRequest = {}) => api.post<MarketingAdAdmin>(`/admin/marketing-admin/ads/${id(adId)}/pause`, body).then(unwrap),
  resumeAd: (adId: string, body: MarketingActionRequest = {}) => api.post<MarketingAdAdmin>(`/admin/marketing-admin/ads/${id(adId)}/resume`, body).then(unwrap),
  blockAd: (adId: string, body: MarketingActionRequest) => api.post<MarketingAdAdmin>(`/admin/marketing-admin/ads/${id(adId)}/block`, body).then(unwrap),
  unblockAd: (adId: string, body: MarketingActionRequest = {}) => api.post<MarketingAdAdmin>(`/admin/marketing-admin/ads/${id(adId)}/unblock`, body).then(unwrap),
  archiveAd: (adId: string, body: MarketingActionRequest = {}) => api.post<MarketingAdAdmin>(`/admin/marketing-admin/ads/${id(adId)}/archive`, body).then(unwrap),
  getWorkflow: () => api.get<MarketingWorkflowResponse>("/admin/marketing-admin/workflow").then(unwrap),
  updateWorkflow: (settings: MarketingWorkflowSettings) => api.patch<MarketingWorkflowResponse>("/admin/marketing-admin/workflow", settings).then(unwrap),
  getPermissions: () => api.get<MarketingPermissionResponse>("/admin/marketing-admin/permissions").then(unwrap),
  getCampaignStatuses: () => api.get<MarketingStatusResponse>("/admin/marketing-admin/campaign-statuses").then(unwrap),
  getAudit: (params?: { resourceType?: string; resourceId?: string }) => api.get<MarketingAuditEvent[]>("/admin/marketing-admin/audit", { params }).then(unwrap),
};

export default marketingAdminControlApi;
