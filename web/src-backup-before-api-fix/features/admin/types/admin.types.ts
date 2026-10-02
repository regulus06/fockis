// ============================================================
// FOCKIS ADMIN — CORE TYPES
// ============================================================

/**
 * Built-in administrator roles.
 *
 * Dynamic/custom roles are represented separately by AdminRoleRecord.
 * Keep these values for existing frontend role-based functionality.
 */
export type AdminRole =
  | "SUPER_ADMIN"
  | "USER_ADMIN"
  | "MODERATION_ADMIN"
  | "SUPPORT_ADMIN"
  | "MARKETPLACE_ADMIN"
  | "SELLER_ADMIN"
  | "SHIPPING_ADMIN"
  | "FINANCE_ADMIN"
  | "PAYMENTS_ADMIN"
  | "SUBSCRIPTION_ADMIN"
  | "GIFTS_ADMIN"
  | "MARKETING_ADMIN"
  | "LIVE_ADMIN"
  | "MEETINGS_ADMIN"
  | "REAL_ESTATE_ADMIN"
  | "DOCUMENT_ADMIN"
  | "DESIGN_ADMIN"
  | "PLAYLIST_ADMIN"
  | "REVIEWS_ADMIN"
  | "ANALYTICS_ADMIN"
  | "SECURITY_ADMIN"
  | "AUDITOR";

/**
 * A permission assigned to an administrator.
 *
 * Runtime validation is performed against the backend permission catalogue.
 */
export type AdminPermission = string;

/**
 * Stronger alias used by dynamic RBAC APIs.
 */
export type AdminPermissionValue = AdminPermission;

/**
 * Administrator account status.
 */
export type AdminAccountStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED"
  | "BLOCKED";

/**
 * ============================================================
 * ADMINISTRATOR
 * ============================================================
 */

export interface AdminUser {
  id: string;

  name: string;

  email: string;

  role: AdminRole;

  /**
   * Dynamic role assigned by the backend.
   *
   * Existing administrators can continue using `role`.
   * New RBAC administrators can additionally use `adminRoleId`.
   */
  adminRoleId?: string | null;

  /**
   * Human-readable dynamic role name.
   */
  adminRoleName?: string | null;

  /**
   * Effective permissions returned by the backend/session.
   */
  permissions?: AdminPermission[];

  status: AdminAccountStatus;

  twoFactorEnabled: boolean;

  lastLogin: string | null;

  lastActivity: string | null;

  activeSessions: number;

  failedLoginAttempts: number;

  securityAlerts: number;

  createdAt: string;
}

/**
 * ============================================================
 * DYNAMIC ADMIN ROLE
 * ============================================================
 *
 * Used by:
 *
 * Super Admin
 *      ↓
 * Manager
 *      ↓
 * Supervisor
 *      ↓
 * Custom/scoped administrator roles
 *
 * The backend remains authoritative for permission validation.
 */

export interface AdminRoleRecord {
  id: string;

  name: string;

  slug: string;

  description: string;

  permissions: AdminPermission[];

  isActive: boolean;

  /**
   * System roles cannot normally be edited or deleted
   * through the custom role manager.
   */
  isSystemRole: boolean;

  createdBy?: string | null;

  updatedBy?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

/**
 * Payload used when creating a dynamic administrator role.
 */
export interface CreateAdminRoleInput {
  name: string;

  slug?: string;

  description?: string;

  permissions: AdminPermission[];

  isActive?: boolean;
}

/**
 * Payload used when updating a dynamic administrator role.
 */
export interface UpdateAdminRoleInput {
  name?: string;

  slug?: string;

  description?: string;

  permissions?: AdminPermission[];

  isActive?: boolean;
}

/**
 * ============================================================
 * PERMISSION CATALOG
 * ============================================================
 */

export interface AdminPermissionCatalogItem {
  key: AdminPermission;

  label: string;

  description?: string;

  category?: string;

  /**
   * Optional grouping used by the Admin Center UI.
   */
  group?: string;

