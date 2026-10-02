import { Permission } from "./permissions.enum";
import { Role } from "./roles.enum";

/**
 * System role → baseline permissions.
 *
 * Important:
 * - USER receives no administrative permissions.
 * - MODERATOR receives moderation/audit permissions only.
 * - ADMIN receives normal administrative/marketing permissions.
 * - SUPER_ADMIN receives the complete permission catalog.
 *
 * Highly destructive/system permissions such as DELETE_DB and
 * SYSTEM_CLEANUP remain restricted to SUPER_ADMIN.
 */
export const RolePermissions: Record<Role, Permission[]> = {
  // ========================================================================
  // USER
  // ========================================================================

  [Role.USER]: [],

  // ========================================================================
  // MODERATOR
  // ========================================================================

  [Role.MODERATOR]: [
    Permission.VIEW_AUDIT,
    Permission.POST_MODERATE,
  ],

  // ========================================================================
  // ADMIN
  // ========================================================================

  [Role.ADMIN]: [
    // ----------------------------------------------------------------------
    // General administration / audit
    // ----------------------------------------------------------------------

    Permission.VIEW_AUDIT,

    // ----------------------------------------------------------------------
    // Content moderation
    // ----------------------------------------------------------------------

    Permission.DELETE_POST,
    Permission.DELETE_MEDIA,

    // ----------------------------------------------------------------------
    // Marketing overview
    // ----------------------------------------------------------------------

    Permission.MARKETING_VIEW,

    // ----------------------------------------------------------------------
    // Campaigns
    // ----------------------------------------------------------------------

    Permission.MARKETING_CAMPAIGN_VIEW,
    Permission.MARKETING_CAMPAIGN_CREATE,
    Permission.MARKETING_CAMPAIGN_EDIT,
    Permission.MARKETING_CAMPAIGN_APPROVE,
    Permission.MARKETING_CAMPAIGN_PUBLISH,
    Permission.MARKETING_CAMPAIGN_REJECT,
    Permission.MARKETING_CAMPAIGN_PAUSE,
    Permission.MARKETING_CAMPAIGN_RESUME,
    Permission.MARKETING_CAMPAIGN_BLOCK,
    Permission.MARKETING_CAMPAIGN_UNBLOCK,
    Permission.MARKETING_CAMPAIGN_ARCHIVE,

    // ----------------------------------------------------------------------
    // Advertisements
    // ----------------------------------------------------------------------

    Permission.MARKETING_AD_VIEW,
    Permission.MARKETING_AD_CREATE,
    Permission.MARKETING_AD_EDIT,
    Permission.MARKETING_AD_APPROVE,
    Permission.MARKETING_AD_PUBLISH,
    Permission.MARKETING_AD_REJECT,
    Permission.MARKETING_AD_PAUSE,
    Permission.MARKETING_AD_RESUME,
    Permission.MARKETING_AD_BLOCK,
    Permission.MARKETING_AD_UNBLOCK,
    Permission.MARKETING_AD_ARCHIVE,

    // ----------------------------------------------------------------------
    // Marketing administration
    // ----------------------------------------------------------------------

    Permission.MARKETING_ADVERTISER_VIEW,
    Permission.MARKETING_AUDIENCE_VIEW,
    Permission.MARKETING_PLACEMENT_VIEW,
    Permission.MARKETING_ANALYTICS_VIEW,
    Permission.MARKETING_BILLING_VIEW,

    // ----------------------------------------------------------------------
    // Marketing workflow
    // ----------------------------------------------------------------------

    Permission.MARKETING_WORKFLOW_VIEW,
    Permission.MARKETING_WORKFLOW_EDIT,

    // ----------------------------------------------------------------------
    // Marketing audit
    // ----------------------------------------------------------------------

    Permission.MARKETING_AUDIT_VIEW,
  ],

  // ========================================================================
  // SUPER ADMIN
  // ========================================================================

  [Role.SUPER_ADMIN]: Object.values(Permission),
};