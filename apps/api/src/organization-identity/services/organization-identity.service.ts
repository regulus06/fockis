import { Injectable } from "@nestjs/common";

import { CreateManagedUserDto } from "../dto/create-managed-user.dto";
import { UpdateManagedUserDto } from "../dto/update-managed-user.dto";
import { UpdateSecurityPolicyDto } from "../dto/update-security-policy.dto";
import { CreateDomainDto } from "../dto/create-domain.dto";

import { OrganizationIdentityUserService } from "./organization-identity-user.service";
import { OrganizationIdentityDomainService } from "./organization-identity-domain.service";
import { OrganizationIdentitySecurityService } from "./organization-identity-security.service";

/**
 * ============================================================================
 * RESPONSE TYPES
 * ============================================================================
 */

export interface SecurityPolicyResponse {
  strongPasswords: boolean;
  minimumPasswordLength: number;
  passwordHistoryCount: number;
  requirePasswordChange: boolean;
  forcePasswordChangeAfterAdminReset: boolean;
  passwordExpirationEnabled: boolean;
  passwordExpirationDays: number;
  preventPasswordReuse: boolean;

  loginLockoutEnabled: boolean;
  maxFailedLoginAttempts: number;
  loginRetryDelaySeconds: number;
  accountLockoutDurationMinutes: number;
  failedLoginResetMinutes: number;
  progressiveLockout: boolean;
  notifyUserOnAccountLockout: boolean;
  notifyAdminOnRepeatedLockout: boolean;
  repeatedLockoutNotificationThreshold: number;

  inactivityTimeoutMinutes: number;
  maximumSessionHours: number;
  rememberMeDays: number;

  revokeSessionsAfterPasswordChange: boolean;
  revokeSessionsAfterSecurityChange: boolean;

  requireTwoFactor: boolean;
  requireTwoFactorForAdministrators: boolean;
  allowUserTwoFactor: boolean;
  allowRecoveryCodes: boolean;

  requireReauthenticationForSensitiveActions: boolean;
  requireReauthenticationForSecurityChanges: boolean;
  requireAdminReauthentication: boolean;

  loginAlerts: boolean;
  failedLoginAlerts: boolean;
  suspiciousLoginAlerts: boolean;
  newDeviceAlerts: boolean;
  newLocationAlerts: boolean;
  lockoutAlerts: boolean;
  securityChangeNotifications: boolean;

  requireVerifiedEmail: boolean;
  passwordResetProtection: boolean;
  emailChangeProtection: boolean;
  protectOrganizationOwner: boolean;
  protectLastAdministrator: boolean;
  securityAuditLog: boolean;
}

export interface OrganizationIdentityStatsResponse {
  totalUsers: number;
  activeUsers: number;
  invitedUsers: number;
  suspendedUsers: number;
  verifiedDomains: number;
  pendingDomains: number;
}

export interface OrganizationIdentityActionResponse {
  success: boolean;
  message: string;
  identity?: OrganizationIdentityResponse;
}

export interface OrganizationIdentityResponse {
  id: string;
  organizationId: string;
  userId?: string | null;

  firstName: string;
  lastName: string;
  username: string;

  organizationEmail: string;
  recoveryEmail?: string | null;

  role: string;
  customRole?: string | null;
  department?: string | null;

  domainId?: string | null;
  domain?: string | null;
  domainType?: string | null;
  parentDomainId?: string | null;

  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  requirePasswordChange: boolean;

  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastLoginAt?: Date | string | null;
}

export interface OrganizationDomainResponse {
  id: string;
  organizationId: string;

  domain: string;
  domainType: string;
  parentDomainId?: string | null;

  assignedUserId?: string | null;
  assignedMembershipId?: string | null;

  status: string;

