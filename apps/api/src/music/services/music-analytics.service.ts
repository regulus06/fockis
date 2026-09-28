import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  MusicPlay,
  MusicView,
  MusicShare,
  ProducerFollow,
  MusicFavorite,
} from '../schemas/music-analytics.schema';

import {
  MusicContent,
} from '../schemas/music-content.schema';

import {
  MusicPurchase,
  MusicPaymentStatus,
} from '../schemas/music-purchase.schema';

import {
  AnalyticsRange,
} from '../dto/analytics-query.dto';

function rangeToDate(
  range: AnalyticsRange = '30d',
): Date | null {
  const now = Date.now();

  switch (range) {
    case '7d':
      return new Date(
        now - 7 * 86_400_000,
      );

    case '30d':
      return new Date(
        now - 30 * 86_400_000,
      );

    case '90d':
      return new Date(
        now - 90 * 86_400_000,
      );

    case '1y':
      return new Date(
        now - 365 * 86_400_000,
      );

    case 'all':
    default:
      return null;
  }
}

@Injectable()
export class MusicAnalyticsService {
  /**
   * A play becomes qualified once the listener reaches
   * at least 50% of the media duration.
   *
   * 0.50 = 50%
   */
  private readonly PLAY_THRESHOLD = 0.5;

  constructor(
    @InjectModel(MusicPlay.name)
    private readonly playModel: Model<MusicPlay>,

    @InjectModel(MusicView.name)
    private readonly viewModel: Model<MusicView>,

    @InjectModel(MusicShare.name)
    private readonly shareModel: Model<MusicShare>,

    @InjectModel(MusicFavorite.name)
    private readonly favoriteModel: Model<MusicFavorite>,

    @InjectModel(ProducerFollow.name)
    private readonly followModel: Model<ProducerFollow>,

    @InjectModel(MusicContent.name)
    private readonly contentModel: Model<MusicContent>,

    @InjectModel(MusicPurchase.name)
    private readonly purchaseModel: Model<MusicPurchase>,
  ) {}

  /**
   * Record a qualified play.
   *
   * IMPORTANT:
   *
   * This method is NOT called by the playback URL endpoint.
   *
   * It is called by the analytics endpoint after the frontend
   * detects that playback has reached at least 50%.
   *
   * Therefore:
   *
   * Opening content       = 0 plays
   * Clicking Play         = 0 plays
   * 10% playback          = 0 plays
   * 49% playback          = 0 plays
   * 50% playback          = +1 play
   * 75% playback          = already +1
   * 100% playback         = already +1
   * Replay → 50%          = +1 additional play
   */
  async recordQualifiedPlay(
    contentId: string,
    userId: string | null,
    currentTime: number,
    duration: number,
    wasPreview = false,
  ) {
    /**
     * Validate content ID.
     */
    if (!Types.ObjectId.isValid(contentId)) {
      throw new BadRequestException(
        'Invalid music content id.',
      );
    }

    /**
     * Validate authenticated user.
     */
    if (
      userId &&
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        'Invalid user id.',
      );
    }

    /**
     * Validate playback values.
     */
    if (
      !Number.isFinite(currentTime) ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      currentTime < 0
    ) {
      throw new BadRequestException(
        'Invalid playback progress.',
      );
    }

    /**
     * Never allow currentTime to exceed duration.
     */
    const safeCurrentTime = Math.min(
      currentTime,
      duration,
    );

    /**
     * Calculate playback progress.
     *
     * Example:
     *
     * 30 seconds / 100 seconds = 0.30
     * 50 seconds / 100 seconds = 0.50
     * 100 seconds / 100 seconds = 1.00
     */
    const progress = Math.min(
      safeCurrentTime / duration,
      1,
    );

    /**
     * HARD SERVER-SIDE 50% GATE.
     *
     * Even if somebody manually calls the API,
     * a request below 50% cannot create a play.
     */
    if (
      progress < this.PLAY_THRESHOLD
    ) {
      return {
        counted: false,
        reason: 'threshold_not_reached',
        threshold: this.PLAY_THRESHOLD,
        progress,
      };
    }

    /**
     * Load the music content so the play event
     * receives the correct producer ID.
     */
    const content = await this.contentModel
      .findById(contentId)
      .select(
        '_id producerId playCount viewCount',
      )
      .lean();

    if (!content) {
      throw new NotFoundException(
        'Music content not found.',
      );
    }

    if (!content.producerId) {
      throw new BadRequestException(
        'Music content has no producer.',
      );
    }

