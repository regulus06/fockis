import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type OrganizationSecurityPolicyDocument =
  HydratedDocument<OrganizationSecurityPolicy>;

@Schema({
  timestamps: true,
  collection: "organization_security_policies",
})
export class OrganizationSecurityPolicy {
  // ============================================================
  // ORGANIZATION
  // ============================================================

  @Prop({
    type: Types.ObjectId,
    ref: "Organization",
    required: true,
    unique: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  // ============================================================
  // PASSWORD SECURITY
  // ============================================================

  /**
   * Require strong passwords.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  strongPasswords!: boolean;

  /**
   * Minimum password length.
   *
   * Admin chooses the value.
   */
  @Prop({
    type: Number,
    default: 12,
    min: 1,
    max: 128,
  })
  minimumPasswordLength!: number;

  /**
   * Number of previous passwords that cannot be reused.
   *
   * Example:
   * 5 = remember the previous 5 passwords.
   */
  @Prop({
    type: Number,
    default: 5,
    min: 0,
    max: 50,
  })
  passwordHistoryCount!: number;

  /**
   * Require password change on first login.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  requirePasswordChange!: boolean;

  /**
   * Force password change after an administrator resets
   * the user's password.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  forcePasswordChangeAfterAdminReset!: boolean;

  /**
   * Enable password expiration.
   */
  @Prop({
    type: Boolean,
    default: false,
  })
  passwordExpirationEnabled!: boolean;

  /**
   * Number of days before a password expires.
   */
  @Prop({
    type: Number,
    default: 90,
    min: 1,
    max: 3650,
  })
  passwordExpirationDays!: number;

  /**
   * Prevent users from reusing their current password.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  preventPasswordReuse!: boolean;

  // ============================================================
  // LOGIN LOCKOUT
  // ============================================================

  /**
   * Enable failed-login protection.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  loginLockoutEnabled!: boolean;

  /**
   * Number of failed login attempts before lockout.
   *
   * ADMIN CONTROLLED.
   *
   * Example:
   * 3, 5, 10, 20, etc.
   */
  @Prop({
    type: Number,
    default: 5,
    min: 1,
    max: 100,
  })
  maxFailedLoginAttempts!: number;

  /**
   * Number of seconds the user must wait between
   * failed login attempts.
   *
   * ADMIN CONTROLLED.
   */
  @Prop({
    type: Number,
    default: 30,
    min: 0,
    max: 86400,
  })
  loginRetryDelaySeconds!: number;

  /**
   * How long the account remains locked.
   *
   * ADMIN CONTROLLED.
   */
  @Prop({
    type: Number,
    default: 15,
    min: 1,
    max: 10080,
  })
  accountLockoutDurationMinutes!: number;

  /**
   * Failed-attempt counter is reset after this many
   * minutes without another failed login.
   *
   * ADMIN CONTROLLED.
   */
  @Prop({
    type: Number,
    default: 30,
    min: 1,
    max: 10080,
  })
  failedLoginResetMinutes!: number;

  /**
   * Progressive lockout.
   *
   * Example:
   *
   * First lockout: 15 minutes
   * Second lockout: 30 minutes
   * Third lockout: 60 minutes
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  progressiveLockout!: boolean;

  /**
   * Notify the user when their account is locked.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  notifyUserOnAccountLockout!: boolean;

  /**
   * Notify administrators after repeated lockouts.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  notifyAdminOnRepeatedLockout!: boolean;

  /**
   * Number of lockouts before administrators are notified.
   *
   * Example:
   * 3 = notify admin after 3 lockouts.
   */
  @Prop({
    type: Number,
    default: 3,
    min: 1,
    max: 100,
  })
  repeatedLockoutNotificationThreshold!: number;

  // ============================================================
  // SESSION SECURITY
  // ============================================================

  /**
   * Automatically expire inactive sessions.
   *
   * Set to 0 to disable.
   */
  @Prop({
    type: Number,
    default: 15,
    min: 0,
    max: 10080,
  })
  inactivityTimeoutMinutes!: number;

  /**
   * Maximum session duration.
   *
   * Set to 0 to disable.
   */
  @Prop({
    type: Number,
    default: 12,
    min: 0,
    max: 720,
  })
  maximumSessionHours!: number;

  /**
   * Remember-me duration.
   *
   * Set to 0 to disable.
   */
  @Prop({
    type: Number,
    default: 30,
    min: 0,
    max: 3650,
  })
  rememberMeDays!: number;

  /**
   * Revoke all sessions after password change.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  revokeSessionsAfterPasswordChange!: boolean;

  /**
   * Revoke all sessions after a security setting change.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  revokeSessionsAfterSecurityChange!: boolean;

  // ============================================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================================

  /**
   * Require 2FA for organization users.
   */
  @Prop({
    type: Boolean,
    default: false,
  })
  requireTwoFactor!: boolean;

  /**
   * Require 2FA specifically for administrators.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  requireTwoFactorForAdministrators!: boolean;

  /**
   * Allow users to enable 2FA themselves.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  allowUserTwoFactor!: boolean;

  /**
   * Allow recovery codes.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  allowRecoveryCodes!: boolean;

  /**
   * Require re-authentication for sensitive actions.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  requireReauthenticationForSensitiveActions!: boolean;

  /**
   * Require re-authentication before changing
   * security settings.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  requireReauthenticationForSecurityChanges!: boolean;

  /**
   * Require administrator re-authentication for
   * high-risk organization operations.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  requireAdminReauthentication!: boolean;

  // ============================================================
  // LOGIN NOTIFICATIONS
  // ============================================================

  /**
   * Successful login notifications.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  loginAlerts!: boolean;

  /**
   * Failed login notifications.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  failedLoginAlerts!: boolean;

  /**
   * Suspicious login notifications.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  suspiciousLoginAlerts!: boolean;

  /**
   * New device notifications.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  newDeviceAlerts!: boolean;

  /**
   * New location notifications.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  newLocationAlerts!: boolean;

  /**
   * Account lockout notifications.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  lockoutAlerts!: boolean;

  /**
   * Security-change notifications.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  securityChangeNotifications!: boolean;

  // ============================================================
  // ACCOUNT PROTECTION
  // ============================================================

  /**
   * Require verified email before full access.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  requireVerifiedEmail!: boolean;

  /**
   * Additional protection around password resets.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  passwordResetProtection!: boolean;

  /**
   * Additional protection around email changes.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  emailChangeProtection!: boolean;

  /**
   * Protect organization owner.
   *
   * This should normally remain enabled.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  protectOrganizationOwner!: boolean;

  /**
   * Protect the last administrator.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  protectLastAdministrator!: boolean;

  // ============================================================
  // AUDITING
  // ============================================================

  /**
   * Security audit log.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  securityAuditLog!: boolean;
}

export const OrganizationSecurityPolicySchema =
  SchemaFactory.createForClass(
    OrganizationSecurityPolicy,
  );