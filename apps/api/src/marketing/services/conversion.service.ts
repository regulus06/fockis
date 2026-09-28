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
  AdConversion,
  AdConversionDocument,
  ConversionType,
} from "../schemas/ad-conversion.schema";

import {
  Advertisement,
  AdvertisementDocument,
} from "../schemas/advertisement.schema";

import {
  Campaign,
  CampaignDocument,
} from "../schemas/campaign.schema";

export interface RecordConversionInput {
  adId: string;
  userId?: string;
  type: ConversionType;
  value?: number;
  currency?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ConversionService {
  constructor(
    @InjectModel(
      AdConversion.name,
    )
    private readonly conversionModel:
      Model<AdConversionDocument>,

    @InjectModel(
      Advertisement.name,
    )
    private readonly adModel:
      Model<AdvertisementDocument>,

    @InjectModel(
      Campaign.name,
    )
    private readonly campaignModel:
      Model<CampaignDocument>,
  ) {}

  /* ============================================================
     RECORD
  ============================================================ */

  async record(
    input: RecordConversionInput,
  ) {
    if (
      !Types.ObjectId.isValid(
        input.adId,
      )
    ) {
      throw new BadRequestException(
        "Invalid advertisement ID.",
      );
    }

    const ad =
      await this.adModel
        .findById(input.adId)
        .exec();

    if (!ad) {
      throw new NotFoundException(
        "Advertisement not found.",
      );
    }

    const value =
      input.value ?? 0;

    if (value < 0) {
      throw new BadRequestException(
        "Conversion value cannot be negative.",
      );
    }

    const conversion =
      await this.conversionModel.create({
        adId: ad._id,

        campaignId:
          ad.campaignId,

        userId:
          input.userId &&
          Types.ObjectId.isValid(
            input.userId,
          )
            ? new Types.ObjectId(
                input.userId,
              )
            : undefined,

        type: input.type,

        value,

        currency:
          input.currency,

        externalId:
          input.externalId,

        metadata:
          input.metadata ?? {},
      });

    ad.conversions += 1;
    ad.revenue += value;

    await ad.save();

    await this.campaignModel
      .findByIdAndUpdate(
        ad.campaignId,
        {
          $inc: {
            conversions: 1,
            revenue: value,
          },
        },
      )
      .exec();

    return conversion;
  }

  /* ============================================================
     GET CAMPAIGN CONVERSIONS
  ============================================================ */

  async getCampaignConversions(
    advertiserId: string,
    campaignId: string,
  ) {
    const campaign =
      await this.campaignModel
        .findById(campaignId)
        .exec();

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found.",
      );
    }

    if (
      campaign.advertiserId.toString() !==
      advertiserId
    ) {
      throw new BadRequestException(
        "You do not own this campaign.",
      );
    }

    return this.conversionModel
      .find({
        campaignId:
          campaign._id,
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }
}