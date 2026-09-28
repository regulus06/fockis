import {

  Injectable,

  Logger,

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

  AdvertisementPlacement,

} from "../schemas/advertisement.schema";



import {

  Campaign,

  CampaignDocument,

  CampaignStatus,

} from "../schemas/campaign.schema";



import {

  AdEvent,

  AdEventDocument,

  AdEventType,

} from "../schemas/ad-event.schema";



import {

  TargetingService,

} from "./targeting.service";



import {

  BudgetService,

} from "./budget.service";





/* ============================================================================

   USER TARGETING PROFILE

============================================================================ */



export interface AdDeliveryUser {

  id?: string;



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

}





/* ============================================================================

   DELIVERED AD

============================================================================ */



export interface DeliveredAd {

  id: string;



  campaignId: string;



  type: string;



  name: string;



  placement: AdvertisementPlacement;



  placements: AdvertisementPlacement[];



  headline: string;



  description?: string | null;



  mediaUrl?: string | null;



  thumbnailUrl?: string | null;



  appIconUrl?: string | null;



  destinationType: string;



  destinationUrl?: string | null;



  destinationId?: string | null;



  callToAction?: string | null;



  advertiser: {

    id: string;

    name: string;

    avatar?: string;

  };



  appName?: string;



  appStoreUrl?: string;



  googlePlayUrl?: string;



  adStartDate?: string;



  adEndDate?: string;



  isExpired: boolean;

}





/* ============================================================================

   AD DELIVERY SERVICE

============================================================================ */



@Injectable()

export class AdDeliveryService {

  private readonly logger =

    new Logger(

      AdDeliveryService.name,

    );





  constructor(

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



    @InjectModel(

      AdEvent.name,

    )

    private readonly adEventModel:

      Model<AdEventDocument>,



    private readonly targetingService:

      TargetingService,



    private readonly budgetService:

      BudgetService,

  ) {}





  /* ==========================================================================

     SAFE OBJECT ID

  ========================================================================== */



  private toObjectId(

    value?: string | Types.ObjectId | null,

  ): Types.ObjectId | null {

    if (

      value === undefined ||

      value === null

    ) {

      return null;

    }



    if (

      value instanceof Types.ObjectId

    ) {

      return value;

    }



    const stringValue =

      String(value).trim();



    if (

      !stringValue

    ) {

      return null;

    }



    if (

      !Types.ObjectId.isValid(

        stringValue,

      )

    ) {

      return null;

    }



    try {

      return new Types.ObjectId(

        stringValue,

      );

    } catch {

      return null;

    }

  }





  /* ==========================================================================

     SAFE STRING

  ========================================================================== */



  private safeString(

    value: unknown,

  ): string | undefined {

    if (

      value === undefined ||

      value === null

    ) {

      return undefined;

    }



    const result =

      String(value).trim();



    return result || undefined;

  }





  /* ==========================================================================

     MARK EXPIRED CAMPAIGNS

  ========================================================================== */



  private async markExpiredCampaigns(

    now: Date,

  ): Promise<void> {

    try {

      await this.campaignModel

        .updateMany(

          {

            status:

              CampaignStatus.ACTIVE,



            isActive:

              true,



            endDate: {

              $ne: null,

              $lte: now,

            },

          },



          {

            $set: {

              status:

                CampaignStatus.COMPLETED,



              isActive:

                false,

            },

          },

        )

        .exec();

    } catch (error) {

      this.logger.error(

        "[AD DELIVERY] Failed to mark expired campaigns.",

        error,

      );

    }

  }





  /* ==========================================================================

     MARK EXPIRED ADS

  ========================================================================== */



  private async markExpiredAds(

    now: Date,

  ): Promise<void> {

    try {

      await this.adModel

        .updateMany(

          {

            status:

              AdvertisementStatus.ACTIVE,



            isActive:

              true,



            endDate: {

              $ne: null,

              $lte: now,

            },

          },



          {

            $set: {

              status:

                AdvertisementStatus.COMPLETED,



              isActive:

                false,

            },

          },

        )

        .exec();

    } catch (error) {

      this.logger.error(

        "[AD DELIVERY] Failed to mark expired advertisements.",

        error,

      );

    }

  }





