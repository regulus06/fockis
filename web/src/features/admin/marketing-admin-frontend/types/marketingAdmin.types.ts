export type MarketingCampaignStatus =
  | "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "SCHEDULED" | "ACTIVE"
  | "PAUSED" | "BLOCKED" | "REJECTED" | "EXPIRED" | "ARCHIVED";

export type MarketingAdStatus = MarketingCampaignStatus;

export type MarketingAction =
  | "VIEW" | "CREATE" | "EDIT" | "APPROVE" | "PUBLISH" | "REJECT"
  | "PAUSE" | "RESUME" | "BLOCK" | "UNBLOCK" | "ARCHIVE";

export type ApprovalMode = "AUTO_PUBLISH" | "REQUIRE_ADMIN_APPROVAL" | "REQUIRE_TWO_ADMIN_APPROVALS";

export interface MarketingWorkflowSettings {
  campaignApprovalMode: ApprovalMode;
  adApprovalMode: ApprovalMode;
  autoPublishTrustedAdvertisers: boolean;
  blockedCampaignStopsAds: boolean;
  blockedCampaignStopsScheduledAds: boolean;
  blockedCampaignStopsNotifications: boolean;
  notifyAdvertiserOnBlock: boolean;
  requireReviewBeforeReactivation: boolean;
}

export interface MarketingCampaignAdmin {
  id: string; name: string; advertiserId: string; advertiserName: string;
  status: MarketingCampaignStatus; budget: number; spent: number;
  impressions: number; clicks: number; conversions: number;
  createdAt: string; updatedAt: string;
}

export interface MarketingAdAdmin {
  id: string; campaignId: string; campaignName: string;
  advertiserId: string; advertiserName: string; status: MarketingAdStatus;
  placement: string; impressions: number; clicks: number; spend: number;
  createdAt: string; updatedAt: string;
}

export interface MarketingActionRequest {
  reason?: string; note?: string; notifyAdvertiser?: boolean;
  stopAllCampaignDelivery?: boolean;
}

export interface MarketingAuditEvent {
  id: string; actorId: string; actorName?: string;
  action: MarketingAction | "SET_WORKFLOW";
  resourceType: "CAMPAIGN" | "AD" | "WORKFLOW";
  resourceId: string; reason?: string; note?: string; createdAt: string;
}

export interface MarketingOverview {
  success: boolean; service: string; status: string;
  capabilities: string[]; workflow: MarketingWorkflowSettings;
  campaignStatuses: string[]; permissions: string[];
}

export interface MarketingPermissionResponse {
  success: boolean; permissions: string[];
}

export interface MarketingStatusResponse {
  success: boolean; statuses: string[];
}

export interface MarketingWorkflowResponse {
  success: boolean; workflow: MarketingWorkflowSettings;
}
