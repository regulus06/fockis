import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import { Model, Types } from "mongoose";

import {
  Organization,
  OrganizationDocument,
} from "../../church/organizations/schemas/organization.schema";

import {
  Membership,
  MembershipDocument,
} from "../../church/members/schemas/membership.schema";

import {
  MembershipStatus,
} from "../../church/enums/membership-status.enum";

import {
  ADMIN_MEMBER_ROLES,
} from "../../church/enums/member-role.enum";

import {
  OrganizationIdentity,
  OrganizationIdentityDocument,
} from "../schemas/organization-identity.schema";

import {
  OrganizationDomain,
  OrganizationDomainDocument,
  OrganizationDomainStatus,
  OrganizationDomainType,
} from "../schemas/organization-domain.schema";

import {
  OrganizationSecurityPolicy,
  OrganizationSecurityPolicyDocument,
} from "../schemas/organization-security-policy.schema";

import {
  OrganizationDomainResponse,
  OrganizationIdentityResponse,
  SecurityPolicyResponse,
} from "./organization-identity.service";

@Injectable()
export class OrganizationIdentityCommonService {
  readonly FOCKIS_ROOT_DOMAIN = "fockis.com";

  constructor(
    @InjectModel(Organization.name)
    readonly organizationModel: Model<OrganizationDocument>,

    @InjectModel(Membership.name)
    readonly membershipModel: Model<MembershipDocument>,

    @InjectModel(OrganizationIdentity.name)
    readonly identityModel: Model<OrganizationIdentityDocument>,

    @InjectModel(OrganizationDomain.name)
    readonly domainModel: Model<OrganizationDomainDocument>,

    @InjectModel(OrganizationSecurityPolicy.name)
    readonly securityPolicyModel: Model<OrganizationSecurityPolicyDocument>,
  ) {}

  // ==========================================================================
  // OBJECT IDS
  // ==========================================================================

