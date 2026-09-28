import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  DomainPolicy,
  DomainPolicyDocument,
} from "./schemas/domain-policy.schema";

import {
  DomainCampaign,
  DomainCampaignDocument,
} from "./schemas/domain-campaign.schema";

import {
  DomainAuthorization,
  DomainAuthorizationDocument,
} from "./schemas/domain-authorization.schema";

import {
  ManagedDomain,
  ManagedDomainDocument,
} from "./schemas/managed-domain.schema";

import {
  UpdateDomainPolicyDto,
} from "./dto/update-domain-policy.dto";

import {
  CreateDomainCampaignDto,
} from "./dto/create-domain-campaign.dto";

import {
  UpdateDomainCampaignDto,
} from "./dto/update-domain-campaign.dto";

import {
  CreateDomainAuthorizationDto,
} from "./dto/create-domain-authorization.dto";

@Injectable()
export class DomainAdminService {
  constructor(
    @InjectModel(DomainPolicy.name)
    private readonly policyModel: Model<DomainPolicyDocument>,

    @InjectModel(DomainCampaign.name)
    private readonly campaignModel: Model<DomainCampaignDocument>,

    @InjectModel(DomainAuthorization.name)
    private readonly authorizationModel: Model<DomainAuthorizationDocument>,

    @InjectModel(ManagedDomain.name)
    private readonly domainModel: Model<ManagedDomainDocument>,
  ) {}

  // ========================================================================
  // POLICY
  // ========================================================================

  async getPolicy() {
    let policy = await this.policyModel
      .findOne()
      .lean();

    if (!policy) {
      policy = await this.policyModel.create({
        domainsEnabled: true,
        freeDomainsEnabled: true,
        freeDomainsPerUser: 1,
        paidDomainsEnabled: true,
        paidDomainPrice: 9.99,
        currency: "USD",
        allowManualAssignment: true,
        allowUserDomainChanges: true,
        domainChangePrice: 9.99,
      });

      return policy.toObject();
    }

    return policy;
  }

