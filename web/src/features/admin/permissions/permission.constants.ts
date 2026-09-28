// ============================================================
// FOCKIS ADMIN — PERMISSION CATALOGUE
// Single source of truth.
// Nothing outside this file should hardcode a permission string.
// ============================================================

export const PERMISSIONS = {
  // ============================================================
  // USERS
  // ============================================================

  USERS_VIEW: "users.view",
  USERS_VIEW_BASIC: "users.view_basic",
  USERS_VIEW_CONTACT: "users.view_contact",
  USERS_VIEW_SENSITIVE: "users.view_sensitive",
  USERS_VIEW_SECURITY: "users.view_security",
  USERS_VIEW_FINANCIAL: "users.view_financial",
  USERS_VIEW_DOCUMENTS: "users.view_documents",
  USERS_VIEW_PRIVATE_CONTENT: "users.view_private_content",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_ACTIVATE: "users.activate",
  USERS_DEACTIVATE: "users.deactivate",
  USERS_SUSPEND: "users.suspend",
  USERS_BLOCK: "users.block",
  USERS_RESTORE: "users.restore",
  USERS_DELETE_REQUEST: "users.delete.request",
  USERS_DELETE_APPROVE: "users.delete.approve",
  USERS_DELETE_PERMANENT: "users.delete.permanent",
  USERS_FORCE_LOGOUT: "users.force_logout",
  USERS_RECOVERY: "users.recovery",

  // ============================================================
  // ADMINISTRATORS
  // ============================================================

  ADMINS_VIEW: "admins.view",
  ADMINS_CREATE: "admins.create",
  ADMINS_EDIT: "admins.edit",
  ADMINS_SUSPEND: "admins.suspend",
  ADMINS_DEACTIVATE: "admins.deactivate",
  ADMINS_RESTORE: "admins.restore",
  ADMINS_CHANGE_ROLE: "admins.change_role",

  // ============================================================
  // ROLES / PERMISSIONS
  // ============================================================

  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",
  ROLES_DELETE: "roles.delete",

  PERMISSIONS_VIEW: "permissions.view",
  PERMISSIONS_ASSIGN: "permissions.assign",

  // ============================================================
  // MODERATION
  // ============================================================

  MODERATION_VIEW: "moderation.view",
  MODERATION_REVIEW: "moderation.review",
  MODERATION_RESTRICT: "moderation.restrict",
  MODERATION_RESTORE: "moderation.restore",

  // ============================================================
  // SUPPORT
  // ============================================================

  SUPPORT_VIEW: "support.view",
  SUPPORT_CREATE: "support.create",
  SUPPORT_ASSIGN: "support.assign",
  SUPPORT_RESOLVE: "support.resolve",

  // ============================================================
  // MARKETPLACE
  // ============================================================

  MARKETPLACE_VIEW: "marketplace.view",
  MARKETPLACE_PRODUCTS_VIEW: "marketplace.products.view",
  MARKETPLACE_PRODUCTS_APPROVE: "marketplace.products.approve",
  MARKETPLACE_PRODUCTS_REJECT: "marketplace.products.reject",
  MARKETPLACE_PRODUCTS_REMOVE: "marketplace.products.remove",
  MARKETPLACE_SELLERS_VIEW: "marketplace.sellers.view",
  MARKETPLACE_SELLERS_APPROVE: "marketplace.sellers.approve",
  MARKETPLACE_SELLERS_SUSPEND: "marketplace.sellers.suspend",
  MARKETPLACE_ORDERS_VIEW: "marketplace.orders.view",
  MARKETPLACE_DISPUTES_MANAGE: "marketplace.disputes.manage",
  MARKETPLACE_REVIEWS_MANAGE: "marketplace.reviews.manage",

  // ============================================================
  // SHIPPING
  // ============================================================

  SHIPPING_VIEW: "shipping.view",
  SHIPPING_MANAGE: "shipping.manage",

  // ============================================================
  // FINANCE
  // ============================================================

  FINANCE_VIEW: "finance.view",
  FINANCE_TRANSACTIONS: "finance.transactions",
  FINANCE_REFUNDS: "finance.refunds",
  FINANCE_PAYOUTS: "finance.payouts",
  FINANCE_EARNINGS: "finance.earnings",

  // ============================================================
  // PAYMENTS
  // ============================================================

  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_MANAGE: "payments.manage",
  PAYMENTS_REFUNDS: "payments.refunds",

  // ============================================================
  // SUBSCRIPTIONS
  // ============================================================

  SUBSCRIPTIONS_VIEW: "subscriptions.view",
  SUBSCRIPTIONS_MANAGE: "subscriptions.manage",
  SUBSCRIPTIONS_PLANS_MANAGE: "subscriptions.plans.manage",

  // ============================================================
  // GIFTS
  // ============================================================

  GIFTS_VIEW: "gifts.view",
  GIFTS_MANAGE: "gifts.manage",
  GIFTS_TRANSACTIONS: "gifts.transactions",

  // ============================================================
  // MARKETING
  // ============================================================

  MARKETING_VIEW: "marketing.view",
  MARKETING_CAMPAIGNS: "marketing.campaigns",
  MARKETING_ADS: "marketing.ads",
  MARKETING_APPROVE: "marketing.approve",
  MARKETING_REJECT: "marketing.reject",
  MARKETING_ANALYTICS: "marketing.analytics",

  // ============================================================
  // LIVE
  // ============================================================

  LIVE_VIEW: "live.view",
  LIVE_MODERATE: "live.moderate",
  LIVE_REMOVE: "live.remove",
  LIVE_REPORTS: "live.reports",

  // ============================================================
  // MEETINGS
  // ============================================================

  MEETINGS_VIEW: "meetings.view",
  MEETINGS_MANAGE: "meetings.manage",
  MEETINGS_REPORTS: "meetings.reports",

  // ============================================================
  // REAL ESTATE
  // ============================================================

  REALESTATE_VIEW: "realestate.view",
  REALESTATE_MANAGE: "realestate.manage",
  REALESTATE_APPROVE: "realestate.approve",

  // ============================================================
  // DOCUMENTS
  // ============================================================

  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_MANAGE: "documents.manage",
  DOCUMENTS_REVIEW: "documents.review",

  // ============================================================
  // DESIGN
  // ============================================================

  DESIGN_VIEW: "design.view",
  DESIGN_TEMPLATES: "design.templates",
  DESIGN_REVIEW: "design.review",
  DESIGN_REMOVE: "design.remove",

  // ============================================================
  // PLAYLISTS
  // ============================================================

  PLAYLISTS_VIEW: "playlists.view",
  PLAYLISTS_MANAGE: "playlists.manage",

  // ============================================================
  // REVIEWS
  // ============================================================

  REVIEWS_VIEW: "reviews.view",
  REVIEWS_MANAGE: "reviews.manage",

  // ============================================================
  // ANALYTICS
  // ============================================================

  ANALYTICS_VIEW: "analytics.view",

  // ============================================================
  // SECURITY
  // ============================================================

  SECURITY_VIEW: "security.view",
  SECURITY_SESSIONS: "security.sessions",
  SECURITY_EVENTS: "security.events",
  SECURITY_POLICIES: "security.policies",

  // ============================================================
  // AUDIT
  // ============================================================

  AUDIT_VIEW: "audit.view",

  // ============================================================
  // SYSTEM
  // ============================================================

  SYSTEM_VIEW: "system.view",
  SYSTEM_SETTINGS: "system.settings",
  SYSTEM_FEATURES: "system.features",

  // ============================================================
  // EMERGENCY
  // ============================================================

  EMERGENCY_VIEW: "emergency.view",
  EMERGENCY_EXECUTE: "emergency.execute",

  // ============================================================
  // FOCKIS AI / VAPI
  // ============================================================

  AI_VIEW: "ai.view",
  AI_MANAGE: "ai.manage",

  AI_MANAGE_PLANS: "ai.plans.manage",
  AI_MANAGE_USERS: "ai.users.manage",
  AI_MANAGE_CONVERSATIONS: "ai.conversations.manage",
  AI_MANAGE_TOOLS: "ai.tools.manage",

  AI_RECOMMENDATIONS: "ai.recommendations",
  AI_SPECIAL_ADS: "ai.special_ads",

  AI_VIEW_USAGE: "ai.usage.view",

  AI_SETTINGS: "ai.settings",

  AI_VAPI_VIEW: "ai.vapi.view",
  AI_VAPI_MANAGE: "ai.vapi.manage",

  AI_MODERATE: "ai.moderate",

  AI_SYSTEM_CONTROL: "ai.system.control",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export type PermissionValue =
  (typeof PERMISSIONS)[PermissionKey];

export const ALL_PERMISSIONS: PermissionValue[] =
  Object.values(PERMISSIONS);

/**
 * Actions that always require the admin to type a reason
 * before proceeding.
 */
export const REASON_REQUIRED_ACTIONS = new Set<string>([
  "BLOCK",
  "DEACTIVATE",
  "SUSPEND",
  "RESTORE",
  "VIEW_SENSITIVE",
  "PERMANENT_DELETE",
  "FORCE_LOGOUT",
  "CHANGE_ADMIN_ROLE",
  "CHANGE_PERMISSIONS",
  "EMERGENCY_ACTION",
]);