  toObjectId(
    value: string | Types.ObjectId,
    fieldName: string,
  ): Types.ObjectId {
    if (value instanceof Types.ObjectId) {
      return value;
    }

    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `Invalid ${fieldName}.`,
      );
    }

    return new Types.ObjectId(value);
  }

  // ==========================================================================
  // ENUMS
  // ==========================================================================

  getSchemaEnumValues(
    model: Model<any>,
    fieldName: string,
  ): string[] {
    const path = model.schema.path(
      fieldName,
    ) as any;

    return Array.isArray(path?.enumValues)
      ? path.enumValues
      : [];
  }

  enumValue(
    values: string[],
    fallback: string,
  ): string {
    return values.includes(fallback)
      ? fallback
      : values[0] ?? fallback;
  }

  identityStatusActive(): any {
    return this.enumValue(
      this.getSchemaEnumValues(
        this.identityModel,
        "status",
      ),
      "active",
    );
  }

  identityStatusInvited(): any {
    return this.enumValue(
      this.getSchemaEnumValues(
        this.identityModel,
        "status",
      ),
      "invited",
    );
  }

  identityStatusSuspended(): any {
    return this.enumValue(
      this.getSchemaEnumValues(
        this.identityModel,
        "status",
      ),
      "suspended",
    );
  }

  domainStatusPending(): OrganizationDomainStatus {
    return this.enumValue(
      this.getSchemaEnumValues(
        this.domainModel,
        "status",
      ),
      OrganizationDomainStatus.Pending,
    ) as OrganizationDomainStatus;
  }

  domainStatusVerified(): OrganizationDomainStatus {
    return this.enumValue(
      this.getSchemaEnumValues(
        this.domainModel,
        "status",
      ),
      OrganizationDomainStatus.Verified,
    ) as OrganizationDomainStatus;
  }

  normalizeIdentityRole(
    role: string,
  ): any {
    const normalized = String(role)
      .trim()
      .toLowerCase();

    const values =
      this.getSchemaEnumValues(
        this.identityModel,
        "role",
      );

    if (values.includes(normalized)) {
      return normalized;
    }

    if (
      normalized === "member" &&
      values.includes("staff")
    ) {
      return "staff";
    }

    if (
      normalized === "staff" &&
      values.includes("member")
    ) {
      return "member";
    }

    return normalized;
  }

  // ==========================================================================
  // ORGANIZATION
  // ==========================================================================

  async getOrganization(
    organizationId: string,
  ): Promise<OrganizationDocument> {
    const id = this.toObjectId(
      organizationId,
      "organizationId",
    );

    const organization =
      await this.organizationModel
        .findById(id)
        .exec();

    if (!organization) {
      throw new NotFoundException(
        "Organization not found.",
      );
    }

    return organization;
  }

  // ==========================================================================
  // ADMIN AUTHORIZATION
  // ==========================================================================

  async requireAdministrator(
    organizationId: string,
    actorUserId: string,
  ): Promise<void> {
    const organization =
      await this.getOrganization(
        organizationId,
      );

    const actorId =
      this.toObjectId(
        actorUserId,
        "actorUserId",
      );

    if (
      String(
        (organization as any).createdByUserId,
      ) === String(actorId)
    ) {
      return;
    }

    const membership =
      await this.membershipModel
        .findOne({
          organizationId:
            organization._id,

          userId:
            actorId,

          status:
            MembershipStatus.Active,

          role: {
            $in:
              ADMIN_MEMBER_ROLES,
          },
        } as any)
        .exec();

    if (!membership) {
      throw new ForbiddenException(
        "You do not have administrator access to this organization.",
      );
    }
  }

  // ==========================================================================
  // IDENTITY MAPPER
  // ==========================================================================

  toIdentityResponse(
    identity: OrganizationIdentityDocument,
  ): OrganizationIdentityResponse {
    const value = identity as any;

    return {
      id: String(identity._id),

      organizationId:
        String(identity.organizationId),

      userId:
        identity.userId
          ? String(identity.userId)
          : null,

      firstName:
        value.firstName ?? "",

      lastName:
        value.lastName ?? "",

      username:
        value.username ?? "",

      organizationEmail:
        value.organizationEmail ?? "",

      recoveryEmail:
        value.recoveryEmail ?? null,

      role:
        value.role ?? "member",

      customRole:
        value.customRole ?? null,

      department:
        value.department ?? null,

      domainId:
        value.domainId
          ? String(value.domainId)
          : null,

      domain:
        value.domain ?? null,

      domainType:
        value.domainType ?? null,

      parentDomainId:
        value.parentDomainId
          ? String(value.parentDomainId)
          : null,

      status:
        value.status ?? "",

      emailVerified:
        Boolean(value.emailVerified),

      twoFactorEnabled:
        Boolean(value.twoFactorEnabled),

      requirePasswordChange:
        Boolean(value.requirePasswordChange),

      createdAt:
        value.createdAt,

      updatedAt:
        value.updatedAt,

      lastLoginAt:
        value.lastLoginAt ?? null,
    };
  }

  // ==========================================================================
  // DOMAIN MAPPER
  // ==========================================================================

  toDomainResponse(
    domain: OrganizationDomainDocument,
  ): OrganizationDomainResponse {
    const value = domain as any;

    return {
      id: String(domain._id),

      organizationId:
        String(domain.organizationId),

      domain:
        domain.domain,

      domainType:
        value.domainType ??
        OrganizationDomainType.Member,

      parentDomainId:
        value.parentDomainId
          ? String(value.parentDomainId)
          : null,

      assignedUserId:
        value.assignedUserId
          ? String(value.assignedUserId)
          : null,

      assignedMembershipId:
        value.assignedMembershipId
          ? String(value.assignedMembershipId)
          : null,

      status:
        String(domain.status),

      verificationHost:
        domain.verificationHost ?? null,

      verificationValue:
        domain.verificationValue ?? null,

      verifiedAt:
        domain.verifiedAt ?? null,

      createdAt:
        value.createdAt,

      updatedAt:
        value.updatedAt,
    };
  }

  // ==========================================================================
  // SECURITY DEFAULTS
  // ==========================================================================

  defaultPolicy() {
    return {
      strongPasswords: true,
      minimumPasswordLength: 12,
      passwordHistoryCount: 5,
      requirePasswordChange: true,
      forcePasswordChangeAfterAdminReset: true,
      passwordExpirationEnabled: false,
      passwordExpirationDays: 90,
      preventPasswordReuse: true,

      loginLockoutEnabled: true,
      maxFailedLoginAttempts: 5,
      loginRetryDelaySeconds: 30,
      accountLockoutDurationMinutes: 15,
      failedLoginResetMinutes: 30,
      progressiveLockout: true,
      notifyUserOnAccountLockout: true,
      notifyAdminOnRepeatedLockout: true,
      repeatedLockoutNotificationThreshold: 3,

      inactivityTimeoutMinutes: 15,
      maximumSessionHours: 12,
      rememberMeDays: 30,

      revokeSessionsAfterPasswordChange: true,
      revokeSessionsAfterSecurityChange: true,

      requireTwoFactor: false,
      requireTwoFactorForAdministrators: true,
      allowUserTwoFactor: true,
      allowRecoveryCodes: true,

      requireReauthenticationForSensitiveActions: true,
      requireReauthenticationForSecurityChanges: true,
      requireAdminReauthentication: true,

      loginAlerts: true,
      failedLoginAlerts: true,
      suspiciousLoginAlerts: true,
      newDeviceAlerts: true,
      newLocationAlerts: true,
      lockoutAlerts: true,
      securityChangeNotifications: true,

      requireVerifiedEmail: true,
      passwordResetProtection: true,
      emailChangeProtection: true,
      protectOrganizationOwner: true,
      protectLastAdministrator: true,
      securityAuditLog: true,
    };
  }

  async getOrCreateSecurityPolicy(
    organizationId: Types.ObjectId,
  ): Promise<OrganizationSecurityPolicyDocument> {
    const defaults =
      this.defaultPolicy();

    try {
      const policy =
        await this.securityPolicyModel
          .findOneAndUpdate(
            {
              organizationId,
            } as any,
            {
              $setOnInsert: {
                organizationId,
                ...defaults,
              },
            },
            {
              new: true,
              upsert: true,
              setDefaultsOnInsert: true,
            },
          )
          .exec();

      if (!policy) {
        throw new NotFoundException(
          "Unable to create organization security policy.",
        );
      }

      return policy as OrganizationSecurityPolicyDocument;
    } catch (error: unknown) {
      if (
        this.isDuplicateKeyError(error)
      ) {
        const existing =
          await this.securityPolicyModel
            .findOne({
              organizationId,
            } as any)
            .exec();

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  toPolicyResponse(
    policy: OrganizationSecurityPolicyDocument,
  ): SecurityPolicyResponse {
    const defaults =
      this.defaultPolicy();

    const p = policy as any;

    return {
      strongPasswords:
        p.strongPasswords ??
        defaults.strongPasswords,

      minimumPasswordLength:
        p.minimumPasswordLength ??
        defaults.minimumPasswordLength,

      passwordHistoryCount:
        p.passwordHistoryCount ??
        defaults.passwordHistoryCount,

      requirePasswordChange:
        p.requirePasswordChange ??
        defaults.requirePasswordChange,

      forcePasswordChangeAfterAdminReset:
        p.forcePasswordChangeAfterAdminReset ??
        defaults.forcePasswordChangeAfterAdminReset,

      passwordExpirationEnabled:
        p.passwordExpirationEnabled ??
        defaults.passwordExpirationEnabled,

      passwordExpirationDays:
        p.passwordExpirationDays ??
        defaults.passwordExpirationDays,

      preventPasswordReuse:
        p.preventPasswordReuse ??
        defaults.preventPasswordReuse,

      loginLockoutEnabled:
        p.loginLockoutEnabled ??
        defaults.loginLockoutEnabled,

      maxFailedLoginAttempts:
        p.maxFailedLoginAttempts ??
        defaults.maxFailedLoginAttempts,

      loginRetryDelaySeconds:
        p.loginRetryDelaySeconds ??
        defaults.loginRetryDelaySeconds,

      accountLockoutDurationMinutes:
        p.accountLockoutDurationMinutes ??
        defaults.accountLockoutDurationMinutes,

      failedLoginResetMinutes:
        p.failedLoginResetMinutes ??
        defaults.failedLoginResetMinutes,

      progressiveLockout:
        p.progressiveLockout ??
        defaults.progressiveLockout,

      notifyUserOnAccountLockout:
        p.notifyUserOnAccountLockout ??
        defaults.notifyUserOnAccountLockout,

      notifyAdminOnRepeatedLockout:
        p.notifyAdminOnRepeatedLockout ??
        defaults.notifyAdminOnRepeatedLockout,

      repeatedLockoutNotificationThreshold:
        p.repeatedLockoutNotificationThreshold ??
        defaults.repeatedLockoutNotificationThreshold,

      inactivityTimeoutMinutes:
        p.inactivityTimeoutMinutes ??
        defaults.inactivityTimeoutMinutes,

      maximumSessionHours:
        p.maximumSessionHours ??
        defaults.maximumSessionHours,

      rememberMeDays:
        p.rememberMeDays ??
        defaults.rememberMeDays,

      revokeSessionsAfterPasswordChange:
        p.revokeSessionsAfterPasswordChange ??
        defaults.revokeSessionsAfterPasswordChange,

      revokeSessionsAfterSecurityChange:
        p.revokeSessionsAfterSecurityChange ??
        defaults.revokeSessionsAfterSecurityChange,

      requireTwoFactor:
        p.requireTwoFactor ??
        defaults.requireTwoFactor,

      requireTwoFactorForAdministrators:
        p.requireTwoFactorForAdministrators ??
        defaults.requireTwoFactorForAdministrators,

      allowUserTwoFactor:
        p.allowUserTwoFactor ??
        defaults.allowUserTwoFactor,

      allowRecoveryCodes:
        p.allowRecoveryCodes ??
        defaults.allowRecoveryCodes,

      requireReauthenticationForSensitiveActions:
        p.requireReauthenticationForSensitiveActions ??
        defaults.requireReauthenticationForSensitiveActions,

      requireReauthenticationForSecurityChanges:
        p.requireReauthenticationForSecurityChanges ??
        defaults.requireReauthenticationForSecurityChanges,

      requireAdminReauthentication:
        p.requireAdminReauthentication ??
        defaults.requireAdminReauthentication,

      loginAlerts:
        p.loginAlerts ??
        defaults.loginAlerts,

      failedLoginAlerts:
        p.failedLoginAlerts ??
        defaults.failedLoginAlerts,

      suspiciousLoginAlerts:
        p.suspiciousLoginAlerts ??
        defaults.suspiciousLoginAlerts,

      newDeviceAlerts:
        p.newDeviceAlerts ??
        defaults.newDeviceAlerts,

      newLocationAlerts:
        p.newLocationAlerts ??
        defaults.newLocationAlerts,

      lockoutAlerts:
        p.lockoutAlerts ??
        defaults.lockoutAlerts,

      securityChangeNotifications:
        p.securityChangeNotifications ??
        defaults.securityChangeNotifications,

      requireVerifiedEmail:
        p.requireVerifiedEmail ??
        defaults.requireVerifiedEmail,

      passwordResetProtection:
        p.passwordResetProtection ??
        defaults.passwordResetProtection,

      emailChangeProtection:
        p.emailChangeProtection ??
        defaults.emailChangeProtection,

      protectOrganizationOwner:
        p.protectOrganizationOwner ??
        defaults.protectOrganizationOwner,

      protectLastAdministrator:
        p.protectLastAdministrator ??
        defaults.protectLastAdministrator,

      securityAuditLog:
        p.securityAuditLog ??
        defaults.securityAuditLog,
    };
  }

  // ==========================================================================
  // DOMAIN HELPERS
  // ==========================================================================

  normalizeDomain(
    value: string,
  ): string {
    return String(value ?? "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .replace(/\.$/, "")
      .toLowerCase();
  }

  isFockisDomain(
    value: string,
  ): boolean {
    const domain =
      this.normalizeDomain(value);

    return (
      domain === this.FOCKIS_ROOT_DOMAIN ||
      domain.endsWith(
        `.${this.FOCKIS_ROOT_DOMAIN}`,
      )
    );
  }

  validateFockisDomain(
    value: string,
  ): string {
    const domain =
      this.normalizeDomain(value);

    if (!domain) {
      throw new BadRequestException(
        "Domain is required.",
      );
    }

    const dnsPattern =
      /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

    if (!dnsPattern.test(domain)) {
      throw new BadRequestException(
        "Invalid domain format.",
      );
    }

    if (!this.isFockisDomain(domain)) {
      throw new BadRequestException(
        "Only Fockis domains ending in .fockis.com are allowed.",
      );
    }

    return domain;
  }

  isDirectFockisSubdomain(
    domain: string,
  ): boolean {
    const normalized =
      this.normalizeDomain(domain);

    if (
      normalized ===
      this.FOCKIS_ROOT_DOMAIN
    ) {
      return false;
    }

    const suffix =
      `.${this.FOCKIS_ROOT_DOMAIN}`;

    if (!normalized.endsWith(suffix)) {
      return false;
    }

    const prefix =
      normalized.slice(
        0,
        -suffix.length,
      );

    return (
      prefix.length > 0 &&
      !prefix.includes(".")
    );
  }

  async getOrganizationBaseDomain(
    organizationId: Types.ObjectId,
    requireVerified = true,
  ): Promise<OrganizationDomainDocument | null> {
    const query: Record<string, any> = {
      organizationId,
      domainType:
        OrganizationDomainType.Organization,
    };

    if (requireVerified) {
      query.status =
        this.domainStatusVerified();
    }

    return this.domainModel
      .findOne(query as any)
      .exec();
  }

  normalizeUsername(
    value: string,
  ): string {
    const username =
      String(value ?? "")
        .trim()
        .toLowerCase();

    if (!username) {
      throw new BadRequestException(
        "Username is required.",
      );
    }

    if (
      !/^[a-z0-9._-]+$/.test(username)
    ) {
      throw new BadRequestException(
        "Username may contain only letters, numbers, dots, underscores, and hyphens.",
      );
    }

    return username;
  }

  isOrganizationOwner(
    organization: OrganizationDocument,
    identity: OrganizationIdentityDocument,
  ): boolean {
    if (!identity.userId) {
      return false;
    }

    return (
      String(
        (organization as any)
          .createdByUserId,
      ) ===
      String(identity.userId)
    );
  }

  async isLastAdministrator(
    organizationId: Types.ObjectId,
    identity: OrganizationIdentityDocument,
  ): Promise<boolean> {
    const role =
      String(
        (identity as any).role,
      )
        .trim()
        .toLowerCase();

    const isAdmin =
      role === "admin" ||
      role === "administrator";

    if (!isAdmin) {
      return false;
    }

    const count =
      await this.identityModel
        .countDocuments({
          organizationId,

          status:
            this.identityStatusActive(),

          role: {
            $in: [
              "admin",
              "administrator",
            ],
          },
        } as any)
        .exec();

    return count <= 1;
  }

  isDuplicateKeyError(
    error: unknown,
  ): boolean {
    if (
      !error ||
      typeof error !== "object"
    ) {
      return false;
    }

    return (
      "code" in error &&
      (error as any).code === 11000
    );
  }
}