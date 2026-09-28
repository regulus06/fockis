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
  AdEvent,
  AdEventDocument,
  AdEventType,
} from "../schemas/ad-event.schema";

import {
  Advertisement,
  AdvertisementDocument,
} from "../schemas/advertisement.schema";

import {
  Campaign,
  CampaignDocument,
} from "../schemas/campaign.schema";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(
      AdEvent.name,
    )
    private readonly eventModel:
      Model<AdEventDocument>,

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
     RECORD EVENT
  ============================================================ */

  async recordEvent(
    input: {
      adId: string;
      userId?: string;
      type: AdEventType;
      sessionId?: string;
      requestId?: string;
      placement?: string;
      source?: string;
      deviceType?: string;
      country?: string;
      state?: string;
      city?: string;
      cost?: number;
      revenue?: number;
      metadata?: Record<string, unknown>;
    },
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

    const event =
      await this.eventModel.create({
        adId:
          ad._id,

        campaignId:
          ad.campaignId,

        /*
         * Fockis user IDs are strings.
         *
         * Example:
         * user_6a2e3f6bd600b007fca5c19a
         *
         * Do NOT convert this to MongoDB ObjectId.
         */
        userId:
          input.userId?.toString(),

        type:
          input.type,

        sessionId:
          input.sessionId,

        requestId:
          input.requestId,

        placement:
          input.placement,

        source:
          input.source,

        deviceType:
          input.deviceType,

        country:
          input.country,

        state:
          input.state,

        city:
          input.city,

        cost:
          input.cost ?? 0,

        revenue:
          input.revenue ?? 0,

        metadata:
          input.metadata ?? {},
      });

    await this.applyEventToMetrics(
      ad,
      input.type,
      input.cost ?? 0,
      input.revenue ?? 0,
    );

    return event;
  }

  /* ============================================================
     CAMPAIGN ANALYTICS
  ============================================================ */

  async getCampaignAnalytics(
    advertiserId: string,
    campaignId: string,
  ) {
    const campaign =
      await this.getOwnedCampaign(
        advertiserId,
        campaignId,
      );

    const events =
      await this.eventModel
        .find({
          campaignId:
            campaign._id,
        })
        .sort({
          createdAt: -1,
        })
        .exec();

    return {
      campaignId:
        campaign._id,

      campaignName:
        campaign.name,

      status:
        campaign.status,

      impressions:
        campaign.impressions,

      clicks:
        campaign.clicks,

      videoViews:
        campaign.videoViews,

      installs:
        campaign.installs,

      conversions:
        campaign.conversions,

      spend:
        campaign.spent,

      revenue:
        campaign.revenue,

      ctr:
        this.calculateRate(
          campaign.clicks,
          campaign.impressions,
        ),

      conversionRate:
        this.calculateRate(
          campaign.conversions,
          campaign.clicks,
        ),

      roas:
        campaign.spent > 0
          ? campaign.revenue /
            campaign.spent
          : 0,

      events,
    };
  }

  /* ============================================================
     SUMMARY
  ============================================================ */

  async getCampaignSummary(
    advertiserId: string,
    campaignId: string,
  ) {
    const campaign =
      await this.getOwnedCampaign(
        advertiserId,
        campaignId,
      );

    return {
      campaignId:
        campaign._id,

      impressions:
        campaign.impressions,

      clicks:
        campaign.clicks,

      videoViews:
        campaign.videoViews,

      installs:
        campaign.installs,

      conversions:
        campaign.conversions,

      spent:
        campaign.spent,

      revenue:
        campaign.revenue,

      ctr:
        this.calculateRate(
          campaign.clicks,
          campaign.impressions,
        ),

      conversionRate:
        this.calculateRate(
          campaign.conversions,
          campaign.clicks,
        ),

      costPerClick:
        campaign.clicks > 0
          ? campaign.spent /
            campaign.clicks
          : 0,

      costPerConversion:
        campaign.conversions > 0
          ? campaign.spent /
            campaign.conversions
          : 0,

      roas:
        campaign.spent > 0
          ? campaign.revenue /
            campaign.spent
          : 0,
    };
  }

  /* ============================================================
     EVENTS
  ============================================================ */

  async getCampaignEvents(
    advertiserId: string,
    campaignId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
    },
  ) {
    const campaign =
      await this.getOwnedCampaign(
        advertiserId,
        campaignId,
      );

    const query: any = {
      campaignId:
        campaign._id,
    };

    if (
      filters?.startDate ||
      filters?.endDate
    ) {
      query.createdAt = {};

      if (filters.startDate) {
        query.createdAt.$gte =
          new Date(
            filters.startDate,
          );
      }

      if (filters.endDate) {
        query.createdAt.$lte =
          new Date(
            filters.endDate,
          );
      }
    }

    return this.eventModel
      .find(query)
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ============================================================
     AD ANALYTICS
  ============================================================ */

  async getAdAnalytics(
    advertiserId: string,
    adId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        adId,
      )
    ) {
      throw new BadRequestException(
        "Invalid ad ID.",
      );
    }

    const ad =
      await this.adModel
        .findById(adId)
        .exec();

    if (!ad) {
      throw new NotFoundException(
        "Advertisement not found.",
      );
    }

    if (
      ad.advertiserId.toString() !==
      advertiserId
    ) {
      throw new BadRequestException(
        "You do not own this advertisement.",
      );
    }

    return {
      adId:
        ad._id,

      campaignId:
        ad.campaignId,

      name:
        ad.name,

      status:
        ad.status,

      impressions:
        ad.impressions,

      clicks:
        ad.clicks,

      videoViews:
        ad.videoViews,

      conversions:
        ad.conversions,

      spend:
        ad.spend,

      revenue:
        ad.revenue,

      ctr:
        this.calculateRate(
          ad.clicks,
          ad.impressions,
        ),

      conversionRate:
        this.calculateRate(
          ad.conversions,
          ad.clicks,
        ),

      roas:
        ad.spend > 0
          ? ad.revenue /
            ad.spend
          : 0,
    };
  }

  /* ============================================================
     OVERVIEW
  ============================================================ */

  async getAdvertiserOverview(
    advertiserId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        advertiserId,
      )
    ) {
      throw new BadRequestException(
        "Invalid advertiser ID.",
      );
    }

    const campaigns =
      await this.campaignModel
        .find({
          advertiserId:
            new Types.ObjectId(
              advertiserId,
            ),
        })
        .lean()
        .exec();

    const totals =
      campaigns.reduce(
        (
          result,
          campaign,
        ) => {
          result.impressions +=
            campaign.impressions;

          result.clicks +=
            campaign.clicks;

          result.videoViews +=
            campaign.videoViews;

          result.installs +=
            campaign.installs;

          result.conversions +=
            campaign.conversions;

          result.spent +=
            campaign.spent;

          result.revenue +=
            campaign.revenue;

          return result;
        },
        {
          impressions: 0,
          clicks: 0,
          videoViews: 0,
          installs: 0,
          conversions: 0,
          spent: 0,
          revenue: 0,
        },
      );

    return {
      campaignCount:
        campaigns.length,

      ...totals,

      ctr:
        this.calculateRate(
          totals.clicks,
          totals.impressions,
        ),

      conversionRate:
        this.calculateRate(
          totals.conversions,
          totals.clicks,
        ),

      roas:
        totals.spent > 0
          ? totals.revenue /
            totals.spent
          : 0,
    };
  }

  /* ============================================================
     APPLY EVENT
  ============================================================ */

  private async applyEventToMetrics(
    ad: AdvertisementDocument,
    type: AdEventType,
    cost: number,
    revenue: number,
  ) {
    const adUpdate: any = {};

    if (
      type ===
      AdEventType.IMPRESSION
    ) {
      adUpdate.$inc = {
        impressions: 1,
        spend: cost,
      };
    }

    if (
      type ===
      AdEventType.CLICK
    ) {
      adUpdate.$inc = {
        clicks: 1,
        spend: cost,
      };
    }

    if (
      type ===
        AdEventType.VIDEO_VIEW ||
      type ===
        AdEventType.VIDEO_COMPLETE
    ) {
      adUpdate.$inc = {
        videoViews: 1,
        spend: cost,
      };
    }

    if (
      type ===
      AdEventType.CONVERSION
    ) {
      adUpdate.$inc = {
        conversions: 1,
        spend: cost,
        revenue,
      };
    }

    if (
      type ===
      AdEventType.INSTALL
    ) {
      adUpdate.$inc = {
        conversions: 1,
        spend: cost,
      };
    }

    if (
      type ===
        AdEventType.LIKE ||
      type ===
        AdEventType.SHARE ||
      type ===
        AdEventType.SAVE
    ) {
      adUpdate.$inc = {
        spend: cost,
      };
    }

    if (
      Object.keys(adUpdate).length
    ) {
      await this.adModel
        .updateOne(
          {
            _id:
              ad._id,
          },
          adUpdate,
        )
        .exec();
    }

    const campaign =
      await this.campaignModel
        .findById(
          ad.campaignId,
        )
        .exec();

    if (!campaign) {
      return;
    }

    if (
      type ===
      AdEventType.IMPRESSION
    ) {
      campaign.impressions += 1;
    }

    if (
      type ===
      AdEventType.CLICK
    ) {
      campaign.clicks += 1;
    }

    if (
      type ===
        AdEventType.VIDEO_VIEW ||
      type ===
        AdEventType.VIDEO_COMPLETE
    ) {
      campaign.videoViews += 1;
    }

    if (
      type ===
      AdEventType.INSTALL
    ) {
      campaign.installs += 1;
    }

    if (
      type ===
      AdEventType.CONVERSION
    ) {
      campaign.conversions += 1;
    }

    campaign.spent +=
      cost;

    campaign.revenue +=
      revenue;

    await campaign.save();
  }

  /* ============================================================
     CAMPAIGN
  ============================================================ */

  private async getOwnedCampaign(
    advertiserId: string,
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

    return campaign;
  }

  /* ============================================================
     RATE
  ============================================================ */

  private calculateRate(
    numerator: number,
    denominator: number,
  ) {
    if (
      denominator <= 0
    ) {
      return 0;
    }

    return Number(
      (
        numerator /
        denominator
      ).toFixed(4),
    );
  }
}