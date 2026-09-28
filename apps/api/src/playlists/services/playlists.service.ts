import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Playlist,
  PlaylistDocument,
} from '../schemas/playlist.schema';

import {
  PlaylistPurchase,
  PlaylistPurchaseDocument,
} from '../schemas/playlist-purchase.schema';

import {
  PlaylistFavorite,
  PlaylistFavoriteDocument,
} from '../schemas/playlist-favorite.schema';

import {
  PlaylistLibraryEntry,
  PlaylistLibraryEntryDocument,
} from '../schemas/playlist-library-entry.schema';

import {
  PlayEvent,
  PlayEventDocument,
} from '../schemas/play-event.schema';

import { CreatePlaylistDto } from '../auth/dto/create-playlist.dto';

import { UpdatePlaylistDto } from '../auth/dto/update-playlist.dto';

import { AddPlaylistItemDto } from '../auth/dto/add-playlist-item.dto';

import { QueryPlaylistsDto } from '../auth/dto/query-playlists.dto';

import type {
  AccessType,
  SortOption,
} from '../constants/playlist.constants';

import {
  User,
} from '../../users/user.schema';

interface LeanUser {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface RequestContext {
  userId?: string;
}

type AnyObject = Record<string, unknown>;

const FEATURED_LIMIT = 12;
const PREMIUM_LIMIT = 12;
const DEFAULT_PAGE_SIZE = 20;
const RECENT_LIMIT = 20;

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectModel(Playlist.name)
    private readonly playlistModel:
      Model<PlaylistDocument>,

    @InjectModel(PlaylistPurchase.name)
    private readonly purchaseModel:
      Model<PlaylistPurchaseDocument>,

    @InjectModel(PlaylistFavorite.name)
    private readonly favoriteModel:
      Model<PlaylistFavoriteDocument>,

    @InjectModel(PlaylistLibraryEntry.name)
    private readonly libraryModel:
      Model<PlaylistLibraryEntryDocument>,

    @InjectModel(PlayEvent.name)
    private readonly playEventModel:
      Model<PlayEventDocument>,

