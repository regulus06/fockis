import type { MarketingWorkflowSettings } from "../types/marketingAdmin.types";

export const DEFAULT_MARKETING_WORKFLOW: MarketingWorkflowSettings = {
  campaignApprovalMode: "REQUIRE_ADMIN_APPROVAL",
  adApprovalMode: "REQUIRE_ADMIN_APPROVAL",
  autoPublishTrustedAdvertisers: false,
  blockedCampaignStopsAds: true,
  blockedCampaignStopsScheduledAds: true,
  blockedCampaignStopsNotifications: true,
  notifyAdvertiserOnBlock: true,
  requireReviewBeforeReactivation: true,
};

export const MARKETING_STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  BLOCKED: "Blocked",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
} as const;
