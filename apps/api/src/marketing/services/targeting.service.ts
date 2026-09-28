import {
  BadRequestException,
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
  AdTargeting,
  AdTargetingDocument,
  TargetGender,
} from "../schemas/ad-targeting.schema";

import {
  Campaign,
  CampaignDocument,
} from "../schemas/campaign.schema";

import {
  TargetingDto,
} from "../dto/targeting.dto";

@Injectable()
export class TargetingService {
  constructor(
    @InjectModel(
      AdTargeting.name,
    )
    private readonly targetingModel:
      Model<AdTargetingDocument>,

    @InjectModel(
      Campaign.name,
    )
    private readonly campaignModel:
      Model<CampaignDocument>,
  ) {}

  /* ============================================================
     GET TARGETING
  ============================================================ */

  async get(
    advertiserId: string,
    campaignId: string,
  ) {
    this.validateId(
      advertiserId,
      "Invalid advertiser ID.",
    );

    this.validateId(
      campaignId,
      "Invalid campaign ID.",
    );

    const campaign =
      await this.campaignModel
        .findById(campaignId)
        .exec();

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found.",
      );
    }

    this.verifyOwnership(
      campaign,
      advertiserId,
    );

    return this.targetingModel
      .findOne({
        campaignId:
          new Types.ObjectId(
            campaignId,
          ),
      })
      .lean()
      .exec();
  }

  /* ============================================================
     SAVE TARGETING
  ============================================================ */

  async save(
    advertiserId: string,
    campaignId: string,
    dto: TargetingDto,
  ) {
    this.validateId(
      advertiserId,
      "Invalid advertiser ID.",
    );

    this.validateId(
      campaignId,
      "Invalid campaign ID.",
    );

    const campaign =
      await this.campaignModel
        .findById(campaignId)
        .exec();

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found.",
      );
    }

    this.verifyOwnership(
      campaign,
      advertiserId,
    );

    const minimumAge =
      dto.minimumAge ?? 18;

    const maximumAge =
      dto.maximumAge ?? 65;

    if (
      minimumAge > maximumAge
    ) {
      throw new BadRequestException(
        "Minimum age cannot be greater than maximum age.",
      );
    }

    const targeting =
      await this.targetingModel
        .findOneAndUpdate(
          {
            campaignId:
              new Types.ObjectId(
                campaignId,
              ),
          },
          {
            $set: {
              minimumAge,
              maximumAge,

              gender:
                dto.gender ??
                TargetGender.ALL,

              countries:
                dto.countries ?? [],

              states:
                dto.states ?? [],

              cities:
                dto.cities ?? [],

              interests:
                dto.interests ?? [],

              categories:
                dto.categories ?? [],

              keywords:
                dto.keywords ?? [],

              behaviors:
                dto.behaviors ?? [],

              devices:
                dto.devices ?? [],

              operatingSystems:
                dto.operatingSystems ??
                [],

              audienceExpansion:
                dto.audienceExpansion ??
                false,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();

    return targeting;
  }

  /* ============================================================
     MATCH USER
  ============================================================ */

  async matchesAudience(
    campaignId: string,
    user: {
      age?: number;
      gender?: string;
      country?: string;
      state?: string;
      city?: string;
      interests?: string[];
      categories?: string[];
      behaviors?: string[];
      device?: string;
      operatingSystem?: string;
    },
  ): Promise<boolean> {
    const targeting =
      await this.targetingModel
        .findOne({
          campaignId:
            new Types.ObjectId(
              campaignId,
            ),
        })
        .lean()
        .exec();

    if (!targeting) {
      return true;
    }

    if (
      user.age !== undefined &&
      (
        user.age <
          targeting.minimumAge ||
        user.age >
          targeting.maximumAge
      )
    ) {
      return false;
    }

    if (
      targeting.gender !==
        TargetGender.ALL &&
      user.gender &&
      targeting.gender !==
        user.gender
    ) {
      return false;
    }

    if (
      targeting.countries.length &&
      user.country &&
      !targeting.countries.includes(
        user.country,
      )
    ) {
      return false;
    }

    if (
      targeting.states.length &&
      user.state &&
      !targeting.states.includes(
        user.state,
      )
    ) {
      return false;
    }

    if (
      targeting.cities.length &&
      user.city &&
      !targeting.cities.includes(
        user.city,
      )
    ) {
      return false;
    }

    if (
      targeting.interests.length &&
      user.interests
    ) {
      const match =
        targeting.interests.some(
          (interest) =>
            user.interests!.includes(
              interest,
            ),
        );

      if (!match) {
        return false;
      }
    }

    if (
      targeting.categories.length &&
      user.categories
    ) {
      const match =
        targeting.categories.some(
          (category) =>
            user.categories!.includes(
              category,
            ),
        );

      if (!match) {
        return false;
      }
    }

    if (
      targeting.behaviors.length &&
      user.behaviors
    ) {
      const match =
        targeting.behaviors.some(
          (behavior) =>
            user.behaviors!.includes(
              behavior,
            ),
        );

      if (!match) {
        return false;
      }
    }

    if (
      targeting.devices.length &&
      user.device &&
      !targeting.devices.includes(
        user.device,
      )
    ) {
      return false;
    }

    if (
      targeting.operatingSystems
        .length &&
      user.operatingSystem &&
      !targeting.operatingSystems.includes(
        user.operatingSystem,
      )
    ) {
      return false;
    }

    return true;
  }

  private verifyOwnership(
    campaign: CampaignDocument,
    advertiserId: string,
  ) {
    if (
      campaign.advertiserId.toString() !==
      advertiserId
    ) {
      throw new BadRequestException(
        "Campaign does not belong to this advertiser.",
      );
    }
  }

  private validateId(
    value: string,
    message: string,
  ) {
    if (
      !value ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new BadRequestException(
        message,
      );
    }
  }
}