import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Advertisement,
  AdvertisementDocument,
  AdvertisementStatus,
} from "../schemas/advertisement.schema";

import {
  Campaign,
  CampaignDocument,
  CampaignStatus,
} from "../schemas/campaign.schema";

import {
  CreateAdDto,
} from "../dto/create-ad.dto";

import {
  UpdateAdDto,
} from "../dto/update-ad.dto";


/* ============================================================================
   ADVERTISEMENT SERVICE
============================================================================ */

@Injectable()
export class AdvertisementService {

  constructor(

    @InjectModel(
      Advertisement.name,
    )
    private readonly advertisementModel:
      Model<AdvertisementDocument>,

    @InjectModel(
      Campaign.name,
    )
    private readonly campaignModel:
      Model<CampaignDocument>,

  ) {}


  /* ==========================================================================
     CREATE ADVERTISEMENT
  ========================================================================== */

  async create(
    advertiserId: string,
    dto: CreateAdDto,
  ): Promise<AdvertisementDocument> {

    this.validateObjectId(
      advertiserId,
      "Invalid advertiser ID.",
    );

    this.validateObjectId(
      dto.campaignId,
      "Invalid campaign ID.",
    );


    const campaign =
      await this.campaignModel
        .findById(
          dto.campaignId,
        )
        .exec();


    if (!campaign) {

      throw new NotFoundException(
        "Campaign not found.",
      );

    }


    this.verifyCampaignOwnership(
      campaign,
      advertiserId,
    );


    /*
     * Ads cannot be added to an already-active
     * campaign.
     */

    if (
      campaign.status ===
      CampaignStatus.ACTIVE
    ) {

      throw new BadRequestException(
        "Ads cannot be created for an active campaign. Pause the campaign first.",
      );

    }


    /*
     * MULTIPLE PLACEMENTS
     *
     * CreateAdDto:
     *
     *   placements?: AdvertisementPlacement[]
     *
     * Advertisement schema:
     *
     *   placements: AdvertisementPlacement[]
     */

    const placements =
      dto.placements?.length
        ? dto.placements
        : [];


    const ad =
      new this.advertisementModel({

        advertiserId:
          new Types.ObjectId(
            advertiserId,
          ),

        campaignId:
          new Types.ObjectId(
            dto.campaignId,
          ),

        name:
          dto.name,

        type:
          dto.type,

        headline:
          dto.headline,

        description:
          dto.description,

        mediaUrl:
          dto.mediaUrl,

        thumbnailUrl:
          dto.thumbnailUrl,

        appIconUrl:
          dto.appIconUrl,

        carouselItems:
          dto.carouselItems ?? [],

        destinationType:
          dto.destinationType,

        destinationUrl:
          dto.destinationUrl,

        destinationId:
          dto.destinationId
            ? new Types.ObjectId(
                dto.destinationId,
              )
            : undefined,

        placements,

        callToAction:
          dto.callToAction,

        /*
         * Newly-created advertisements
         * always start as drafts.
         */

        status:
          AdvertisementStatus.DRAFT,

        isActive:
          false,

        impressions:
          0,

        clicks:
          0,

        videoViews:
          0,

        conversions:
          0,

        spend:
          0,

        revenue:
          0,

        qualityScore:
          0,

        relevanceScore:
          0,

        deliveryScore:
          0,

        rankingScore:
          0,

      });


    return ad.save();

  }


  /* ==========================================================================
     FIND MY ADS
  ========================================================================== */

  async findMine(
    advertiserId: string,
  ): Promise<AdvertisementDocument[]> {

    this.validateObjectId(
      advertiserId,
      "Invalid advertiser ID.",
    );


    return this.advertisementModel
      .find({

        advertiserId:
          new Types.ObjectId(
            advertiserId,
          ),

      })
      .sort({
        createdAt: -1,
      })
      .exec();

  }


  /* ==========================================================================
     FIND ONE
  ========================================================================== */

  async findOne(
    advertiserId: string,
    adId: string,
  ): Promise<AdvertisementDocument> {

    this.validateObjectId(
      advertiserId,
      "Invalid advertiser ID.",
    );

    this.validateObjectId(
      adId,
      "Invalid advertisement ID.",
    );


    const ad =
      await this.advertisementModel
        .findById(
          adId,
        )
        .exec();


    if (!ad) {

      throw new NotFoundException(
        "Advertisement not found.",
      );

    }


    this.verifyAdOwnership(
      ad,
      advertiserId,
    );


    return ad;

  }


  /* ==========================================================================
     FIND ADS BY CAMPAIGN
  ========================================================================== */

  async findByCampaign(
    advertiserId: string,
    campaignId: string,
  ): Promise<AdvertisementDocument[]> {

    this.validateObjectId(
      advertiserId,
      "Invalid advertiser ID.",
    );

    this.validateObjectId(
      campaignId,
      "Invalid campaign ID.",
    );


    const campaign =
      await this.campaignModel
        .findById(
          campaignId,
        )
        .exec();


    if (!campaign) {

      throw new NotFoundException(
        "Campaign not found.",
      );

    }


    this.verifyCampaignOwnership(
      campaign,
      advertiserId,
    );


    return this.advertisementModel
      .find({

        advertiserId:
          new Types.ObjectId(
            advertiserId,
          ),

        campaignId:
          new Types.ObjectId(
            campaignId,
          ),

      })
      .sort({
        createdAt: -1,
      })
      .exec();

  }


  /* ==========================================================================
     UPDATE ADVERTISEMENT
  ========================================================================== */

