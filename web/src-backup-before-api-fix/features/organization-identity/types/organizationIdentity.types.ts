// ============================================================================
// ORGANIZATION IDENTITY TYPES
// ============================================================================

export type OrganizationIdentityStatus =
  | "active"
  | "invited"
  | "suspended"
  | "disabled";

export type OrganizationDomainStatus =
  | "pending"
  | "verified"
  | "rejected";

export type ManagedUserRole =
  | "owner"
  | "admin"
  | "manager"
  | "staff"
  | "teacher"
  | "student"
  | "member"
  | "custom";

// ============================================================================
// FOCKIS DOMAIN CONFIGURATION
// ============================================================================

/**
 * Fockis-owned organization domain suffixes.
 *
 * These are logical Fockis namespaces. They do not imply that public DNS
 * records have been registered for every suffix.
 */
export const FOCKIS_DOMAIN_SUFFIXES = [
  ".fockis.com",
  ".fockis.org",
  ".fockis.net",
  ".fockis.edu",
  ".fockis.church",
  ".fockis.co",
  ".fockis.io",
] as const;

export type FockisDomainSuffix =
  (typeof FOCKIS_DOMAIN_SUFFIXES)[number];

/**
 * Organization domain:
 *
 * springfieldchurch.fockis.com
 * springfieldchurch.fockis.org
 * springfieldchurch.fockis.church
 */
export const FOCKIS_ORGANIZATION_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/**
 * Member domain:
 *
 * john.springfieldchurch.fockis.com
 * mary.springfieldchurch.fockis.org
 * admin.springfieldchurch.fockis.church
 */
export const FOCKIS_MEMBER_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/**
 * Member prefix rules.
 *
 * The prefix becomes the first label of the member Fockis identity:
 *
 * john + .springfieldchurch.fockis.com
 *
 * => john.springfieldchurch.fockis.com
 */
export const FOCKIS_MEMBER_PREFIX_PATTERN =
  /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/i;

// ============================================================================
// DOMAIN HELPERS
// ============================================================================

