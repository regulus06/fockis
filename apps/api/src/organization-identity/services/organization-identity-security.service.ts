import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  UpdateSecurityPolicyDto,
} from "../dto/update-security-policy.dto";

import {
  OrganizationIdentityCommonService,
} from "./organization-identity-common.service";

import type {
  SecurityPolicyResponse,
} from "./organization-identity.service";

@Injectable()
export class OrganizationIdentitySecurityService {
  constructor(
    private readonly common: OrganizationIdentityCommonService,
  ) {}

  // ==========================================================================
  // GET
  // ==========================================================================

  async getSecurityPolicy(
    organizationId: string,
    actorUserId: string,
  ): Promise<SecurityPolicyResponse> {
    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const policy =
      await this.common.getOrCreateSecurityPolicy(
        organization._id,
      );

    return this.common.toPolicyResponse(
      policy,
    );
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  async updateSecurityPolicy(
    organizationId: string,
    dto: UpdateSecurityPolicyDto,
    actorUserId: string,
  ): Promise<SecurityPolicyResponse> {
    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    // ------------------------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------------------------

    if (
      dto.minimumPasswordLength !==
      undefined &&
      (
        dto.minimumPasswordLength < 8 ||
        dto.minimumPasswordLength > 128
      )
    ) {
      throw new BadRequestException(
        "Minimum password length must be between 8 and 128 characters.",
      );
    }

    if (
      dto.passwordHistoryCount !==
      undefined &&
      (
        dto.passwordHistoryCount < 0 ||
        dto.passwordHistoryCount > 50
      )
    ) {
      throw new BadRequestException(
        "Password history count must be between 0 and 50.",
      );
    }

    if (
      dto.passwordExpirationDays !==
      undefined &&
      (
        dto.passwordExpirationDays < 1 ||
        dto.passwordExpirationDays > 3650
      )
    ) {
      throw new BadRequestException(
        "Password expiration must be between 1 and 3650 days.",
      );
    }

    if (
      dto.maxFailedLoginAttempts !==
      undefined &&
      (
        dto.maxFailedLoginAttempts < 1 ||
        dto.maxFailedLoginAttempts > 100
      )
    ) {
      throw new BadRequestException(
        "Maximum failed login attempts must be between 1 and 100.",
      );
    }

    if (
      dto.loginRetryDelaySeconds !==
      undefined &&
      (
        dto.loginRetryDelaySeconds < 0 ||
        dto.loginRetryDelaySeconds > 86400
      )
    ) {
      throw new BadRequestException(
        "Login retry delay must be between 0 and 86400 seconds.",
      );
    }

    if (
      dto.accountLockoutDurationMinutes !==
      undefined &&
      (
        dto.accountLockoutDurationMinutes < 1 ||
        dto.accountLockoutDurationMinutes > 10080
      )
    ) {
      throw new BadRequestException(
        "Account lockout duration must be between 1 and 10080 minutes.",
      );
    }

    if (
      dto.failedLoginResetMinutes !==
      undefined &&
      (
        dto.failedLoginResetMinutes < 1 ||
        dto.failedLoginResetMinutes > 10080
      )
    ) {
      throw new BadRequestException(
        "Failed-login reset duration must be between 1 and 10080 minutes.",
      );
    }

    if (
      dto.repeatedLockoutNotificationThreshold !==
      undefined &&
      (
        dto.repeatedLockoutNotificationThreshold < 1 ||
        dto.repeatedLockoutNotificationThreshold > 100
      )
    ) {
      throw new BadRequestException(
        "Repeated-lockout notification threshold must be between 1 and 100.",
      );
    }

    if (
      dto.inactivityTimeoutMinutes !==
      undefined &&
      (
        dto.inactivityTimeoutMinutes < 0 ||
        dto.inactivityTimeoutMinutes > 10080
      )
    ) {
      throw new BadRequestException(
        "Inactivity timeout must be between 0 and 10080 minutes.",
      );
    }

    if (
      dto.maximumSessionHours !==
      undefined &&
      (
        dto.maximumSessionHours < 0 ||
        dto.maximumSessionHours > 720
      )
    ) {
      throw new BadRequestException(
        "Maximum session duration must be between 0 and 720 hours.",
      );
    }

    if (
      dto.rememberMeDays !==
      undefined &&
      (
        dto.rememberMeDays < 0 ||
        dto.rememberMeDays > 3650
      )
    ) {
      throw new BadRequestException(
        "Remember-me duration must be between 0 and 3650 days.",
      );
    }

    const existingPolicy =
      await this.common.getOrCreateSecurityPolicy(
        organization._id,
      );

    const update:
      Record<string, unknown> = {};

    // ------------------------------------------------------------------------
    // PASSWORD
    // ------------------------------------------------------------------------

    const passwordFields = [
      "strongPasswords",
      "minimumPasswordLength",
      "passwordHistoryCount",
      "requirePasswordChange",
      "forcePasswordChangeAfterAdminReset",
      "passwordExpirationEnabled",
      "passwordExpirationDays",
      "preventPasswordReuse",
    ] as const;

    for (const field of passwordFields) {
      if (dto[field] !== undefined) {
        update[field] = dto[field];
      }
    }

    // ------------------------------------------------------------------------
    // LOCKOUT
    // ------------------------------------------------------------------------

    const lockoutFields = [
      "loginLockoutEnabled",
      "maxFailedLoginAttempts",
      "loginRetryDelaySeconds",
      "accountLockoutDurationMinutes",
      "failedLoginResetMinutes",
      "progressiveLockout",
      "notifyUserOnAccountLockout",
      "notifyAdminOnRepeatedLockout",
      "repeatedLockoutNotificationThreshold",
    ] as const;

    for (const field of lockoutFields) {
      if (dto[field] !== undefined) {
        update[field] = dto[field];
      }
    }

    // ------------------------------------------------------------------------
    // SESSION
    // ------------------------------------------------------------------------

    const sessionFields = [
      "inactivityTimeoutMinutes",
      "maximumSessionHours",
      "rememberMeDays",
      "revokeSessionsAfterPasswordChange",
      "revokeSessionsAfterSecurityChange",
    ] as const;

    for (const field of sessionFields) {
      if (dto[field] !== undefined) {
        update[field] = dto[field];
      }
    }

    // ------------------------------------------------------------------------
    // 2FA / REAUTH
    // ------------------------------------------------------------------------

    const twoFactorFields = [
      "requireTwoFactor",
      "requireTwoFactorForAdministrators",
      "allowUserTwoFactor",
      "allowRecoveryCodes",
      "requireReauthenticationForSensitiveActions",
      "requireReauthenticationForSecurityChanges",
      "requireAdminReauthentication",
    ] as const;

    for (const field of twoFactorFields) {
      if (dto[field] !== undefined) {
        update[field] = dto[field];
      }
    }

    // ------------------------------------------------------------------------
    // LOGIN NOTIFICATIONS
    // ------------------------------------------------------------------------

    const notificationFields = [
      "loginAlerts",
      "failedLoginAlerts",
      "suspiciousLoginAlerts",
      "newDeviceAlerts",
      "newLocationAlerts",
      "lockoutAlerts",
      "securityChangeNotifications",
    ] as const;

    for (const field of notificationFields) {
      if (dto[field] !== undefined) {
        update[field] = dto[field];
      }
    }

    // ------------------------------------------------------------------------
    // ACCOUNT PROTECTION
    // ------------------------------------------------------------------------

    const protectionFields = [
      "requireVerifiedEmail",
      "passwordResetProtection",
      "emailChangeProtection",
      "protectOrganizationOwner",
      "protectLastAdministrator",
      "securityAuditLog",
    ] as const;

    for (const field of protectionFields) {
      if (dto[field] !== undefined) {
        update[field] = dto[field];
      }
    }

    const policy =
      await this.common.securityPolicyModel
        .findOneAndUpdate(
          {
            _id:
              existingPolicy._id,

            organizationId:
              organization._id,
          } as any,
          {
            $set:
              update,
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

    if (!policy) {
      throw new NotFoundException(
        "Unable to save organization security policy.",
      );
    }

    return this.common.toPolicyResponse(
      policy as any,
    );
  }
}