  verificationHost?: string | null;
  verificationValue?: string | null;
  verifiedAt?: Date | string | null;

  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DomainAvailabilityResponse {
  available: boolean;
  domain: string;
  message: string;
}

/**
 * ============================================================================
 * MAIN FACADE
 * ============================================================================
 *
 * The controller can continue injecting OrganizationIdentityService.
 *
 * This service only coordinates the specialized services.
 */

@Injectable()
export class OrganizationIdentityService {
  constructor(
    private readonly userService: OrganizationIdentityUserService,
    private readonly domainService: OrganizationIdentityDomainService,
    private readonly securityService: OrganizationIdentitySecurityService,
  ) {}

  // ==========================================================================
  // USERS
  // ==========================================================================

  getStats(
    organizationId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityStatsResponse> {
    return this.userService.getStats(
      organizationId,
      actorUserId,
    );
  }

  getUsers(
    organizationId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse[]> {
    return this.userService.getUsers(
      organizationId,
      actorUserId,
    );
  }

  getUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse> {
    return this.userService.getUser(
      organizationId,
      userId,
      actorUserId,
    );
  }

  createUser(
    organizationId: string,
    dto: CreateManagedUserDto,
    actorUserId: string,
  ): Promise<
    OrganizationIdentityResponse & {
      temporaryPassword?: string;
    }
  > {
    return this.userService.createUser(
      organizationId,
      dto,
      actorUserId,
    );
  }

  updateUser(
    organizationId: string,
    userId: string,
    dto: UpdateManagedUserDto,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse> {
    return this.userService.updateUser(
      organizationId,
      userId,
      dto,
      actorUserId,
    );
  }

  suspendUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse> {
    return this.userService.suspendUser(
      organizationId,
      userId,
      actorUserId,
    );
  }

  restoreUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse> {
    return this.userService.restoreUser(
      organizationId,
      userId,
      actorUserId,
    );
  }

  resetPassword(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<
    OrganizationIdentityActionResponse & {
      temporaryPassword?: string;
    }
  > {
    return this.userService.resetPassword(
      organizationId,
      userId,
      actorUserId,
    );
  }

  resendActivation(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    return this.userService.resendActivation(
      organizationId,
      userId,
      actorUserId,
    );
  }

  removeUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    return this.userService.removeUser(
      organizationId,
      userId,
      actorUserId,
    );
  }

  // ==========================================================================
  // DOMAINS
  // ==========================================================================

  checkDomainAvailability(
    organizationId: string,
    domainValue: string,
    actorUserId: string,
    requestedDomainType?: string,
  ): Promise<DomainAvailabilityResponse> {
    return this.domainService.checkDomainAvailability(
      organizationId,
      domainValue,
      actorUserId,
      requestedDomainType,
    );
  }

  getDomains(
    organizationId: string,
    actorUserId: string,
  ): Promise<OrganizationDomainResponse[]> {
    return this.domainService.getDomains(
      organizationId,
      actorUserId,
    );
  }

  addDomain(
    organizationId: string,
    dto: CreateDomainDto,
    actorUserId: string,
  ): Promise<OrganizationDomainResponse> {
    return this.domainService.addDomain(
      organizationId,
      dto,
      actorUserId,
    );
  }

  verifyDomain(
    organizationId: string,
    domainId: string,
    actorUserId: string,
  ): Promise<OrganizationDomainResponse> {
    return this.domainService.verifyDomain(
      organizationId,
      domainId,
      actorUserId,
    );
  }

  removeDomain(
    organizationId: string,
    domainId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    return this.domainService.removeDomain(
      organizationId,
      domainId,
      actorUserId,
    );
  }

  // ==========================================================================
  // SECURITY
  // ==========================================================================

  getSecurityPolicy(
    organizationId: string,
    actorUserId: string,
  ): Promise<SecurityPolicyResponse> {
    return this.securityService.getSecurityPolicy(
      organizationId,
      actorUserId,
    );
  }

  updateSecurityPolicy(
    organizationId: string,
    dto: UpdateSecurityPolicyDto,
    actorUserId: string,
  ): Promise<SecurityPolicyResponse> {
    return this.securityService.updateSecurityPolicy(
      organizationId,
      dto,
      actorUserId,
    );
  }
}

export default OrganizationIdentityService;