  /* ==========================================================================

     GET ADS FOR USER

  ========================================================================== */



  async getAdsForUser(

    user: AdDeliveryUser,

    limit = 5,

    placement?: AdvertisementPlacement,

  ): Promise<AdvertisementDocument[]> {

    const now =

      new Date();





    /* ------------------------------------------------------------------------

       SAFE LIMIT

    ------------------------------------------------------------------------ */



    const numericLimit =

      Number(limit);



    const safeLimit =

      Math.min(

        Math.max(

          Number.isFinite(

            numericLimit,

          )

            ? Math.floor(

                numericLimit,

              )

            : 5,

          1,

        ),

        20,

      );





    /* ------------------------------------------------------------------------

       EXPIRE OLD DATA

    ------------------------------------------------------------------------ */



    await Promise.all([

      this.markExpiredCampaigns(

        now,

      ),



      this.markExpiredAds(

        now,

      ),

    ]);





    /* ==========================================================================

       FIND ACTIVE CAMPAIGNS

    ========================================================================== */



    const campaigns =

      await this.campaignModel

        .find({

          status:

            CampaignStatus.ACTIVE,



          isActive:

            true,



          $and: [

            {

              $or: [

                {

                  startDate: {

                    $exists:

                      false,

                  },

                },



                {

                  startDate:

                    null,

                },



                {

                  startDate: {

                    $lte:

                      now,

                  },

                },

              ],

            },



            {

              $or: [

                {

                  endDate: {

                    $exists:

                      false,

                  },

                },



                {

                  endDate:

                    null,

                },



                {

                  endDate: {

                    $gt:

                      now,

                  },

                },

              ],

            },

          ],

        })

        .exec();





    this.logger.log(

      `[AD DELIVERY] Active campaigns found: ${campaigns.length}`,

    );





    if (

      campaigns.length === 0

    ) {

      return [];

    }





    /* ==========================================================================

       TARGETING + BUDGET

    ========================================================================== */



    const eligibleCampaigns:

      CampaignDocument[] = [];





    for (

      const campaign of campaigns

    ) {

      const campaignId =

        campaign._id.toString();





      let targetingMatches =

        false;





      try {

        targetingMatches =

          await this.targetingService

            .matchesAudience(

              campaignId,

              user,

            );

      } catch (error) {

        this.logger.warn(

          `[AD DELIVERY] Targeting check failed for campaign ${campaignId}.`,

        );



        this.logger.debug(

          String(error),

        );



        targetingMatches =

          false;

      }





      if (

        !targetingMatches

      ) {

        continue;

      }





      let budgetAvailable =

        false;





      try {

        budgetAvailable =

          await this.budgetService.canSpend(

            campaignId,

            0.01,

          );

      } catch (error) {

        this.logger.warn(

          `[AD DELIVERY] Budget check failed for campaign ${campaignId}.`,

        );



        this.logger.debug(

          String(error),

        );



        budgetAvailable =

          false;

      }





      if (

        !budgetAvailable

      ) {

        continue;

      }





      eligibleCampaigns.push(

        campaign,

      );

    }





    if (

      eligibleCampaigns.length === 0

    ) {

      this.logger.log(

        "[AD DELIVERY] No eligible campaigns after targeting/budget checks.",

      );



      return [];

    }





    /* ==========================================================================

       CAMPAIGN IDS

    ========================================================================== */



    const campaignIds =

      eligibleCampaigns.map(

        (

          campaign,

        ) =>

          campaign._id,

      );





    /* ==========================================================================

       AD QUERY

    ========================================================================== */



    const adQuery:

      Record<string, unknown> = {

        campaignId: {

          $in:

            campaignIds,

        },



        status:

          AdvertisementStatus.ACTIVE,



        isActive:

          true,



        $and: [

          {

            $or: [

              {

                startDate: {

                  $exists:

                    false,

                },

              },



              {

                startDate:

                  null,

              },



              {

                startDate: {

                  $lte:

                    now,

                },

              },

            ],

          },



          {

            $or: [

              {

                endDate: {

                  $exists:

                    false,

                },

              },



              {

                endDate:

                  null,

              },



              {

                endDate: {

                  $gt:

                    now,

                },

              },

            ],

          },

        ],

      };





    /* ==========================================================================

       PLACEMENT

    ========================================================================== */



    if (

      placement

    ) {

      adQuery.placements = {

        $in: [

          placement,

        ],

      };

    }





    /* ==========================================================================

       FIND ADS

    ========================================================================== */



    const ads =

      await this.adModel

        .find(

          adQuery,

        )

        .sort({

          rankingScore:

            -1,



          qualityScore:

            -1,



          relevanceScore:

            -1,



          deliveryScore:

            -1,



          createdAt:

            -1,

        })

        .limit(

          safeLimit,

        )

        .exec();





    this.logger.log(

      `[AD DELIVERY] Active ads found: ${ads.length} | placement=${placement ?? "ANY"} | eligibleCampaigns=${campaignIds.length}`,

    );





    return ads;

  }