  /**
   * Allows the frontend to visually identify sensitive
   * permissions such as permanent deletion or emergency access.
   */
  sensitive?: boolean;

  /**
   * Whether this permission can be delegated by the current
   * administrator. The backend remains authoritative.
   */
  delegatable?: boolean;
}

/**
 * Permission group for the Admin Center permission matrix.
 */
export interface AdminPermissionGroup {
  id: string;

  name: string;

  description?: string;

  permissions: AdminPermissionCatalogItem[];
}

/**
 * Effective RBAC information for the currently logged-in admin.
 */
export interface AdminRbacContext {
  administratorId: string;

  role: AdminRole | null;

  adminRoleId?: string | null;

  adminRoleName?: string | null;

  permissions: AdminPermission[];

  /**
   * Whether this administrator is allowed to create roles.
   */
  canCreateRoles: boolean;

  /**
   * Whether this administrator is allowed to edit roles.
   */
  canEditRoles: boolean;

  /**
   * Whether this administrator is allowed to delete roles.
   */
  canDeleteRoles: boolean;

  /**
   * Whether this administrator is allowed to assign permissions.
   */
  canAssignPermissions: boolean;
}

/**
 * ============================================================
 * PLATFORM USERS
 * ============================================================
 */

export type UserAccountStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED"
  | "BLOCKED"
  | "PENDING_REVIEW"
  | "PENDING_DELETION"
  | "PERMANENTLY_DELETED";

export interface PlatformUser {
  id: string;

  name: string;

  username: string;

  email: string;

  avatarSeed: string;

  role:
    | "MEMBER"
    | "SELLER"
    | "CREATOR"
    | "AGENT";

  status: UserAccountStatus;

  verified: boolean;

  flags: string[];

  createdAt: string;

  lastLogin: string | null;

  blockCaseId?: string;

  blockedAt?: string;

  blockedBy?: string;

  blockReason?: string;

  blockNotes?: string;

  userNotified?: boolean;

  reviewStatus?:
    | "PENDING"
    | "UNDER_REVIEW"
    | "RESOLVED";

  suspensionStart?: string;

  suspensionEnd?: string;

  deactivationReason?: string;

  deletionCaseId?: string;

  deletionReason?: string;

  deletedBy?: string;

  deletedAt?: string;
}

/**
 * ============================================================
 * AUDIT
 * ============================================================
 */

export type AuditActionType =
  | "USER_ACTIVATE"
  | "USER_DEACTIVATE"
  | "USER_SUSPEND"
  | "USER_BLOCK"
  | "USER_UNBLOCK"
  | "USER_RESTORE"
  | "USER_DELETE_REQUEST"
  | "USER_DELETE_APPROVED"
  | "USER_PERMANENT_DELETE"
  | "USER_FORCE_LOGOUT"
  | "USER_PASSWORD_RESET_REQUEST"
  | "USER_RECOVERY_CASE_CREATED"
  | "USER_SENSITIVE_DATA_VIEW"

  | "ADMIN_CREATED"
  | "ADMIN_UPDATED"
  | "ADMIN_SUSPENDED"
  | "ADMIN_DEACTIVATED"
  | "ADMIN_RESTORED"
  | "ADMIN_ROLE_CHANGED"
  | "ADMIN_PERMISSION_CHANGED"

  | "ADMIN_ROLE_CREATED"
  | "ADMIN_ROLE_UPDATED"
  | "ADMIN_ROLE_DELETED"

  | "SECURITY_POLICY_CHANGED"
  | "FEATURE_FLAG_CHANGED"
  | "EMERGENCY_ACTION"
  | "MARKETPLACE_APPROVAL"
  | "MARKETPLACE_REJECTION"
  | "MODERATION_ACTION"
  | "SUPPORT_CASE_ACTION";

export type AuditResult =
  | "SUCCESS"
  | "FAILURE"
  | "DENIED";

export type AuditRisk =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export interface AuditEvent {
  id: string;

  timestamp: string;

  actor: string;

  actorRole: AdminRole;

  action: AuditActionType;

  resource: string;

  target: string;

  targetId?: string;

  previousValue?: string;

  newValue?: string;

  reason?: string;

  ip: string;

  session: string;

  requestId: string;

  result: AuditResult;

  risk: AuditRisk;
}

/**
 * ============================================================
 * RECOVERY
 * ============================================================
 */

export interface RecoveryCase {
  id: string;