  async update(
    advertiserId: string,
    adId: string,
    dto: UpdateAdDto,
  ): Promise<AdvertisementDocument> {

    const ad =
      await this.findOne(
        advertiserId,
        adId,
      );


    /*
     * Active ads must be paused before editing.
     */

    if (
      ad.status ===
      AdvertisementStatus.ACTIVE
    ) {

      throw new BadRequestException(
        "Active ads cannot be edited. Pause the ad first.",
      );

    }


    if (
      dto.name !== undefined
    ) {

      ad.name =
        dto.name;

    }


    if (
      dto.type !== undefined
    ) {

      ad.type =
        dto.type;

    }


    if (
      dto.headline !== undefined
    ) {

      ad.headline =
        dto.headline;

    }


    if (
      dto.description !== undefined
    ) {

      ad.description =
        dto.description;

    }


    if (
      dto.mediaUrl !== undefined
    ) {

      ad.mediaUrl =
        dto.mediaUrl;

    }


    if (
      dto.thumbnailUrl !== undefined
    ) {

      ad.thumbnailUrl =
        dto.thumbnailUrl;

    }


    if (
      dto.appIconUrl !== undefined
    ) {

      ad.appIconUrl =
        dto.appIconUrl;

    }


    if (
      dto.carouselItems !== undefined
    ) {

      ad.carouselItems =
        dto.carouselItems;

    }


    if (
      dto.destinationType !== undefined
    ) {

      ad.destinationType =
        dto.destinationType;

    }


    if (
      dto.destinationUrl !== undefined
    ) {

      ad.destinationUrl =
        dto.destinationUrl;

    }


    if (
      dto.destinationId !== undefined
    ) {

      this.validateObjectId(
        dto.destinationId,
        "Invalid destination ID.",
      );


      ad.destinationId =
        new Types.ObjectId(
          dto.destinationId,
        );

    }


    /*
     * ================================================================
     * MULTIPLE PLACEMENTS
     * ================================================================
     *
     * UpdateAdDto:
     *
     *   placements?: AdvertisementPlacement[]
     *
     * Advertisement schema:
     *
     *   placements: AdvertisementPlacement[]
     *
     * Keep the DTO and schema consistent.
     */

    if (
      dto.placements !== undefined
    ) {

      ad.placements =
        dto.placements;

    }


    if (
      dto.callToAction !== undefined
    ) {

      ad.callToAction =
        dto.callToAction;

    }


    return ad.save();

  }


  /* ==========================================================================
     ACTIVATE
  ========================================================================== */

  async activate(
    advertiserId: string,
    adId: string,
  ): Promise<AdvertisementDocument> {

    const ad =
      await this.findOne(
        advertiserId,
        adId,
      );


    const campaign =
      await this.campaignModel
        .findById(
          ad.campaignId,
        )
        .exec();


    if (!campaign) {

      throw new NotFoundException(
        "Campaign not found.",
      );

    }


    /*
     * Do not activate an advertisement
     * after the campaign has expired.
     */

    const now =
      new Date();


    if (
      campaign.endDate &&
      campaign.endDate < now
    ) {

      throw new BadRequestException(
        "This campaign has expired. Update the campaign end date before activating the advertisement.",
      );

    }


    if (
      campaign.startDate &&
      campaign.startDate > now
    ) {

      throw new BadRequestException(
        "This campaign has not started yet.",
      );

    }


    if (
      campaign.status !==
      CampaignStatus.ACTIVE
    ) {

      throw new BadRequestException(
        "The campaign must be active before the advertisement can be activated.",
      );

    }


    ad.status =
      AdvertisementStatus.ACTIVE;

    ad.isActive =
      true;


    return ad.save();

  }


  /* ==========================================================================
     PAUSE
  ========================================================================== */

  async pause(
    advertiserId: string,
    adId: string,
  ): Promise<AdvertisementDocument> {

    const ad =
      await this.findOne(
        advertiserId,
        adId,
      );


    ad.status =
      AdvertisementStatus.PAUSED;

    ad.isActive =
      false;


    return ad.save();

  }


  /* ==========================================================================
     DELETE
  ========================================================================== */

  async remove(
    advertiserId: string,
    adId: string,
  ): Promise<{
    message: string;
  }> {

    const ad =
      await this.findOne(
        advertiserId,
        adId,
      );


    if (
      ad.status ===
      AdvertisementStatus.ACTIVE
    ) {

      throw new BadRequestException(
        "Active ads cannot be deleted. Pause the ad first.",
      );

    }


    await this.advertisementModel
      .deleteOne({
        _id:
          ad._id,
      })
      .exec();


    return {

      message:
        "Advertisement deleted successfully.",

    };

  }


  /* ==========================================================================
     OWNERSHIP
  ========================================================================== */

  private verifyAdOwnership(
    ad: AdvertisementDocument,
    advertiserId: string,
  ): void {

    if (
      ad.advertiserId.toString() !==
      advertiserId
    ) {

      throw new ForbiddenException(
        "You do not have permission to access this advertisement.",
      );

    }

  }


  private verifyCampaignOwnership(
    campaign: CampaignDocument,
    advertiserId: string,
  ): void {

    if (
      campaign.advertiserId.toString() !==
      advertiserId
    ) {

      throw new ForbiddenException(
        "You do not have permission to access this campaign.",
      );

    }

  }


  /* ==========================================================================
     OBJECT ID VALIDATION
  ========================================================================== */

  private validateObjectId(
    value: string,
    message: string,
  ): void {

    if (
      !value ||
      !Types.ObjectId.isValid(
        value,
      )
    ) {

      throw new BadRequestException(
        message,
      );

    }

  }

}