  /* ==========================================================================

     BEST AD

  ========================================================================== */



  async getBestAd(

    user: AdDeliveryUser,

    placement?: AdvertisementPlacement,

  ): Promise<AdvertisementDocument | null> {

    const ads =

      await this.getAdsForUser(

        user,

        1,

        placement,

      );



    return (

      ads[0] ??

      null

    );

  }





  /* ==========================================================================

     CONVERT DATABASE AD → FRONTEND AD

  ========================================================================== */



  private toDeliveredAd(

    ad: AdvertisementDocument,

  ): DeliveredAd {

    const campaign =

      ad.campaignId as unknown as

        | (

            CampaignDocument & {

              appName?: string;

              appStoreUrl?: string;

              googlePlayUrl?: string;

              callToAction?: string;

            }

          )

        | Types.ObjectId;





    const advertiser =

      ad.advertiserId as unknown as

        | {

            _id: Types.ObjectId;

            username?: string;

            avatar?: string;

          }

        | Types.ObjectId;





    const populatedCampaign =

      campaign &&

      typeof campaign === "object" &&

      "appName" in campaign

        ? campaign

        : null;





    const populatedAdvertiser =

      advertiser &&

      typeof advertiser === "object" &&

      "username" in advertiser

        ? advertiser

        : null;





    const placements =

      ad.placements ?? [];





    const primaryPlacement =

      placements.includes(

        AdvertisementPlacement.FEED,

      )

        ? AdvertisementPlacement.FEED

        : placements[0] ??

          AdvertisementPlacement.FEED;





    return {

      id:

        ad._id.toString(),



      campaignId:

        this.toObjectId(

          String(

            ad.campaignId,

          ),

        )?.toString() ?? "",



      type:

        ad.type,



      name:

        ad.name,



      placement:

        primaryPlacement,



      placements,



      headline:

        ad.headline,



      description:

        ad.description,



      mediaUrl:

        ad.mediaUrl,



      thumbnailUrl:

        ad.thumbnailUrl,



      appIconUrl:

        ad.appIconUrl,



      destinationType:

        ad.destinationType,



      destinationUrl:

        ad.destinationUrl,



      destinationId:

        ad.destinationId

          ? ad.destinationId.toString()

          : undefined,



      callToAction:

        ad.callToAction ??

        populatedCampaign?.callToAction,



      advertiser: {

        id:

          populatedAdvertiser?._id?.toString() ??

          this.toObjectId(

            String(

              ad.advertiserId,

            ),

          )?.toString() ??

          "",



        name:

          populatedAdvertiser?.username ??

          "Fockis Advertiser",



        avatar:

          populatedAdvertiser?.avatar,

      },



      appName:

        populatedCampaign?.appName,



      appStoreUrl:

        populatedCampaign?.appStoreUrl,



      googlePlayUrl:

        populatedCampaign?.googlePlayUrl,



      adStartDate:

        ad.startDate

          ? ad.startDate.toISOString()

          : undefined,



      adEndDate:

        ad.endDate

          ? ad.endDate.toISOString()

          : undefined,



      isExpired:

        Boolean(

          ad.endDate &&

          ad.endDate.getTime() <=

            Date.now(),

        ),

    };

  }





  /* ==========================================================================

     GET DELIVERED ADS

  ========================================================================== */