  async updatePolicy(
    dto: UpdateDomainPolicyDto,
  ) {
    const policy =
      await this.policyModel.findOneAndUpdate(
        {},
        {
          $set: dto,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

    return policy;
  }

  // ========================================================================
  // CAMPAIGNS
  // ========================================================================

  async getCampaigns() {
    return this.campaignModel
      .find({
        deleted: false,
      })
      .sort({
        startsAt: -1,
      })
      .lean();
  }

  async createCampaign(
    dto: CreateDomainCampaignDto,
  ) {
    const startsAt =
      new Date(dto.startsAt);

    const endsAt =
      new Date(dto.endsAt);

    if (
      Number.isNaN(
        startsAt.getTime(),
      ) ||
      Number.isNaN(
        endsAt.getTime(),
      )
    ) {
      throw new BadRequestException(
        "Invalid campaign dates.",
      );
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        "Campaign end date must be after the start date.",
      );
    }

    const userIds =
      (dto.userIds ?? []).map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new BadRequestException(
            `Invalid user ID: ${id}`,
          );
        }

        return new Types.ObjectId(id);
      });

    return this.campaignModel.create({
      name: dto.name,
      enabled:
        dto.enabled ?? true,
      startsAt,
      endsAt,
      freeDomainLimit:
        dto.freeDomainLimit,
      appliesToUsers:
        dto.appliesToUsers ?? true,
      appliesToOrganizations:
        dto.appliesToOrganizations ?? true,
      userIds,
    });
  }

  async updateCampaign(
    campaignId: string,
    dto: UpdateDomainCampaignDto,
  ) {
    if (
      !Types.ObjectId.isValid(
        campaignId,
      )
    ) {
      throw new BadRequestException(
        "Invalid campaign ID.",
      );
    }

    const update: Record<
      string,
      unknown
    > = {};

    if (dto.name !== undefined) {
      update.name = dto.name;
    }

    if (dto.enabled !== undefined) {
      update.enabled = dto.enabled;
    }

    if (dto.startsAt !== undefined) {
      const startsAt =
        new Date(dto.startsAt);

      if (
        Number.isNaN(
          startsAt.getTime(),
        )
      ) {
        throw new BadRequestException(
          "Invalid campaign start date.",
        );
      }

      update.startsAt = startsAt;
    }

    if (dto.endsAt !== undefined) {
      const endsAt =
        new Date(dto.endsAt);

      if (
        Number.isNaN(
          endsAt.getTime(),
        )
      ) {
        throw new BadRequestException(
          "Invalid campaign end date.",
        );
      }

      update.endsAt = endsAt;
    }

    if (
      dto.freeDomainLimit !==
      undefined
    ) {
      update.freeDomainLimit =
        dto.freeDomainLimit;
    }

    if (
      dto.appliesToUsers !==
      undefined
    ) {
      update.appliesToUsers =
        dto.appliesToUsers;
    }

    if (
      dto.appliesToOrganizations !==
      undefined
    ) {
      update.appliesToOrganizations =
        dto.appliesToOrganizations;
    }

    if (dto.userIds !== undefined) {
      update.userIds =
        dto.userIds.map((id) => {
          if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(
              `Invalid user ID: ${id}`,
            );
          }

          return new Types.ObjectId(id);
        });
    }

    const existingCampaign =
      await this.campaignModel.findOne({
        _id: campaignId,
        deleted: false,
      });

    if (!existingCampaign) {
      throw new NotFoundException(
        "Campaign not found.",
      );
    }

    const effectiveStartsAt =
      update.startsAt ??
      existingCampaign.startsAt;

    const effectiveEndsAt =
      update.endsAt ??
      existingCampaign.endsAt;

    if (
      effectiveEndsAt <=
      effectiveStartsAt
    ) {
      throw new BadRequestException(
        "Campaign end date must be after the start date.",
      );
    }

    const campaign =
      await this.campaignModel.findOneAndUpdate(
        {
          _id: campaignId,
          deleted: false,
        },
        {
          $set: update,
        },
        {
          new: true,
        },
      );

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found.",
      );
    }

    return campaign;
  }

  async pauseCampaign(
    campaignId: string,
  ) {
    return this.setCampaignStatus(
      campaignId,
      false,
    );
  }

  async activateCampaign(
    campaignId: string,
  ) {
    return this.setCampaignStatus(
      campaignId,
      true,
    );
  }

  private async setCampaignStatus(
    campaignId: string,
    enabled: boolean,
  ) {
    if (
      !Types.ObjectId.isValid(
        campaignId,
      )
    ) {
      throw new BadRequestException(
        "Invalid campaign ID.",
      );
    }

    const campaign =
      await this.campaignModel.findOneAndUpdate(
        {
          _id: campaignId,
          deleted: false,
        },
        {
          $set: {
            enabled,
          },
        },
        {
          new: true,
        },
      );

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found.",
      );
    }

    return campaign;
  }

  async deleteCampaign(
    campaignId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        campaignId,
      )
    ) {
      throw new BadRequestException(
        "Invalid campaign ID.",
      );
    }

    const campaign =
      await this.campaignModel.findOneAndUpdate(
        {
          _id: campaignId,
          deleted: false,
        },
        {
          $set: {
            deleted: true,
            enabled: false,
          },
        },
        {
          new: true,
        },
      );

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found.",
      );
    }

    return {
      success: true,
    };
  }

  // ========================================================================
  // AUTHORIZATIONS
  // ========================================================================

  async getAuthorizations() {
    return this.authorizationModel
      .find()
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  async createAuthorization(
    dto: CreateDomainAuthorizationDto,
    grantedByUserId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        dto.targetId,
      )
    ) {
      throw new BadRequestException(
        "Invalid target ID.",
      );
    }

    if (
      !Types.ObjectId.isValid(
        grantedByUserId,
      )
    ) {
      throw new BadRequestException(
        "Invalid administrator ID.",
      );
    }

    const expiresAt =
      dto.expiresAt
        ? new Date(dto.expiresAt)
        : null;

    if (
      expiresAt &&
      Number.isNaN(
        expiresAt.getTime(),
      )
    ) {
      throw new BadRequestException(
        "Invalid authorization expiration date.",
      );
    }

    if (
      expiresAt &&
      expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        "Authorization expiration date must be in the future.",
      );
    }

    return this.authorizationModel.create({
      targetType:
        dto.targetType,

      targetId:
        new Types.ObjectId(
          dto.targetId,
        ),

      freeDomainQuantity:
        dto.freeDomainQuantity,

      usedQuantity: 0,

      expiresAt,

      reason:
        dto.reason ?? "",

      enabled: true,

      grantedByUserId:
        new Types.ObjectId(
          grantedByUserId,
        ),
    });
  }

  async revokeAuthorization(
    authorizationId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        authorizationId,
      )
    ) {
      throw new BadRequestException(
        "Invalid authorization ID.",
      );
    }

    const authorization =
      await this.authorizationModel.findByIdAndUpdate(
        authorizationId,
        {
          $set: {
            enabled: false,
          },
        },
        {
          new: true,
        },
      );

    if (!authorization) {
      throw new NotFoundException(
        "Authorization not found.",
      );
    }

    return {
      success: true,
    };
  }

  // ========================================================================
  // DOMAINS
  // ========================================================================

  async getDomains(
    params: {
      search?: string;
      status?: string;
      assignmentType?: string;
      ownerType?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page =
      Math.max(
        Number(params.page) || 1,
        1,
      );

    const limit =
      Math.min(
        Math.max(
          Number(params.limit) || 25,
          1,
        ),
        100,
      );

    /**
     * We intentionally do not use FilterQuery here.
     *
     * Some installed Mongoose versions expose FilterQuery
     * differently, which causes TypeScript import errors.
     *
     * This object is consumed directly by Model.find()
     * and countDocuments().
     */
    const filter: Record<
      string,
      unknown
    > = {};

    if (params.search?.trim()) {
      filter.domain = {
        $regex:
          params.search.trim(),
        $options: "i",
      };
    }

    if (params.status) {
      filter.status =
        params.status;
    }

    if (params.assignmentType) {
      filter.assignmentType =
        params.assignmentType;
    }

    if (params.ownerType) {
      filter.ownerType =
        params.ownerType;
    }

    const skip =
      (page - 1) * limit;

    const [
      domains,
      total,
    ] = await Promise.all([
      this.domainModel
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.domainModel.countDocuments(
        filter,
      ),
    ]);

    return {
      domains,
      total,
      page,
      limit,
      totalPages:
        Math.ceil(
          total / limit,
        ),
    };
  }

  // ========================================================================
  // ASSIGN FREE DOMAIN
  // ========================================================================

  async assignFreeDomain(
    domainId: string,
    ownerType:
      | "user"
      | "organization",
    ownerId: string,
    adminUserId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        domainId,
      )
    ) {
      throw new BadRequestException(
        "Invalid domain ID.",
      );
    }

    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new BadRequestException(
        "Invalid owner ID.",
      );
    }

    if (
      !Types.ObjectId.isValid(
        adminUserId,
      )
    ) {
      throw new BadRequestException(
        "Invalid administrator ID.",
      );
    }

    if (
      ownerType !== "user" &&
      ownerType !== "organization"
    ) {
      throw new BadRequestException(
        "Invalid owner type.",
      );
    }

    const policy =
      await this.getPolicy();

    if (!policy.domainsEnabled) {
      throw new BadRequestException(
        "Domain system is currently disabled.",
      );
    }

    if (
      !policy.freeDomainsEnabled
    ) {
      throw new BadRequestException(
        "Free domains are currently disabled.",
      );
    }

    if (
      !policy.allowManualAssignment
    ) {
      throw new BadRequestException(
        "Manual domain assignment is disabled.",
      );
    }

    const existingOwner =
      await this.domainModel.findOne({
        ownerType,
        ownerId:
          new Types.ObjectId(
            ownerId,
          ),
        status: "assigned",
      });

    if (existingOwner) {
      throw new ConflictException(
        "This owner already has an assigned domain.",
      );
    }

    const domain =
      await this.domainModel.findOneAndUpdate(
        {
          _id: domainId,
          status: "available",
          isActive: true,
        },
        {
          $set: {
            status: "assigned",

            /**
             * This is a free assignment performed
             * by Super App Admin.
             */
            assignmentType:
              "manual",

            ownerType,

            ownerId:
              new Types.ObjectId(
                ownerId,
              ),

            assignedByUserId:
              new Types.ObjectId(
                adminUserId,
              ),

            price: 0,

            currency:
              policy.currency,
          },
        },
        {
          new: true,
        },
      );

    if (!domain) {
      throw new ConflictException(
        "Domain is no longer available.",
      );
    }

    return domain;
  }

  // ========================================================================
  // SUSPEND
  // ========================================================================

  async suspendDomain(
    domainId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        domainId,
      )
    ) {
      throw new BadRequestException(
        "Invalid domain ID.",
      );
    }

    const domain =
      await this.domainModel.findByIdAndUpdate(
        domainId,
        {
          $set: {
            status: "suspended",
            isActive: false,
          },
        },
        {
          new: true,
        },
      );

    if (!domain) {
      throw new NotFoundException(
        "Domain not found.",
      );
    }

    return domain;
  }

  // ========================================================================
  // ACTIVATE
  // ========================================================================

  async activateDomain(
    domainId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        domainId,
      )
    ) {
      throw new BadRequestException(
        "Invalid domain ID.",
      );
    }

    const domain =
      await this.domainModel.findByIdAndUpdate(
        domainId,
        {
          $set: {
            status: "available",
            isActive: true,
            assignmentType: null,
            price: 0,
          },
          $unset: {
            ownerType: "",
            ownerId: "",
            assignedByUserId: "",
            purchasedAt: "",
            expiresAt: "",
          },
        },
        {
          new: true,
        },
      );

    if (!domain) {
      throw new NotFoundException(
        "Domain not found.",
      );
    }

    return domain;
  }

  // ========================================================================
  // OVERVIEW
  // ========================================================================

  async getOverview() {
    const [
      totalDomains,
      availableDomains,
      assignedDomains,
      suspendedDomains,
      freeDomains,
      paidDomains,
      campaignCount,
      authorizationCount,
      policy,
    ] = await Promise.all([
      this.domainModel.countDocuments(),

      this.domainModel.countDocuments({
        status: "available",
      }),

      this.domainModel.countDocuments({
        status: "assigned",
      }),

      this.domainModel.countDocuments({
        status: "suspended",
      }),

      this.domainModel.countDocuments({
        assignmentType: "free",
      }),

      this.domainModel.countDocuments({
        assignmentType: "paid",
      }),

      this.campaignModel.countDocuments({
        deleted: false,
        enabled: true,
      }),

      this.authorizationModel.countDocuments({
        enabled: true,
      }),

      this.getPolicy(),
    ]);

    return {
      totalDomains,
      availableDomains,
      assignedDomains,
      suspendedDomains,
      freeDomains,
      paidDomains,
      activeCampaigns:
        campaignCount,
      activeAuthorizations:
        authorizationCount,
      policy,
    };
  }

  // ========================================================================
  // STATS
  // ========================================================================

  async getStats() {
    const [
      total,
      available,
      assigned,
      free,
      paid,
      suspended,
    ] = await Promise.all([
      this.domainModel.countDocuments(),

      this.domainModel.countDocuments({
        status: "available",
      }),

      this.domainModel.countDocuments({
        status: "assigned",
      }),

      this.domainModel.countDocuments({
        assignmentType: "free",
      }),

      this.domainModel.countDocuments({
        assignmentType: "paid",
      }),

      this.domainModel.countDocuments({
        status: "suspended",
      }),
    ]);

    const paidRevenueResult =
      await this.domainModel.aggregate([
        {
          $match: {
            assignmentType: "paid",
            status: "assigned",
          },
        },
        {
          $group: {
            _id: null,
            revenue: {
              $sum: "$price",
            },
          },
        },
      ]);

    const paidRevenue =
      paidRevenueResult[0]?.revenue ??
      0;

    return {
      total,
      available,
      assigned,
      free,
      paid,
      suspended,
      paidRevenue,
    };
  }
}