export function normalizeFockisDomain(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

export function isFockisOrganizationDomain(
  value: string,
): boolean {
  const normalized =
    normalizeFockisDomain(value);

  return FOCKIS_ORGANIZATION_DOMAIN_PATTERN.test(
    normalized,
  );
}

export function isFockisMemberDomain(
  value: string,
): boolean {
  const normalized =
    normalizeFockisDomain(value);

  return FOCKIS_MEMBER_DOMAIN_PATTERN.test(
    normalized,
  );
}

/**
 * Builds a member identity from:
 *
 * prefix = john
 * organizationDomain = springfieldchurch.fockis.com
 *
 * Result:
 *
 * john.springfieldchurch.fockis.com
 */
export function buildFockisMemberDomain(
  prefix: string,
  organizationDomain: string,
): string {
  const normalizedPrefix =
    prefix.trim().toLowerCase();

  const normalizedOrganizationDomain =
    normalizeFockisDomain(
      organizationDomain,
    );

  if (
    !FOCKIS_MEMBER_PREFIX_PATTERN.test(
      normalizedPrefix,
    )
  ) {
    throw new Error(
      "The member domain prefix contains invalid characters.",
    );
  }

  if (
    !isFockisOrganizationDomain(
      normalizedOrganizationDomain,
    )
  ) {
    throw new Error(
      "The organization must have a valid Fockis domain.",
    );
  }

  return `${normalizedPrefix}.${normalizedOrganizationDomain}`;
}

/**
 * Verifies that a member domain belongs to a specific
 * organization domain.
 *
 * Example:
 *
 * member:
 * john.springfieldchurch.fockis.com
 *
 * organization:
 * springfieldchurch.fockis.com
 *
 * => true
 */
export function memberDomainBelongsToOrganization(
  memberDomain: string,
  organizationDomain: string,
): boolean {
  const normalizedMember =
    normalizeFockisDomain(memberDomain);

  const normalizedOrganization =
    normalizeFockisDomain(
      organizationDomain,
    );

  if (
    !isFockisMemberDomain(
      normalizedMember,
    )
  ) {
    return false;
  }

  if (
    !isFockisOrganizationDomain(
      normalizedOrganization,
    )
  ) {
    return false;
  }

  return normalizedMember.endsWith(
    `.${normalizedOrganization}`,
  );
}

// ============================================================================
// ORGANIZATION IDENTITY
// ============================================================================

export interface OrganizationIdentity {
  id: string;

  organizationId: string;

  userId?: string | null;

  firstName: string;

  lastName: string;

  username: string;

  /**
   * Complete organization email / identity address.
   *
   * Example:
   * john.springfieldchurch.fockis.com
   */
  organizationEmail: string;

  recoveryEmail?: string | null;

  role: ManagedUserRole;

  customRole?: string | null;

  department?: string | null;

  /**
   * Optional legacy/reference ID for the organization domain.
   *
   * The canonical member namespace is `domain`.
   */
  domainId?: string | null;

  /**
   * Complete Fockis member domain.
   *
   * Example:
   * john.springfieldchurch.fockis.com
   */
  domain: string;

  status: OrganizationIdentityStatus;

  emailVerified: boolean;

  twoFactorEnabled: boolean;

  requirePasswordChange: boolean;

  createdAt?: string;

  updatedAt?: string;

  lastLoginAt?: string | null;
}

// ============================================================================
// ORGANIZATION DOMAIN
// ============================================================================

export interface OrganizationDomain {
  id: string;

  organizationId: string;

  /**
   * Organization's canonical Fockis domain.
   *
   * Example:
   * springfieldchurch.fockis.com
   */
  domain: string;

  status: OrganizationDomainStatus;

  verificationHost?: string | null;

  verificationValue?: string | null;

  verifiedAt?: string | null;

  createdAt?: string;
}

// ============================================================================
// SECURITY POLICY
// ============================================================================

//
// Keep this interface synchronized with SecurityPolicyCard.tsx.
//
// The security UI exposes password security, account lockout,
// session security, 2FA, re-authentication, notifications,
// recovery protection, organization protection, auditing,
// and email/identity verification.
//

export interface SecurityPolicy {
  // --------------------------------------------------------------------------
  // Password security
  // --------------------------------------------------------------------------

  strongPasswords: boolean;

  minimumPasswordLength: number;

  requirePasswordChange: boolean;

  passwordHistoryCount: number;

  forcePasswordChangeAfterAdminReset: boolean;

  passwordExpirationEnabled: boolean;

  passwordExpirationDays: number;

  preventPasswordReuse: boolean;

  // --------------------------------------------------------------------------
  // Login / account lockout
  // --------------------------------------------------------------------------

  loginLockoutEnabled: boolean;

  maxFailedLoginAttempts: number;

  loginRetryDelaySeconds: number;

  accountLockoutDurationMinutes: number;

  failedLoginResetMinutes: number;

  progressiveLockout: boolean;

  // --------------------------------------------------------------------------
  // Lockout notifications
  // --------------------------------------------------------------------------

  notifyUserOnAccountLockout: boolean;

  notifyAdminOnRepeatedLockout: boolean;

  repeatedLockoutNotificationThreshold: number;

  // --------------------------------------------------------------------------
  // Session security
  // --------------------------------------------------------------------------

  inactivityTimeoutMinutes: number;

  maximumSessionHours: number;

  rememberMeDays: number;

  revokeSessionsAfterPasswordChange: boolean;

  revokeSessionsAfterSecurityChange: boolean;

  // --------------------------------------------------------------------------
  // Two-factor authentication
  // --------------------------------------------------------------------------

  requireTwoFactor: boolean;

  allowUserTwoFactor: boolean;

  requireTwoFactorForAdministrators: boolean;

  allowRecoveryCodes: boolean;

  // --------------------------------------------------------------------------
  // Re-authentication
  // --------------------------------------------------------------------------

  requireReauthenticationForSensitiveActions: boolean;

  requireReauthenticationForSecurityChanges: boolean;

  requireAdminReauthentication: boolean;

  // --------------------------------------------------------------------------
  // Login / security notifications
  // --------------------------------------------------------------------------

  loginAlerts: boolean;

  suspiciousLoginAlerts: boolean;

  failedLoginAlerts: boolean;

  newDeviceAlerts: boolean;

  newLocationAlerts: boolean;

  lockoutAlerts: boolean;

  securityChangeNotifications: boolean;

  // --------------------------------------------------------------------------
  // Account recovery / sensitive changes
  // --------------------------------------------------------------------------

  passwordResetProtection: boolean;

  emailChangeProtection: boolean;

  // --------------------------------------------------------------------------
  // Organization protection
  // --------------------------------------------------------------------------

  protectOrganizationOwner: boolean;

  protectLastAdministrator: boolean;

  // --------------------------------------------------------------------------
  // Auditing
  // --------------------------------------------------------------------------

  securityAuditLog: boolean;

  // --------------------------------------------------------------------------
  // Email / identity verification
  // --------------------------------------------------------------------------

  requireVerifiedEmail: boolean;
}

// ============================================================================
// CREATE MANAGED USER
// ============================================================================

export interface CreateManagedUserPayload {
  firstName: string;

  lastName: string;

  username: string;

  role: ManagedUserRole;

  customRole?: string;

  department?: string;

  /**
   * Complete canonical Fockis member domain.
   *
   * Example:
   * john.springfieldchurch.fockis.com
   *
   * This is required for every newly created managed user.
   */
  domain: string;

  /**
   * Optional legacy/reference ID.
   *
   * This is retained so existing API/domain-management code does not
   * immediately break while the canonical Fockis domain becomes the
   * primary identity field.
   */
  domainId?: string;

  recoveryEmail?: string;

  sendActivationEmail: boolean;

  requirePasswordChange: boolean;

  requireTwoFactor: boolean;
}

// ============================================================================
// UPDATE MANAGED USER
// ============================================================================

export interface UpdateManagedUserPayload {
  firstName?: string;

  lastName?: string;

  username?: string;

  role?: ManagedUserRole;

  customRole?: string;

  department?: string;

  recoveryEmail?: string;

  requirePasswordChange?: boolean;

  requireTwoFactor?: boolean;
}

// ============================================================================
// DOMAIN PAYLOADS
// ============================================================================

export interface CreateDomainPayload {
  domain: string;
}

// ============================================================================
// ORGANIZATION IDENTITY STATISTICS
// ============================================================================

export interface OrganizationIdentityStats {
  totalUsers: number;

  activeUsers: number;

  invitedUsers: number;

  suspendedUsers: number;

  verifiedDomains: number;

  pendingDomains: number;
}

// ============================================================================
// ACTION RESPONSE
// ============================================================================

export interface OrganizationIdentityActionResponse {
  success?: boolean;

  message?: string;

  identity?: OrganizationIdentity;
}
