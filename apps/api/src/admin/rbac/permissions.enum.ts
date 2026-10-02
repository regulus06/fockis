export enum Permission {
  // ========================================================================
  // USERS — GENERAL
  // ========================================================================

  USER_READ = "user:read",
  USER_WRITE = "user:write",
  USER_DELETE = "user:delete",

  // ========================================================================
  // USERS — ADMINISTRATION
  // ========================================================================

  /**
   * View the Users Administration dashboard/list.
   */
  USERS_VIEW = "users.view",

  /**
   * View a user's detailed administrative profile.
   */
  USERS_DETAILS_VIEW = "users.details.view",

  /**
   * Manage general user information.
   */
  USERS_MANAGE = "users.manage",

  /**
   * Update a user's profile from administration.
   */
  USERS_PROFILE_MANAGE = "users.profile.manage",

  /**
   * Change account status.
   */
  USERS_STATUS_MANAGE = "users.status.manage",

  /**
   * Assign/change a user's system or custom administrative role.
   */
  USERS_ROLES_MANAGE = "users.roles.manage",

  /**
   * Assign/remove direct user permissions.
   */
  USERS_PERMISSIONS_MANAGE = "users.permissions.manage",

  /**
   * Manage account verification.
   */
  USERS_VERIFICATION_MANAGE = "users.verification.manage",

  /**
   * Manage premium/subscription status.
   */
  USERS_PREMIUM_MANAGE = "users.premium.manage",

  /**
   * Manage Fockis ID access.
   */
  USERS_FOCKIS_ID_MANAGE = "users.fockis_id.manage",

  /**
   * Lock user accounts.
   */
  USERS_LOCK = "users.lock",

  /**
   * Unlock user accounts.
   */
  USERS_UNLOCK = "users.unlock",

  /**
   * Force a password change.
   */
  USERS_FORCE_PASSWORD_CHANGE =
    "users.force_password_change",

  /**
   * Reset a user's password.
   */
  USERS_RESET_PASSWORD =
    "users.reset_password",

  /**
   * Export user data.
   */
  USERS_EXPORT = "users.export",

  /**
   * Delete users.
   *
   * This is a highly sensitive permission.
   */
  USERS_DELETE = "users.delete",

  /**
   * Perform bulk administrative actions.
   */
  USERS_BULK_MANAGE = "users.bulk.manage",

  // ========================================================================
  // USERS — DATA SECTIONS
  // ========================================================================

  /**
   * View user activity.
   */
  USERS_ACTIVITY_VIEW = "users.activity.view",

  /**
   * View user messages.
   */
  USERS_MESSAGES_VIEW = "users.messages.view",

  /**
   * View user bookings.
   */
  USERS_BOOKINGS_VIEW = "users.bookings.view",

  /**
   * View user payment information.
   */
  USERS_PAYMENTS_VIEW = "users.payments.view",

  /**
   * View user reports.
   */
  USERS_REPORTS_VIEW = "users.reports.view",

  /**
   * View user's domain information.
   */
  USERS_DOMAINS_VIEW = "users.domains.view",

  /**
   * View user security information.
   */
  USERS_SECURITY_VIEW = "users.security.view",

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
  // ADMINISTRATOR MANAGEMENT
  // ========================================================================

  ADMINISTRATORS_VIEW =
    "administrators.view",

  ADMINISTRATORS_CREATE =
    "administrators.create",

  ADMINISTRATORS_UPDATE =
    "administrators.update",

  ADMINISTRATORS_DELETE =
    "administrators.delete",

  ADMINISTRATORS_ROLES_MANAGE =
    "administrators.roles.manage",

  // ========================================================================
  // MARKETPLACE
  // ========================================================================

  MARKETPLACE_MANAGE =
    "marketplace:manage",

  MARKETPLACE_VIEW =
    "marketplace.view",

  MARKETPLACE_PRODUCTS_VIEW =
    "marketplace.products.view",

  MARKETPLACE_PRODUCTS_MANAGE =
    "marketplace.products.manage",

  MARKETPLACE_ORDERS_VIEW =
    "marketplace.orders.view",

  MARKETPLACE_ORDERS_MANAGE =
    "marketplace.orders.manage",

  MARKETPLACE_SELLERS_VIEW =
    "marketplace.sellers.view",

  MARKETPLACE_SELLERS_MANAGE =
    "marketplace.sellers.manage",

  MARKETPLACE_REVIEWS_MANAGE =
    "marketplace.reviews.manage",

  // ========================================================================
  // FINANCE
  // ========================================================================

  FINANCE_VIEW =
    "finance.view",

  FINANCE_PAYOUTS_MANAGE =
    "finance.payouts.manage",

  FINANCE_SUBSCRIPTIONS_VIEW =
    "finance.subscriptions.view",

  // ========================================================================
  // AI
  // ========================================================================

  AI_VIEW =
    "ai.view",

  AI_MANAGE =
    "ai.manage",

  // ========================================================================
  // MUSIC
  // ========================================================================

  MUSIC_VIEW =
    "music.view",

  MUSIC_RULES_MANAGE =
    "music.rules.manage",

  MUSIC_CREATORS_MANAGE =
    "music.creators.manage",

  // ========================================================================
  // TRAVEL
  // ========================================================================

  TRAVEL_VIEW =
    "travel.view",

  TRAVEL_MANAGE =
    "travel.manage",

  // ========================================================================
  // PLATFORM
  // ========================================================================

  MESSAGES_MANAGE =
    "messages.manage",

  LIVE_MANAGE =
    "live.manage",

  MEETINGS_MANAGE =
    "meetings.manage",

  REALESTATE_MANAGE =
    "realestate.manage",

  DOCUMENTS_MANAGE =
    "documents.manage",

  DESIGN_MANAGE =
    "design.manage",

  PLAYLISTS_MANAGE =
    "playlists.manage",

  // ========================================================================
  // MODERATION
  // ========================================================================

  MODERATION_VIEW =
    "moderation.view",

  MODERATION_MANAGE =
    "moderation.manage",

  // ========================================================================
  // SECURITY
  // ========================================================================

  SECURITY_VIEW =
    "security.view",

  SECURITY_MANAGE =
    "security.manage",

  // ========================================================================
  // AUDIT
  // ========================================================================

  VIEW_AUDIT =
    "audit:view",

  AUDIT_VIEW =
    "audit.view",

  // ========================================================================
  // DOMAINS
  // ========================================================================

  DOMAINS_VIEW =
    "domains.view",

  DOMAINS_MANAGE =
    "domains.manage",

  // ========================================================================
  // SYSTEM
  // ========================================================================

  SYSTEM_SETTINGS_MANAGE =
    "system.settings.manage",

  // ========================================================================
  // DESTRUCTIVE / SYSTEM
  // ========================================================================

  DELETE_USER =
    "delete:user",

  DELETE_POST =
    "delete:post",

  DELETE_MEDIA =
    "delete:media",

  DELETE_DB =
    "delete:db",

  SYSTEM_CLEANUP =
    "system:cleanup",

  // ========================================================================
  // MARKETING
  // ========================================================================

  MARKETING_VIEW =
    "marketing.view",

  MARKETING_MANAGE =
    "marketing.manage",

  MARKETING_CAMPAIGN_VIEW =
    "marketing.campaign.view",

  MARKETING_CAMPAIGN_CREATE =
    "marketing.campaign.create",

  MARKETING_CAMPAIGN_EDIT =
    "marketing.campaign.edit",

  MARKETING_CAMPAIGN_APPROVE =
    "marketing.campaign.approve",

  MARKETING_CAMPAIGN_PUBLISH =
    "marketing.campaign.publish",

  MARKETING_CAMPAIGN_REJECT =
    "marketing.campaign.reject",

  MARKETING_CAMPAIGN_PAUSE =
    "marketing.campaign.pause",

  MARKETING_CAMPAIGN_RESUME =
    "marketing.campaign.resume",

  MARKETING_CAMPAIGN_BLOCK =
    "marketing.campaign.block",

  MARKETING_CAMPAIGN_UNBLOCK =
    "marketing.campaign.unblock",

  MARKETING_CAMPAIGN_ARCHIVE =
    "marketing.campaign.archive",

  MARKETING_AD_VIEW =
    "marketing.ad.view",

  MARKETING_AD_CREATE =
    "marketing.ad.create",

  MARKETING_AD_EDIT =
    "marketing.ad.edit",

  MARKETING_AD_APPROVE =
    "marketing.ad.approve",

  MARKETING_AD_PUBLISH =
    "marketing.ad.publish",

  MARKETING_AD_REJECT =
    "marketing.ad.reject",

  MARKETING_AD_PAUSE =
    "marketing.ad.pause",

  MARKETING_AD_RESUME =
    "marketing.ad.resume",

  MARKETING_AD_BLOCK =
    "marketing.ad.block",

  MARKETING_AD_UNBLOCK =
    "marketing.ad.unblock",

  MARKETING_AD_ARCHIVE =
    "marketing.ad.archive",

  MARKETING_ADVERTISER_VIEW =
    "marketing.advertiser.view",

  MARKETING_AUDIENCE_VIEW =
    "marketing.audience.view",

  MARKETING_PLACEMENT_VIEW =
    "marketing.placement.view",

  MARKETING_ANALYTICS_VIEW =
    "marketing.analytics.view",

  MARKETING_BILLING_VIEW =
    "marketing.billing.view",

  MARKETING_WORKFLOW_VIEW =
    "marketing.workflow.view",

  MARKETING_WORKFLOW_EDIT =
    "marketing.workflow.edit",

  MARKETING_AUDIT_VIEW =
    "marketing.audit.view",
}