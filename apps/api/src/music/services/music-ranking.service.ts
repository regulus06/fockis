import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import {
  MusicAccessType,
  MusicContent,
  MusicMediaKind,
  MusicPublishStatus,
} from '../schemas/music-content.schema';

@Injectable()
export class MusicRankingService {
  private readonly logger = new Logger(
    MusicRankingService.name,
  );

  constructor(
    @InjectModel(MusicContent.name)
    private readonly model: Model<MusicContent>,
  ) {}

  /**
   * ==========================================================================
   * RECOMPUTE ALL RANKINGS
   * ==========================================================================
   *
   * Server-side ranking calculation.
   *
   * The frontend never supplies rankScore.
   */
  async recomputeAll(): Promise<number> {
    const now = Date.now();

    const cursor = this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
      })
      .cursor();

    let updated = 0;

    for await (const doc of cursor) {
      const ageDays = doc.releaseDate
        ? Math.max(
            0,
            (now - doc.releaseDate.getTime()) /
              86_400_000,
          )
        : 9999;

      /**
       * Freshness gradually decreases over approximately
       * 60 days.
       */
      const freshness = Math.max(
        0,
        1 - ageDays / 60,
      );

      const paidListens =
        doc.paidListenCount ?? 0;

      const paidPlays =
        doc.paidPlayCount ?? 0;

      const uniqueListeners =
        doc.uniqueListenerCount ?? 0;

      const revenue =
        doc.revenueCents ?? 0;

      const purchases =
        doc.purchaseCount ?? 0;

      const favorites =
        doc.favoriteCount ?? 0;

      const shares =
        doc.shareCount ?? 0;

      const views =
        doc.viewCount ?? 0;

      /**
       * Revenue is normalized so very large dollar
       * amounts do not completely dominate engagement.
       *
       * $1,000 = 100,000 cents.
       */
      const revenueScore =
        Math.sqrt(revenue / 100);

      /**
       * Trending score.
       *
       * Paid activity receives substantially more
       * weight than raw views.
       */
      const engagementScore =
        paidListens * 4 +
        paidPlays * 3 +
        uniqueListeners * 2 +
        purchases * 8 +
        favorites * 2 +
        shares * 3 +
        views * 0.5 +
        revenueScore;

      const rankScore = Math.round(
        engagementScore *
          (1 + freshness),
      );

      if (doc.rankScore !== rankScore) {
        await this.model.updateOne(
          {
            _id: doc._id,
          },
          {
            $set: {
              rankScore,
            },
          },
        );

        updated++;
      }
    }

    this.logger.log(
      `Music ranking recomputed for ${updated} items.`,
    );

    return updated;
  }

  /**
   * ==========================================================================
   * TOP MUSIC
   * ==========================================================================
   */
  async topMusic(limit = 5) {
    return this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
        mediaKind: MusicMediaKind.AUDIO,
      })
      .sort({
        rankScore: -1,
        paidListenCount: -1,
        paidPlayCount: -1,
        purchaseCount: -1,
        playCount: -1,
      })
      .limit(Math.max(1, limit))
      .lean();
  }

  /**
   * ==========================================================================
   * TOP VIDEOS
   * ==========================================================================
   */
  async topVideos(limit = 5) {
    return this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
        mediaKind: MusicMediaKind.VIDEO,
      })
      .sort({
        rankScore: -1,
        paidViewCount: -1,
        paidPlayCount: -1,
        purchaseCount: -1,
        viewCount: -1,
      })
      .limit(Math.max(1, limit))
      .lean();
  }

  /**
   * ==========================================================================
   * HIGHEST EARNING
   * ==========================================================================
   */
  async topEarning(limit = 5) {
    return this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
      })
      .sort({
        earningsCents: -1,
        revenueCents: -1,
        purchaseCount: -1,
        paidPlayCount: -1,
      })
      .limit(Math.max(1, limit))
      .lean();
  }

  /**
   * ==========================================================================
   * RISING
   * ==========================================================================
   *
   * Rising content gives newer releases an opportunity to compete
   * against older content.
   */
  async rising(limit = 5) {
    const now = Date.now();

    const items = await this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
      })
      .lean();

    return items
      .map((item: any) => {
        const ageDays = item.releaseDate
          ? Math.max(
              0,
              (now -
                new Date(
                  item.releaseDate,
                ).getTime()) /
                86_400_000,
            )
          : 9999;

        /**
         * Rising chart uses a 90-day freshness window.
         */
        const freshness = Math.max(
          0.05,
          1 - ageDays / 90,
        );

        const score =
          (
            (item.paidListenCount ?? 0) * 4 +
            (item.paidPlayCount ?? 0) * 3 +
            (item.uniqueListenerCount ?? 0) * 2 +
            (item.favoriteCount ?? 0) * 2 +
            (item.shareCount ?? 0) * 4 +
            (item.viewCount ?? 0) * 0.5
          ) * freshness;

        return {
          ...item,
          risingScore: Math.round(score),
        };
      })
      .sort(
        (a, b) =>
          b.risingScore -
          a.risingScore,
      )
      .slice(0, Math.max(1, limit));
  }

  /**
   * ==========================================================================
   * NEW RELEASES
   * ==========================================================================
   */
  async newReleases(limit = 12) {
    return this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
      })
      .sort({
        releaseDate: -1,
        createdAt: -1,
      })
      .limit(Math.max(1, limit))
      .lean();
  }

  /**
   * ==========================================================================
   * FREE MUSIC
   * ==========================================================================
   *
   * IMPORTANT:
   * Use MusicAccessType.FREE instead of the raw string "free".
   *
   * This fixes the Mongoose TypeScript overload error:
   *
   * Type '"free"' is not assignable to MusicAccessType.
   */
  async freeMusic(limit = 12) {
    return this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
        accessType: MusicAccessType.FREE,
      })
      .sort({
        rankScore: -1,
        playCount: -1,
        favoriteCount: -1,
      })
      .limit(Math.max(1, limit))
      .lean();
  }

  /**
   * ==========================================================================
   * TRENDING
   * ==========================================================================
   */
  async trending(limit = 5) {
    return this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
      })
      .sort({
        rankScore: -1,
        paidListenCount: -1,
        paidPlayCount: -1,
        purchaseCount: -1,
        playCount: -1,
      })
      .limit(Math.max(1, limit))
      .lean();
  }

  /**
   * ==========================================================================
   * PREMIUM / EXCLUSIVE
   * ==========================================================================
   *
   * Useful for the Music Home page.
   */
  async premiumAndExclusive(limit = 12) {
    return this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
        accessType: {
          $in: [
            MusicAccessType.PREMIUM,
            MusicAccessType.EXCLUSIVE,
          ],
        },
      })
      .sort({
        rankScore: -1,
        paidPlayCount: -1,
        revenueCents: -1,
      })
      .limit(Math.max(1, limit))
      .lean();
  }

  /**
   * ==========================================================================
   * FEATURED
   * ==========================================================================
   */
  async featured(limit = 12) {
    return this.model
      .find({
        status: MusicPublishStatus.PUBLISHED,
        isFeatured: true,
      })
      .sort({
        rankScore: -1,
        releaseDate: -1,
      })
      .limit(Math.max(1, limit))
      .lean();
  }

  /**
   * ==========================================================================
   * PRODUCER RANKINGS
   * ==========================================================================
   */
  async computeProducerScores(): Promise<
    Array<{
      producerId: string;
      score: number;
      paidListens: number;
      purchases: number;
      revenueCents: number;
      followers: number;
    }>
  > {
    const results =
      await this.model.aggregate([
        {
          $match: {
            status:
              MusicPublishStatus.PUBLISHED,
          },
        },

        {
          $group: {
            _id: '$producerId',

            plays: {
              $sum: '$playCount',
            },

            paidListens: {
              $sum: '$paidListenCount',
            },

            paidPlays: {
              $sum: '$paidPlayCount',
            },

            views: {
              $sum: '$viewCount',
            },

            purchases: {
              $sum: '$purchaseCount',
            },

            favorites: {
              $sum: '$favoriteCount',
            },

            shares: {
              $sum: '$shareCount',
            },

            revenueCents: {
              $sum: '$revenueCents',
            },

            earningsCents: {
              $sum: '$earningsCents',
            },

            followers: {
              $max: '$followerCount',
            },
          },
        },

        {
          $project: {
            producerId: '$_id',

            paidListens: 1,

            purchases: 1,

            revenueCents: 1,

            followers: 1,

            score: {
              $add: [
                {
                  $multiply: [
                    '$paidListens',
                    4,
                  ],
                },

                {
                  $multiply: [
                    '$paidPlays',
                    3,
                  ],
                },

                {
                  $multiply: [
                    '$purchases',
                    8,
                  ],
                },

                {
                  $multiply: [
                    '$favorites',
                    2,
                  ],
                },

                {
                  $multiply: [
                    '$shares',
                    3,
                  ],
                },

                {
                  $multiply: [
                    '$views',
                    0.5,
                  ],
                },

                {
                  $multiply: [
                    '$followers',
                    0.25,
                  ],
                },
              ],
            },
          },
        },

        {
          $sort: {
            score: -1,
          },
        },
      ]);

    return results.map((r: any) => ({
      producerId:
        r.producerId.toString(),

      score: Math.round(
        r.score ?? 0,
      ),

      paidListens:
        r.paidListens ?? 0,

      purchases:
        r.purchases ?? 0,

      revenueCents:
        r.revenueCents ?? 0,

      followers:
        r.followers ?? 0,
    }));
  }
}