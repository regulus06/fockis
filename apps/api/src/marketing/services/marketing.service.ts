/* ============================================================================
   FOCKIS MARKETING SERVICE

   Main marketing orchestration service.

   Responsibilities:
   - Marketing dashboard overview
   - Advertiser marketing summary
   - Campaign statistics
   - Budget statistics
   - Performance statistics
   - Campaign status breakdown
   - Active / paused / draft / review counts
   - Spend and remaining budget
   - CTR / conversion rate / CPC / CPM
   - Date-based marketing summary
   - Campaign performance ranking
   - Video advertisement delivery
   - Video advertisement event recording

   Campaign creation / editing / approval remains inside:
     CampaignsService

   Advertisement creation / editing remains inside:
     AdvertisementService

   Detailed event analytics remains inside:
     AnalyticsService

   Billing remains inside:
     BudgetService / BillingController
============================================================================ */

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Campaign,
  CampaignDocument,
  CampaignStatus,
} from "../schemas/campaign.schema";

/* ============================================================================
   RESPONSE TYPES
============================================================================ */

export interface MarketingOverview {
  advertiserId: string;

  campaigns: {
    total: number;
    draft: number;
    pendingReview: number;
    active: number;
    paused: number;
    completed: number;
    rejected: number;
  };

  budget: {
    totalBudget: number;
    spent: number;
    remainingBudget: number;
    dailyBudget: number;
  };

  performance: {
    impressions: number;
    clicks: number;
    videoViews: number;
    installs: number;
    conversions: number;
    revenue: number;

    ctr: number;
    conversionRate: number;
    installRate: number;

    cpc: number;
    cpm: number;
    costPerInstall: number;
    costPerConversion: number;

    roas: number;
  };
}

export interface MarketingDashboardResponse {
  overview: MarketingOverview;

  recentCampaigns: Array<{
    id: string;
    name: string;
    objective: string;
    status: string;
    isActive: boolean;

    dailyBudget: number;
    totalBudget: number;
    spent: number;

    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;

    ctr: number;
    conversionRate: number;

    startDate: Date;

    /*
     * Campaign schema allows endDate to be null.
     *
     * Therefore the dashboard response must also allow null.
     */
    endDate?: Date | null;

    createdAt?: Date;
  }>;

  topCampaigns: Array<{
    id: string;
    name: string;
    status: string;

    impressions: number;
    clicks: number;
    conversions: number;

    revenue: number;
    spent: number;

    ctr: number;
    conversionRate: number;
    roas: number;
  }>;
}

export interface MarketingDateRange {
  startDate?: string;
  endDate?: string;
}

/* ============================================================================
   VIDEO AD TYPES
============================================================================ */

export interface NextVideoAdParams {
  videoId?: string;
  userId?: string;
}

export interface VideoAdEventInput {
  campaignId?: string;
  videoId?: string;

  event?: string;

  type?: string;

  eventType?: string;

  value?: number;

