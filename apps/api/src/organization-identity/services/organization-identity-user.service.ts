import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  randomBytes,
} from "crypto";

import * as bcrypt from "bcryptjs";

import {
  Membership,
  MembershipDocument,
} from "../../church/members/schemas/membership.schema";

import {
  MembershipStatus,
} from "../../church/enums/membership-status.enum";

import {
  MemberRole,
} from "../../church/enums/member-role.enum";

import {
  User,
  UserDocument,
} from "../../users/user.schema";

import {
  OrganizationIdentity,
  OrganizationIdentityDocument,
} from "../schemas/organization-identity.schema";

import {
  OrganizationDomain,
  OrganizationDomainDocument,
  OrganizationDomainType,
} from "../schemas/organization-domain.schema";

import {
  CreateManagedUserDto,
} from "../dto/create-managed-user.dto";

import {
  UpdateManagedUserDto,
} from "../dto/update-managed-user.dto";

import {
  OrganizationIdentityCommonService,
} from "./organization-identity-common.service";

import type {
  OrganizationIdentityActionResponse,
  OrganizationIdentityResponse,
  OrganizationIdentityStatsResponse,
} from "./organization-identity.service";

@Injectable()
export class OrganizationIdentityUserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,

    @InjectModel(OrganizationIdentity.name)
    private readonly identityModel: Model<OrganizationIdentityDocument>,

    @InjectModel(OrganizationDomain.name)
    private readonly domainModel: Model<OrganizationDomainDocument>,

    private readonly common: OrganizationIdentityCommonService,
  ) {}

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private generateTemporaryPassword(): string {
    return randomBytes(12)
      .toString("base64url");
  }

  private generateInternalEmail(
    username: string,
    organizationId: Types.ObjectId,
  ): string {
    const cleanOrganizationId =
      String(organizationId)
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

    return `${username}.${cleanOrganizationId}@fockis.com`;
  }

  private toMembershipRole(
    role: string,
  ): MemberRole {
    const normalized =
      String(role)
        .trim()
        .toLowerCase();

    if (
      normalized === "admin" ||
      normalized === "administrator"
    ) {
      return MemberRole.Administrator;
    }

    return MemberRole.Member;
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  async getStats(
    organizationId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityStatsResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const [
      totalUsers,
      activeUsers,
      invitedUsers,
      suspendedUsers,
      verifiedDomains,
      pendingDomains,
    ] = await Promise.all([
      this.identityModel.countDocuments({
        organizationId:
          organization._id,
      } as any),

      this.identityModel.countDocuments({
        organizationId:
          organization._id,
        status:
          this.common.identityStatusActive(),
      } as any),

      this.identityModel.countDocuments({
        organizationId:
          organization._id,
        status:
          this.common.identityStatusInvited(),
      } as any),

      this.identityModel.countDocuments({
        organizationId:
          organization._id,
        status:
          this.common.identityStatusSuspended(),
      } as any),

      this.domainModel.countDocuments({
        organizationId:
          organization._id,
        status:
          this.common.domainStatusVerified(),
      } as any),

      this.domainModel.countDocuments({
        organizationId:
          organization._id,
        status:
          this.common.domainStatusPending(),
      } as any),
    ]);

    return {
      totalUsers,
      activeUsers,
      invitedUsers,
      suspendedUsers,
      verifiedDomains,
      pendingDomains,
    };
  }

  // ==========================================================================
  // GET USERS
  // ==========================================================================

  async getUsers(
    organizationId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse[]> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const identities =
      await this.identityModel
        .find({
          organizationId:
            organization._id,
        } as any)
        .sort({
          createdAt: -1,
        })
        .exec();

    return identities.map(
      (identity) =>
        this.common.toIdentityResponse(
          identity,
        ),
    );
  }

  // ==========================================================================
  // GET USER
  // ==========================================================================

  async getUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const identity =
      await this.identityModel
        .findOne({
          _id:
            this.common.toObjectId(
              userId,
              "userId",
            ),
          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!identity) {
      throw new NotFoundException(
        "Organization identity not found.",
      );
    }

    return this.common.toIdentityResponse(
      identity,
    );
  }

  // ==========================================================================
  // CREATE USER
  // ==========================================================================

  async createUser(
    organizationId: string,
    dto: CreateManagedUserDto,
    actorUserId: string,
  ): Promise<
    OrganizationIdentityResponse & {
      temporaryPassword?: string;
    }
  > {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const policy =
      await this.common.getOrCreateSecurityPolicy(
        organization._id,
      );

    const username =
      this.common.normalizeUsername(
        dto.username,
      );

    const requestedRole =
      String(dto.role ?? "member")
        .trim()
        .toLowerCase();

    if (
      requestedRole === "owner"
    ) {
      throw new BadRequestException(
        "A managed user cannot be created as the organization owner.",
      );
    }

    const duplicateUsername =
      await this.identityModel
        .findOne({
          organizationId:
            organization._id,
          username,
        } as any)
        .exec();

    if (duplicateUsername) {
      throw new BadRequestException(
        "This username is already in use in this organization.",
      );
    }

    let selectedDomain:
      OrganizationDomainDocument | null =
      null;

    if (
      (dto as any).domainId
    ) {
      selectedDomain =
        await this.domainModel
          .findOne({
            _id:
              this.common.toObjectId(
                (dto as any).domainId,
                "domainId",
              ),
            organizationId:
              organization._id,
          } as any)
          .exec();

      if (!selectedDomain) {
        throw new NotFoundException(
          "Organization domain not found.",
        );
      }

      if (
        selectedDomain.domainType ===
        OrganizationDomainType.Organization
      ) {
        throw new BadRequestException(
          "The organization's base domain cannot be directly assigned to a member.",
        );
      }

      if (
        String(selectedDomain.status) !==
        String(
          this.common.domainStatusVerified(),
        )
      ) {
        throw new BadRequestException(
          "The selected domain must be verified before it can be assigned.",
        );
      }

      if (
        selectedDomain.assignedUserId ||
        selectedDomain.assignedMembershipId
      ) {
        throw new BadRequestException(
          "This domain is already assigned.",
        );
      }
    }

    const temporaryPassword =
      this.generateTemporaryPassword();

    const hashedPassword =
      await bcrypt.hash(
        temporaryPassword,
        12,
      );

    let createdUser:
      UserDocument | null = null;

    let createdIdentity:
      OrganizationIdentityDocument | null =
      null;

    let createdMembership:
      MembershipDocument | null = null;

    let createdMemberDomain:
      OrganizationDomainDocument | null =
      null;

    try {
      let organizationEmail: string;

      if (selectedDomain) {
        organizationEmail =
          `${username}@${selectedDomain.domain}`;
      } else {
        const baseDomain =
          await this.common.getOrganizationBaseDomain(
            organization._id,
            true,
          );

        if (baseDomain) {
          const generated =
            this.common.validateFockisDomain(
              `${username}.${baseDomain.domain}`,
            );

          organizationEmail =
            `${username}@${generated}`;
        } else {
          organizationEmail =
            this.generateInternalEmail(
              username,
              organization._id,
            );
        }
      }

      const duplicateEmail =
        await this.userModel
          .findOne({
            email:
              organizationEmail.toLowerCase(),
          } as any)
          .exec();

      if (duplicateEmail) {
        throw new BadRequestException(
          "This organization email address is already in use.",
        );
      }

      const effectiveRequirePasswordChange =
        (dto as any)
          .requirePasswordChange !==
        undefined
          ? Boolean(
              (dto as any)
                .requirePasswordChange,
            )
          : Boolean(
              policy.requirePasswordChange,
            );

      const effectiveRequireTwoFactor =
        Boolean(
          (dto as any)
            .requireTwoFactor,
        ) ||
        (
          (
            requestedRole === "admin" ||
            requestedRole === "administrator"
          ) &&
          Boolean(
            policy.requireTwoFactorForAdministrators,
          )
        ) ||
        Boolean(
          policy.requireTwoFactor,
        );

      createdUser =
        await this.userModel.create({
          username,

          email:
            organizationEmail.toLowerCase(),

          password:
            hashedPassword,

          firstName:
            dto.firstName ?? "",

          lastName:
            dto.lastName ?? "",

          role: "user",
          accountType: "user",

          permissions: [],

          verified: false,
          isActive: true,

          mustChangePassword:
            effectiveRequirePasswordChange,

          passwordHistory: [],

          passwordChangedAt:
            new Date(),

          passwordResetByAdmin:
            false,

          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockedUntil: null,
        } as any);

      createdMembership =
        await this.membershipModel.create({
          organizationId:
            organization._id,

          userId:
            createdUser._id,

          status:
            MembershipStatus.Active,

          role:
            this.toMembershipRole(
              requestedRole,
            ),

          joinedAt:
            new Date(),

          profile: {
            displayName:
              `${dto.firstName ?? ""} ${dto.lastName ?? ""}`
                .trim() ||
              username,

            avatarUrl: "",
          },

          privateProfile: {
            recoveryEmail:
              (dto as any)
                .recoveryEmail ?? null,

            department:
              (dto as any)
                .department ?? null,
          },

          departmentIds: [],
          groupIds: [],
        } as any);

      // ----------------------------------------------------------------------
      // AUTOMATIC MEMBER DOMAIN
      // ----------------------------------------------------------------------

      if (!selectedDomain) {
        const baseDomain =
          await this.common.getOrganizationBaseDomain(
            organization._id,
            true,
          );

        if (baseDomain) {
          const memberDomain =
            this.common.validateFockisDomain(
              `${username}.${baseDomain.domain}`,
            );

          const existing =
            await this.domainModel
              .findOne({
                domain:
                  memberDomain,
              } as any)
              .exec();

          if (existing) {
            throw new BadRequestException(
              `The member domain ${memberDomain} is already registered.`,
            );
          }

          createdMemberDomain =
            await this.domainModel.create({
              organizationId:
                organization._id,

              domainType:
                OrganizationDomainType.Member,

              parentDomainId:
                baseDomain._id,

              domain:
                memberDomain,

              assignedUserId:
                createdUser._id,

              assignedMembershipId:
                createdMembership._id,

              status:
                this.common.domainStatusVerified(),

              verificationHost: null,
              verificationValue: null,
              verifiedAt: new Date(),
            } as any);

          selectedDomain =
            createdMemberDomain as OrganizationDomainDocument;
        }
      } else {
        const result =
          await this.domainModel
            .updateOne(
              {
                _id:
                  selectedDomain._id,

                organizationId:
                  organization._id,

                status:
                  this.common.domainStatusVerified(),

                assignedUserId: null,

                assignedMembershipId: null,
              } as any,
              {
                $set: {
                  assignedUserId:
                    createdUser._id,

                  assignedMembershipId:
                    createdMembership._id,
                },
              },
            )
            .exec();

        if (
          result.modifiedCount !== 1
        ) {
          throw new BadRequestException(
            "The selected domain is no longer available.",
          );
        }

        selectedDomain =
          await this.domainModel
            .findOne({
              _id:
                selectedDomain._id,
            } as any)
            .exec();
      }

      createdIdentity =
        await this.identityModel.create({
          organizationId:
            organization._id,

          userId:
            createdUser._id,

          firstName:
            dto.firstName ?? "",

          lastName:
            dto.lastName ?? "",

          username,

          organizationEmail:
            createdUser.email,

          recoveryEmail:
            (dto as any).recoveryEmail
              ? String(
                  (dto as any).recoveryEmail,
                )
                  .trim()
                  .toLowerCase()
              : null,

          role:
            this.common.normalizeIdentityRole(
              requestedRole,
            ),

          customRole:
            (dto as any).customRole ??
            null,

          department:
            (dto as any).department ??
            null,

          domainId:
            selectedDomain?._id ?? null,

          domain:
            selectedDomain?.domain ?? null,

          domainType:
            selectedDomain?.domainType ?? null,

          parentDomainId:
            selectedDomain?.parentDomainId ??
            null,

          status:
            this.common.identityStatusActive(),

          emailVerified: false,

          twoFactorEnabled:
            effectiveRequireTwoFactor,

          requirePasswordChange:
            effectiveRequirePasswordChange,
        } as any);

      return {
        ...this.common.toIdentityResponse(
          createdIdentity,
        ),
        temporaryPassword,
      };
    } catch (error: unknown) {
      if (
        createdMemberDomain?._id
      ) {
        await this.domainModel
          .deleteOne({
            _id:
              createdMemberDomain._id,
          } as any)
          .exec()
          .catch(() => undefined);
      } else if (
        selectedDomain?._id &&
        createdUser?._id
      ) {
        await this.domainModel
          .updateOne(
            {
              _id:
                selectedDomain._id,

              assignedUserId:
                createdUser._id,
            } as any,
            {
              $unset: {
                assignedUserId: "",
                assignedMembershipId: "",
              },
            },
          )
          .exec()
          .catch(() => undefined);
      }

      if (createdMembership?._id) {
        await this.membershipModel
          .deleteOne({
            _id:
              createdMembership._id,
          } as any)
          .exec()
          .catch(() => undefined);
      }

      if (createdIdentity?._id) {
        await this.identityModel
          .deleteOne({
            _id:
              createdIdentity._id,
          } as any)
          .exec()
          .catch(() => undefined);
      }

      if (createdUser?._id) {
        await this.userModel
          .deleteOne({
            _id:
              createdUser._id,
          } as any)
          .exec()
          .catch(() => undefined);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (
        this.common.isDuplicateKeyError(
          error,
        )
      ) {
        throw new BadRequestException(
          "The user, email, membership, or domain already exists.",
        );
      }

      throw error;
    }
  }

  // ==========================================================================
  // UPDATE USER
  // ==========================================================================

  async updateUser(
    organizationId: string,
    userId: string,
    dto: UpdateManagedUserDto,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const identity =
      await this.identityModel
        .findOne({
          _id:
            this.common.toObjectId(
              userId,
              "userId",
            ),
          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!identity) {
      throw new NotFoundException(
        "Organization identity not found.",
      );
    }

    if (
      this.common.isOrganizationOwner(
        organization,
        identity,
      )
    ) {
      throw new ForbiddenException(
        "The organization owner cannot be modified through managed-user administration.",
      );
    }

    if (
      dto.username !== undefined
    ) {
      const username =
        this.common.normalizeUsername(
          dto.username,
        );

      if (
        username !== identity.username
      ) {
        const duplicate =
          await this.identityModel
            .findOne({
              organizationId:
                organization._id,

              username,

              _id: {
                $ne:
                  identity._id,
              },
            } as any)
            .exec();

        if (duplicate) {
          throw new BadRequestException(
            "This username is already in use in this organization.",
          );
        }

        identity.username =
          username;

        if (identity.userId) {
          await this.userModel
            .updateOne(
              {
                _id:
                  identity.userId,
              } as any,
              {
                $set: {
                  username,
                },
              },
            )
            .exec();
        }
      }
    }

    if (
      dto.firstName !== undefined
    ) {
      identity.firstName =
        dto.firstName.trim();

      if (identity.userId) {
        await this.userModel
          .updateOne(
            {
              _id:
                identity.userId,
            } as any,
            {
              $set: {
                firstName:
                  dto.firstName.trim(),
              },
            },
          )
          .exec();
      }
    }

    if (
      dto.lastName !== undefined
    ) {
      identity.lastName =
        dto.lastName.trim();

      if (identity.userId) {
        await this.userModel
          .updateOne(
            {
              _id:
                identity.userId,
            } as any,
            {
              $set: {
                lastName:
                  dto.lastName.trim(),
              },
            },
          )
          .exec();
      }
    }

    if (
      dto.role !== undefined
    ) {
      const role =
        String(dto.role)
          .trim()
          .toLowerCase();

      if (role === "owner") {
        throw new BadRequestException(
          "A managed user cannot be promoted to owner.",
        );
      }

      const currentRole =
        String(identity.role)
          .trim()
          .toLowerCase();

      const currentlyAdmin =
        currentRole === "admin" ||
        currentRole === "administrator";

      const becomingNonAdmin =
        !(
          role === "admin" ||
          role === "administrator"
        );

      if (
        currentlyAdmin &&
        becomingNonAdmin
      ) {
        const policy =
          await this.common.getOrCreateSecurityPolicy(
            organization._id,
          );

        if (
          policy.protectLastAdministrator
        ) {
          const lastAdmin =
            await this.common.isLastAdministrator(
              organization._id,
              identity,
            );

          if (lastAdmin) {
            throw new ForbiddenException(
              "The last organization administrator cannot be demoted.",
            );
          }
        }
      }

      (identity as any).role =
        this.common.normalizeIdentityRole(
          role,
        );

      if (identity.userId) {
        await this.membershipModel
          .updateOne(
            {
              organizationId:
                organization._id,

              userId:
                identity.userId,
            } as any,
            {
              $set: {
                role:
                  this.toMembershipRole(
                    role,
                  ),
              },
            },
          )
          .exec();
      }
    }

    if (
      dto.customRole !== undefined
    ) {
      identity.customRole =
        dto.customRole.trim();
    }

    if (
      dto.department !== undefined
    ) {
      identity.department =
        dto.department.trim();
    }

    if (
      dto.recoveryEmail !== undefined
    ) {
      identity.recoveryEmail =
        dto.recoveryEmail
          .trim()
          .toLowerCase();
    }

    if (
      dto.requirePasswordChange !==
      undefined
    ) {
      identity.requirePasswordChange =
        Boolean(
          dto.requirePasswordChange,
        );

      if (identity.userId) {
        await this.userModel
          .updateOne(
            {
              _id:
                identity.userId,
            } as any,
            {
              $set: {
                mustChangePassword:
                  Boolean(
                    dto.requirePasswordChange,
                  ),
              },
            },
          )
          .exec();
      }
    }

    if (
      dto.requireTwoFactor !== undefined
    ) {
      identity.twoFactorEnabled =
        Boolean(
          dto.requireTwoFactor,
        );
    }

    await identity.save();

    return this.common.toIdentityResponse(
      identity,
    );
  }

  // ==========================================================================
  // SUSPEND
  // ==========================================================================

  async suspendUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const identity =
      await this.identityModel
        .findOne({
          _id:
            this.common.toObjectId(
              userId,
              "userId",
            ),
          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!identity) {
      throw new NotFoundException(
        "Organization identity not found.",
      );
    }

    const policy =
      await this.common.getOrCreateSecurityPolicy(
        organization._id,
      );

    if (
      policy.protectOrganizationOwner &&
      this.common.isOrganizationOwner(
        organization,
        identity,
      )
    ) {
      throw new ForbiddenException(
        "The organization owner cannot be suspended.",
      );
    }

    if (
      policy.protectLastAdministrator
    ) {
      const lastAdmin =
        await this.common.isLastAdministrator(
          organization._id,
          identity,
        );

      if (lastAdmin) {
        throw new ForbiddenException(
          "The last organization administrator cannot be suspended.",
        );
      }
    }

    (identity as any).status =
      this.common.identityStatusSuspended();

    await identity.save();

    if (identity.userId) {
      await this.userModel
        .updateOne(
          {
            _id:
              identity.userId,
          } as any,
          {
            $set: {
              isActive: false,
            },
          },
        )
        .exec();
    }

    return this.common.toIdentityResponse(
      identity,
    );
  }

  // ==========================================================================
  // RESTORE
  // ==========================================================================

  async restoreUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const identity =
      await this.identityModel
        .findOne({
          _id:
            this.common.toObjectId(
              userId,
              "userId",
            ),
          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!identity) {
      throw new NotFoundException(
        "Organization identity not found.",
      );
    }

    (identity as any).status =
      this.common.identityStatusActive();

    await identity.save();

    if (identity.userId) {
      await this.userModel
        .updateOne(
          {
            _id:
              identity.userId,
          } as any,
          {
            $set: {
              isActive: true,
            },
          },
        )
        .exec();
    }

    return this.common.toIdentityResponse(
      identity,
    );
  }

  // ==========================================================================
  // RESET PASSWORD
  // ==========================================================================

  async resetPassword(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<
    OrganizationIdentityActionResponse & {
      temporaryPassword?: string;
    }
  > {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const policy =
      await this.common.getOrCreateSecurityPolicy(
        organization._id,
      );

    const identity =
      await this.identityModel
        .findOne({
          _id:
            this.common.toObjectId(
              userId,
              "userId",
            ),
          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!identity) {
      throw new NotFoundException(
        "Organization identity not found.",
      );
    }

    if (!identity.userId) {
      throw new BadRequestException(
        "This organization identity is not linked to a user account.",
      );
    }

    if (
      policy.protectOrganizationOwner &&
      this.common.isOrganizationOwner(
        organization,
        identity,
      )
    ) {
      throw new ForbiddenException(
        "The organization owner's password cannot be reset through managed-user administration.",
      );
    }

    const temporaryPassword =
      this.generateTemporaryPassword();

    const hashedPassword =
      await bcrypt.hash(
        temporaryPassword,
        12,
      );

    await this.userModel
      .updateOne(
        {
          _id:
            identity.userId,
        } as any,
        {
          $set: {
            password:
              hashedPassword,

            failedLoginAttempts: 0,
            lastFailedLoginAt: null,
            lockedUntil: null,

            passwordResetByAdmin: true,

            passwordChangedAt:
              new Date(),

            mustChangePassword:
              Boolean(
                policy.forcePasswordChangeAfterAdminReset,
              ),
          },

          $unset: {
            resetPasswordToken: "",
            resetPasswordExpires: "",
          },
        },
      )
      .exec();

    identity.requirePasswordChange =
      Boolean(
        policy.forcePasswordChangeAfterAdminReset,
      );

    await identity.save();

    return {
      success: true,

      message:
        policy.forcePasswordChangeAfterAdminReset
          ? "Password reset successfully. The temporary password must be changed after the user signs in."
          : "Password reset successfully.",

      identity:
        this.common.toIdentityResponse(
          identity,
        ),

      temporaryPassword,
    };
  }

  // ==========================================================================
  // RESEND ACTIVATION
  // ==========================================================================

  async resendActivation(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const identity =
      await this.identityModel
        .findOne({
          _id:
            this.common.toObjectId(
              userId,
              "userId",
            ),
          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!identity) {
      throw new NotFoundException(
        "Organization identity not found.",
      );
    }

    if (!identity.userId) {
      throw new BadRequestException(
        "This organization identity is not linked to a user account.",
      );
    }

    const token =
      randomBytes(32)
        .toString("hex");

    await this.userModel
      .updateOne(
        {
          _id:
            identity.userId,
        } as any,
        {
          $set: {
            resetPasswordToken:
              token,

            resetPasswordExpires:
              new Date(
                Date.now() +
                  24 *
                    60 *
                    60 *
                    1000,
              ),
          },
        },
      )
      .exec();

    (identity as any).status =
      this.common.identityStatusInvited();

    await identity.save();

    return {
      success: true,

      message:
        "A new activation token has been prepared for this organization identity.",
    };
  }

  // ==========================================================================
  // REMOVE USER
  // ==========================================================================

  async removeUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<OrganizationIdentityActionResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const identity =
      await this.identityModel
        .findOne({
          _id:
            this.common.toObjectId(
              userId,
              "userId",
            ),
          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!identity) {
      throw new NotFoundException(
        "Organization identity not found.",
      );
    }

    const policy =
      await this.common.getOrCreateSecurityPolicy(
        organization._id,
      );

    if (
      policy.protectOrganizationOwner &&
      this.common.isOrganizationOwner(
        organization,
        identity,
      )
    ) {
      throw new ForbiddenException(
        "The organization owner cannot be removed.",
      );
    }

    if (
      policy.protectLastAdministrator
    ) {
      const lastAdmin =
        await this.common.isLastAdministrator(
          organization._id,
          identity,
        );

      if (lastAdmin) {
        throw new ForbiddenException(
          "The last organization administrator cannot be removed.",
        );
      }
    }

    let membership:
      MembershipDocument | null = null;

    if (identity.userId) {
      membership =
        await this.membershipModel
          .findOne({
            organizationId:
              organization._id,

            userId:
              identity.userId,
          } as any)
          .exec();
    }

    if (identity.domainId) {
      const domain =
        await this.domainModel
          .findOne({
            _id:
              identity.domainId,

            organizationId:
              organization._id,
          } as any)
          .exec();

      if (
        domain &&
        domain.domainType ===
          OrganizationDomainType.Member
      ) {
        await this.domainModel
          .deleteOne({
            _id:
              domain._id,
          } as any)
          .exec();
      } else if (
        domain &&
        identity.userId
      ) {
        await this.domainModel
          .updateOne(
            {
              _id:
                domain._id,
            } as any,
            {
              $unset: {
                assignedUserId: "",
                assignedMembershipId: "",
              },
            },
          )
          .exec();
      }
    }

    if (identity.userId) {
      const releaseConditions:
        Record<string, unknown>[] = [
          {
            assignedUserId:
              identity.userId,
          },
        ];

      if (membership?._id) {
        releaseConditions.push({
          assignedMembershipId:
            membership._id,
        });
      }

      await this.domainModel
        .updateMany(
          {
            organizationId:
              organization._id,

            domainType:
              OrganizationDomainType.Member,

            $or:
              releaseConditions,
          } as any,
          {
            $unset: {
              assignedUserId: "",
              assignedMembershipId: "",
            },
          },
        )
        .exec();
    }

    if (membership?._id) {
      await this.membershipModel
        .deleteOne({
          _id:
            membership._id,
        } as any)
        .exec();
    }

    await this.identityModel
      .deleteOne({
        _id:
          identity._id,
      } as any)
      .exec();

    return {
      success: true,

      message:
        "Organization identity removed successfully.",
    };
  }
}