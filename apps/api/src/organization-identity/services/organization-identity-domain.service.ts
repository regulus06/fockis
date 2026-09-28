import {
  BadRequestException,
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

import {
  Membership,
  MembershipDocument,
} from "../../church/members/schemas/membership.schema";

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
  CreateDomainDto,
} from "../dto/create-domain.dto";

import {
  OrganizationIdentityCommonService,
} from "./organization-identity-common.service";

import type {
  DomainAvailabilityResponse,
  OrganizationDomainResponse,
  OrganizationIdentityActionResponse,
} from "./organization-identity.service";

@Injectable()
export class OrganizationIdentityDomainService {
  constructor(
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,

    @InjectModel(OrganizationIdentity.name)
    private readonly identityModel: Model<OrganizationIdentityDocument>,

    @InjectModel(OrganizationDomain.name)
    private readonly domainModel: Model<OrganizationDomainDocument>,

    private readonly common: OrganizationIdentityCommonService,
  ) {}

  // ==========================================================================
  // CHECK AVAILABILITY
  // ==========================================================================

  async checkDomainAvailability(
    organizationId: string,
    domainValue: string,
    actorUserId: string,
    requestedDomainType?: string,
  ): Promise<DomainAvailabilityResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const domain =
      this.common.validateFockisDomain(
        domainValue,
      );

    const existing =
      await this.domainModel
        .findOne({
          domain,
        } as any)
        .exec();

    if (!existing) {
      if (
        requestedDomainType ===
        OrganizationDomainType.Member
      ) {
        const base =
          await this.common.getOrganizationBaseDomain(
            organization._id,
            true,
          );

        if (!base) {
          return {
            available: false,
            domain,
            message:
              "The organization must have a verified base domain before member domains can be created.",
          };
        }

        if (
          !domain.endsWith(
            `.${base.domain}`,
          )
        ) {
          return {
            available: false,
            domain,
            message:
              "A member domain must be under the organization's base domain.",
          };
        }
      }

      if (
        requestedDomainType ===
        OrganizationDomainType.Organization
      ) {
        if (
          !this.common.isDirectFockisSubdomain(
            domain,
          )
        ) {
          return {
            available: false,
            domain,
            message:
              "An organization base domain must be a direct subdomain of fockis.com.",
          };
        }

        const existingBase =
          await this.common.getOrganizationBaseDomain(
            organization._id,
            false,
          );

        if (existingBase) {
          return {
            available: false,
            domain,
            message:
              "This organization already has a base domain.",
          };
        }
      }

      return {
        available: true,
        domain,
        message:
          "This Fockis domain is available.",
      };
    }

    if (
      existing.assignedUserId
    ) {
      return {
        available: false,
        domain,
        message:
          "This Fockis domain is already assigned to another user or member.",
      };
    }

    if (
      existing.assignedMembershipId
    ) {
      return {
        available: false,
        domain,
        message:
          "This Fockis domain is already assigned to another organization member.",
      };
    }

    if (
      String(existing.organizationId) ===
      String(organization._id)
    ) {
      return {
        available: false,
        domain,
        message:
          "This Fockis domain has already been added to this organization.",
      };
    }

