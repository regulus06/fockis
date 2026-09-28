import {
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class UpdateSecurityPolicyDto {
  // ============================================================
  // PASSWORD SECURITY
  // ============================================================

  @IsOptional()
  @IsBoolean()
  strongPasswords?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(128)
  minimumPasswordLength?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  passwordHistoryCount?: number;

  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;

  @IsOptional()
  @IsBoolean()
  forcePasswordChangeAfterAdminReset?: boolean;

  @IsOptional()
  @IsBoolean()
  passwordExpirationEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  passwordExpirationDays?: number;

  @IsOptional()
  @IsBoolean()
  preventPasswordReuse?: boolean;

  // ============================================================
  // LOGIN LOCKOUT
  // ============================================================

  @IsOptional()
  @IsBoolean()
  loginLockoutEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxFailedLoginAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  loginRetryDelaySeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  accountLockoutDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  failedLoginResetMinutes?: number;

  @IsOptional()
  @IsBoolean()
  progressiveLockout?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyUserOnAccountLockout?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyAdminOnRepeatedLockout?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  repeatedLockoutNotificationThreshold?: number;

  // ============================================================
  // SESSION SECURITY
  // ============================================================

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  inactivityTimeoutMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  maximumSessionHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  rememberMeDays?: number;

  @IsOptional()
  @IsBoolean()
  revokeSessionsAfterPasswordChange?: boolean;

  @IsOptional()
  @IsBoolean()
  revokeSessionsAfterSecurityChange?: boolean;

  // ============================================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================================

  @IsOptional()
  @IsBoolean()
  requireTwoFactor?: boolean;

  @IsOptional()
  @IsBoolean()
  requireTwoFactorForAdministrators?: boolean;

  @IsOptional()
  @IsBoolean()
  allowUserTwoFactor?: boolean;

  @IsOptional()
  @IsBoolean()
  allowRecoveryCodes?: boolean;

  @IsOptional()
  @IsBoolean()
  requireReauthenticationForSensitiveActions?: boolean;

  @IsOptional()
  @IsBoolean()
  requireReauthenticationForSecurityChanges?: boolean;

  @IsOptional()
  @IsBoolean()
  requireAdminReauthentication?: boolean;

  // ============================================================
  // LOGIN NOTIFICATIONS
  // ============================================================

  @IsOptional()
  @IsBoolean()
  loginAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  failedLoginAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  suspiciousLoginAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  newDeviceAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  newLocationAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  lockoutAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  securityChangeNotifications?: boolean;

  // ============================================================
  // ACCOUNT PROTECTION
  // ============================================================

  @IsOptional()
  @IsBoolean()
  requireVerifiedEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  passwordResetProtection?: boolean;

  @IsOptional()
  @IsBoolean()
  emailChangeProtection?: boolean;

  @IsOptional()
  @IsBoolean()
  protectOrganizationOwner?: boolean;

  @IsOptional()
  @IsBoolean()
  protectLastAdministrator?: boolean;

  // ============================================================
  // AUDIT
  // ============================================================

  @IsOptional()
  @IsBoolean()
  securityAuditLog?: boolean;
}