    @InjectModel(User.name)
    private readonly userModel:
      Model<LeanUser & { _id: Types.ObjectId }>,
  ) {}

  // -----------------------------------------------------------------------
  // Discovery
  // -----------------------------------------------------------------------

  async getFeatured(
    ctx: RequestContext,
  ) {
    const docs = await this.playlistModel
      .find({
        status: 'published',
        visibility: 'public',
        isFeatured: true,
      })
      .sort({
        playCount: -1,
      })
      .limit(FEATURED_LIMIT)
      .lean();

    return this.toSummaryList(
      docs,
      ctx,
    );
  }

  async getPremium(
    ctx: RequestContext,
  ) {
    const docs = await this.playlistModel
      .find({
        status: 'published',
        visibility: 'public',
        access: {
          $in: [
            'paid',
            'premium',
            'exclusive',
          ],
        },
      })
      .sort({
        createdAt: -1,
      })
      .limit(PREMIUM_LIMIT)
      .lean();

    return this.toSummaryList(
      docs,
      ctx,
    );
  }

  async search(
    query: QueryPlaylistsDto,
    ctx: RequestContext,
  ) {
    const page =
      query.page ?? 1;

    const pageSize =
      query.pageSize ??
      DEFAULT_PAGE_SIZE;

    const filter: AnyObject = {
      status: 'published',
      visibility: 'public',
    };

    if (
      query.contentType &&
      query.contentType !== 'all'
    ) {
      filter.contentType =
        query.contentType;
    }

    if (
      query.access &&
      query.access !== 'all'
    ) {
      filter.access =
        query.access;
    }

    if (query.genre) {
      filter.genre =
        query.genre;
    }

    if (query.search) {
      filter.$text = {
        $search: query.search,
      };
    }

    const sort =
      this.resolveSort(
        query.sort,
      );

    const [
      docs,
      total,
    ] = await Promise.all([
      this.playlistModel
        .find(filter)
        .sort(sort)
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(pageSize)
        .lean(),

      this.playlistModel
        .countDocuments(filter),
    ]);

    return {
      items:
        await this.toSummaryList(
          docs,
          ctx,
        ),

      page,
      pageSize,
      total,

      hasMore:
        page * pageSize <
        total,
    };
  }

  private resolveSort(
    sort?: SortOption,
  ): Record<
    string,
    1 | -1
  > {
    switch (sort) {
      case 'popular':
      case 'most-played':
        return {
          playCount: -1,
        };

      case 'top-rated':
        return {
          rating: -1,
        };

      case 'price':
        return {
          price: 1,
        };

      case 'new-releases':
        return {
          releaseDate: -1,
        };

      case 'recent':
      default:
        return {
          createdAt: -1,
        };
    }
  }

  // -----------------------------------------------------------------------
  // Single playlist
  // -----------------------------------------------------------------------

  async getBySlug(
    slug: string,
    ctx: RequestContext,
  ) {
    const doc =
      await this.playlistModel
        .findOne({
          slug,
        })
        .select(
          '+tracks.streamUrl',
        )
        .lean();

    if (!doc) {
      throw new NotFoundException(
        'Playlist not found.',
      );
    }

    return this.toDetail(
      doc,
      ctx,
    );
  }

  async getById(
    id: string,
    ctx: RequestContext,
  ) {
    const doc =
      await this.playlistModel
        .findById(id)
        .select(
          '+tracks.streamUrl',
        )
        .lean();

    if (!doc) {
      throw new NotFoundException(
        'Playlist not found.',
      );
    }

    if (
      !ctx.userId ||
      String(doc.creatorId) !==
        ctx.userId
    ) {
      throw new ForbiddenException(
        "You don't have access to this playlist.",
      );
    }

    return this.toDetail(
      doc,
      ctx,
    );
  }

  // -----------------------------------------------------------------------
  // Creator CRUD
  // -----------------------------------------------------------------------

  async create(
    userId: string,
    dto: CreatePlaylistDto,
    coverImageUrl: string | undefined,
  ) {
    const slug =
      await this.generateUniqueSlug(
        dto.title,
      );

    const created =
      await this.playlistModel.create({
        title: dto.title,

        description:
          dto.description,

        slug,

        coverImageUrl:
          coverImageUrl ??
          dto.coverImageUrl ??
          '',

        contentType:
          dto.contentType,

        mediaKind:
          dto.contentType === 'video'
            ? 'video'
            : dto.contentType === 'mixed'
              ? 'video'
              : 'audio',

        genre:
          dto.genre,

        tags:
          dto.tags ?? [],

        creatorId:
          new Types.ObjectId(
            userId,
          ),

        access:
          dto.access,

        price:
          dto.access === 'free'
            ? undefined
            : dto.price,

        visibility:
          dto.visibility,

        status:
          'draft',

        isFeatured:
          false,

        allowComments:
          dto.allowComments ??
          true,

        allowSharing:
          dto.allowSharing ??
          true,

        releaseDate:
          dto.releaseDate
            ? new Date(
                dto.releaseDate,
              )
            : new Date(),

        tracks: [],
      });

    return this.toDetail(
      created.toObject(),
      {
        userId,
      },
    );
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePlaylistDto,
    coverImageUrl: string | undefined,
  ) {
    const playlist =
      await this.findOwned(
        userId,
        id,
      );

    if (
      dto.title &&
      dto.title !==
        playlist.title
    ) {
      playlist.slug =
        await this.generateUniqueSlug(
          dto.title,
          id,
        );
    }

    Object.assign(
      playlist,
      {
        title:
          dto.title ??
          playlist.title,

        description:
          dto.description ??
          playlist.description,

        coverImageUrl:
          coverImageUrl ??
          dto.coverImageUrl ??
          playlist.coverImageUrl,

        contentType:
          dto.contentType ??
          playlist.contentType,

        genre:
          dto.genre ??
          playlist.genre,

        tags:
          dto.tags ??
          playlist.tags,

        access:
          dto.access ??
          playlist.access,

        price:
          (
            dto.access ??
            playlist.access
          ) === 'free'
            ? undefined
            : dto.price ??
              playlist.price,

        visibility:
          dto.visibility ??
          playlist.visibility,

        status:
          dto.status ??
          playlist.status,

        allowComments:
          dto.allowComments ??
          playlist.allowComments,

        allowSharing:
          dto.allowSharing ??
          playlist.allowSharing,

        releaseDate:
          dto.releaseDate
            ? new Date(
                dto.releaseDate,
              )
            : playlist.releaseDate,
      },
    );

    await playlist.save();

    return this.toDetail(
      playlist.toObject(),
      {
        userId,
      },
    );
  }

  async remove(
    userId: string,
    id: string,
  ) {
    const playlist =
      await this.findOwned(
        userId,
        id,
      );

    await playlist.deleteOne();

    return {
      success: true,
      id,
    };
  }

  async publish(
    userId: string,
    id: string,
  ) {
    const playlist =
      await this.findOwned(
        userId,
        id,
      );

    if (
      playlist.tracks.length ===
      0
    ) {
      throw new BadRequestException(
        'Add at least one track before publishing.',
      );
    }

    playlist.status =
      'published';

    await playlist.save();

    return this.toDetail(
      playlist.toObject(),
      {
        userId,
      },
    );
  }

  async unpublish(
    userId: string,
    id: string,
  ) {
    const playlist =
      await this.findOwned(
        userId,
        id,
      );

    playlist.status =
      'unpublished';

    await playlist.save();

    return this.toDetail(
      playlist.toObject(),
      {
        userId,
      },
    );
  }

  async duplicate(
    userId: string,
    id: string,
  ) {
    const playlist =
      await this.findOwned(
        userId,
        id,
      );

    const slug =
      await this.generateUniqueSlug(
        `${playlist.title} copy`,
      );

    const source =
      playlist.toObject();

    const copy =
      await this.playlistModel.create({
        ...source,

        _id: undefined,

        slug,

        title:
          `${playlist.title} (Copy)`,

        status:
          'draft',

        isFeatured:
          false,

        playCount:
          0,

        followerCount:
          0,

        favoriteCount:
          0,

        createdAt:
          undefined,

        updatedAt:
          undefined,
      });

    return this.toDetail(
      copy.toObject(),
      {
        userId,
      },
    );
  }

  async addTrack(
    userId: string,
    id: string,
    dto: AddPlaylistItemDto,
  ) {
    const playlist =
      await this.findOwned(
        userId,
        id,
      );

    playlist.tracks.push({
      order:
        playlist.tracks.length +
        1,

      title:
        dto.title,

      artist:
        dto.artist,

      mediaKind:
        dto.mediaKind,

      durationSeconds:
        dto.durationSeconds,

      previewUrl:
        dto.previewUrl,

      streamUrl:
        dto.streamUrl,

      posterUrl:
        dto.posterUrl,
    } as never);

    await playlist.save();

    return this.toDetail(
      playlist.toObject(),
      {
        userId,
      },
    );
  }

  private async findOwned(
    userId: string,
    id: string,
  ): Promise<PlaylistDocument> {
    const playlist =
      await this.playlistModel
        .findById(id);

    if (!playlist) {
      throw new NotFoundException(
        'Playlist not found.',
      );
    }

    if (
      String(
        playlist.creatorId,
      ) !== userId
    ) {
      throw new ForbiddenException(
        "You don't have permission to modify this playlist.",
      );
    }

    return playlist;
  }

  private async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const base =
      title
        .toLowerCase()
        .trim()
        .replace(
          /[^a-z0-9]+/g,
          '-',
        )
        .replace(
          /(^-|-$)/g,
          '',
        )
        .slice(0, 80);

    let candidate =
      base || 'playlist';

    let suffix = 0;

    while (true) {
      const existing =
        await this.playlistModel
          .findOne({
            slug: candidate,
          })
          .select('_id')
          .lean();

      if (
        !existing ||
        (
          excludeId &&
          String(
            existing._id,
          ) === excludeId
        )
      ) {
        return candidate;
      }

      suffix += 1;

      candidate =
        `${base}-${suffix}`;
    }
  }

  // -----------------------------------------------------------------------
  // Access / commerce
  // -----------------------------------------------------------------------

  async unlock(
    userId: string,
    playlistId: string,
  ) {
    const playlist =
      await this.playlistModel
        .findById(playlistId)
        .lean();

    if (!playlist) {
      throw new NotFoundException(
        'Playlist not found.',
      );
    }

    if (
      playlist.access ===
      'free'
    ) {
      throw new BadRequestException(
        'This playlist is already free to play.',
      );
    }

    const existing =
      await this.purchaseModel.findOne({
        userId:
          new Types.ObjectId(
            userId,
          ),

        playlistId:
          new Types.ObjectId(
            playlistId,
          ),

        status:
          'completed',
      });

    if (existing) {
      return {
        playlistId,
        success: true,
      };
    }

    await this.purchaseModel.create({
      userId:
        new Types.ObjectId(
          userId,
        ),

      playlistId:
        new Types.ObjectId(
          playlistId,
        ),

      amount:
        playlist.price ?? 0,

      currency:
        playlist.currency ??
        'USD',

      status:
        'completed',

      paymentProvider:
        'manual',
    });

    return {
      playlistId,
      success: true,
    };
  }

  async addToLibrary(
    userId: string,
    playlistId: string,
  ) {
    await this.libraryModel.updateOne(
      {
        userId:
          new Types.ObjectId(
            userId,
          ),

        playlistId:
          new Types.ObjectId(
            playlistId,
          ),
      },

      {
        $setOnInsert: {
          userId:
            new Types.ObjectId(
              userId,
            ),

          playlistId:
            new Types.ObjectId(
              playlistId,
            ),
        },
      },

      {
        upsert: true,
      },
    );

    return {
      success: true,
    };
  }

  async removeFromLibrary(
    userId: string,
    playlistId: string,
  ) {
    await this.libraryModel.deleteOne({
      userId:
        new Types.ObjectId(
          userId,
        ),

      playlistId:
        new Types.ObjectId(
          playlistId,
        ),
    });

    return {
      success: true,
    };
  }

  async favorite(
    userId: string,
    playlistId: string,
  ) {
    const result =
      await this.favoriteModel.updateOne(
        {
          userId:
            new Types.ObjectId(
              userId,
            ),

          playlistId:
            new Types.ObjectId(
              playlistId,
            ),
        },

        {
          $setOnInsert: {
            userId:
              new Types.ObjectId(
                userId,
              ),

            playlistId:
              new Types.ObjectId(
                playlistId,
              ),
          },
        },

        {
          upsert: true,
        },
      );

    if (
      result.upsertedCount > 0
    ) {
      await this.playlistModel.updateOne(
        {
          _id: playlistId,
        },

        {
          $inc: {
            favoriteCount: 1,
          },
        },
      );
    }

    return {
      success: true,
    };
  }

  async unfavorite(
    userId: string,
    playlistId: string,
  ) {
    const result =
      await this.favoriteModel.deleteOne({
        userId:
          new Types.ObjectId(
            userId,
          ),

        playlistId:
          new Types.ObjectId(
            playlistId,
          ),
      });

    if (
      result.deletedCount > 0
    ) {
      await this.playlistModel.updateOne(
        {
          _id: playlistId,
        },

        {
          $inc: {
            favoriteCount: -1,
          },
        },
      );
    }

    return {
      success: true,
    };
  }

  async recordPlay(
    userId: string | undefined,
    playlistId: string,
    trackId: string,
  ) {
    const playlist =
      await this.playlistModel
        .findById(playlistId)
        .lean();

    if (!playlist) {
      throw new NotFoundException(
        'Playlist not found.',
      );
    }

    const track =
      playlist.tracks.find(
        (t) =>
          String(
            (
              t as unknown as {
                _id: Types.ObjectId;
              }
            )._id,
          ) === trackId,
      );

    if (!track) {
      throw new NotFoundException(
        'Track not found.',
      );
    }

    if (
      playlist.access !==
        'free' &&
      String(
        playlist.creatorId,
      ) !== userId
    ) {
      const purchased =
        userId
          ? await this.purchaseModel.exists({
              userId:
                new Types.ObjectId(
                  userId,
                ),

              playlistId:
                new Types.ObjectId(
                  playlistId,
                ),

              status:
                'completed',
            })
          : null;

      if (!purchased) {
        throw new ForbiddenException(
          'Unlock this playlist to play this track.',
        );
      }
    }

    await this.playEventModel.create({
      userId: userId
        ? new Types.ObjectId(
            userId,
          )
        : undefined,

      playlistId:
        new Types.ObjectId(
          playlistId,
        ),

      trackId,
    });

    await this.playlistModel.updateOne(
      {
        _id: playlistId,
      },

      {
        $inc: {
          playCount: 1,
        },
      },
    );

    return {
      success: true,
    };
  }

  // -----------------------------------------------------------------------
  // Library
  // -----------------------------------------------------------------------

  async getMyLibrary(
    userId: string,
    query: QueryPlaylistsDto,
  ) {
    const page =
      query.page ?? 1;

    const pageSize =
      query.pageSize ??
      DEFAULT_PAGE_SIZE;

    const uid =
      new Types.ObjectId(
        userId,
      );

    let playlistIds:
      | Types.ObjectId[]
      | undefined;

    if (
      query.tab ===
      'favorites'
    ) {
      const favs =
        await this.favoriteModel
          .find({
            userId: uid,
          })
          .select('playlistId')
          .lean();

      playlistIds =
        favs.map(
          (f) =>
            f.playlistId,
        );
    } else if (
      query.tab ===
        'purchased' ||
      query.tab ===
        'premium'
    ) {
      const purchases =
        await this.purchaseModel
          .find({
            userId: uid,
            status: 'completed',
          })
          .select('playlistId')
          .lean();

      playlistIds =
        purchases.map(
          (p) =>
            p.playlistId,
        );
    } else if (
      query.tab ===
      'recent'
    ) {
      const events =
        await this.playEventModel
          .find({
            userId: uid,
          })
          .sort({
            playedAt: -1,
          })
          .limit(200)
          .select(
            'playlistId',
          )
          .lean();

      const seen =
        new Set<string>();

      playlistIds = [];

      for (
        const event of events
      ) {
        const key =
          String(
            event.playlistId,
          );

        if (
          !seen.has(key)
        ) {
          seen.add(key);

          playlistIds.push(
            event.playlistId,
          );
        }
      }
    } else {
      const [
        entries,
        favs,
        purchases,
      ] = await Promise.all([
        this.libraryModel
          .find({
            userId: uid,
          })
          .select(
            'playlistId',
          )
          .lean(),

        this.favoriteModel
          .find({
            userId: uid,
          })
          .select(
            'playlistId',
          )
          .lean(),

        this.purchaseModel
          .find({
            userId: uid,
            status: 'completed',
          })
          .select(
            'playlistId',
          )
          .lean(),
      ]);

      const seen =
        new Set<string>();

      playlistIds = [];

      for (
        const id of [
          ...entries.map(
            (e) =>
              e.playlistId,
          ),

          ...favs.map(
            (f) =>
              f.playlistId,
          ),

          ...purchases.map(
            (p) =>
              p.playlistId,
          ),
        ]
      ) {
        const key =
          String(id);

        if (
          !seen.has(key)
        ) {
          seen.add(key);

          playlistIds.push(
            id,
          );
        }
      }
    }

    const filter: AnyObject = {
      _id: {
        $in:
          playlistIds,
      },
    };

    if (
      query.tab ===
      'music'
    ) {
      filter.mediaKind =
        'audio';
    }

    if (
      query.tab ===
      'videos'
    ) {
      filter.mediaKind =
        'video';
    }

    if (
      query.tab ===
      'premium'
    ) {
      filter.access = {
        $in: [
          'premium',
          'exclusive',
        ],
      };
    }

    if (
      query.contentType &&
      query.contentType !== 'all'
    ) {
      filter.contentType =
        query.contentType;
    }

    if (query.search) {
      filter.$text = {
        $search:
          query.search,
      };
    }

    const sort =
      this.resolveSort(
        query.sort,
      );

    const [
      docs,
      total,
    ] = await Promise.all([
      this.playlistModel
        .find(filter)
        .sort(sort)
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(pageSize)
        .lean(),

      this.playlistModel
        .countDocuments(filter),
    ]);

    return {
      items:
        await this.toSummaryList(
          docs,
          {
            userId,
          },
        ),

      page,
      pageSize,
      total,

      hasMore:
        page * pageSize <
        total,
    };
  }

  async getMyFavorites(
    userId: string,
  ) {
    const favs =
      await this.favoriteModel
        .find({
          userId:
            new Types.ObjectId(
              userId,
            ),
        })
        .select('playlistId')
        .lean();

    const docs =
      await this.playlistModel
        .find({
          _id: {
            $in:
              favs.map(
                (f) =>
                  f.playlistId,
              ),
          },
        })
        .lean();

    return this.toSummaryList(
      docs,
      {
        userId,
      },
    );
  }

  async getMyRecentlyPlayed(
    userId: string,
  ) {
    const events =
      await this.playEventModel
        .find({
          userId:
            new Types.ObjectId(
              userId,
            ),
        })
        .sort({
          playedAt: -1,
        })
        .limit(200)
        .select(
          'playlistId',
        )
        .lean();

    const seen =
      new Set<string>();

    const ids:
      Types.ObjectId[] = [];

    for (
      const event of events
    ) {
      const key =
        String(
          event.playlistId,
        );

      if (
        !seen.has(key)
      ) {
        seen.add(key);

        ids.push(
          event.playlistId,
        );
      }

      if (
        ids.length >=
        RECENT_LIMIT
      ) {
        break;
      }
    }

    const docs =
      await this.playlistModel
        .find({
          _id: {
            $in: ids,
          },
        })
        .lean();

    const byId =
      new Map(
        docs.map(
          (doc) => [
            String(doc._id),
            doc,
          ],
        ),
      );

    const ordered =
      ids
        .map(
          (id) =>
            byId.get(
              String(id),
            ),
        )
        .filter(
          (
            doc,
          ): doc is NonNullable<
            typeof doc
          > =>
            Boolean(doc),
        );

    return this.toSummaryList(
      ordered,
      {
        userId,
      },
    );
  }

  // -----------------------------------------------------------------------
  // Creator dashboard
  // -----------------------------------------------------------------------

  async getMyPlaylists(
    userId: string,
  ) {
    const docs =
      await this.playlistModel
        .find({
          creatorId:
            new Types.ObjectId(
              userId,
            ),
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return this.toSummaryList(
      docs,
      {
        userId,
      },
    );
  }

  async getMyCreatorStats(
    userId: string,
  ) {
    const uid =
      new Types.ObjectId(
        userId,
      );

    const [agg] =
      await this.playlistModel.aggregate(
        [
          {
            $match: {
              creatorId: uid,
            },
          },

          {
            $group: {
              _id: null,

              totalPlaylists: {
                $sum: 1,
              },

              totalPlays: {
                $sum:
                  '$playCount',
              },

              totalFollowers: {
                $sum:
                  '$followerCount',
              },

              premiumContentCount: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$access',
                        [
                          'premium',
                          'exclusive',
                        ],
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              publishedContentCount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        '$status',
                        'published',
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
      );

    const revenueAgg =
      await this.purchaseModel.aggregate(
        [
          {
            $match: {
              status:
                'completed',
            },
          },

          {
            $lookup: {
              from:
                this.playlistModel
                  .collection
                  .name,

              localField:
                'playlistId',

              foreignField:
                '_id',

              as: 'playlist',
            },
          },

          {
            $unwind:
              '$playlist',
          },

          {
            $match: {
              'playlist.creatorId':
                uid,
            },
          },

          {
            $group: {
              _id: null,

              revenue: {
                $sum:
                  '$amount',
              },
            },
          },
        ],
      );

    return {
      totalPlaylists:
        agg?.totalPlaylists ??
        0,

      totalPlays:
        agg?.totalPlays ??
        0,

      totalFollowers:
        agg?.totalFollowers ??
        0,

      revenueCents:
        Math.round(
          (
            revenueAgg[0]
              ?.revenue ??
            0
          ) * 100,
        ),

      currency:
        'USD',

      premiumContentCount:
        agg?.premiumContentCount ??
        0,

      publishedContentCount:
        agg?.publishedContentCount ??
        0,
    };
  }

  async getAnalytics(
    userId: string,
    playlistId: string,
  ) {
    const playlist =
      await this.findOwned(
        userId,
        playlistId,
      );

    const purchaseCount =
      await this.purchaseModel
        .countDocuments({
          playlistId:
            playlist._id,

          status:
            'completed',
        });

    const revenueAgg =
      await this.purchaseModel.aggregate(
        [
          {
            $match: {
              playlistId:
                playlist._id,

              status:
                'completed',
            },
          },

          {
            $group: {
              _id: null,

              revenue: {
                $sum:
                  '$amount',
              },
            },
          },
        ],
      );

    return {
      playCount:
        playlist.playCount,

      favoriteCount:
        playlist.favoriteCount,

      followerCount:
        playlist.followerCount,

      purchaseCount,

      revenueCents:
        Math.round(
          (
            revenueAgg[0]
              ?.revenue ??
            0
          ) * 100,
        ),

      currency:
        playlist.currency,
    };
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  private async toSummaryList<
    T extends object,
  >(
    docs: T[],
    ctx: RequestContext,
  ) {
    if (
      docs.length === 0
    ) {
      return [];
    }

    const creatorIds =
      docs.map((doc) => {
        const data =
          doc as unknown as AnyObject;

        return String(
          data.creatorId,
        );
      });

    const playlistIds =
      docs.map((doc) => {
        const data =
          doc as unknown as AnyObject;

        return String(
          data._id,
        );
      });

    const [
      creators,
      favoritedIds,
      purchasedIds,
    ] = await Promise.all([
      this.loadCreators(
        [
          ...new Set(
            creatorIds,
          ),
        ],
      ),

      this.loadFavoritedIds(
        ctx.userId,
        playlistIds,
      ),

      this.loadPurchasedIds(
        ctx.userId,
        playlistIds,
      ),
    ]);

    return docs.map(
      (doc) =>
        this.serializeSummary(
          doc,
          creators,
          favoritedIds,
          purchasedIds,
          ctx,
        ),
    );
  }

  private async toDetail<
    T extends object,
  >(
    doc: T,
    ctx: RequestContext,
  ) {
    const data =
      doc as unknown as AnyObject;

    const creators =
      await this.loadCreators([
        String(
          data.creatorId,
        ),
      ]);

    const favoritedIds =
      await this.loadFavoritedIds(
        ctx.userId,
        [
          String(
            data._id,
          ),
        ],
      );

    const purchasedIds =
      await this.loadPurchasedIds(
        ctx.userId,
        [
          String(
            data._id,
          ),
        ],
      );

    const summary =
      this.serializeSummary(
        doc,
        creators,
        favoritedIds,
        purchasedIds,
        ctx,
      );

    const isOwned =
      summary.isOwnedByCurrentUser;

    const isEntitled =
      summary.access ===
        'free' ||
      isOwned ||
      summary.isPurchasedByCurrentUser;

    const tracks =
      (
        (
          data.tracks ??
          []
        ) as AnyObject[]
      ).map(
        (track) => ({
          id: String(
            track._id,
          ),

          playlistId:
            String(
              data._id,
            ),

          order:
            track.order,

          title:
            track.title,

          artist:
            track.artist,

          mediaKind:
            track.mediaKind,

          durationSeconds:
            track.durationSeconds,

          previewUrl:
            track.previewUrl,

          posterUrl:
            track.posterUrl,

          isLocked:
            !isEntitled,

          streamUrl:
            isEntitled
              ? track.streamUrl
              : undefined,
        }),
      );

    return {
      ...summary,
      tracks,
    };
  }

  private serializeSummary<
    T extends object,
  >(
    doc: T,
    creators: Map<
      string,
      LeanUser
    >,
    favoritedIds: Set<string>,
    purchasedIds: Set<string>,
    ctx: RequestContext,
  ) {
    const data =
      doc as unknown as AnyObject;

    const creator =
      creators.get(
        String(
          data.creatorId,
        ),
      );

    const tracks =
      (
        data.tracks ??
        []
      ) as AnyObject[];

    const totalDurationSeconds =
      tracks.reduce(
        (
          sum,
          track,
        ) =>
          sum +
          (
            (
              track.durationSeconds ??
              0
            ) as number
          ),
        0,
      );

    const playlistId =
      String(
        data._id,
      );

    return {
      id:
        playlistId,

      slug:
        data.slug as string,

      title:
        data.title as string,

      description:
        data.description as string,

      coverImageUrl:
        data.coverImageUrl as string,

      bannerImageUrl:
        data.bannerImageUrl as
          | string
          | undefined,

      contentType:
        data.contentType,

      mediaKind:
        data.mediaKind,

      genre:
        data.genre,

      tags:
        data.tags ?? [],

      creator:
        creator
          ? {
              id:
                String(
                  creator._id,
                ),

              username:
                creator.username,

              displayName:
                creator.displayName,

              avatarUrl:
                creator.avatarUrl,

              category:
                'music-producer',

              verified:
                false,

              followerCount:
                0,

              releaseCount:
                0,
            }
          : null,

      access:
        data.access as AccessType,

      price:
        data.price,

      currency:
        data.currency,

      visibility:
        data.visibility,

      status:
        data.status,

      isFeatured:
        data.isFeatured,

      allowComments:
        data.allowComments,

      allowSharing:
        data.allowSharing,

      releaseDate:
        data.releaseDate,

      createdAt:
        data.createdAt,

      updatedAt:
        data.updatedAt,

      trackCount:
        tracks.length,

      totalDurationSeconds,

      playCount:
        data.playCount,

      followerCount:
        data.followerCount,

      favoriteCount:
        data.favoriteCount,

      rating:
        data.rating,

      isFavoritedByCurrentUser:
        favoritedIds.has(
          playlistId,
        ),

      isPurchasedByCurrentUser:
        purchasedIds.has(
          playlistId,
        ),

      isOwnedByCurrentUser:
        !!ctx.userId &&
        String(
          data.creatorId,
        ) === ctx.userId,
    };
  }

  private async loadCreators(
    ids: string[],
  ): Promise<
    Map<
      string,
      LeanUser
    >
  > {
    if (
      ids.length === 0
    ) {
      return new Map();
    }

    const validIds =
      ids.filter((id) =>
        Types.ObjectId.isValid(
          id,
        ),
      );

    if (
      validIds.length === 0
    ) {
      return new Map();
    }

    const users =
      await this.userModel
        .find({
          _id: {
            $in:
              validIds.map(
                (id) =>
                  new Types.ObjectId(
                    id,
                  ),
              ),
          },
        })
        .select(
          'username displayName avatarUrl',
        )
        .lean();

    return new Map(
      users.map(
        (user) => [
          String(
            user._id,
          ),
          user,
        ],
      ),
    );
  }

  private async loadFavoritedIds(
    userId:
      | string
      | undefined,
    playlistIds: string[],
  ): Promise<
    Set<string>
  > {
    if (
      !userId ||
      playlistIds.length ===
        0
    ) {
      return new Set();
    }

    const validPlaylistIds =
      playlistIds.filter(
        (id) =>
          Types.ObjectId.isValid(
            id,
          ),
      );

    if (
      validPlaylistIds.length ===
      0
    ) {
      return new Set();
    }

    const favs =
      await this.favoriteModel
        .find({
          userId:
            new Types.ObjectId(
              userId,
            ),

          playlistId: {
            $in:
              validPlaylistIds.map(
                (id) =>
                  new Types.ObjectId(
                    id,
                  ),
              ),
          },
        })
        .select(
          'playlistId',
        )
        .lean();

    return new Set(
      favs.map(
        (fav) =>
          String(
            fav.playlistId,
          ),
      ),
    );
  }

  private async loadPurchasedIds(
    userId:
      | string
      | undefined,
    playlistIds: string[],
  ): Promise<
    Set<string>
  > {
    if (
      !userId ||
      playlistIds.length ===
        0
    ) {
      return new Set();
    }

    const validPlaylistIds =
      playlistIds.filter(
        (id) =>
          Types.ObjectId.isValid(
            id,
          ),
      );

    if (
      validPlaylistIds.length ===
      0
    ) {
      return new Set();
    }

    const purchases =
      await this.purchaseModel
        .find({
          userId:
            new Types.ObjectId(
              userId,
            ),

          playlistId: {
            $in:
              validPlaylistIds.map(
                (id) =>
                  new Types.ObjectId(
                    id,
                  ),
              ),
          },

          status:
            'completed',
        })
        .select(
          'playlistId',
        )
        .lean();

    return new Set(
      purchases.map(
        (purchase) =>
          String(
            purchase.playlistId,
          ),
      ),
    );
  }
}