  [key: string]: unknown;
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class MarketingService {
  constructor(
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<CampaignDocument>,
  ) {}

  /* ==========================================================================
     GET MARKETING OVERVIEW
  ========================================================================== */

  async getOverview(
    advertiserId: string,
  ): Promise<MarketingOverview> {
    this.validateAdvertiserId(advertiserId);

    const campaigns =
      await this.getAdvertiserCampaigns(
        advertiserId,
      );

    return this.buildOverview(
      advertiserId,
      campaigns,
    );
  }

  /* ==========================================================================
     GET MARKETING DASHBOARD
  ========================================================================== */

  async getDashboard(
    advertiserId: string,
  ): Promise<MarketingDashboardResponse> {
    this.validateAdvertiserId(advertiserId);

    const campaigns =
      await this.getAdvertiserCampaigns(
        advertiserId,
      );

    const overview =
      this.buildOverview(
        advertiserId,
        campaigns,
      );

    const recentCampaigns =
      campaigns
        .slice()
        .sort(
          (a, b) =>
            this.getTime(
              b.createdAt,
            ) -
            this.getTime(
              a.createdAt,
            ),
        )
        .slice(0, 10)
        .map(
          (campaign) =>
            this.serializeCampaign(
              campaign,
            ),
        );

    const topCampaigns =
      campaigns
        .slice()
        .sort(
          (a, b) =>
            this.calculateCampaignScore(
              b,
            ) -
            this.calculateCampaignScore(
              a,
            ),
        )
        .slice(0, 10)
        .map(
          (campaign) =>
            this.serializeTopCampaign(
              campaign,
            ),
        );

    return {
      overview,
      recentCampaigns,
      topCampaigns,
    };
  }

  /* ==========================================================================
     GET DATE RANGE OVERVIEW
  ========================================================================== */

  async getDateRangeOverview(
    advertiserId: string,
    range: MarketingDateRange,
  ): Promise<MarketingOverview> {
    this.validateAdvertiserId(advertiserId);

    const startDate =
      this.parseOptionalDate(
        range.startDate,
        "Invalid marketing start date.",
      );

    const endDate =
      this.parseOptionalDate(
        range.endDate,
        "Invalid marketing end date.",
      );

    this.validateDateRange(
      startDate,
      endDate,
    );

    const campaigns =
      await this.getAdvertiserCampaigns(
        advertiserId,
      );

    const filtered =
      campaigns.filter(
        (campaign) =>
          this.campaignOverlapsRange(
            campaign,
            startDate,
            endDate,
          ),
      );

    return this.buildOverview(
      advertiserId,
      filtered,
    );
  }

  /* ==========================================================================
     GET CAMPAIGN PERFORMANCE
  ========================================================================== */

  async getCampaignPerformance(
    advertiserId: string,
    campaignId: string,
  ) {
    this.validateAdvertiserId(
      advertiserId,
    );

    this.validateCampaignId(
      campaignId,
    );

    const campaign =
      await this.campaignModel
        .findOne({
          _id:
            new Types.ObjectId(
              campaignId,
            ),

          advertiserId:
            new Types.ObjectId(
              advertiserId,
            ),
        })
        .exec();

    if (!campaign) {
      throw new BadRequestException(
        "Campaign not found.",
      );
    }

    return this.serializeTopCampaign(
      campaign,
    );
  }

  /* ==========================================================================
     GET CAMPAIGN STATUS SUMMARY
  ========================================================================== */

  async getCampaignStatusSummary(
    advertiserId: string,
  ): Promise<Record<string, number>> {
    this.validateAdvertiserId(
      advertiserId,
    );

    const campaigns =
      await this.getAdvertiserCampaigns(
        advertiserId,
      );

    const summary: Record<
      string,
      number
    > = {};

    Object.values(
      CampaignStatus,
    ).forEach(
      (status) => {
        summary[status] = 0;
      },
    );

    for (const campaign of campaigns) {
      summary[campaign.status] =
        (summary[campaign.status] ?? 0) +
        1;
    }

    return summary;
  }

  /* ==========================================================================
     GET BUDGET SUMMARY
  ========================================================================== */

  async getBudgetSummary(
    advertiserId: string,
  ) {
    this.validateAdvertiserId(
      advertiserId,
    );

    const campaigns =
      await this.getAdvertiserCampaigns(
        advertiserId,
      );

    let totalBudget = 0;
    let spent = 0;
    let dailyBudget = 0;

    for (const campaign of campaigns) {
      totalBudget +=
        this.toNumber(
          campaign.totalBudget,
        );

      spent +=
        this.toNumber(
          campaign.spent,
        );

      if (
        campaign.status ===
          CampaignStatus.ACTIVE ||
        campaign.status ===
          CampaignStatus.PAUSED
      ) {
        dailyBudget +=
          this.toNumber(
            campaign.dailyBudget,
          );
      }
    }

    const remainingBudget =
      Math.max(
        totalBudget - spent,
        0,
      );

    const utilization =
      totalBudget > 0
        ? (spent / totalBudget) * 100
        : 0;

    return {
      totalBudget:
        this.roundCurrency(
          totalBudget,
        ),

      spent:
        this.roundCurrency(
          spent,
        ),

      remainingBudget:
        this.roundCurrency(
          remainingBudget,
        ),

      dailyBudget:
        this.roundCurrency(
          dailyBudget,
        ),

      utilization:
        this.roundPercentage(
          utilization,
        ),
    };
  }

  /* ==========================================================================
     GET PERFORMANCE SUMMARY
  ========================================================================== */

  async getPerformanceSummary(
    advertiserId: string,
  ) {
    this.validateAdvertiserId(
      advertiserId,
    );

    const campaigns =
      await this.getAdvertiserCampaigns(
        advertiserId,
      );

    return this.calculatePerformance(
      campaigns,
    );
  }

  /* ==========================================================================
     GET ACTIVE CAMPAIGNS

     Used by the ad-delivery system.
  ========================================================================== */

  async getActiveCampaigns(): Promise<
    CampaignDocument[]
  > {
    const now =
      new Date();

    return this.campaignModel
      .find({
        status:
          CampaignStatus.ACTIVE,

        isActive: true,

        startDate: {
          $lte: now,
        },

        $or: [
          {
            endDate: {
              $exists: false,
            },
          },

          {
            endDate: null,
          },

          {
            endDate: {
              $gt: now,
            },
          },
        ],
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ==========================================================================
     GET ACTIVE CAMPAIGNS FOR ADVERTISER
  ========================================================================== */

  async getActiveCampaignsForAdvertiser(
    advertiserId: string,
  ): Promise<
    CampaignDocument[]
  > {
    this.validateAdvertiserId(
      advertiserId,
    );

    const now =
      new Date();

    return this.campaignModel
      .find({
        advertiserId:
          new Types.ObjectId(
            advertiserId,
          ),

        status:
          CampaignStatus.ACTIVE,

        isActive: true,

        startDate: {
          $lte: now,
        },

        $or: [
          {
            endDate: {
              $exists: false,
            },
          },

          {
            endDate: null,
          },

          {
            endDate: {
              $gt: now,
            },
          },
        ],
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  /* ==========================================================================
     GET NEXT VIDEO AD
  ========================================================================== */

  async getNextVideoAd(
    params: NextVideoAdParams,
  ) {
    const now =
      new Date();

    const query: Record<
      string,
      unknown
    > = {
      status:
        CampaignStatus.ACTIVE,

      isActive: true,

      startDate: {
        $lte: now,
      },

      $or: [
        {
          endDate: {
            $exists: false,
          },
        },

        {
          endDate: null,
        },

        {
          endDate: {
            $gt: now,
          },
        },
      ],
    };

    if (params.videoId) {
      query.$or = [
        {
          videoId:
            params.videoId,
        },

        {
          "creative.videoId":
            params.videoId,
        },

        {
          "ad.videoId":
            params.videoId,
        },

        {
          endDate: {
            $exists: false,
          },
        },
      ];
    }

    const campaigns =
      await this.campaignModel
        .find(query)
        .sort({
          createdAt: -1,
        })
        .limit(20)
        .lean()
        .exec();

    let campaign:
      | any
      | null =
      null;

    for (const candidate of campaigns) {
      const spent =
        this.toNumber(
          candidate.spent,
        );

      const totalBudget =
        this.toNumber(
          candidate.totalBudget,
        );

      if (
        totalBudget <= 0 ||
        spent < totalBudget
      ) {
        campaign =
          candidate;
        break;
      }
    }

    if (!campaign) {
      return {
        available: false,
        ad: null,
      };
    }

    const raw =
      campaign as any;

    const creative =
      raw.creative ?? {};

    const ad =
      raw.ad ?? {};

    return {
      available: true,

      ad: {
        campaignId:
          String(
            raw._id,
          ),

        videoId:
          raw.videoId ??
          creative.videoId ??
          ad.videoId ??
          params.videoId ??
          null,

        campaignName:
          raw.name ??
          null,

        objective:
          raw.objective ??
          null,

        status:
          raw.status ??
          null,

        headline:
          raw.headline ??
          creative.headline ??
          ad.headline ??
          null,

        description:
          raw.description ??
          creative.description ??
          ad.description ??
          null,

        destinationUrl:
          raw.destinationUrl ??
          creative.destinationUrl ??
          ad.destinationUrl ??
          null,

        callToAction:
          raw.callToAction ??
          creative.callToAction ??
          ad.callToAction ??
          null,

        imageUrl:
          raw.imageUrl ??
          creative.imageUrl ??
          ad.imageUrl ??
          null,

        videoUrl:
          raw.videoUrl ??
          creative.videoUrl ??
          ad.videoUrl ??
          null,

        thumbnailUrl:
          raw.thumbnailUrl ??
          creative.thumbnailUrl ??
          ad.thumbnailUrl ??
          null,
      },
    };
  }

  /* ==========================================================================
     RECORD VIDEO AD EVENT
  ========================================================================== */

  async recordVideoAdEvent(
    dto: VideoAdEventInput,
    userId?: string,
  ) {
    const campaignId =
      this.getStringValue(
        dto.campaignId,
      );

    const videoId =
      this.getStringValue(
        dto.videoId,
      );

    const eventName =
      (
        this.getStringValue(
          dto.eventType,
        ) ??
        this.getStringValue(
          dto.event,
        ) ??
        this.getStringValue(
          dto.type,
        ) ??
        ""
      )
        .trim()
        .toLowerCase();

    if (!campaignId) {
      throw new BadRequestException(
        "Campaign ID is required.",
      );
    }

    this.validateCampaignId(
      campaignId,
    );

    if (!eventName) {
      throw new BadRequestException(
        "Video ad event type is required.",
      );
    }

    const campaign =
      await this.campaignModel
        .findById(
          campaignId,
        )
        .exec();

    if (!campaign) {
      throw new BadRequestException(
        "Campaign not found.",
      );
    }

    const increment: Record<
      string,
      number
    > = {};

    switch (eventName) {
      case "impression":
      case "impressions":
        increment.impressions = 1;
        break;

      case "view":
      case "views":
      case "video_view":
      case "video-view":
      case "video_viewed":
      case "video-viewed":
      case "video_play":
      case "video-play":
      case "play":
      case "played":
        increment.videoViews = 1;
        break;

      case "click":
      case "clicks":
        increment.clicks = 1;
        break;

      case "install":
      case "installs":
        increment.installs = 1;
        break;

      case "conversion":
      case "conversions":
        increment.conversions = 1;
        break;

      default:
        throw new BadRequestException(
          `Unsupported video ad event: ${eventName}`,
        );
    }

    await this.campaignModel
      .updateOne(
        {
          _id:
            new Types.ObjectId(
              campaignId,
            ),
        },
        {
          $inc: increment,
        },
      )
      .exec();

    return {
      success: true,

      campaignId,

      videoId:
        videoId ??
        null,

      event:
        eventName,

      userId:
        userId ??
        null,

      updated: increment,
    };
  }

  /* ==========================================================================
     CHECK WHETHER CAMPAIGN CAN DELIVER
  ========================================================================== */

  async canCampaignDeliver(
    campaignId: string,
  ): Promise<boolean> {
    this.validateCampaignId(
      campaignId,
    );

    const campaign =
      await this.campaignModel
        .findById(
          campaignId,
        )
        .select(
          "_id status isActive startDate endDate spent totalBudget",
        )
        .lean()
        .exec();

    if (!campaign) {
      return false;
    }

    if (
      campaign.status !==
      CampaignStatus.ACTIVE
    ) {
      return false;
    }

    if (
      campaign.isActive !==
      true
    ) {
      return false;
    }

    const now =
      new Date();

    if (
      campaign.startDate &&
      campaign.startDate > now
    ) {
      return false;
    }

    if (
      campaign.endDate &&
      campaign.endDate <= now
    ) {
      return false;
    }

    const spent =
      this.toNumber(
        campaign.spent,
      );

    const totalBudget =
      this.toNumber(
        campaign.totalBudget,
      );

    if (
      totalBudget > 0 &&
      spent >= totalBudget
    ) {
      return false;
    }

    return true;
  }

  /* ==========================================================================
     BUILD OVERVIEW
  ========================================================================== */

  private buildOverview(
    advertiserId: string,
    campaigns: CampaignDocument[],
  ): MarketingOverview {
    const campaignCounts = {
      total: campaigns.length,

      draft: 0,
      pendingReview: 0,
      active: 0,
      paused: 0,
      completed: 0,
      rejected: 0,
    };

    let totalBudget = 0;
    let spent = 0;
    let dailyBudget = 0;

    let impressions = 0;
    let clicks = 0;
    let videoViews = 0;
    let installs = 0;
    let conversions = 0;
    let revenue = 0;

    for (const campaign of campaigns) {
      switch (campaign.status) {
        case CampaignStatus.DRAFT:
          campaignCounts.draft++;
          break;

        case CampaignStatus.PENDING_REVIEW:
          campaignCounts.pendingReview++;
          break;

        case CampaignStatus.ACTIVE:
          campaignCounts.active++;
          break;

        case CampaignStatus.PAUSED:
          campaignCounts.paused++;
          break;

        case CampaignStatus.COMPLETED:
          campaignCounts.completed++;
          break;

        case CampaignStatus.REJECTED:
          campaignCounts.rejected++;
          break;
      }

      totalBudget +=
        this.toNumber(
          campaign.totalBudget,
        );

      spent +=
        this.toNumber(
          campaign.spent,
        );

      if (
        campaign.status ===
        CampaignStatus.ACTIVE
      ) {
        dailyBudget +=
          this.toNumber(
            campaign.dailyBudget,
          );
      }

      impressions +=
        this.toNumber(
          campaign.impressions,
        );

      clicks +=
        this.toNumber(
          campaign.clicks,
        );

      videoViews +=
        this.toNumber(
          campaign.videoViews,
        );

      installs +=
        this.toNumber(
          campaign.installs,
        );

      conversions +=
        this.toNumber(
          campaign.conversions,
        );

      revenue +=
        this.toNumber(
          campaign.revenue,
        );
    }

    const performance =
      this.calculatePerformanceFromNumbers(
        {
          spent,
          impressions,
          clicks,
          installs,
          conversions,
          revenue,
        },
      );

    return {
      advertiserId,

      campaigns:
        campaignCounts,

      budget: {
        totalBudget:
          this.roundCurrency(
            totalBudget,
          ),

        spent:
          this.roundCurrency(
            spent,
          ),

        remainingBudget:
          this.roundCurrency(
            Math.max(
              totalBudget - spent,
              0,
            ),
          ),

        dailyBudget:
          this.roundCurrency(
            dailyBudget,
          ),
      },

      performance: {
        impressions,
        clicks,
        videoViews,
        installs,
        conversions,

        revenue:
          this.roundCurrency(
            revenue,
          ),

        ctr:
          performance.ctr,

        conversionRate:
          performance.conversionRate,

        installRate:
          performance.installRate,

        cpc:
          performance.cpc,

        cpm:
          performance.cpm,

        costPerInstall:
          performance.costPerInstall,

        costPerConversion:
          performance.costPerConversion,

        roas:
          performance.roas,
      },
    };
  }

  /* ==========================================================================
     CALCULATE PERFORMANCE
  ========================================================================== */

  private calculatePerformance(
    campaigns: CampaignDocument[],
  ) {
    let spent = 0;
    let impressions = 0;
    let clicks = 0;
    let installs = 0;
    let conversions = 0;
    let revenue = 0;

    for (const campaign of campaigns) {
      spent +=
        this.toNumber(
          campaign.spent,
        );

      impressions +=
        this.toNumber(
          campaign.impressions,
        );

      clicks +=
        this.toNumber(
          campaign.clicks,
        );

      installs +=
        this.toNumber(
          campaign.installs,
        );

      conversions +=
        this.toNumber(
          campaign.conversions,
        );

      revenue +=
        this.toNumber(
          campaign.revenue,
        );
    }

    return this.calculatePerformanceFromNumbers(
      {
        spent,
        impressions,
        clicks,
        installs,
        conversions,
        revenue,
      },
    );
  }

  /* ==========================================================================
     PERFORMANCE CALCULATOR
  ========================================================================== */

  private calculatePerformanceFromNumbers(
    values: {
      spent: number;
      impressions: number;
      clicks: number;
      installs: number;
      conversions: number;
      revenue: number;
    },
  ) {
    const {
      spent,
      impressions,
      clicks,
      installs,
      conversions,
      revenue,
    } = values;

    const ctr =
      impressions > 0
        ? (clicks / impressions) * 100
        : 0;

    const conversionRate =
      clicks > 0
        ? (conversions / clicks) * 100
        : 0;

    const installRate =
      clicks > 0
        ? (installs / clicks) * 100
        : 0;

    const cpc =
      clicks > 0
        ? spent / clicks
        : 0;

    const cpm =
      impressions > 0
        ? (spent / impressions) * 1000
        : 0;

    const costPerInstall =
      installs > 0
        ? spent / installs
        : 0;

    const costPerConversion =
      conversions > 0
        ? spent / conversions
        : 0;

    const roas =
      spent > 0
        ? revenue / spent
        : 0;

    return {
      ctr:
        this.roundPercentage(
          ctr,
        ),

      conversionRate:
        this.roundPercentage(
          conversionRate,
        ),

      installRate:
        this.roundPercentage(
          installRate,
        ),

      cpc:
        this.roundCurrency(
          cpc,
        ),

      cpm:
        this.roundCurrency(
          cpm,
        ),

      costPerInstall:
        this.roundCurrency(
          costPerInstall,
        ),

      costPerConversion:
        this.roundCurrency(
          costPerConversion,
        ),

      roas:
        this.roundNumber(
          roas,
        ),
    };
  }

  /* ==========================================================================
     SERIALIZE CAMPAIGN

     IMPORTANT:
     Campaign schema allows:
       endDate?: Date | null

     Dashboard response now also allows:
       endDate?: Date | null

     Therefore null is preserved instead of being incorrectly
     converted to undefined.
  ========================================================================== */

  private serializeCampaign(
    campaign: CampaignDocument,
  ): MarketingDashboardResponse["recentCampaigns"][number] {
    const performance =
      this.calculatePerformanceFromNumbers(
        {
          spent:
            this.toNumber(
              campaign.spent,
            ),

          impressions:
            this.toNumber(
              campaign.impressions,
            ),

          clicks:
            this.toNumber(
              campaign.clicks,
            ),

          installs:
            this.toNumber(
              campaign.installs,
            ),

          conversions:
            this.toNumber(
              campaign.conversions,
            ),

          revenue:
            this.toNumber(
              campaign.revenue,
            ),
        },
      );

    return {
      id:
        campaign._id.toString(),

      name:
        campaign.name,

      objective:
        campaign.objective,

      status:
        campaign.status,

      isActive:
        campaign.isActive,

      dailyBudget:
        this.roundCurrency(
          campaign.dailyBudget,
        ),

      totalBudget:
        this.roundCurrency(
          campaign.totalBudget,
        ),

      spent:
        this.roundCurrency(
          campaign.spent,
        ),

      impressions:
        this.toNumber(
          campaign.impressions,
        ),

      clicks:
        this.toNumber(
          campaign.clicks,
        ),

      conversions:
        this.toNumber(
          campaign.conversions,
        ),

      revenue:
        this.roundCurrency(
          campaign.revenue,
        ),

      ctr:
        performance.ctr,

      conversionRate:
        performance.conversionRate,

      startDate:
        campaign.startDate,

      /*
       * Explicitly preserve null.
       *
       * This matches the Campaign schema and the dashboard
       * response interface.
       */
      endDate:
        campaign.endDate ?? null,

      createdAt:
        campaign.createdAt,
    };
  }

  /* ==========================================================================
     SERIALIZE TOP CAMPAIGN
  ========================================================================== */

  private serializeTopCampaign(
    campaign: CampaignDocument,
  ) {
    const spent =
      this.toNumber(
        campaign.spent,
      );

    const impressions =
      this.toNumber(
        campaign.impressions,
      );

    const clicks =
      this.toNumber(
        campaign.clicks,
      );

    const conversions =
      this.toNumber(
        campaign.conversions,
      );

    const revenue =
      this.toNumber(
        campaign.revenue,
      );

    const ctr =
      impressions > 0
        ? (clicks / impressions) * 100
        : 0;

    const conversionRate =
      clicks > 0
        ? (conversions / clicks) * 100
        : 0;

    const roas =
      spent > 0
        ? revenue / spent
        : 0;

    return {
      id:
        campaign._id.toString(),

      name:
        campaign.name,

      status:
        campaign.status,

      impressions,

      clicks,

      conversions,

      revenue:
        this.roundCurrency(
          revenue,
        ),

      spent:
        this.roundCurrency(
          spent,
        ),

      ctr:
        this.roundPercentage(
          ctr,
        ),

      conversionRate:
        this.roundPercentage(
          conversionRate,
        ),

      roas:
        this.roundNumber(
          roas,
        ),
    };
  }

  /* ==========================================================================
     CAMPAIGN SCORE
  ========================================================================== */

  private calculateCampaignScore(
    campaign: CampaignDocument,
  ): number {
    const conversions =
      this.toNumber(
        campaign.conversions,
      );

    const revenue =
      this.toNumber(
        campaign.revenue,
      );

    const clicks =
      this.toNumber(
        campaign.clicks,
      );

    const impressions =
      this.toNumber(
        campaign.impressions,
      );

    const ctr =
      impressions > 0
        ? clicks / impressions
        : 0;

    return (
      conversions * 1000 +
      revenue * 10 +
      clicks +
      ctr * 100
    );
  }

  /* ==========================================================================
     GET ADVERTISER CAMPAIGNS
  ========================================================================== */

  private async getAdvertiserCampaigns(
    advertiserId: string,
  ): Promise<CampaignDocument[]> {
    return this.campaignModel
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
     CAMPAIGN RANGE MATCHING
  ========================================================================== */

  private campaignOverlapsRange(
    campaign: CampaignDocument,
    startDate?: Date,
    endDate?: Date,
  ): boolean {
    const campaignStart =
      campaign.startDate ??
      campaign.createdAt ??
      new Date(0);

    const campaignEnd =
      campaign.endDate ??
      new Date(
        "9999-12-31T23:59:59.999Z",
      );

    if (
      startDate &&
      campaignEnd < startDate
    ) {
      return false;
    }

    if (
      endDate &&
      campaignStart > endDate
    ) {
      return false;
    }

    return true;
  }

  /* ==========================================================================
     VALIDATE ADVERTISER ID
  ========================================================================== */

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

  /* ==========================================================================
     VALIDATE CAMPAIGN ID
  ========================================================================== */

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

  /* ==========================================================================
     STRING NORMALIZATION
  ========================================================================== */

  private getStringValue(
    value:
      | unknown
      | null
      | undefined,
  ): string | undefined {
    if (
      typeof value !==
      "string"
    ) {
      return undefined;
    }

    const normalized =
      value.trim();

    return normalized
      ? normalized
      : undefined;
  }

  /* ==========================================================================
     DATE PARSER
  ========================================================================== */

  private parseOptionalDate(
    value:
      | string
      | undefined,
    message: string,
  ): Date | undefined {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return undefined;
    }

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

  /* ==========================================================================
     DATE RANGE VALIDATION
  ========================================================================== */

  private validateDateRange(
    startDate?: Date,
    endDate?: Date,
  ): void {
    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      throw new BadRequestException(
        "Marketing end date cannot be before the start date.",
      );
    }
  }

  /* ==========================================================================
     NUMBER NORMALIZATION
  ========================================================================== */

  private toNumber(
    value:
      | number
      | null
      | undefined,
  ): number {
    const number =
      Number(value ?? 0);

    if (
      !Number.isFinite(
        number,
      )
    ) {
      return 0;
    }

    return number;
  }

  /* ==========================================================================
     ROUND CURRENCY
  ========================================================================== */

  private roundCurrency(
    value: number,
  ): number {
    return (
      Math.round(
        value * 100,
      ) / 100
    );
  }

  /* ==========================================================================
     ROUND PERCENTAGE
  ========================================================================== */

  private roundPercentage(
    value: number,
  ): number {
    return (
      Math.round(
        value * 100,
      ) / 100
    );
  }

  /* ==========================================================================
     ROUND GENERAL NUMBER
  ========================================================================== */

  private roundNumber(
    value: number,
  ): number {
    return (
      Math.round(
        value * 100,
      ) / 100
    );
  }

  /* ==========================================================================
     DATE / TIMESTAMP HELPER

     Accepts null because Campaign.createdAt/endDate fields can
     come through as nullable depending on the Mongoose schema.
  ========================================================================== */

  private getTime(
    value:
      | Date
      | null
      | undefined,
  ): number {
    if (!value) {
      return 0;
    }

    const time =
      new Date(
        value,
      ).getTime();

    return Number.isFinite(
      time,
    )
      ? time
      : 0;
  }
}