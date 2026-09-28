export enum Permission {
  // ========================================================================
  // USERS
  // ========================================================================

  USER_READ = "user:read",
  USER_WRITE = "user:write",
  USER_DELETE = "user:delete",

  // ========================================================================
  // CONTENT
  // ========================================================================

  POST_MODERATE = "post:moderate",

  // ========================================================================
  // ADMINISTRATION
  // ========================================================================

  ADMIN_READ = "admin:read",
  ADMIN_WRITE = "admin:write",

  // ========================================================================
  // MARKETPLACE
  // ========================================================================

  MARKETPLACE_MANAGE = "marketplace:manage",

  // ========================================================================
  // DESTRUCTIVE / SYSTEM
  // ========================================================================

  DELETE_USER = "delete:user",
  DELETE_POST = "delete:post",
  DELETE_MEDIA = "delete:media",

  DELETE_DB = "delete:db",
  SYSTEM_CLEANUP = "system:cleanup",

  VIEW_AUDIT = "audit:view",

  // ========================================================================
  // MARKETING
  // ========================================================================

  MARKETING_VIEW = "marketing.view",

  MARKETING_CAMPAIGN_VIEW = "marketing.campaign.view",
  MARKETING_CAMPAIGN_CREATE = "marketing.campaign.create",
  MARKETING_CAMPAIGN_EDIT = "marketing.campaign.edit",
  MARKETING_CAMPAIGN_APPROVE = "marketing.campaign.approve",
  MARKETING_CAMPAIGN_PUBLISH = "marketing.campaign.publish",
  MARKETING_CAMPAIGN_REJECT = "marketing.campaign.reject",
  MARKETING_CAMPAIGN_PAUSE = "marketing.campaign.pause",
  MARKETING_CAMPAIGN_RESUME = "marketing.campaign.resume",
  MARKETING_CAMPAIGN_BLOCK = "marketing.campaign.block",
  MARKETING_CAMPAIGN_UNBLOCK = "marketing.campaign.unblock",
  MARKETING_CAMPAIGN_ARCHIVE = "marketing.campaign.archive",

  MARKETING_AD_VIEW = "marketing.ad.view",
  MARKETING_AD_CREATE = "marketing.ad.create",
  MARKETING_AD_EDIT = "marketing.ad.edit",
  MARKETING_AD_APPROVE = "marketing.ad.approve",
  MARKETING_AD_PUBLISH = "marketing.ad.publish",
  MARKETING_AD_REJECT = "marketing.ad.reject",
  MARKETING_AD_PAUSE = "marketing.ad.pause",
  MARKETING_AD_RESUME = "marketing.ad.resume",
  MARKETING_AD_BLOCK = "marketing.ad.block",
  MARKETING_AD_UNBLOCK = "marketing.ad.unblock",
  MARKETING_AD_ARCHIVE = "marketing.ad.archive",

  MARKETING_ADVERTISER_VIEW = "marketing.advertiser.view",
  MARKETING_AUDIENCE_VIEW = "marketing.audience.view",
  MARKETING_PLACEMENT_VIEW = "marketing.placement.view",
  MARKETING_ANALYTICS_VIEW = "marketing.analytics.view",
  MARKETING_BILLING_VIEW = "marketing.billing.view",

  MARKETING_WORKFLOW_VIEW = "marketing.workflow.view",
  MARKETING_WORKFLOW_EDIT = "marketing.workflow.edit",

  MARKETING_AUDIT_VIEW = "marketing.audit.view",
}