  async getDeliveredAdsForUser(

    user: AdDeliveryUser,

    placement: AdvertisementPlacement,

    limit = 5,

  ): Promise<DeliveredAd[]> {

    const ads =

      await this.getAdsForUser(

        user,

        limit,

        placement,

      );





    if (

      ads.length === 0

    ) {

      return [];

    }





    let populated:

      AdvertisementDocument[];





    try {

      populated =

        await this.adModel.populate(

          ads,

          [

            {

              path:

                "campaignId",



              select:

                "appName appStoreUrl googlePlayUrl callToAction startDate endDate status",

            },



            {

              path:

                "advertiserId",



              select:

                "username avatar",

            },

          ],

        );

    } catch (error) {

      this.logger.error(

        "[AD DELIVERY] Failed to populate campaign/advertiser data.",

        error,

      );



      populated =

        ads;

    }





    const numericLimit =

      Number(limit);





    const safeOutputLimit =

      Math.min(

        Math.max(

          Number.isFinite(

            numericLimit,

          )

            ? Math.floor(

                numericLimit,

              )

            : 5,

          1,

        ),

        20,

      );





    return populated

      .slice(

        0,

        safeOutputLimit,

      )

      .map(

        (

          ad,

        ) =>

          this.toDeliveredAd(

            ad,

          ),

      );

  }





  /* ==========================================================================

     RECORD AD EVENT



     IMPORTANT:



     This method is intentionally "never throw".



     Advertisement tracking is auxiliary functionality.



     A tracking problem must NEVER cause:



       POST /marketing/delivery/event → 500



     and must NEVER break the feed.

  ========================================================================== */



