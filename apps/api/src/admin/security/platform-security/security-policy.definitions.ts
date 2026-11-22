// ============================================================================
// FOCKIS PLATFORM SECURITY POLICY — FIELD DEFINITIONS
//
// Single source of truth for every configurable security setting:
//   - which profile it belongs to (all Fockis accounts / org-managed identities)
//   - its type, validated range, unit and secure default
//   - which direction is "stricter" (used to stop organizations weakening it)
//   - whether organizations may override it (delegation)
//   - how it is enforced, so the Admin Center never shows a decorative toggle
//
// The Admin Center renders its pages from these definitions (served by
// GET /admin/security/policy), so no policy values are hard-coded in the web
// app. Cryptographic constants (bcrypt cost, token formats, TOTP parameters)
// are intentionally NOT configurable and do not appear here.
// ============================================================================

export type PolicyProfile = "accounts" | "managed";

export type PolicySectionKey =
  | "password"
  | "login"
  | "sessions"
  | "twoFactor"
  | "alerts"
  | "protection"
  | "auditing";

/**
 * How two values compare for strictness.
 *
 * - true_stricter:        `true` is stricter than `false`
 * - higher_stricter:      a larger number is stricter
 * - lower_stricter:       a smaller number is stricter
 * - lower_stricter_zero_off:
 *                         a smaller number is stricter, but 0 means "off"
 *                         (the weakest setting)
 * - none:                 not comparable; organizations cannot change it
 */
export type PolicyStrictness =
  | "true_stricter"
  | "higher_stricter"
  | "lower_stricter"
  | "lower_stricter_zero_off"
  | "none";

/**
 * enforced:     the backend enforces this value today.
 * locked:       a fixed platform guarantee; shown read-only.
 * unavailable:  Fockis has no mechanism for this yet; shown read-only and
 *               the backend refuses to change it.
 */
export type PolicyEnforcement = "enforced" | "locked" | "unavailable";

export interface PolicyFieldDefinition {
  key: string;
  section: PolicySectionKey;
  /** Extra section(s) that display the same field (no duplicate storage). */
  alsoShownIn?: PolicySectionKey[];
  label: string;
  description: string;
  type: "boolean" | "number";
  unit?: "sec" | "min" | "hrs" | "days" | "chars" | "passwords" | "attempts" | "lockouts";
  min?: number;
  max?: number;
  profiles: PolicyProfile[];
  defaults: Partial<Record<PolicyProfile, boolean | number>>;
  strictness: PolicyStrictness;
  /** May the platform delegate this field to organization administrators? */
  delegable: boolean;
  /** Delegated to organizations unless the platform changes it. */
  delegatedByDefault?: boolean;
  enforcement: PolicyEnforcement;
  /** Where/how the backend enforces it (shown to administrators). */
  enforcementNote: string;
  /** Only meaningful when this boolean field is on. */
  dependsOn?: string;
  /**
   * A change in this direction can lock people out or weaken protection
   * platform-wide. Requires explicit confirmation + reauthentication.
   */
  highRisk?: "enable" | "disable" | "decrease" | "increase" | "any";
  riskNote?: string;
}

export const POLICY_SECTIONS: {
  key: PolicySectionKey;
  title: string;
  description: string;
}[] = [
  {
    key: "password",
    title: "Password Security",
    description:
      "Password strength, reuse, expiration and administrator resets.",
  },
  {
    key: "login",
    title: "Login Protection",
    description:
      "Failed-attempt limits, retry delays and account lockout.",
  },
  {
    key: "sessions",
    title: "Session Management",
    description:
      "Inactivity timeouts, maximum session lifetime and session revocation.",
  },
  {
    key: "twoFactor",
    title: "Two-Factor Authentication",
    description:
      "Two-factor requirements, recovery codes and reauthentication.",
  },
  {
    key: "alerts",
    title: "Login Alerts",
    description:
      "In-app security notifications sent to account owners.",
  },
  {
    key: "protection",
    title: "Account Protection",
    description:
      "Password-reset, email-change and organization ownership safeguards.",
  },
  {
    key: "auditing",
    title: "Security Auditing",
    description: "Security event recording and retention.",
  },
];

const BOTH: PolicyProfile[] = ["accounts", "managed"];

