export const MARKETING_PERMISSIONS = {
  VIEW: "marketing.view",

  // Campaigns
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

  // Ads
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

  // Advertisers / targeting
  ADVERTISER_VIEW: "marketing.advertiser.view",
  AUDIENCE_VIEW: "marketing.audience.view",
  PLACEMENT_VIEW: "marketing.placement.view",

  // Analytics / billing
  ANALYTICS_VIEW: "marketing.analytics.view",
  BILLING_VIEW: "marketing.billing.view",

  // Workflow
  WORKFLOW_VIEW: "marketing.workflow.view",
  WORKFLOW_EDIT: "marketing.workflow.edit",

  // Audit
  AUDIT_VIEW: "marketing.audit.view",
} as const;

export type MarketingPermission =
  (typeof MARKETING_PERMISSIONS)[keyof typeof MARKETING_PERMISSIONS];