    return {
      available: false,
      domain,
      message:
        "This Fockis domain is already registered to another organization.",
    };
  }

  // ==========================================================================
  // LIST
  // ==========================================================================

  async getDomains(
    organizationId: string,
    actorUserId: string,
  ): Promise<OrganizationDomainResponse[]> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const domains =
      await this.domainModel
        .find({
          organizationId:
            organization._id,
        } as any)
        .sort({
          createdAt: -1,
        })
        .exec();

    return domains.map(
      (domain) =>
        this.common.toDomainResponse(
          domain,
        ),
    );
  }

  // ==========================================================================
  // ADD
  // ==========================================================================

  async addDomain(
    organizationId: string,
    dto: CreateDomainDto,
    actorUserId: string,
  ): Promise<OrganizationDomainResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const domain =
      this.common.validateFockisDomain(
        dto.domain,
      );

    const domainType =
      String(
        dto.domainType ??
          OrganizationDomainType.Organization,
      )
        .trim()
        .toLowerCase();

    if (
      domainType !==
        OrganizationDomainType.Organization &&
      domainType !==
        OrganizationDomainType.Member
    ) {
      throw new BadRequestException(
        "Invalid domain type.",
      );
    }

    // ------------------------------------------------------------------------
    // ORGANIZATION BASE DOMAIN
    // ------------------------------------------------------------------------

    if (
      domainType ===
      OrganizationDomainType.Organization
    ) {
      if (
        !this.common.isDirectFockisSubdomain(
          domain,
        )
      ) {
        throw new BadRequestException(
          "An organization base domain must be a direct subdomain of fockis.com.",
        );
      }

      const existingBase =
        await this.common.getOrganizationBaseDomain(
          organization._id,
          false,
        );

      if (existingBase) {
        throw new BadRequestException(
          "This organization already has a base domain.",
        );
      }
    }

    // ------------------------------------------------------------------------
    // MEMBER DOMAIN
    // ------------------------------------------------------------------------

    let parentDomain:
      OrganizationDomainDocument | null =
      null;

    if (
      domainType ===
      OrganizationDomainType.Member
    ) {
      if (!dto.parentDomainId) {
        parentDomain =
          await this.common.getOrganizationBaseDomain(
            organization._id,
            true,
          );

        if (!parentDomain) {
          throw new BadRequestException(
            "A verified organization base domain is required before creating a member domain.",
          );
        }
      } else {
        parentDomain =
          await this.domainModel
            .findOne({
              _id:
                this.common.toObjectId(
                  dto.parentDomainId,
                  "parentDomainId",
                ),

              organizationId:
                organization._id,

              domainType:
                OrganizationDomainType.Organization,
            } as any)
            .exec();

        if (!parentDomain) {
          throw new BadRequestException(
            "The parent domain does not belong to this organization.",
          );
        }

        if (
          String(parentDomain.status) !==
          String(
            this.common.domainStatusVerified(),
          )
        ) {
          throw new BadRequestException(
            "The parent organization domain must be verified.",
          );
        }
      }

      if (
        !domain.endsWith(
          `.${parentDomain.domain}`,
        )
      ) {
        throw new BadRequestException(
          "A member domain must be under the organization's base domain.",
        );
      }
    }

    const existing =
      await this.domainModel
        .findOne({
          domain,
        } as any)
        .exec();

    if (existing) {
      throw new BadRequestException(
        "This Fockis domain has already been registered and cannot be assigned to another organization or user.",
      );
    }

    let assignedUserId:
      Types.ObjectId | null = null;

    let assignedMembershipId:
      Types.ObjectId | null = null;

    if (dto.assignedUserId) {
      assignedUserId =
        this.common.toObjectId(
          dto.assignedUserId,
          "assignedUserId",
        );

      const identity =
        await this.identityModel
          .findOne({
            organizationId:
              organization._id,

            userId:
              assignedUserId,
          } as any)
          .exec();

      if (!identity) {
        throw new BadRequestException(
          "The assigned user does not belong to this organization.",
        );
      }

      if (identity.domainId) {
        throw new BadRequestException(
          "This user already has an organization domain.",
        );
      }
    }

    if (dto.assignedMembershipId) {
      assignedMembershipId =
        this.common.toObjectId(
          dto.assignedMembershipId,
          "assignedMembershipId",
        );

      const membership =
        await this.membershipModel
          .findOne({
            _id:
              assignedMembershipId,

            organizationId:
              organization._id,
          } as any)
          .exec();

      if (!membership) {
        throw new BadRequestException(
          "The assigned membership does not belong to this organization.",
        );
      }
    }

    const token =
      randomBytes(24)
        .toString("hex");

    try {
      const created =
        await this.domainModel.create({
          organizationId:
            organization._id,

          domainType:
            domainType as OrganizationDomainType,

          parentDomainId:
            parentDomain?._id ?? null,

          domain,

          assignedUserId,
          assignedMembershipId,

          status:
            this.common.domainStatusPending(),

          verificationHost:
            `_fockis-verification.${domain}`,

          verificationValue:
            `fockis-verify=${token}`,

          verifiedAt: null,
        } as any);

      return this.common.toDomainResponse(
        created as OrganizationDomainDocument,
      );
    } catch (error: unknown) {
      if (
        this.common.isDuplicateKeyError(
          error,
        )
      ) {
        throw new BadRequestException(
          "This Fockis domain has already been registered.",
        );
      }

      throw error;
    }
  }

  // ==========================================================================
  // VERIFY
  // ==========================================================================

  async verifyDomain(
    organizationId: string,
    domainId: string,
    actorUserId: string,
  ): Promise<OrganizationDomainResponse> {
    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    const domain =
      await this.domainModel
        .findOne({
          _id:
            this.common.toObjectId(
              domainId,
              "domainId",
            ),

          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!domain) {
      throw new NotFoundException(
        "Organization domain not found.",
      );
    }

    domain.domain =
      this.common.validateFockisDomain(
        domain.domain,
      );

    if (
      domain.domainType ===
      OrganizationDomainType.Member
    ) {
      const parent =
        domain.parentDomainId
          ? await this.domainModel
              .findOne({
                _id:
                  domain.parentDomainId,

                organizationId:
                  organization._id,

                domainType:
                  OrganizationDomainType.Organization,
              } as any)
              .exec()
          : null;

      if (!parent) {
        throw new BadRequestException(
          "The member domain has no valid organization base domain.",
        );
      }

      if (
        String(parent.status) !==
        String(
          this.common.domainStatusVerified(),
        )
      ) {
        throw new BadRequestException(
          "The organization base domain must be verified first.",
        );
      }

      if (
        !domain.domain.endsWith(
          `.${parent.domain}`,
        )
      ) {
        throw new BadRequestException(
          "The member domain does not belong to its parent organization domain.",
        );
      }
    }

    domain.status =
      this.common.domainStatusVerified();

    domain.verifiedAt =
      new Date();

    try {
      await domain.save();
    } catch (error: unknown) {
      if (
        this.common.isDuplicateKeyError(
          error,
        )
      ) {
        throw new BadRequestException(
          "This Fockis domain is already registered.",
        );
      }

      throw error;
    }

    return this.common.toDomainResponse(
      domain,
    );
  }

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  async removeDomain(
    organizationId: string,
    domainId: string,
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

    const domain =
      await this.domainModel
        .findOne({
          _id:
            this.common.toObjectId(
              domainId,
              "domainId",
            ),

          organizationId:
            organization._id,
        } as any)
        .exec();

    if (!domain) {
      throw new NotFoundException(
        "Organization domain not found.",
      );
    }

    if (
      domain.domainType ===
      OrganizationDomainType.Member
    ) {
      if (
        domain.assignedUserId ||
        domain.assignedMembershipId
      ) {
        throw new BadRequestException(
          "This member domain cannot be removed while it is assigned.",
        );
      }

      await this.domainModel
        .deleteOne({
          _id:
            domain._id,
        } as any)
        .exec();

      return {
        success: true,
        message:
          "Organization member domain removed successfully.",
      };
    }

    const childDomains =
      await this.domainModel
        .countDocuments({
          organizationId:
            organization._id,

          parentDomainId:
            domain._id,
        } as any)
        .exec();

    if (childDomains > 0) {
      throw new BadRequestException(
        "The organization base domain cannot be removed while member domains depend on it.",
      );
    }

    const usersUsingDomain =
      await this.identityModel
        .countDocuments({
          organizationId:
            organization._id,

          domainId:
            domain._id,
        } as any)
        .exec();

    if (usersUsingDomain > 0) {
      throw new BadRequestException(
        "This domain cannot be removed while organization identities are using it.",
      );
    }

    if (
      domain.assignedUserId ||
      domain.assignedMembershipId
    ) {
      throw new BadRequestException(
        "This domain cannot be removed while it is assigned.",
      );
    }

    await this.domainModel
      .deleteOne({
        _id:
          domain._id,
      } as any)
      .exec();

    return {
      success: true,
      message:
        "Organization domain removed successfully.",
    };
  }
}