  userId: string;

  userName: string;

  reason: string;

  verificationStatus:
    | "UNVERIFIED"
    | "VERIFYING"
    | "VERIFIED";

  assignedAdmin: string | null;

  status:
    | "OPEN"
    | "VERIFYING"
    | "ESCALATED"
    | "APPROVED"
    | "COMPLETED"
    | "REJECTED";

  createdAt: string;

  updatedAt: string;
}

/**
 * ============================================================
 * SUPPORT
 * ============================================================
 */

export interface SupportCase {
  id: string;

  userId: string;

  userName: string;

  subject: string;

  category: string;

  status:
    | "OPEN"
    | "ASSIGNED"
    | "AWAITING_USER"
    | "ESCALATED"
    | "RESOLVED"
    | "CLOSED";

  assignedAdmin: string | null;

  priority:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "URGENT";

  createdAt: string;

  updatedAt: string;
}

/**
 * ============================================================
 * ADMIN NOTIFICATIONS
 * ============================================================
 */

export interface AdminNotification {
  id: string;

  type:
    | "RECOVERY_CASE"
    | "SECURITY_ALERT"
    | "MODERATION_ESCALATION"
    | "MARKETPLACE_DISPUTE"
    | "PENDING_DELETION"
    | "FAILED_PAYMENT"
    | "PAYOUT_ISSUE"
    | "ADMIN_PERMISSION_CHANGE"
    | "SYSTEM_ALERT";

  title: string;

  message: string;

  timestamp: string;

  read: boolean;

  severity:
    | "INFO"
    | "WARNING"
    | "CRITICAL";
}

/**
 * ============================================================
 * DASHBOARD
 * ============================================================
 */

export interface DashboardStats {
  totalUsers: number;

  activeUsers: number;

  blockedUsers: number;

  suspendedUsers: number;

  pendingRecoveryCases: number;

  pendingModerationCases: number;

  pendingMarketplaceReviews: number;

  pendingPayouts: number;

  openSupportCases: number;

  securityAlerts: number;

  pendingDeletionRequests: number;

  revenue: number;

  marketplaceGmv: number;

  activeLiveStreams: number;

  activeMeetings: number;

  subscriptionRevenue: number;
}

/**
 * ============================================================
 * ADMIN API RESPONSES
 * ============================================================
 */

export interface AdminRoleListResponse {
  roles: AdminRoleRecord[];
}

export interface AdminPermissionListResponse {
  permissions: AdminPermissionCatalogItem[];
}

/**
 * ============================================================
 * ADMIN ROLE ASSIGNMENT
 * ============================================================
 */

export interface AssignAdminRoleInput {
  administratorId: string;

  roleId: string;

  reason?: string;
}

/**
 * Used by the administrator creation/editing UI.
 */
export interface CreateAdministratorInput {
  name: string;

  email: string;

  password?: string;

  role?: AdminRole;

  adminRoleId?: string | null;

  permissions?: AdminPermission[];

  twoFactorRequired?: boolean;
}

/**
 * Used by the administrator update UI.
 */
export interface UpdateAdministratorInput {
  name?: string;

  email?: string;

  status?: AdminAccountStatus;

  role?: AdminRole;

  adminRoleId?: string | null;

  permissions?: AdminPermission[];

  twoFactorRequired?: boolean;

  reason?: string;
}

/**
 * ============================================================
 * SECURITY / ERRORS
 * ============================================================
 */

export class ForbiddenError extends Error {
  constructor(permission: string) {
    super(
      `FORBIDDEN: missing permission "${permission}"`,
    );

    this.name = "ForbiddenError";
  }
}