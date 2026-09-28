export const MARKETING_ADMIN_PERMISSIONS = {
  VIEW: "marketing.view",
  CAMPAIGN_VIEW: "marketing.campaign.view",
  CAMPAIGN_CREATE: "marketing.campaign.create",
  CAMPAIGN_EDIT: "marketing.campaign.edit",
  CAMPAIGN_APPROVE: "marketing.campaign.approve",
  CAMPAIGN_PUBLISH: "marketing.campaign.publish",
  CAMPAIGN_REJECT: "marketing.campaign.reject",
  CAMPAIGN_PAUSE: "marketing.campaign.pause",
  CAMPAIGN_RESUME: "marketing.campaign.resume",
  CAMPAIGN_BLOCK: "marketing.campaign.block",
  CAMPAIGN_UNBLOCK: "marketing.campaign.unblock",
  CAMPAIGN_ARCHIVE: "marketing.campaign.archive",
  AD_VIEW: "marketing.ad.view",
  AD_CREATE: "marketing.ad.create",
  AD_EDIT: "marketing.ad.edit",
  AD_APPROVE: "marketing.ad.approve",
  AD_PUBLISH: "marketing.ad.publish",
  AD_REJECT: "marketing.ad.reject",
  AD_PAUSE: "marketing.ad.pause",
  AD_RESUME: "marketing.ad.resume",
  AD_BLOCK: "marketing.ad.block",
  AD_UNBLOCK: "marketing.ad.unblock",
  AD_ARCHIVE: "marketing.ad.archive",
  ADVERTISER_VIEW: "marketing.advertiser.view",
  AUDIENCE_VIEW: "marketing.audience.view",
  PLACEMENT_VIEW: "marketing.placement.view",
  ANALYTICS_VIEW: "marketing.analytics.view",
  BILLING_VIEW: "marketing.billing.view",
  WORKFLOW_VIEW: "marketing.workflow.view",
  WORKFLOW_EDIT: "marketing.workflow.edit",
  AUDIT_VIEW: "marketing.audit.view",
} as const;

export type MarketingAdminPermission =
  (typeof MARKETING_ADMIN_PERMISSIONS)[keyof typeof MARKETING_ADMIN_PERMISSIONS];

export const MARKETING_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "BLOCKED",
  "REJECTED",
  "EXPIRED",
  "ARCHIVED",
] as const;

export type MarketingStatus = (typeof MARKETING_STATUSES)[number];

export const CAMPAIGN_ACTIONS = {
  APPROVE: { from: ["PENDING_REVIEW"], to: "APPROVED" },
  PUBLISH: { from: ["APPROVED", "PAUSED"], to: "ACTIVE" },
  REJECT: { from: ["PENDING_REVIEW", "APPROVED"], to: "REJECTED" },
  PAUSE: { from: ["ACTIVE", "SCHEDULED"], to: "PAUSED" },
  RESUME: { from: ["PAUSED"], to: "ACTIVE" },
  BLOCK: {
    from: ["DRAFT", "PENDING_REVIEW", "APPROVED", "SCHEDULED", "ACTIVE", "PAUSED"],
    to: "BLOCKED",
  },
  UNBLOCK: { from: ["BLOCKED"], to: "PAUSED" },
  ARCHIVE: { from: ["DRAFT", "REJECTED", "EXPIRED", "PAUSED"], to: "ARCHIVED" },
} as const;

export const AD_ACTIONS = CAMPAIGN_ACTIONS;

export type MarketingActionName = keyof typeof CAMPAIGN_ACTIONS;

export const DEFAULT_MARKETING_WORKFLOW = {
  campaignApprovalMode: "REQUIRE_ADMIN_APPROVAL" as const,
  adApprovalMode: "REQUIRE_ADMIN_APPROVAL" as const,
  autoPublishTrustedAdvertisers: false,
  blockedCampaignStopsAds: true,
  blockedCampaignStopsScheduledAds: true,
  blockedCampaignStopsNotifications: true,
  notifyAdvertiserOnBlock: true,
  requireReviewBeforeReactivation: true,
};

export type MarketingApprovalMode =
  | "AUTO_PUBLISH"
  | "REQUIRE_ADMIN_APPROVAL"
  | "REQUIRE_TWO_ADMIN_APPROVALS";

export type MarketingWorkflowSettings = {
  campaignApprovalMode: MarketingApprovalMode;
  adApprovalMode: MarketingApprovalMode;
  autoPublishTrustedAdvertisers: boolean;
  blockedCampaignStopsAds: boolean;
  blockedCampaignStopsScheduledAds: boolean;
  blockedCampaignStopsNotifications: boolean;
  notifyAdvertiserOnBlock: boolean;
  requireReviewBeforeReactivation: boolean;
};

export const ACTION_PERMISSION: Record<"campaign" | "ad", Record<string, MarketingAdminPermission>> = {
  campaign: {
    APPROVE: MARKETING_ADMIN_PERMISSIONS.CAMPAIGN_APPROVE,
    PUBLISH: MARKETING_ADMIN_PERMISSIONS.CAMPAIGN_PUBLISH,
    REJECT: MARKETING_ADMIN_PERMISSIONS.CAMPAIGN_REJECT,
    PAUSE: MARKETING_ADMIN_PERMISSIONS.CAMPAIGN_PAUSE,
    RESUME: MARKETING_ADMIN_PERMISSIONS.CAMPAIGN_RESUME,
    BLOCK: MARKETING_ADMIN_PERMISSIONS.CAMPAIGN_BLOCK,
    UNBLOCK: MARKETING_ADMIN_PERMISSIONS.CAMPAIGN_UNBLOCK,
    ARCHIVE: MARKETING_ADMIN_PERMISSIONS.CAMPAIGN_ARCHIVE,
  },
  ad: {
    APPROVE: MARKETING_ADMIN_PERMISSIONS.AD_APPROVE,
    PUBLISH: MARKETING_ADMIN_PERMISSIONS.AD_PUBLISH,
    REJECT: MARKETING_ADMIN_PERMISSIONS.AD_REJECT,
    PAUSE: MARKETING_ADMIN_PERMISSIONS.AD_PAUSE,
    RESUME: MARKETING_ADMIN_PERMISSIONS.AD_RESUME,
    BLOCK: MARKETING_ADMIN_PERMISSIONS.AD_BLOCK,
    UNBLOCK: MARKETING_ADMIN_PERMISSIONS.AD_UNBLOCK,
    ARCHIVE: MARKETING_ADMIN_PERMISSIONS.AD_ARCHIVE,
  },
};
