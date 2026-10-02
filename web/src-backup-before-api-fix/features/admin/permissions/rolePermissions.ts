import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  type PermissionValue,
} from "./permission.constants";

import type { AdminRole } from "../types/admin.types";

const P = PERMISSIONS;

/**
 * Explicit grant table.
 *
 * SUPER_ADMIN receives every permission in the catalogue.
 * Scoped administrator roles only receive permissions relevant
 * to their administration area.
 */
export const ROLE_PERMISSIONS: Record<
  AdminRole,
  PermissionValue[]
> = {
  // ============================================================
  // SUPER ADMIN
  // ============================================================

  SUPER_ADMIN: ALL_PERMISSIONS,

  // ============================================================
  // USERS
  // ============================================================

  USER_ADMIN: [
    P.USERS_VIEW,
    P.USERS_VIEW_BASIC,
    P.USERS_VIEW_CONTACT,
    P.USERS_VIEW_SECURITY,
    P.USERS_CREATE,
    P.USERS_EDIT,
    P.USERS_ACTIVATE,
    P.USERS_DEACTIVATE,
    P.USERS_SUSPEND,
    P.USERS_BLOCK,
    P.USERS_RESTORE,
    P.USERS_DELETE_REQUEST,
    P.USERS_FORCE_LOGOUT,
    P.USERS_RECOVERY,
    P.AUDIT_VIEW,
  ],

  // ============================================================
  // MODERATION
  // ============================================================

  MODERATION_ADMIN: [
    P.MODERATION_VIEW,
    P.MODERATION_REVIEW,
    P.MODERATION_RESTRICT,
    P.MODERATION_RESTORE,

    P.USERS_VIEW,
    P.USERS_VIEW_BASIC,
    P.USERS_SUSPEND,
    P.USERS_BLOCK,

    P.LIVE_MODERATE,
    P.LIVE_REMOVE,
    P.LIVE_REPORTS,

    P.PLAYLISTS_MANAGE,
    P.REVIEWS_MANAGE,

    P.AI_MODERATE,
  ],

  // ============================================================
  // SUPPORT
  // ============================================================

  SUPPORT_ADMIN: [
    P.SUPPORT_VIEW,
    P.SUPPORT_CREATE,
    P.SUPPORT_ASSIGN,
    P.SUPPORT_RESOLVE,

    P.USERS_VIEW,
    P.USERS_VIEW_BASIC,
    P.USERS_VIEW_CONTACT,
    P.USERS_RECOVERY,
  ],

  // ============================================================
  // MARKETPLACE
  // ============================================================

  MARKETPLACE_ADMIN: [
    P.MARKETPLACE_VIEW,
    P.MARKETPLACE_PRODUCTS_VIEW,
    P.MARKETPLACE_PRODUCTS_APPROVE,
    P.MARKETPLACE_PRODUCTS_REJECT,
    P.MARKETPLACE_PRODUCTS_REMOVE,

    P.MARKETPLACE_SELLERS_VIEW,
    P.MARKETPLACE_SELLERS_APPROVE,
    P.MARKETPLACE_SELLERS_SUSPEND,

    P.MARKETPLACE_ORDERS_VIEW,
    P.MARKETPLACE_DISPUTES_MANAGE,
    P.MARKETPLACE_REVIEWS_MANAGE,
  ],

  SELLER_ADMIN: [
    P.MARKETPLACE_SELLERS_VIEW,
    P.MARKETPLACE_SELLERS_APPROVE,
    P.MARKETPLACE_SELLERS_SUSPEND,
    P.MARKETPLACE_VIEW,
  ],

  // ============================================================
  // SHIPPING
  // ============================================================

  SHIPPING_ADMIN: [
    P.SHIPPING_VIEW,
    P.SHIPPING_MANAGE,
  ],

  // ============================================================
  // FINANCE
  // ============================================================

  FINANCE_ADMIN: [
    P.FINANCE_VIEW,
    P.FINANCE_TRANSACTIONS,
    P.FINANCE_REFUNDS,
    P.FINANCE_PAYOUTS,
    P.FINANCE_EARNINGS,
    P.USERS_VIEW_FINANCIAL,
  ],

  // ============================================================
  // PAYMENTS
  // ============================================================

  PAYMENTS_ADMIN: [
    P.PAYMENTS_VIEW,
    P.PAYMENTS_MANAGE,
    P.PAYMENTS_REFUNDS,
  ],

  // ============================================================
  // SUBSCRIPTIONS
  // ============================================================

  SUBSCRIPTION_ADMIN: [
    P.SUBSCRIPTIONS_VIEW,
    P.SUBSCRIPTIONS_MANAGE,
    P.SUBSCRIPTIONS_PLANS_MANAGE,
  ],

  // ============================================================
  // GIFTS
  // ============================================================

  GIFTS_ADMIN: [
    P.GIFTS_VIEW,
    P.GIFTS_MANAGE,
    P.GIFTS_TRANSACTIONS,
  ],

  // ============================================================
  // MARKETING
  // ============================================================

  MARKETING_ADMIN: [
    P.MARKETING_VIEW,
    P.MARKETING_CAMPAIGNS,
    P.MARKETING_ADS,
    P.MARKETING_APPROVE,
    P.MARKETING_REJECT,
    P.MARKETING_ANALYTICS,
  ],

  // ============================================================
  // LIVE
  // ============================================================

  LIVE_ADMIN: [
    P.LIVE_VIEW,
    P.LIVE_MODERATE,
    P.LIVE_REMOVE,
    P.LIVE_REPORTS,
  ],

  // ============================================================
  // MEETINGS
  // ============================================================

  MEETINGS_ADMIN: [
    P.MEETINGS_VIEW,
    P.MEETINGS_MANAGE,
    P.MEETINGS_REPORTS,
  ],

  // ============================================================
  // REAL ESTATE
  // ============================================================

  REAL_ESTATE_ADMIN: [
    P.REALESTATE_VIEW,
    P.REALESTATE_MANAGE,
    P.REALESTATE_APPROVE,
  ],

  // ============================================================
  // DOCUMENTS
  // ============================================================

  DOCUMENT_ADMIN: [
    P.DOCUMENTS_VIEW,
    P.DOCUMENTS_MANAGE,
    P.DOCUMENTS_REVIEW,
  ],

  // ============================================================
  // DESIGN
  // ============================================================

  DESIGN_ADMIN: [
    P.DESIGN_VIEW,
    P.DESIGN_TEMPLATES,
    P.DESIGN_REVIEW,
    P.DESIGN_REMOVE,
  ],

  // ============================================================
  // PLAYLISTS
  // ============================================================

  PLAYLIST_ADMIN: [
    P.PLAYLISTS_VIEW,
    P.PLAYLISTS_MANAGE,
  ],

  // ============================================================
  // REVIEWS
  // ============================================================

  REVIEWS_ADMIN: [
    P.REVIEWS_VIEW,
    P.REVIEWS_MANAGE,
  ],

  // ============================================================
  // ANALYTICS
  // ============================================================

  ANALYTICS_ADMIN: [
    P.ANALYTICS_VIEW,
  ],

  // ============================================================
  // SECURITY
  // ============================================================

  SECURITY_ADMIN: [
    P.SECURITY_VIEW,
    P.SECURITY_SESSIONS,
    P.SECURITY_EVENTS,
    P.SECURITY_POLICIES,

    P.USERS_VIEW_SECURITY,
    P.USERS_FORCE_LOGOUT,

    P.AUDIT_VIEW,

    P.EMERGENCY_VIEW,
  ],

  // ============================================================
  // AUDITOR
  // ============================================================

  AUDITOR: [
    P.AUDIT_VIEW,
    P.ANALYTICS_VIEW,
    P.SECURITY_VIEW,
  ],
};

export function getPermissionsForRole(
  role: AdminRole,
): PermissionValue[] {
  return ROLE_PERMISSIONS[role] ?? [];
}