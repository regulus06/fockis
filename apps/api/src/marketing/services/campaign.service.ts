import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Campaign,
  CampaignDocument,
  CampaignStatus,
} from "../schemas/campaign.schema";

import { CreateCampaignDto } from "../dto/create-campaign.dto";
import { UpdateCampaignDto } from "../dto/update-campaign.dto";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<CampaignDocument>,
  ) {}

  /* ============================================================
     CREATE CAMPAIGN
  ============================================================ */

  async create(
    advertiserId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignDocument> {
    this.validateAdvertiserId(advertiserId);

    this.validateAgeRange(
      dto.minimumAge ?? 18,
      dto.maximumAge ?? 65,
    );

    const startDate = this.parseDate(
      dto.startDate,
      "Invalid start date",
    );

    const endDate =
      dto.endDate
        ? this.parseDate(
            dto.endDate,
            "Invalid end date",
          )
        : undefined;

    this.validateDateRange(
      startDate,
      endDate,
    );

    this.validateBudget(
      dto.dailyBudget,
      dto.totalBudget,
    );

    const storeId =
      this.parseOptionalObjectId(
        dto.storeId,
        "Invalid store ID",
      );

    const campaign =
      new this.campaignModel({
        name: dto.name,
        objective: dto.objective,
        adFormat: dto.adFormat,

        headline: dto.headline,
        description: dto.description,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
        appIconUrl: dto.appIconUrl,

        appName: dto.appName,
        appStoreUrl: dto.appStoreUrl,
        googlePlayUrl: dto.googlePlayUrl,
        callToAction: dto.callToAction,

        locations: dto.locations ?? [],
        interests: dto.interests ?? [],
        categories: dto.categories ?? [],
        keywords: dto.keywords ?? [],

        minimumAge: dto.minimumAge ?? 18,
        maximumAge: dto.maximumAge ?? 65,

        dailyBudget: dto.dailyBudget,
        totalBudget: dto.totalBudget,

        startDate,
        endDate,

        advertiserId:
          new Types.ObjectId(advertiserId),

        storeId,

        status: CampaignStatus.DRAFT,
        isActive: false,

        spent: 0,
        impressions: 0,
        clicks: 0,
        videoViews: 0,
        installs: 0,
        conversions: 0,
        revenue: 0,
        frequency: 0,
      });

    return campaign.save();
  }

  /* ============================================================
     GET ALL CAMPAIGNS
  ============================================================ */

  async findAll(
    advertiserId: string,
  ): Promise<CampaignDocument[]> {
    this.validateAdvertiserId(advertiserId);

    return this.campaignModel
      .find({
        advertiserId:
          new Types.ObjectId(advertiserId),
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ============================================================
     GET ONE CAMPAIGN
  ============================================================ */

  async findOne(
    advertiserId: string,
    campaignId: string,
  ): Promise<CampaignDocument> {
    this.validateIds(
      advertiserId,
      campaignId,
    );

    const campaign =
      await this.campaignModel
        .findById(campaignId)
        .exec();

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found",
      );
    }

    this.verifyOwnership(
      campaign,
      advertiserId,
    );

    return campaign;
  }

  /* ============================================================
     UPDATE CAMPAIGN
  ============================================================ */

  async update(
    advertiserId: string,
    campaignId: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignDocument> {
    const campaign =
      await this.findOne(
        advertiserId,
        campaignId,
      );

    if (
      campaign.status ===
      CampaignStatus.ACTIVE
    ) {
      throw new BadRequestException(
        "Active campaigns cannot be edited. Pause the campaign first.",
      );
    }

    if (
      campaign.status ===
      CampaignStatus.PENDING_REVIEW
    ) {
      throw new BadRequestException(
        "Campaigns pending review cannot be edited.",
      );
    }

    const minimumAge =
      dto.minimumAge ??
      campaign.minimumAge;

    const maximumAge =
      dto.maximumAge ??
      campaign.maximumAge;

    this.validateAgeRange(
      minimumAge,
      maximumAge,
    );

    const dailyBudget =
      dto.dailyBudget ??
      campaign.dailyBudget;

    const totalBudget =
      dto.totalBudget ??
      campaign.totalBudget;

    this.validateBudget(
      dailyBudget,
      totalBudget,
    );

    const startDate =
      dto.startDate
        ? this.parseDate(
            dto.startDate,
            "Invalid start date",
          )
        : campaign.startDate;

    /*
     * IMPORTANT:
     *
     * Campaign.endDate can be:
     *
     * Date
     * null
     * undefined
     *
     * Normalize null → undefined.
     */
    let endDate: Date | undefined;

    if (
      dto.endDate !== undefined
    ) {
      endDate =
        dto.endDate
          ? this.parseDate(
              dto.endDate,
              "Invalid end date",
            )
          : undefined;
    } else {
      endDate =
        campaign.endDate ??
        undefined;
    }

    this.validateDateRange(
      startDate,
      endDate,
    );

    /* ----------------------------------------------------------
       STORE
    ---------------------------------------------------------- */

    if (
      dto.storeId !== undefined
    ) {
      campaign.storeId =
        this.parseOptionalObjectId(
          dto.storeId,
          "Invalid store ID",
        );
    }

    /* ----------------------------------------------------------
       BASIC CAMPAIGN FIELDS
    ---------------------------------------------------------- */

    if (
      dto.name !== undefined
    ) {
      campaign.name =
        dto.name;
    }

    if (
      dto.objective !== undefined
    ) {
      campaign.objective =
        dto.objective;
    }

    if (
      dto.adFormat !== undefined
    ) {
      campaign.adFormat =
        dto.adFormat;
    }

    /* ----------------------------------------------------------
       AD CONTENT
    ---------------------------------------------------------- */

    if (
      dto.headline !== undefined
    ) {
      campaign.headline =
        dto.headline;
    }

    if (
      dto.description !== undefined
    ) {
      campaign.description =
        dto.description;
    }

    if (
      dto.mediaUrl !== undefined
    ) {
      campaign.mediaUrl =
        dto.mediaUrl;
    }

    if (
      dto.thumbnailUrl !== undefined
    ) {
      campaign.thumbnailUrl =
        dto.thumbnailUrl;
    }

    if (
      dto.appIconUrl !== undefined
    ) {
      campaign.appIconUrl =
        dto.appIconUrl;
    }

    /* ----------------------------------------------------------
       APP INFORMATION
    ---------------------------------------------------------- */

    if (
      dto.appName !== undefined
    ) {
      campaign.appName =
        dto.appName;
    }

    if (
      dto.appStoreUrl !== undefined
    ) {
      campaign.appStoreUrl =
        dto.appStoreUrl;
    }

    if (
      dto.googlePlayUrl !== undefined
    ) {
      campaign.googlePlayUrl =
        dto.googlePlayUrl;
    }

    if (
      dto.callToAction !== undefined
    ) {
      campaign.callToAction =
        dto.callToAction;
    }

    /* ----------------------------------------------------------
       TARGETING
    ---------------------------------------------------------- */

    if (
      dto.locations !== undefined
    ) {
      campaign.locations =
        dto.locations;
    }

    if (
      dto.interests !== undefined
    ) {
      campaign.interests =
        dto.interests;
    }

    if (
      dto.categories !== undefined
    ) {
      campaign.categories =
        dto.categories;
    }

    if (
      dto.keywords !== undefined
    ) {
      campaign.keywords =
        dto.keywords;
    }

    /* ----------------------------------------------------------
       VALIDATED TARGETING
    ---------------------------------------------------------- */

    campaign.minimumAge =
      minimumAge;

    campaign.maximumAge =
      maximumAge;

    /* ----------------------------------------------------------
       VALIDATED BUDGET
    ---------------------------------------------------------- */

    campaign.dailyBudget =
      dailyBudget;

    campaign.totalBudget =
      totalBudget;

    /* ----------------------------------------------------------
       VALIDATED SCHEDULE
    ---------------------------------------------------------- */

    campaign.startDate =
      startDate;

    /*
     * Keep the database value normalized.
     *
     * Instead of storing null from this service,
     * use undefined when there is no end date.
     */
    campaign.endDate =
      endDate;

    /* ----------------------------------------------------------
       REJECTED → DRAFT
    ---------------------------------------------------------- */

    if (
      campaign.status ===
      CampaignStatus.REJECTED
    ) {
      campaign.status =
        CampaignStatus.DRAFT;

      campaign.isActive =
        false;
    }

    return campaign.save();
  }

  /* ============================================================
     SUBMIT CAMPAIGN FOR REVIEW
  ============================================================ */

  async submitForReview(
    advertiserId: string,
    campaignId: string,
  ): Promise<CampaignDocument> {
    const campaign =
      await this.findOne(
        advertiserId,
        campaignId,
      );

    if (
      campaign.status !==
        CampaignStatus.DRAFT &&
      campaign.status !==
        CampaignStatus.REJECTED
    ) {
      throw new BadRequestException(
        "Only draft or rejected campaigns can be submitted for review.",
      );
    }

    if (!campaign.name?.trim()) {
      throw new BadRequestException(
        "Campaign name is required.",
      );
    }

    if (!campaign.headline?.trim()) {
      throw new BadRequestException(
        "Campaign headline is required.",
      );
    }

    if (!campaign.objective) {
      throw new BadRequestException(
        "Campaign objective is required.",
      );
    }

    if (!campaign.adFormat) {
      throw new BadRequestException(
        "Campaign ad format is required.",
      );
    }

    this.validateBudget(
      campaign.dailyBudget,
      campaign.totalBudget,
    );

    this.validateAgeRange(
      campaign.minimumAge,
      campaign.maximumAge,
    );

    /*
     * Normalize nullable endDate before validation.
     */
    const endDate =
      campaign.endDate ??
      undefined;

    this.validateDateRange(
      campaign.startDate,
      endDate,
    );

    campaign.status =
      CampaignStatus.PENDING_REVIEW;

    campaign.isActive =
      false;

    return campaign.save();
  }

  /* ============================================================
     FIND PENDING CAMPAIGNS
  ============================================================ */

  async findPending(): Promise<
    CampaignDocument[]
  > {
    return this.campaignModel
      .find({
        status:
          CampaignStatus.PENDING_REVIEW,
      })
      .sort({
        createdAt: 1,
      })
      .exec();
  }

  /* ============================================================
     APPROVE CAMPAIGN
  ============================================================ */

  async approve(
    campaignId: string,
  ): Promise<CampaignDocument> {
    this.validateCampaignId(
      campaignId,
    );

    const campaign =
      await this.campaignModel
        .findOneAndUpdate(
          {
            _id:
              new Types.ObjectId(
                campaignId,
              ),

            status:
              CampaignStatus.PENDING_REVIEW,
          },

          {
            $set: {
              status:
                CampaignStatus.ACTIVE,

              isActive:
                true,
            },
          },

          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

    if (!campaign) {
      const existing =
        await this.campaignModel
          .findById(campaignId)
          .select("_id status")
          .lean()
          .exec();

      if (!existing) {
        throw new NotFoundException(
          "Campaign not found",
        );
      }

      throw new BadRequestException(
        "Only campaigns pending review can be approved.",
      );
    }

    return campaign;
  }

  /* ============================================================
     REJECT CAMPAIGN
  ============================================================ */

  async reject(
    campaignId: string,
  ): Promise<CampaignDocument> {
    this.validateCampaignId(
      campaignId,
    );

    const campaign =
      await this.campaignModel
        .findOneAndUpdate(
          {
            _id:
              new Types.ObjectId(
                campaignId,
              ),

            status:
              CampaignStatus.PENDING_REVIEW,
          },

          {
            $set: {
              status:
                CampaignStatus.REJECTED,

              isActive:
                false,
            },
          },

          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

    if (!campaign) {
      const existing =
        await this.campaignModel
          .findById(campaignId)
          .select("_id status")
          .lean()
          .exec();

      if (!existing) {
        throw new NotFoundException(
          "Campaign not found",
        );
      }

      throw new BadRequestException(
        "Only campaigns pending review can be rejected.",
      );
    }

    return campaign;
  }

  /* ============================================================
     PAUSE CAMPAIGN
  ============================================================ */

  async pause(
    advertiserId: string,
    campaignId: string,
  ): Promise<CampaignDocument> {
    const campaign =
      await this.findOne(
        advertiserId,
        campaignId,
      );

    if (
      campaign.status !==
      CampaignStatus.ACTIVE
    ) {
      throw new BadRequestException(
        "Only active campaigns can be paused.",
      );
    }

    campaign.status =
      CampaignStatus.PAUSED;

    campaign.isActive =
      false;

    return campaign.save();
  }

  /* ============================================================
     RESUME CAMPAIGN
  ============================================================ */

  async resume(
    advertiserId: string,
    campaignId: string,
  ): Promise<CampaignDocument> {
    const campaign =
      await this.findOne(
        advertiserId,
        campaignId,
      );

    if (
      campaign.status !==
      CampaignStatus.PAUSED
    ) {
      throw new BadRequestException(
        "Only paused campaigns can be resumed.",
      );
    }

    this.validateBudget(
      campaign.dailyBudget,
      campaign.totalBudget,
    );

    /*
     * Normalize nullable endDate.
     */
    const endDate =
      campaign.endDate ??
      undefined;

    this.validateDateRange(
      campaign.startDate,
      endDate,
    );

    campaign.status =
      CampaignStatus.ACTIVE;

    campaign.isActive =
      true;

    return campaign.save();
  }

  /* ============================================================
     DELETE CAMPAIGN
  ============================================================ */

  async remove(
    advertiserId: string,
    campaignId: string,
  ): Promise<{
    message: string;
  }> {
    const campaign =
      await this.findOne(
        advertiserId,
        campaignId,
      );

    if (
      campaign.status ===
      CampaignStatus.ACTIVE
    ) {
      throw new BadRequestException(
        "Active campaigns cannot be deleted. Pause the campaign first.",
      );
    }

    if (
      campaign.status ===
      CampaignStatus.PENDING_REVIEW
    ) {
      throw new BadRequestException(
        "Campaigns pending review cannot be deleted.",
      );
    }

    await this.campaignModel
      .deleteOne({
        _id:
          campaign._id,
      })
      .exec();

    return {
      message:
        "Campaign deleted successfully",
    };
  }

  /* ============================================================
     VERIFY OWNERSHIP
  ============================================================ */

  private verifyOwnership(
    campaign: CampaignDocument,
    advertiserId: string,
  ): void {
    const ownerId =
      campaign.advertiserId?.toString();

    if (
      ownerId !== advertiserId
    ) {
      throw new ForbiddenException(
        "You do not have permission to access this campaign.",
      );
    }
  }

  /* ============================================================
     VALIDATE ADVERTISER ID
  ============================================================ */

  private validateAdvertiserId(
    advertiserId: string,
  ): void {
    if (
      !advertiserId ||
      !Types.ObjectId.isValid(
        advertiserId,
      )
    ) {
      throw new BadRequestException(
        "Invalid advertiser ID.",
      );
    }
  }

  /* ============================================================
     VALIDATE IDS
  ============================================================ */

  private validateIds(
    advertiserId: string,
    campaignId: string,
  ): void {
    this.validateAdvertiserId(
      advertiserId,
    );

    this.validateCampaignId(
      campaignId,
    );
  }

  /* ============================================================
     VALIDATE CAMPAIGN ID
  ============================================================ */

  private validateCampaignId(
    campaignId: string,
  ): void {
    if (
      !campaignId ||
      !Types.ObjectId.isValid(
        campaignId,
      )
    ) {
      throw new BadRequestException(
        "Invalid campaign ID.",
      );
    }
  }

  /* ============================================================
     VALIDATE AGE RANGE
  ============================================================ */

  private validateAgeRange(
    minimumAge: number,
    maximumAge: number,
  ): void {
    if (
      minimumAge < 13 ||
      maximumAge > 100
    ) {
      throw new BadRequestException(
        "Campaign age targeting must be between 13 and 100.",
      );
    }

    if (
      minimumAge > maximumAge
    ) {
      throw new BadRequestException(
        "Minimum age cannot be greater than maximum age.",
      );
    }
  }

  /* ============================================================
     VALIDATE BUDGET
  ============================================================ */

  private validateBudget(
    dailyBudget: number,
    totalBudget: number,
  ): void {
    if (
      !Number.isFinite(
        dailyBudget,
      ) ||
      dailyBudget <= 0
    ) {
      throw new BadRequestException(
        "Daily budget must be greater than zero.",
      );
    }

    if (
      !Number.isFinite(
        totalBudget,
      ) ||
      totalBudget <= 0
    ) {
      throw new BadRequestException(
        "Total budget must be greater than zero.",
      );
    }

    if (
      totalBudget <
      dailyBudget
    ) {
      throw new BadRequestException(
        "Total budget cannot be less than daily budget.",
      );
    }
  }

  /* ============================================================
     PARSE DATE
  ============================================================ */

  private parseDate(
    value: string,
    message: string,
  ): Date {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      throw new BadRequestException(
        message,
      );
    }

    return date;
  }

  /* ============================================================
     VALIDATE DATE RANGE
  ============================================================ */

  private validateDateRange(
    startDate: Date,
    endDate?: Date,
  ): void {
    if (
      !startDate ||
      Number.isNaN(
        startDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        "Invalid start date.",
      );
    }

    if (
      endDate &&
      Number.isNaN(
        endDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        "Invalid end date.",
      );
    }

    if (
      endDate &&
      endDate <= startDate
    ) {
      throw new BadRequestException(
        "End date must be after start date.",
      );
    }
  }

  /* ============================================================
     PARSE OPTIONAL OBJECT ID
  ============================================================ */

  private parseOptionalObjectId(
    value:
      | string
      | undefined,
    message: string,
  ):
    | Types.ObjectId
    | undefined {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return undefined;
    }

    if (
      !Types.ObjectId.isValid(
        value,
      )
    ) {
      throw new BadRequestException(
        message,
      );
    }

    return new Types.ObjectId(
      value,
    );
  }
}