export const POLICY_FIELDS: PolicyFieldDefinition[] = [
  // ==========================================================================
  // PASSWORD
  // ==========================================================================
  {
    key: "requirePasswordChange",
    section: "password",
    label: "First-login password change",
    description:
      "Managed users created with a temporary password must choose a new password the first time they sign in.",
    type: "boolean",
    profiles: ["managed"],
    defaults: { managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Applied when an organization creates a managed user; the API blocks every route except password change until it is done.",
  },
  {
    key: "strongPasswords",
    section: "password",
    label: "Strong passwords",
    description:
      "Require uppercase, lowercase, number and special character.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Checked on registration, password change, password reset and administrator resets.",
    highRisk: "disable",
    riskNote: "Turning this off lets new passwords be much weaker.",
  },
  {
    key: "minimumPasswordLength",
    section: "password",
    label: "Minimum password length",
    description: "Minimum number of characters for new passwords.",
    type: "number",
    unit: "chars",
    min: 8,
    max: 128,
    profiles: BOTH,
    defaults: { accounts: 12, managed: 12 },
    strictness: "higher_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Checked on registration, password change, password reset and administrator resets. Existing passwords are not affected until they change.",
    highRisk: "decrease",
    riskNote: "Lowering the minimum weakens every new password.",
  },
  {
    key: "preventPasswordReuse",
    section: "password",
    label: "Prevent password reuse",
    description:
      "Block new passwords that match one of the remembered previous passwords. Reusing the current password is always blocked.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Compared against bcrypt hashes of previous passwords. Plaintext passwords are never stored.",
  },
  {
    key: "passwordHistoryCount",
    section: "password",
    label: "Password history",
    description:
      "Number of previous passwords remembered and blocked from reuse.",
    type: "number",
    unit: "passwords",
    min: 0,
    max: 50,
    profiles: BOTH,
    defaults: { accounts: 50, managed: 5 },
    strictness: "higher_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Up to 50 previous bcrypt hashes are kept per account; only this many are checked.",
    dependsOn: "preventPasswordReuse",
  },
  {
    key: "forcePasswordChangeAfterAdminReset",
    section: "password",
    label: "Force change after administrator reset",
    description:
      "After an administrator resets a password, the user must replace it at next sign-in.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Applied by organization managed-user resets and platform administrator resets.",
  },
  {
    key: "passwordExpirationEnabled",
    section: "password",
    label: "Password expiration",
    description: "Require users to change their password periodically.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: false, managed: false },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "When a password is older than the limit, the API requires a password change before anything else.",
    highRisk: "enable",
    riskNote:
      "Every account whose password is older than the limit will be asked to change it at once.",
  },
  {
    key: "passwordExpirationDays",
    section: "password",
    label: "Password lifetime",
    description: "Days before a password must be changed.",
    type: "number",
    unit: "days",
    min: 1,
    max: 3650,
    profiles: BOTH,
    defaults: { accounts: 90, managed: 90 },
    strictness: "lower_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Measured from the last password change, or from account creation when no change is recorded.",
    dependsOn: "passwordExpirationEnabled",
  },

  // ==========================================================================
  // LOGIN PROTECTION
  // ==========================================================================
  {
    key: "loginLockoutEnabled",
    section: "login",
    label: "Login lockout",
    description:
      "Temporarily lock an account after too many failed sign-in attempts.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Counters are updated atomically in MongoDB, so concurrent requests and multiple API instances share one count. Unknown email addresses get the same treatment so lockouts do not reveal which accounts exist.",
    highRisk: "disable",
    riskNote: "Without lockout, passwords can be guessed without limit.",
  },
  {
    key: "maxFailedLoginAttempts",
    section: "login",
    label: "Failed login attempts",
    description: "Failed attempts allowed before the account is locked.",
    type: "number",
    unit: "attempts",
    min: 1,
    max: 100,
    profiles: BOTH,
    defaults: { accounts: 5, managed: 5 },
    strictness: "lower_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote: "Enforced by the sign-in endpoint.",
    dependsOn: "loginLockoutEnabled",
  },
  {
    key: "loginRetryDelaySeconds",
    section: "login",
    label: "Retry delay",
    description: "Seconds a user must wait after a failed attempt.",
    type: "number",
    unit: "sec",
    min: 0,
    max: 3600,
    profiles: BOTH,
    defaults: { accounts: 30, managed: 30 },
    strictness: "higher_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote: "Enforced by the sign-in endpoint.",
  },
  {
    key: "accountLockoutDurationMinutes",
    section: "login",
    label: "Account lockout duration",
    description:
      "How long an account stays locked after reaching the limit.",
    type: "number",
    unit: "min",
    min: 1,
    max: 10080,
    profiles: BOTH,
    defaults: { accounts: 15, managed: 15 },
    strictness: "higher_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote: "Enforced by sign-in and on every authenticated request.",
    dependsOn: "loginLockoutEnabled",
  },
  {
    key: "failedLoginResetMinutes",
    section: "login",
    label: "Failed-attempt reset",
    description:
      "Reset the failed-attempt counter after this long without another failure.",
    type: "number",
    unit: "min",
    min: 1,
    max: 10080,
    profiles: BOTH,
    defaults: { accounts: 30, managed: 30 },
    strictness: "higher_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote: "Enforced by the sign-in endpoint.",
    dependsOn: "loginLockoutEnabled",
  },
  {
    key: "progressiveLockout",
    section: "login",
    label: "Progressive lockout",
    description:
      "Double the lockout duration for each repeated lockout (up to 24 hours).",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: false, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Uses the account's lockout count; the count resets after a successful sign-in.",
    dependsOn: "loginLockoutEnabled",
  },
  {
    key: "notifyUserOnAccountLockout",
    section: "login",
    alsoShownIn: ["alerts"],
    label: "Notify user on lockout",
    description:
      "Send the account owner an in-app security notification when the account is locked.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Delivered through Fockis notifications. Delivery is recorded only after the notification is saved.",
  },
  {
    key: "notifyAdminOnRepeatedLockout",
    section: "login",
    label: "Notify administrators",
    description:
      "Notify administrators when an account is locked repeatedly.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Platform accounts notify platform administrators with security.view; managed users notify their organization's owner and administrators.",
  },
  {
    key: "repeatedLockoutNotificationThreshold",
    section: "login",
    label: "Repeated lockout threshold",
    description: "Lockouts before administrators are notified.",
    type: "number",
    unit: "lockouts",
    min: 1,
    max: 100,
    profiles: BOTH,
    defaults: { accounts: 3, managed: 3 },
    strictness: "lower_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote: "Counted per account since its last successful sign-in.",
    dependsOn: "notifyAdminOnRepeatedLockout",
  },

  // ==========================================================================
  // SESSIONS
  // ==========================================================================
  {
    key: "inactivityTimeoutMinutes",
    section: "sessions",
    label: "Inactivity timeout",
    description:
      "Sign the user out after this long without activity. 0 keeps the session open.",
    type: "number",
    unit: "min",
    min: 0,
    max: 10080,
    profiles: BOTH,
    defaults: { accounts: 0, managed: 0 },
    strictness: "lower_stricter_zero_off",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Checked by the API on every authenticated request using the account's last activity time.",
    highRisk: "decrease",
    riskNote:
      "A short timeout signs out everyone who is idle longer than the limit, immediately.",
  },
  {
    key: "maximumSessionHours",
    section: "sessions",
    label: "Maximum session lifetime",
    description:
      "Require signing in again after this many hours. 0 means no limit beyond the token lifetime.",
    type: "number",
    unit: "hrs",
    min: 0,
    max: 720,
    profiles: BOTH,
    defaults: { accounts: 0, managed: 0 },
    strictness: "lower_stricter_zero_off",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Checked by the API on every request from the token's issue time.",
    highRisk: "decrease",
    riskNote:
      "Sessions older than the new limit are ended immediately.",
  },
  {
    key: "rememberMeDays",
    section: "sessions",
    label: "Remember-me duration",
    description:
      "How long a \"keep me signed in\" login stays valid. 0 disables remember-me.",
    type: "number",
    unit: "days",
    min: 0,
    max: 365,
    profiles: BOTH,
    defaults: { accounts: 30, managed: 30 },
    strictness: "lower_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Sets the token lifetime when the sign-in request includes rememberMe. Other sign-ins keep the standard 7-day token.",
  },
  {
    key: "adminInactivityMinutes",
    section: "sessions",
    label: "Administrator inactivity timeout",
    description:
      "Inactivity limit for administrators and moderators inside the Admin Center.",
    type: "number",
    unit: "min",
    min: 1,
    max: 240,
    profiles: ["accounts"],
    defaults: { accounts: 10 },
    strictness: "lower_stricter",
    delegable: false,
    enforcement: "enforced",
    enforcementNote: "Applied to /admin API routes.",
  },
  {
    key: "adminMaximumSessionHours",
    section: "sessions",
    label: "Administrator maximum session",
    description: "Maximum Admin Center session for administrators.",
    type: "number",
    unit: "hrs",
    min: 1,
    max: 72,
    profiles: ["accounts"],
    defaults: { accounts: 8 },
    strictness: "lower_stricter",
    delegable: false,
    enforcement: "enforced",
    enforcementNote: "Applied to /admin API routes.",
  },
  {
    key: "superAdminInactivityMinutes",
    section: "sessions",
    label: "Super administrator inactivity timeout",
    description: "Inactivity limit for super administrators everywhere.",
    type: "number",
    unit: "min",
    min: 1,
    max: 120,
    profiles: ["accounts"],
    defaults: { accounts: 5 },
    strictness: "lower_stricter",
    delegable: false,
    enforcement: "enforced",
    enforcementNote: "Applied to every API route for super administrators.",
  },
  {
    key: "superAdminMaximumSessionHours",
    section: "sessions",
    label: "Super administrator maximum session",
    description: "Maximum session for super administrators.",
    type: "number",
    unit: "hrs",
    min: 1,
    max: 48,
    profiles: ["accounts"],
    defaults: { accounts: 4 },
    strictness: "lower_stricter",
    delegable: false,
    enforcement: "enforced",
    enforcementNote: "Applied to every API route for super administrators.",
  },
  {
    key: "revokeSessionsAfterPasswordChange",
    section: "sessions",
    label: "Revoke sessions after password change",
    description:
      "Sign out every other session when a password is changed or reset.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Tokens issued before the change are rejected server-side. The session that made the change stays signed in.",
  },
  {
    key: "revokeSessionsAfterSecurityChange",
    section: "sessions",
    label: "Revoke sessions after security changes",
    description:
      "Sign out other sessions after two-factor is turned off, recovery codes are regenerated, or the email address changes.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Tokens issued before the change are rejected server-side.",
  },

  // ==========================================================================
  // TWO-FACTOR
  // ==========================================================================
  {
    key: "requireTwoFactor",
    section: "twoFactor",
    label: "Require two-factor authentication",
    description:
      "Every account in this profile must use an authenticator app.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: false, managed: false },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Users without two-factor are guided through enrollment during sign-in before they get access, so nobody is locked out.",
    highRisk: "enable",
    riskNote:
      "Every affected user must enroll an authenticator app at their next sign-in.",
  },
  {
    key: "requireTwoFactorForAdministrators",
    section: "twoFactor",
    label: "Require two-factor for administrators",
    description:
      "Platform administrators (accounts) or organization administrators (managed identities) must use two-factor.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Checked at sign-in. Administrators cannot turn two-factor off while this is on.",
    highRisk: "disable",
    riskNote:
      "Administrators would be able to sign in with a password alone.",
  },
  {
    key: "allowUserTwoFactor",
    section: "twoFactor",
    label: "User-controlled two-factor",
    description:
      "Allow users to turn two-factor on from their own account settings.",
    type: "boolean",
    profiles: ["accounts"],
    defaults: { accounts: true },
    strictness: "none",
    delegable: false,
    enforcement: "enforced",
    enforcementNote:
      "Controls the self-service enrollment endpoints. Users who are required to use two-factor can always enroll.",
  },
  {
    key: "allowRecoveryCodes",
    section: "twoFactor",
    label: "Recovery codes",
    description:
      "Issue one-time recovery codes at enrollment and accept them at sign-in.",
    type: "boolean",
    profiles: ["accounts"],
    defaults: { accounts: true },
    strictness: "none",
    delegable: false,
    enforcement: "enforced",
    enforcementNote:
      "Codes are stored only as bcrypt hashes and each can be used once.",
    highRisk: "disable",
    riskNote:
      "Users who lose their authenticator will need an administrator recovery instead.",
  },
  {
    key: "requireReauthenticationForSecurityChanges",
    section: "twoFactor",
    label: "Reauthentication for security changes",
    description:
      "Users must confirm their password (and two-factor code) before regenerating recovery codes, enrolling two-factor from settings, or signing out other sessions.",
    type: "boolean",
    profiles: ["accounts"],
    defaults: { accounts: true },
    strictness: "true_stricter",
    delegable: false,
    enforcement: "enforced",
    enforcementNote:
      "Requires a short-lived reauthentication token from POST /auth/reauthenticate.",
  },
  {
    key: "requireReauthenticationForSensitiveActions",
    section: "twoFactor",
    label: "Sensitive-action reauthentication",
    description:
      "Password changes, email changes, turning off two-factor and account deletion always require the current password.",
    type: "boolean",
    profiles: ["accounts"],
    defaults: { accounts: true },
    strictness: "true_stricter",
    delegable: false,
    enforcement: "locked",
    enforcementNote:
      "A fixed platform guarantee: these endpoints always verify the current password and cannot be relaxed.",
  },
  {
    key: "requireAdminReauthentication",
    section: "twoFactor",
    label: "Administrator reauthentication",
    description:
      "Administrators must reauthenticate before unlocking accounts, revoking sessions or resetting two-factor.",
    type: "boolean",
    profiles: ["accounts"],
    defaults: { accounts: true },
    strictness: "true_stricter",
    delegable: false,
    enforcement: "enforced",
    enforcementNote:
      "High-risk policy changes always require reauthentication, even when this is off.",
    highRisk: "disable",
  },
  {
    key: "reauthenticationWindowMinutes",
    section: "twoFactor",
    label: "Reauthentication window",
    description: "How long a reauthentication stays valid.",
    type: "number",
    unit: "min",
    min: 1,
    max: 60,
    profiles: ["accounts"],
    defaults: { accounts: 10 },
    strictness: "lower_stricter",
    delegable: false,
    enforcement: "enforced",
    enforcementNote: "Lifetime of the reauthentication token.",
  },

  // ==========================================================================
  // ALERTS
  // ==========================================================================
  {
    key: "loginAlerts",
    section: "alerts",
    label: "Successful sign-in alerts",
    description: "Notify the user after every successful sign-in.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: false, managed: false },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote: "In-app notification on each successful sign-in.",
  },
  {
    key: "failedLoginAlerts",
    section: "alerts",
    label: "Failed sign-in alerts",
    description:
      "Notify the user when repeated failed attempts are made against the account.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Sent once when the failed-attempt count reaches half of the lockout limit, not on every failure.",
  },
  {
    key: "suspiciousLoginAlerts",
    section: "alerts",
    label: "Suspicious sign-in alerts",
    description:
      "Notify the user when a sign-in succeeds right after several failures, or from both a new device and a new network.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Signals: prior failed attempts, new device fingerprint and new network compared with the last 90 days of sign-ins.",
  },
  {
    key: "newDeviceAlerts",
    section: "alerts",
    label: "New-device alerts",
    description:
      "Notify the user when a browser or app not seen in the last 90 days signs in.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Compares the browser, operating system and device type with recent successful sign-ins.",
  },
  {
    key: "newLocationAlerts",
    section: "alerts",
    label: "New-network alerts",
    description:
      "Notify the user when a sign-in comes from a network not seen in the last 90 days.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Compares the network prefix of the sign-in address. Fockis does not use IP geolocation, so alerts describe a new network rather than a city.",
  },
  {
    key: "securityChangeNotifications",
    section: "alerts",
    label: "Security-change notifications",
    description:
      "Notify the user when their password, two-factor, email or sessions change.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote: "In-app notification; never includes codes or passwords.",
  },

  // ==========================================================================
  // ACCOUNT PROTECTION
  // ==========================================================================
  {
    key: "requireVerifiedEmail",
    section: "protection",
    label: "Verified email required",
    description:
      "Block sign-in until the account email address is verified.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: false, managed: false },
    strictness: "true_stricter",
    delegable: false,
    enforcement: "unavailable",
    enforcementNote:
      "Fockis has no email-verification flow for new accounts yet, so enforcing this would lock users out with no way to verify. It stays off until that flow exists.",
  },
  {
    key: "passwordResetProtection",
    section: "protection",
    label: "Password reset protection",
    description:
      "Allow one reset email per account every 2 minutes, end all sessions when a reset completes, and notify the user.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Applied by POST /auth/forgot-password and POST /auth/reset-password. Reset links are always single-use and expire after 15 minutes.",
  },
  {
    key: "emailChangeProtection",
    section: "protection",
    label: "Email change protection",
    description:
      "After an email change, sign out other sessions and notify the user.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: true,
    delegatedByDefault: true,
    enforcement: "enforced",
    enforcementNote:
      "Email changes always require the current password and a code sent to the new address.",
  },
  {
    key: "protectOrganizationOwner",
    section: "protection",
    label: "Protect organization owner",
    description:
      "The organization owner cannot be suspended, removed or reset through managed-user administration.",
    type: "boolean",
    profiles: ["managed"],
    defaults: { managed: true },
    strictness: "true_stricter",
    delegable: false,
    enforcement: "locked",
    enforcementNote:
      "A fixed platform guarantee enforced by the organization identity service.",
  },
  {
    key: "protectLastAdministrator",
    section: "protection",
    label: "Protect last administrator",
    description:
      "An organization cannot lose its last active administrator.",
    type: "boolean",
    profiles: ["managed"],
    defaults: { managed: true },
    strictness: "true_stricter",
    delegable: false,
    enforcement: "locked",
    enforcementNote:
      "A fixed platform guarantee enforced by the organization identity service.",
  },

  // ==========================================================================
  // AUDITING
  // ==========================================================================
  {
    key: "securityAuditLog",
    section: "auditing",
    label: "Security audit log",
    description:
      "Record security policy changes, sign-ins, lockouts, password and two-factor changes.",
    type: "boolean",
    profiles: BOTH,
    defaults: { accounts: true, managed: true },
    strictness: "true_stricter",
    delegable: false,
    enforcement: "locked",
    enforcementNote:
      "Always on. Audit records cannot be edited or deleted through the API.",
  },
  {
    key: "authEventRetentionDays",
    section: "auditing",
    label: "Sign-in event retention",
    description:
      "How long successful and failed sign-in events are kept. Policy changes and administrator actions are kept permanently.",
    type: "number",
    unit: "days",
    min: 30,
    max: 730,
    profiles: ["accounts"],
    defaults: { accounts: 180 },
    strictness: "none",
    delegable: false,
    enforcement: "enforced",
    enforcementNote:
      "Applied when each sign-in event is written (MongoDB TTL index).",
  },
];

export const POLICY_FIELD_MAP: ReadonlyMap<string, PolicyFieldDefinition> =
  new Map(POLICY_FIELDS.map((field) => [field.key, field]));

export type PolicyValues = Record<string, boolean | number>;

export function defaultsFor(profile: PolicyProfile): PolicyValues {
  const values: PolicyValues = {};

  for (const field of POLICY_FIELDS) {
    if (!field.profiles.includes(profile)) continue;

    const value = field.defaults[profile];

    if (value !== undefined) values[field.key] = value;
  }

  return values;
}

export function defaultDelegatedFields(): string[] {
  return POLICY_FIELDS.filter(
    (field) =>
      field.delegable &&
      field.delegatedByDefault &&
      field.profiles.includes("managed"),
  ).map((field) => field.key);
}

// ============================================================================
// STRICTNESS
// ============================================================================

/**
 * Returns the stricter of two values for a field.
 */
export function stricterValue(
  field: PolicyFieldDefinition,
  a: boolean | number | undefined,
  b: boolean | number | undefined,
): boolean | number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;

  switch (field.strictness) {
    case "true_stricter":
      return Boolean(a) || Boolean(b);

    case "higher_stricter":
      return Math.max(Number(a), Number(b));

    case "lower_stricter":
      return Math.min(Number(a), Number(b));

    case "lower_stricter_zero_off": {
      const x = Number(a);
      const y = Number(b);

      if (x === 0) return y;
      if (y === 0) return x;

      return Math.min(x, y);
    }

    default:
      return a;
  }
}

/**
 * True when `candidate` is weaker than `floor`.
 */
export function isWeaker(
  field: PolicyFieldDefinition,
  candidate: boolean | number,
  floor: boolean | number,
): boolean {
  if (field.strictness === "none") return candidate !== floor;

  const stricter = stricterValue(field, candidate, floor);

  return stricter !== candidate && stricter === floor && candidate !== floor;
}

/**
 * Validate one value against its definition. Returns an error string or null.
 */
export function validateFieldValue(
  field: PolicyFieldDefinition,
  value: unknown,
): string | null {
  if (field.type === "boolean") {
    return typeof value === "boolean"
      ? null
      : `${field.label} must be on or off.`;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `${field.label} must be a number.`;
  }

  if (!Number.isInteger(value)) {
    return `${field.label} must be a whole number.`;
  }

  if (field.min !== undefined && value < field.min) {
    return `${field.label} must be at least ${field.min}.`;
  }

  if (field.max !== undefined && value > field.max) {
    return `${field.label} must be at most ${field.max}.`;
  }

  return null;
}