  async recordEvent(

    params?: {

      adId?: string;

      campaignId?: string;

      userId?: string;

      type?: AdEventType | string;

      placement?: string;

      sessionId?: string;

      deviceType?: string;

    },

  ): Promise<void> {

    /* ------------------------------------------------------------------------

       ABSOLUTE SAFETY GUARD

    ------------------------------------------------------------------------ */



    if (

      !params ||

      typeof params !== "object"

    ) {

      this.logger.warn(

        "[AD DELIVERY] Ignoring malformed ad event body.",

      );



      return;

    }





    /* ------------------------------------------------------------------------

       NORMALIZE VALUES

    ------------------------------------------------------------------------ */



    const adId =

      this.safeString(

        params.adId,

      );



    const campaignId =

      this.safeString(

        params.campaignId,

      );



    const userId =

      this.safeString(

        params.userId,

      );



    const eventType =

      this.safeString(

        params.type,

      ) as AdEventType | undefined;



    const placement =

      this.safeString(

        params.placement,

      );



    const sessionId =

      this.safeString(

        params.sessionId,

      );



    const deviceType =

      this.safeString(

        params.deviceType,

      );





    /* ------------------------------------------------------------------------

       VALIDATE EVENT TYPE

    ------------------------------------------------------------------------ */



    if (

      !eventType ||

      !Object.values(

        AdEventType,

      ).includes(

        eventType,

      )

    ) {

      this.logger.warn(

        `[AD DELIVERY] Ignoring invalid ad event type: ${String(params.type)}`,

      );



      return;

    }





    /* ------------------------------------------------------------------------

       VALIDATE AD ID

    ------------------------------------------------------------------------ */



    const adObjectId =

      this.toObjectId(

        adId,

      );





    if (

      !adObjectId

    ) {

      this.logger.warn(

        `[AD DELIVERY] Ignoring event with invalid adId: ${String(adId)}`,

      );



      return;

    }





    /* ------------------------------------------------------------------------

       VALIDATE CAMPAIGN ID

    ------------------------------------------------------------------------ */



    const campaignObjectId =

      this.toObjectId(

        campaignId,

      );





    if (

      !campaignObjectId

    ) {

      this.logger.warn(

        `[AD DELIVERY] Ignoring event with invalid campaignId: ${String(campaignId)}`,

      );



      return;

    }





    /* ------------------------------------------------------------------------

       VALIDATE USER ID

    ------------------------------------------------------------------------ */



    const userObjectId =

      this.toObjectId(

        userId,

      );





    if (

      userId &&

      !userObjectId

    ) {

      this.logger.warn(

        `[AD DELIVERY] Event userId is not a MongoDB ObjectId: ${userId}. Recording event without userId.`,

      );

    }





    /* ==========================================================================

       VERIFY AD

    ========================================================================== */



    let adExists:

      | AdvertisementDocument

      | null = null;





    try {

      adExists =

        await this.adModel

          .findById(

            adObjectId,

          )

          .select(

            "_id campaignId advertiserId",

          )

          .lean()

          .exec() as AdvertisementDocument | null;

    } catch (error) {

      this.logger.error(

        `[AD DELIVERY] Failed checking advertisement ${adId}.`,

        error instanceof Error

          ? error.stack

          : String(error),

      );



      return;

    }





    if (

      !adExists

    ) {

      this.logger.warn(

        `[AD DELIVERY] Ignoring event for missing advertisement ${adId}.`,

      );



      return;

    }





    /* ==========================================================================

       VERIFY CAMPAIGN

    ========================================================================== */



    const actualCampaignId =

      this.toObjectId(

        String(

          adExists.campaignId,

        ),

      );





    if (

      !actualCampaignId

    ) {

      this.logger.warn(

        `[AD DELIVERY] Advertisement ${adId} has an invalid campaignId. Event ignored.`,

      );



      return;

    }





    if (

      !actualCampaignId.equals(

        campaignObjectId,

      )

    ) {

      this.logger.warn(

        `[AD DELIVERY] Campaign mismatch for ad ${adId}. Expected ${actualCampaignId.toString()}, received ${campaignId}. Event ignored.`,

      );



      return;

    }





    /* ==========================================================================

       BUILD EVENT

    ========================================================================== */



    const eventDocument:

      Record<string, unknown> = {

        adId:

          adObjectId,



        campaignId:

          campaignObjectId,



        type:

          eventType,

      };





    if (

      userObjectId

    ) {

      eventDocument.userId =

        userObjectId;

    }





    if (

      placement

    ) {

      eventDocument.placement =

        placement;

    }





    if (

      sessionId

    ) {

      eventDocument.sessionId =

        sessionId;

    }





    if (

      deviceType

    ) {

      eventDocument.deviceType =

        deviceType;

    }





    /* ==========================================================================

       SAVE EVENT

    ========================================================================== */



    try {

      await this.adEventModel.create(

        eventDocument,

      );

    } catch (error) {

      /*

       * IMPORTANT:

       *

       * Do not throw this error.

       *

       * The ad was displayed successfully.

       * Analytics failing should not break the feed.

       */



      this.logger.error(

        `[AD DELIVERY] Failed to save ${eventType} event for ad ${adId}.`,

        error instanceof Error

          ? error.stack

          : String(error),

      );



      return;

    }





    /* ==========================================================================

       DETERMINE COUNTER

    ========================================================================== */



    let counterField:

      | "impressions"

      | "clicks"

      | "videoViews"

      | null =

        null;





    if (

      eventType ===

      AdEventType.IMPRESSION

    ) {

      counterField =

        "impressions";

    } else if (

      eventType ===

      AdEventType.CLICK

    ) {

      counterField =

        "clicks";

    } else if (

      eventType ===

        AdEventType.VIDEO_VIEW ||

      eventType ===

        AdEventType.VIDEO_COMPLETE

    ) {

      counterField =

        "videoViews";

    }





    /* ==========================================================================

       UPDATE COUNTER

    ========================================================================== */



    if (

      counterField

    ) {

      try {

        await this.adModel

          .updateOne(

            {

              _id:

                adObjectId,

            },



            {

              $inc: {

                [counterField]:

                  1,

              },

            },

          )

          .exec();

      } catch (error) {

        this.logger.error(

          `[AD DELIVERY] Failed to update ${counterField} for ad ${adId}.`,

          error instanceof Error

            ? error.stack

            : String(error),

        );



        /*

         * Event was already saved.

         *

         * Do NOT throw.

         */

      }

    }





    /* ==========================================================================

       SUCCESS

    ========================================================================== */



    this.logger.debug(

      `[AD DELIVERY] Event recorded: ${eventType} | ad=${adId} | campaign=${campaignId} | user=${userId ?? "anonymous"}`,

    );

  }

}