    /**
     * Create ONE raw MusicPlay event.
     *
     * There is intentionally NO deduplication here.
     *
     * Why?
     *
     * If the listener finishes/replays the media and
     * reaches 50% again, that is another qualified play.
     */
    const play = await this.playModel.create({
      contentId: content._id,

      producerId: content.producerId,

      userId: userId
        ? new Types.ObjectId(userId)
        : undefined,

      secondsPlayed: safeCurrentTime,

      completed:
        progress >= 1,

      wasPreview,
    });

    /**
     * Increment the materialized play counter.
     *
     * This happens ONLY after the 50% threshold
     * has been successfully reached.
     */
    await this.contentModel.updateOne(
      {
        _id: content._id,
      },
      {
        $inc: {
          playCount: 1,
        },
      },
    );

    return {
      counted: true,

      playId:
        play._id.toString(),

      threshold:
        this.PLAY_THRESHOLD,

      progress,

      secondsPlayed:
        safeCurrentTime,

      completed:
        progress >= 1,
    };
  }

  /**
   * Producer dashboard analytics.
   */
  async producerDashboard(
    producerId: string,
    range: AnalyticsRange = '30d',
  ) {
    if (
      !Types.ObjectId.isValid(producerId)
    ) {
      throw new BadRequestException(
        'Invalid producer id.',
      );
    }

    const since =
      rangeToDate(range);

    const dateFilter = since
      ? {
          createdAt: {
            $gte: since,
          },
        }
      : {};

    const producerObjId =
      new Types.ObjectId(
        producerId,
      );

    const [
      plays,
      views,
      purchases,
      followers,
      contentIds,
    ] = await Promise.all([
      this.playModel.countDocuments({
        producerId:
          producerObjId,
        ...dateFilter,
      }),

      this.viewModel.countDocuments({
        producerId:
          producerObjId,
        ...dateFilter,
      }),

      this.purchaseModel.countDocuments({
        producerId:
          producerObjId,
        status:
          MusicPaymentStatus.SUCCEEDED,
        ...dateFilter,
      }),

      this.followModel.countDocuments({
        producerId:
          producerObjId,
      }),

      this.contentModel
        .find({
          producerId:
            producerObjId,
        })
        .select('_id')
        .lean(),
    ]);

    const uniqueListeners =
      await this.playModel.distinct(
        'userId',
        {
          producerId:
            producerObjId,

          userId: {
            $ne: null,
          },

          wasPreview: false,

          ...dateFilter,
        },
      );

    const revenueAgg =
      await this.purchaseModel.aggregate([
        {
          $match: {
            producerId:
              producerObjId,

            status:
              MusicPaymentStatus.SUCCEEDED,

            ...dateFilter,
          },
        },

        {
          $group: {
            _id: null,

            revenue: {
              $sum:
                '$netProducerCents',
            },

            grossRevenue: {
              $sum:
                '$amountCents',
            },
          },
        },
      ]);

    return {
      range,

      totalPlays:
        plays,

      totalViews:
        views,

      uniqueListeners:
        uniqueListeners.length,

      purchases,

      followers,

      revenueCents:
        revenueAgg[0]
          ?.grossRevenue ?? 0,

      earningsCents:
        revenueAgg[0]
          ?.revenue ?? 0,

      conversionRate:
        plays + views > 0
          ? purchases /
            (plays + views)
          : 0,

      contentCount:
        contentIds.length,
    };
  }

  /**
   * Analytics for one music content item.
   */
  async contentAnalytics(
    contentId: string,
  ) {
    if (
      !Types.ObjectId.isValid(contentId)
    ) {
      throw new BadRequestException(
        'Invalid music content id.',
      );
    }

    const contentObjectId =
      new Types.ObjectId(
        contentId,
      );

    const [
      plays,
      views,
      favorites,
      shares,
      purchases,
    ] = await Promise.all([
      this.playModel.countDocuments({
        contentId:
          contentObjectId,
      }),

      this.viewModel.countDocuments({
        contentId:
          contentObjectId,
      }),

      this.favoriteModel.countDocuments({
        contentId:
          contentObjectId,
      }),

      this.shareModel.countDocuments({
        contentId:
          contentObjectId,
      }),

      this.purchaseModel.countDocuments({
        contentId:
          contentObjectId,

        status:
          MusicPaymentStatus.SUCCEEDED,
      }),
    ]);

    const uniqueListeners =
      await this.playModel.distinct(
        'userId',
        {
          contentId:
            contentObjectId,

          userId: {
            $ne: null,
          },

          wasPreview: false,
        },
      );

    const paidListens =
      await this.playModel.countDocuments({
        contentId:
          contentObjectId,

        wasPreview: false,
      });

    const paidPlays =
      await this.playModel.countDocuments({
        contentId:
          contentObjectId,

        wasPreview: false,

        completed: true,
      });

    const paidViews =
      await this.viewModel.countDocuments({
        contentId:
          contentObjectId,

        wasPreview: false,
      });

    const completionAgg =
      await this.playModel.aggregate([
        {
          $match: {
            contentId:
              contentObjectId,
          },
        },

        {
          $group: {
            _id: null,

            completionRate: {
              $avg: {
                $cond: [
                  '$completed',
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

    const revenueAgg =
      await this.purchaseModel.aggregate([
        {
          $match: {
            contentId:
              contentObjectId,

            status:
              MusicPaymentStatus.SUCCEEDED,
          },
        },

        {
          $group: {
            _id: null,

            revenue: {
              $sum:
                '$amountCents',
            },

            earnings: {
              $sum:
                '$netProducerCents',
            },
          },
        },
      ]);

    return {
      plays,

      views,

      favorites,

      shares,

      purchases,

      paidListenCount:
        paidListens,

      paidPlayCount:
        paidPlays,

      paidViewCount:
        paidViews,

      uniqueListenerCount:
        uniqueListeners.length,

      completionRate:
        completionAgg[0]
          ?.completionRate ?? 0,

      revenueCents:
        revenueAgg[0]
          ?.revenue ?? 0,

      earningsCents:
        revenueAgg[0]
          ?.earnings ?? 0,
    };
  }

  /**
   * Rebuild materialized MusicContent analytics
   * from the raw analytics collections.
   */
  async refreshContentMetrics(
    contentId?: string,
  ): Promise<void> {
    const filter: Record<
      string,
      any
    > = {};

    if (contentId) {
      if (
        !Types.ObjectId.isValid(
          contentId,
        )
      ) {
        throw new BadRequestException(
          'Invalid music content id.',
        );
      }

      filter._id =
        new Types.ObjectId(
          contentId,
        );
    }

    const contents =
      await this.contentModel
        .find(filter)
        .select(
          '_id producerId',
        )
        .lean();

    for (
      const content of contents
    ) {
      const id =
        content._id.toString();

      const [
        plays,
        views,
        favorites,
        shares,
        purchases,
      ] = await Promise.all([
        this.playModel.countDocuments({
          contentId:
            content._id,
        }),

        this.viewModel.countDocuments({
          contentId:
            content._id,
        }),

        this.favoriteModel.countDocuments({
          contentId:
            content._id,
        }),

        this.shareModel.countDocuments({
          contentId:
            content._id,
        }),

        this.purchaseModel.countDocuments({
          contentId:
            content._id,

          status:
            MusicPaymentStatus.SUCCEEDED,
        }),
      ]);

      const [
        paidListenCount,
        paidPlayCount,
        paidViewCount,
      ] = await Promise.all([
        this.playModel.countDocuments({
          contentId:
            content._id,

          wasPreview: false,
        }),

        this.playModel.countDocuments({
          contentId:
            content._id,

          wasPreview: false,

          completed: true,
        }),

        this.viewModel.countDocuments({
          contentId:
            content._id,

          wasPreview: false,
        }),
      ]);

      const uniqueListeners =
        await this.playModel.distinct(
          'userId',
          {
            contentId:
              content._id,

            userId: {
              $ne: null,
            },

            wasPreview: false,
          },
        );

      const revenueAgg =
        await this.purchaseModel.aggregate([
          {
            $match: {
              contentId:
                content._id,

              status:
                MusicPaymentStatus.SUCCEEDED,
            },
          },

          {
            $group: {
              _id: null,

              revenueCents: {
                $sum:
                  '$amountCents',
              },

              earningsCents: {
                $sum:
                  '$netProducerCents',
              },
            },
          },
        ]);

      const followers =
        await this.followModel.countDocuments({
          producerId:
            content.producerId,
        });

      await this.contentModel.updateOne(
        {
          _id:
            content._id,
        },
        {
          $set: {
            playCount:
              plays,

            viewCount:
              views,

            favoriteCount:
              favorites,

            shareCount:
              shares,

            purchaseCount:
              purchases,

            paidListenCount,

            paidPlayCount,

            paidViewCount,

            uniqueListenerCount:
              uniqueListeners.length,

            followerCount:
              followers,

            revenueCents:
              revenueAgg[0]
                ?.revenueCents ?? 0,

            earningsCents:
              revenueAgg[0]
                ?.earningsCents ?? 0,
          },
        },
      );
    }
  }
}